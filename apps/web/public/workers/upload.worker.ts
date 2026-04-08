/// <reference lib="webworker" />
export {};

import { addToQueue, getNextBatch } from "@my-better-t-app/upload/queue";
import { writeChunk } from "@my-better-t-app/upload/opfs";
import { uploadItem } from "@my-better-t-app/upload/uploader";

const ctx: DedicatedWorkerGlobalScope = self as any;

let running = false;

async function loop() {
  if (running) return;
  running = true;

  console.log("[Worker] Upload loop started");

  while (true) {
    try {
      const batch = getNextBatch(3);

      if (batch.length === 0) {
        // 🧠 nothing to upload → sleep longer
        await sleep(2000);
        continue;
      }

      console.log("[Worker] Uploading batch:", batch.length);

      await Promise.allSettled(batch.map(uploadItem));

    } catch (err) {
      console.error("[Worker] Loop error:", err);
    }

    // small delay between cycles
    await sleep(500);
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// 📩 receive chunk from UI
ctx.onmessage = async (e: MessageEvent) => {
  try {
    const { blob, sessionId, chunkIndex, checksum } = e.data;

    if (!blob || !sessionId || chunkIndex === undefined || !checksum) {
      console.error("[Worker] Invalid message", e.data);
      return;
    }

    const id = `${sessionId}-${chunkIndex}`;

    console.log("[Worker] Received chunk:", id);

    // 1. Save to OPFS (CRITICAL)
    await writeChunk(id, blob);

    // 2. Add to queue
    addToQueue({
      id,
      sessionId,
      chunkIndex,
      checksum,
      retries: 0,
      status: "pending",
    });

    // 3. Start loop (only once)
    loop();

  } catch (err) {
    console.error("[Worker] Message handling error:", err);
  }
};