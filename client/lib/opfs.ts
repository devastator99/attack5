export async function getRoot() {
  return await navigator.storage.getDirectory();
}

export async function writeChunk(id: string, blob: Blob) {
  const root = await getRoot();
  const fileHandle = await root.getFileHandle(id, { create: true });

  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function readChunk(id: string): Promise<ArrayBuffer> {
  const root = await getRoot();
  const fileHandle = await root.getFileHandle(id);
  const file = await fileHandle.getFile();
  return await file.arrayBuffer();
}

export async function deleteChunk(id: string) {
  const root = await getRoot();
  await root.removeEntry(id);
}

export async function listChunks(): Promise<string[]> {
  const root = await getRoot();
  const files: string[] = [];

  for await (const entry of (root as any).entries()) {
    files.push(entry[0]);
  }

  return files;
}