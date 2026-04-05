#!/usr/bin/env node
/**
 * Create MinIO bucket for testing
 */

import { Client } from "minio";

const minioClient = new Client({
  endPoint: "localhost",
  port: 9000,
  useSSL: false,
  accessKey: "minioadmin",
  secretKey: "minioadmin",
});

const bucketName = "chunks";

async function createBucket() {
  try {
    console.log(`Checking bucket: ${bucketName}...`);
    
    const exists = await minioClient.bucketExists(bucketName);
    if (exists) {
      console.log("✅ Bucket already exists");
    } else {
      console.log(`Creating bucket: ${bucketName}...`);
      await minioClient.makeBucket(bucketName, "us-east-1");
      console.log("✅ Bucket created successfully");
    }
  } catch (err) {
    console.error("❌ Error with bucket:", err.message);
    process.exit(1);
  }
}

createBucket();
