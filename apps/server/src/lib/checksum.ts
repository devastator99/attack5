// lib/checksum.ts
import crypto from "crypto";

export async function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}