export type QueueItem = {
  id: string;
  sessionId: string;
  chunkIndex: number;
  checksum: string;
  retries: number;
  status: "pending" | "uploading" | "failed";
};

let queue: Map<string, QueueItem> = new Map();

export function addToQueue(item: QueueItem) {
  queue.set(item.id, item);
}

export function getNextBatch(limit = 3): QueueItem[] {
  return [...queue.values()]
    .filter(i => i.status === "pending")
    .slice(0, limit);
}

export function markUploading(id: string) {
  const item = queue.get(id);
  if (item) item.status = "uploading";
}

export function markFailed(id: string) {
  const item = queue.get(id);
  if (item) {
    item.status = "failed";
    item.retries++;
  }
}

export function markDone(id: string) {
  queue.delete(id);
}