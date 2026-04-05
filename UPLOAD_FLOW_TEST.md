# Upload Flow Testing Guide

## Overview
This document outlines how to test the complete upload flow for the Reliable Recording Chunking Pipeline.

## Architecture

```
Browser (Client)
  ├─ Record audio/video data
  ├─ Split into chunks
  ├─ Persist chunks to OPFS (Origin Private File System)
  ├─ Calculate SHA256 checksum for each chunk
  └─ Upload chunks to server
         │
         ▼
    Hono API Server (Backend)
         │
         ├─ Receive FormData with:
         │   ├─ file (blob)
         │   ├─ sessionId
         │   ├─ chunkIndex
         │   └─ checksum
         │
         ├─ Verify checksum
         ├─ Store in MinIO/S3 bucket
         ├─ Insert/Update PostgreSQL database
         └─ Return response
         │
         ├─ PostgreSQL (DB)
         │   └─ Stores chunk metadata: id, sessionId, chunkIndex, checksum, storageKey, status
         │
         └─ MinIO/S3 Storage
             └─ Stores actual chunk files
```

## Component Breakdown

### 1. **Client-side (Browser)**

**Location**: [apps/web/src/app/recorder/page.tsx](apps/web/src/app/recorder/page.tsx)

- Uses `useRecorder` hook to capture audio chunks
- Each chunk is saved to OPFS using [client/lib/opfs.ts](client/lib/opfs.ts)
- Queue is managed via [client/lib/queue.ts](client/lib/queue.ts)
- Uploads are orchestrated by [client/lib/uploader.ts](client/lib/uploader.ts)

**Key Functions**:
- `saveChunk(id, buffer)` - Saves chunk to OPFS
- `uploadItem(item)` - Uploads single chunk with retry logic
- `markUploading(id)` - Updates queue status
- `markDone(id)` - Marks chunk as successfully uploaded

### 2. **Server-side (Backend)**

**Location**: [apps/server/src/routes/upload.ts](apps/server/src/routes/upload.ts)

**Endpoint**: `POST /api/upload`

**Request Format**:
```
FormData {
  file: Blob,           // The actual chunk data
  sessionId: string,    // Unique session identifier
  chunkIndex: string,   // Chunk index (0, 1, 2, ...)
  checksum: string      // SHA256 hash of file
}
```

**Flow**:
1. Extract and validate all fields from FormData
2. Calculate SHA256 of file buffer
3. Compare against provided checksum (fail if mismatch)
4. Insert into PostgreSQL `chunks` table with `status = "pending"`
5. Upload file to MinIO/S3 bucket at `chunks/{sessionId}/{chunkIndex}.wav`
6. Update PostgreSQL with storage metadata and `status = "uploaded"`
7. Return success response with `{ ok: true, id, key, size }`

### 3. **Database Schema**

**Location**: [packages/db/src/schema/index.ts](packages/db/src/schema/index.ts)

**Chunks Table**:
```sql
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,           -- "{sessionId}-{chunkIndex}"
  sessionId TEXT NOT NULL,
  chunkIndex INTEGER NOT NULL,
  checksum TEXT NOT NULL,        -- SHA256 hash
  status TEXT DEFAULT 'pending', -- pending | uploaded | error
  storageKey TEXT,               -- S3/MinIO key
  etag TEXT,                     -- S3 ETag
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### 4. **Storage (MinIO/S3)**

**Endpoint**: `http://localhost:9000` (MinIO)

**Access**: 
- Username: `minioadmin`
- Password: `minioadmin`

**Bucket**: `chunks`

**Path Format**: `chunks/{sessionId}/{chunkIndex}.wav`

## Testing Checklist

### Phase 1: Setup
- [ ] PostgreSQL database is running and accessible
- [ ] MinIO S3-compatible storage is running
- [ ] Environment variables are configured (.env file)
- [ ] All dependencies installed (`npm install`)

