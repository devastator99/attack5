import { readChunk, deleteChunk } from "./opfs";
import { markUploading, markFailed, markDone } from "./queue";

const MAX_RETRIES = 5;

declare const process: { env?: { NEXT_PUBLIC_API_URL?: string } };
const API_URL = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : "http://localhost:3000";

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
    markUploading(item.id);

    const buffer = await readChunk(item.id);

    const form = new FormData();
    form.append("file", new Blob([buffer]));
    form.append("sessionId", item.sessionId);
    form.append("chunkIndex", String(item.chunkIndex));
    form.append("checksum", item.checksum);

    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }

    const data = (await res.json()) as { status?: string };

    if (data.status === "duplicate") {
      console.warn("Duplicate chunk:", item.id);
    }

    await deleteChunk(item.id);

    markDone(item.id);

  } catch (err) {
    console.error("Upload error:", item.id, err);

    if (item.retries >= MAX_RETRIES) {
      console.error("Moved to DLQ:", item.id);
      return;
    }

    markFailed(item.id);

    const delay = (2 ** item.retries + Math.random()) * 1000;
    await sleep(delay);
  }
}