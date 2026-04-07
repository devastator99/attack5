export async function sha256(buffer: ArrayBuffer | Blob): Promise<string> {
  const arrayBuffer = buffer instanceof Blob 
    ? await buffer.arrayBuffer() 
    : buffer;
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
