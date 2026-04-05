// upload.worker.ts

import { addToQueue, getNextBatch } from "../lib/queue";
import { writeChunk } from "../lib/opfs";
import { uploadItem } from "../lib/uploader";

let running = false;

async function loop() {
  if (running) return;
  running = true;

  while (true) {
    const batch = getNextBatch(3);

    await Promise.all(batch.map(uploadItem));

    await sleep(1000);
  }
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

// 📩 receive chunk from UI
self.onmessage = async (e) => {
  const { blob, sessionId, chunkIndex, checksum } = e.data;

  const id = `${sessionId}-${chunkIndex}`;

  // 1. Save to OPFS
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

  // 3. Start loop
  loop();
};

export {};