// client/lib/uploader.ts

import { readChunk, deleteChunk } from "./opfs";
import { markUploading, markFailed, markDone } from "./queue";

const MAX_RETRIES = 5;

// 🔧 change this depending on setup
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function uploadItem(item: {
  id: string;
  sessionId: string;
  chunkIndex: number;
  checksum: string;
  retries: number;
}) {
  try {
    // 1. mark uploading
    markUploading(item.id);

    // 2. read from OPFS (source of truth)
    const buffer = await readChunk(item.id);

    // 3. build form data
    const form = new FormData();
    form.append("file", new Blob([buffer]));
    form.append("sessionId", item.sessionId);
    form.append("chunkIndex", String(item.chunkIndex));
    form.append("checksum", item.checksum);

    // 4. upload
    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: form,
    });

    // 5. handle non-200
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }

    const data = await res.json();

    // optional: handle duplicate response
    if (data.status === "duplicate") {
      console.warn("Duplicate chunk:", item.id);
    }

    // 6. SUCCESS → delete from OPFS
    await deleteChunk(item.id);

    // 7. remove from queue
    markDone(item.id);

  } catch (err) {
    console.error("Upload error:", item.id, err);

    if (item.retries >= MAX_RETRIES) {
      console.error("Moved to DLQ:", item.id);
      return;
    }

    // 8. retry logic
    markFailed(item.id);

    const delay = (2 ** item.retries + Math.random()) * 1000;
    await sleep(delay);
  }
}