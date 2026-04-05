// server/src/routes/upload.ts
import { Hono } from "hono";
import { db } from "../lib/db";
import { chunks } from "../schema/chunks";
import { eq } from "drizzle-orm";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../lib/storage";
import { sha256 } from "../lib/checksum";

const uploadRoute = new Hono();

uploadRoute.post("/upload", async (c) => {
  const form = await c.req.formData();

  const file = form.get("file");
  const sessionId = form.get("sessionId");
  const chunkIndex = form.get("chunkIndex");
  const checksum = form.get("checksum");

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

  // ✅ Insert (idempotent via PK)
  try {
    await db.insert(chunks).values({
      id,
      sessionId,
      chunkIndex: index,
      checksum,
      status: "pending",
    });
  } catch {
    return c.json({ status: "duplicate" });
  }

  const key = `chunks/${sessionId}/${index}.wav`;

  const res = await s3.send(
    new PutObjectCommand({
      Bucket: process.env.BUCKET!,
      Key: key,
      Body: buffer,
    })
  );

  // ✅ checksum verification
  const computed = await sha256(buffer);
  if (computed !== checksum) {
    return c.json({ error: "Checksum mismatch" }, 400);
  }

  await db
    .update(chunks)
    .set({
      storageKey: key,
      etag: res.ETag ?? "",
      status: "uploaded",
    })
    .where(eq(chunks.id, id));

  return c.json({ ok: true });
});

export default uploadRoute;