// server/src/routes/upload.ts
import { Hono } from "hono";
import { env } from "@my-better-t-app/env/server";
import { db, chunks } from "@my-better-t-app/db";
import { eq } from "drizzle-orm";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../lib/storage";
import { sha256 } from "../lib/checksum";

const uploadRoute = new Hono();

uploadRoute.post("/upload", async (c) => {
  const startTime = Date.now();
  try {
    console.log("[Upload] Starting upload request");
    const form = await c.req.formData();
    console.log(`[Upload] Form data parsed in ${Date.now() - startTime}ms`);

    const file = form.get("file");
    const sessionId = form.get("sessionId");
    const chunkIndex = form.get("chunkIndex");
    const checksum = form.get("checksum");

    console.log(`[Upload] Received: sessionId=${sessionId}, chunkIndex=${chunkIndex}, fileSize=${file instanceof File ? file.size : 'invalid'}`);

    // ✅ Type safety checks
    if (
      !(file instanceof File) ||
      typeof sessionId !== "string" ||
      typeof checksum !== "string" ||
      typeof chunkIndex !== "string"
    ) {
      return c.json({ error: "Invalid input" }, 400);
    }

    const index = Number(chunkIndex);
    const id = `${sessionId}-${index}`; 

    const buffer = Buffer.from(await file.arrayBuffer());

    // ✅ Verify checksum BEFORE storing
    const computed = await sha256(buffer);
    console.log(`[Upload] Checksums - expected: ${checksum.substring(0, 16)}..., computed: ${computed.substring(0, 16)}...`);
    if (computed !== checksum) {
      return c.json(
        {
          error: "Checksum mismatch",
          expected: checksum,
          computed,
        },
        400
      );
    }
    console.log(`[Upload] Checksum verified in ${Date.now() - startTime}ms`);

    // ✅ Insert (idempotent via PK)
    try {
      console.log(`[Upload] Inserting into database - ${Date.now() - startTime}ms`);
      await db.insert(chunks).values({
        id,
        sessionId,
        chunkIndex: index,
        checksum,
        status: "pending",
      });
      console.log(`[Upload] DB insert successful - ${Date.now() - startTime}ms`);
    } catch (e) {
      // Check if it's a duplicate key error
      const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("[Upload] Insert error:", errorMsg);
      if (errorMsg.includes("duplicate") || errorMsg.includes("unique")) {
        // Duplicate chunk
        return c.json({ status: "duplicate", id }, 409);
      }
      // Re-throw other errors
      throw e;
    }

    const key = `chunks/${sessionId}/${index}.wav`;

    // ✅ Upload to S3/MinIO
    console.log(`[Upload] Uploading to S3 - ${Date.now() - startTime}ms`);
    const res = await s3.send(
      new PutObjectCommand({
        Bucket: env.BUCKET,
        Key: key,
        Body: buffer,
      })
    );
    console.log(`[Upload] S3 upload successful - ${Date.now() - startTime}ms`);

    // ✅ Update DB with storage info
    await db
      .update(chunks)
      .set({
        storageKey: key,
        etag: res.ETag ?? "",
        status: "uploaded",
      })
      .where(eq(chunks.id, id));

    console.log(`[Upload] Total time: ${Date.now() - startTime}ms`);
    return c.json({ ok: true, id, key, size: buffer.length }, 200);
  } catch (err) {
    const error =
      err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[Upload Error]", error, `(${Date.now() - startTime}ms)`);
    return c.json({ error: "Upload failed", details: error }, 500);
  }
});

export default uploadRoute;