### Phase 2: Start Services
- [ ] Start backend server: `npm run dev:server`
- [ ] Start frontend: `npm run dev:web`
- [ ] Verify backend is running: `curl http://localhost:3000/`
- [ ] Verify frontend is running: `curl http://localhost:3001/`

### Phase 3: Test Recording
- [ ] Open browser to `http://localhost:3001/recorder`
- [ ] Click "Record" button
- [ ] Speak or play audio for ~5-10 seconds
- [ ] Chunks should appear in the list
- [ ] Each chunk should show duration and format

### Phase 4: Test Upload
- [ ] Click "Upload" button
- [ ] Monitor upload progress (should see status changes)
- [ ] Check for any error messages

### Phase 5: Verify Results
- [ ] Check PostgreSQL for new chunk records
- [ ] Check MinIO bucket for stored files
- [ ] Verify OPFS is cleaned up after successful upload
- [ ] Check browser console for any errors

## Manual Testing Commands

### Check Database
```bash
# Connect to PostgreSQL
psql postgresql://neondb_owner:npg_7buoyYCtdLB0@ep-summer-firefly-an7jv8hk.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require

# Check chunks table
SELECT id, sessionId, chunkIndex, status, storageKey FROM chunks ORDER BY createdAt DESC LIMIT 10;
```

### Check MinIO Storage
```bash
# Open MinIO console: http://localhost:9000/minio/
# Login with minioadmin/minioadmin
# Navigate to "chunks" bucket
# Should see folders like: chunks/{sessionId}/{chunkIndex}.wav
```

### Test Upload Endpoint Directly
```bash
# Create a test chunk
echo "test audio data" > test-chunk.bin

# Calculate checksum
CHECKSUM=$(sha256sum test-chunk.bin | cut -d' ' -f1)

# Upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-chunk.bin" \
  -F "sessionId=test-session-001" \
  -F "chunkIndex=0" \
  -F "checksum=$CHECKSUM"

# Expected response:
# {"ok":true,"id":"test-session-001-0","key":"chunks/test-session-001/0.wav","size":15}
```

## Expected Error Scenarios

### 1. Checksum Mismatch
**Request**: Upload with wrong checksum
**Response**: `400 { error: "Checksum mismatch", expected: "...", computed: "..." }`

### 2. Duplicate Chunk
**Request**: Upload same chunk twice
**Response**: `409 { status: "duplicate", id: "..." }`

### 3. Invalid Input
**Request**: Missing required fields
**Response**: `400 { error: "Invalid input" }`

### 4. Storage Failure
**Request**: MinIO not running or bucket missing
**Response**: `500 { error: "Upload failed", details: "..." }`

## Success Flow Summary

1. **Client Records Audio** → chunks created in real-time
2. **Client Persists to OPFS** → survives page reload
3. **Client Queues Chunks** → ready for upload
4. **Client Calculates Checksums** → integrity verification
5. **Client Uploads Batch** → parallel upload with retry
6. **Server Validates Checksum** → data integrity check
7. **Server Stores in S3/MinIO** → durable storage
8. **Server Inserts DB Record** → metadata tracking
9. **Client Marks Complete** → removes from queue and OPFS
10. **Client Cleans Up** → ready for next recording

## Troubleshooting

### "Port 3000/3001 in use"
```bash
# Kill processes
killall -9 node npm bun next
```

### "Cannot connect to database"
Check DATABASE_URL in .env and ensure Neon PostgreSQL is accessible

### "MinIO bucket not found"
```bash
# Check MinIO status
curl http://localhost:9000/
# If not running, start with docker-compose
cd packages/db && docker-compose up -d
```

### "Checksum mismatch"
- Verify SHA256 calculation matches both client and server
- Check that file isn't corrupted during transfer

### "Upload succeeds but not in DB"
- Check server logs for errors
- Verify database connection is working
- Check PostgreSQL `chunks` table

## Next Steps

1. Run the test suite (if available)
2. Monitor browser console during upload
3. Check server logs for detailed information
4. Verify all three components (browser, server, DB, storage)

