// lib/storage.ts
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@my-better-t-app/env/server";

export const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY,
    secretAccessKey: env.R2_SECRET_KEY,
  },
});