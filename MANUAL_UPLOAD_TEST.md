# Manual Upload Flow Testing - Browser Guide

Complete end-to-end test of the upload flow using the browser UI.

## Prerequisites

- ✅ Backend server running on http://localhost:3000
- ✅ Frontend running on http://localhost:3001
- ✅ Database schema created (chunks table)
- ✅ MinIO storage running on http://localhost:9000

## Step-by-Step Test

### 1. Open Recorder Page

Navigate to: **http://localhost:3001/recorder**

Expected to see:
- Record button
- Pause/Resume buttons
- Stop button
- List area for chunks
- Upload button

### 2. Record Audio

1. Click the **Record** button (🎤)
2. Speak or play audio through your microphone
3. Continue for **5-10 seconds**
4. Chunks should appear in the list as they're recorded

Each chunk should display:
- Chunk number (#1, #2, etc.)
- Duration (e.g., "5.0s")
- Format label (16kHz PCM)
- Play button to preview
- Download button

### 3. Verify OPFS Storage

While recording, chunks are saved to Origin Private File System (OPFS):

1. Open **DevTools** (F12 or Cmd+Option+I)
2. Go to **Application** tab
3. Expand **Local Storage** → **Storage** 
4. Look for OPFS entries (or use **File System** section)
5. Should see chunk files being created

### 4. Upload Chunks

Once you have 2-3 chunks recorded:

1. Click the **Upload** button
2. You should see upload progress:
   - Button becomes disabled
   - Status indicator shows uploading
   - Each chunk uploads with checksum verification

Wait for all chunks to complete (typically 30-60 seconds for 3 chunks).

### 5. Verify Successful Upload

After upload completes:

1. **Browser UI**: 
   - Upload button should re-enable
   - Chunks may show success indicator
   - OPFS should be cleaned up

2. **Database** (verify chunks were persisted):
   ```bash
   psql $DATABASE_URL
   SELECT id, sessionId, status FROM chunks ORDER BY createdAt DESC LIMIT 5;
   ```
   Should see entries like:
   ```
   id                    | sessionId   | status
   --------------------------------------------------
   session-id-0          | session-id  | uploaded
   session-id-1          | session-id  | uploaded
   session-id-2          | session-id  | uploaded
   ```

3. **MinIO Storage** (verify files were persisted):
   - Open http://localhost:9000/minio/
   - Login: `minioadmin` / `minioadmin`
   - Navigate to **chunks** bucket
   - Should see folder structure:
     ```
     chunks/
     └─ {sessionId}/
        ├─ 0.wav
        ├─ 1.wav
        └─ 2.wav
     ```

4. **Server Logs** (verify processing):
   ```bash
   tail -f /tmp/server.log | grep Upload
   ```
   Should see output like:
   ```
   [Upload] Starting upload request
   [Upload] Checksum verified in 0ms
   [Upload] DB insert successful - 200ms
   [Upload] S3 upload successful - 30ms
   [Upload] Total time: 230ms
   ```

---

## Test Scenarios

### Scenario 1: Normal Upload Flow ✅

**Expected**: All chunks upload successfully

1. Record 3-5 chunks
2. Click upload
3. All chunks shown as uploaded
4. Verified in DB and storage

### Scenario 2: Retry on Failure

**To test**:
1. Stop MinIO/storage temporarily during upload
2. Upload should fail with retry logic
3. Restart storage
4. Upload should retry and succeed

### Scenario 3: Large Recording

**To test**:
1. Record for 30+ seconds (creates 6+ chunks)
2. Upload all chunks
3. Verify none are lost
4. Check total size in storage

### Scenario 4: Page Refresh

**To test**:
1. Record some chunks
2. Refresh the page (Cmd+R)
3. OPFS chunks should persist
4. UI should show chunks after refresh
5. Still able to upload

### Scenario 5: Concurrent Sessions

**To test**:
1. Open two browser tabs to /recorder
2. Record in both tabs simultaneously
3. Upload from both tabs
4. Verify both sessions' chunks are separate in DB

---

## Expected Performance

| Operation | Time |
|-----------|------|
| Record 1 chunk (5s) | Real-time |
| Save to OPFS | < 100ms |
| Calculate checksum | < 10ms |
| Upload 1 chunk (256KB) | 1-2.5s |
| Database insert | 200-2000ms |
| S3 storage write | 20-50ms |
| **Total upload 3 chunks** | 3-8s |

---

## Troubleshooting

### Issue: Can't access http://localhost:3001

**Solution**: Check if frontend is running
```bash
ps aux | grep -E "next|npm" | grep -v grep
npm run dev:web
```

### Issue: Chunks won't upload

**Solution**: 
1. Check backend is running: `curl http://localhost:3000/`
2. Check database schema: `psql $DATABASE_URL -c "\dt chunks"`
3. Check MinIO: `curl http://localhost:9000/`
4. Check server logs: `tail -f /tmp/server.log`

### Issue: Upload succeeds but data not in DB

**Solution**:
1. Check database connection: `psql $DATABASE_URL`
2. Verify schema: `SELECT * FROM chunks;`
3. Check server error logs

### Issue: OPFS not cleaning up after upload

**Solution**: This is normal if upload completes. Manual cleanup:
```javascript
// In browser console
await navigator.storage.getDirectory()
  .then(root => root.removeEntry('chunk-id', { recursive: true }))
```

### Issue: Files in storage but not in DB

**Solution**:
1. Database insert may have failed
2. Check database connectivity
3. Check server logs for errors
4. Verify DATABASE_URL environment variable

---

## Advanced Testing

### Monitor Network Traffic

1. Open DevTools → **Network** tab
2. Record upload
3. Filter for POST requests
4. Click on `/api/upload` requests
5. Inspect FormData headers and payload

### Monitor Database Queries

Enable Drizzle ORM logging:
```bash
# Set in server code or environment
DEBUG=drizzle:* npm run dev:server
```

### Monitor Storage Operations

MinIO Admin:
1. Open http://localhost:9000/
2. Use S3 browser to monitor uploads in real-time
3. Check object metadata and ETags

---

## Success Criteria

Test is successful when all of the following are true:

✅ Recording works - chunks are created  
✅ OPFS storage works - chunks persist  
✅ Upload initiated - button triggers requests  
✅ Server accepts - receives POST and validates  
✅ Database persists - chunks table has records  
✅ Storage persists - MinIO bucket has files  
✅ Cleanup works - OPFS cleaned up after upload  
✅ No errors - console and server logs show no errors  
✅ Status accurate - all chunks marked as "uploaded"  

---

## Notes

- Each browser tab gets a unique session ID (browser timestamp-based)
- Chunks are indexed sequentially (0, 1, 2, ...)
- Checksums are SHA256 hashes of the actual file content
- Files stored as `.wav` regardless of original audio format
- Database keeps record even after successful upload (for audit trail)
- OPFS is cleaned up after confirmed successful upload

