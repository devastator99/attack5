# Quick Reference Guide

Fast lookup for common tasks and commands.

## URLs & Ports

| Service | URL | Port |
|---------|-----|------|
| **Frontend Web** | http://localhost:3001 | 3001 |
| **Backend API** | http://localhost:3000 | 3000 |
| **MinIO Console** | http://localhost:9000/minio/ | 9000 |
| **Drizzle Studio** | http://localhost:5555 | 5555 |

**Credentials**:
- MinIO: `minioadmin` / `minioadmin`

---

## Essential Commands

### Start Development

```bash
npm run dev                # Start all (frontend + backend)
npm run dev:web           # Frontend only (Next.js)
npm run dev:server        # Backend only (Hono/Bun)
npm run db:studio         # Database UI (Drizzle)
```

### Database

```bash
npm run db:push           # Initialize/update schema
npm run db:start          # Start Docker PostgreSQL
npm run db:stop           # Stop Docker PostgreSQL
npm run db:down           # Remove containers & data
```

### Code Quality

```bash
npm run check             # Lint & type check
npm run fix               # Auto-fix issues
npm run check-types       # TypeScript only
npm run build             # Build all packages
```

### Testing

```bash
node test-upload-flow.js  # Run automated tests
curl http://localhost:3000/  # Test backend health
```

---

## Directory Structure

```
apps/
├── web/                   → Frontend (Next.js, port 3001)
└── server/                → Backend (Hono, port 3000)

packages/
├── db/                    → Database (PostgreSQL + Drizzle)
├── ui/                    → UI components (shadcn/ui)
├── env/                   → Environment validation
└── config/                → Build configs

client/
├── lib/
│   ├── opfs.ts           → OPFS persistence
│   ├── queue.ts          → Upload queue
│   └── uploader.ts       → Upload orchestration
└── workers/
    └── upload.worker.ts  → Background upload worker
```

---

## Environment Variables

Create `.env` in root:

```dotenv
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Servers
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001

# Storage (MinIO/S3)
BUCKET=chunks
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY=minioadmin
R2_SECRET_KEY=minioadmin
```

---

## Troubleshooting

### Port in Use
```bash
lsof -i :3000           # Find process on port 3000
kill -9 <PID>          # Kill the process
```

### Database Connection Failed
```bash
# Verify connection string
echo $DATABASE_URL

# For Docker PostgreSQL, ensure it's running
npm run db:start
npm run db:push
```

### Module Not Found
```bash
rm -rf node_modules
npm install
npm run check-types
```

### Frontend Can't Connect to Backend
```bash
# Verify backend is running
curl http://localhost:3000/

# Check .env has correct URLs
grep NEXT_PUBLIC_SERVER_URL .env
grep CORS_ORIGIN .env
```

---

## API Endpoints

### POST /api/upload

Upload a recording chunk.

**Request** (FormData):
```
file: Blob          # Chunk data
sessionId: string   # Session ID
chunkIndex: number  # Chunk index (0, 1, 2...)
checksum: string    # SHA256 hash
```

**Response Success** (200):
```json
{
  "ok": true,
  "id": "sessionId-chunkIndex",
  "key": "chunks/sessionId/chunkIndex.wav",
  "size": 262144
}
```

**Response Error** (400):
```json
{
  "error": "Checksum mismatch",
  "expected": "...",
  "computed": "..."
}
```

**Response Duplicate** (409):
```json
{
  "status": "duplicate",
  "id": "sessionId-0"
}
```

---

## Testing Workflow

### 1. Start Services
```bash
npm run dev
```

### 2. In Another Terminal, Test
```bash
# Test backend health
curl http://localhost:3000/

# Run automated tests
node test-upload-flow.js

# Test single upload
dd if=/dev/urandom of=/tmp/test.bin bs=1024 count=256
CHECKSUM=$(sha256sum /tmp/test.bin | awk '{print $1}')
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/tmp/test.bin" \
  -F "sessionId=test-1" \
  -F "chunkIndex=0" \
  -F "checksum=$CHECKSUM"
```

### 3. Verify Results
- Check MinIO: http://localhost:9000/minio/
- Check Database: http://localhost:5555
- Check Frontend: http://localhost:3001

---

## File Paths Reference

| Component | Path |
|-----------|------|
| Frontend app | `apps/web/src/app/` |
| Backend API | `apps/server/src/routes/upload.ts` |
| Database schema | `packages/db/src/schema/index.ts` |
| Client OPFS | `client/lib/opfs.ts` |
| Client uploader | `client/lib/uploader.ts` |
| Env validation | `packages/env/src/server.ts` |

---

## Performance Tips

### Local Development
1. Use Docker PostgreSQL for 10-50x faster queries
2. Run backend and frontend in separate terminals for easier debugging
3. Use `npm run check` frequently to catch errors early
4. Keep dev server running - watch mode catches changes automatically

### Production Optimization
1. Replace MinIO with AWS S3
2. Add connection pooling to database
3. Deploy multiple backend instances behind load balancer
4. Enable compression for API responses
5. Use CDN for static assets

---

## Common Workflows

### Record and Upload (Manual)
```
1. Open http://localhost:3001/recorder
2. Click "Record"
3. Speak for 5-10 seconds
4. Click "Stop"
5. Chunks appear in list
6. Click "Upload"
7. Wait for completion
8. Check MinIO console for files
```

### Add New API Endpoint
```
1. Create new route in apps/server/src/routes/
2. Import in apps/server/src/index.ts
3. Register with app.route()
4. Test with curl
5. Check server logs
```

### Update Database Schema
```
1. Edit packages/db/src/schema/index.ts
2. Run: npm run db:push
3. Verify in Drizzle Studio (http://localhost:5555)
4. Backend will automatically use new schema
```

### Debug Upload Issue
```
1. Check server logs: npm run dev:server
2. Check browser console: DevTools → Console
3. Check database: npm run db:studio
4. Check MinIO: http://localhost:9000/minio/
5. Check network requests: DevTools → Network
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `.env` | Environment configuration |
| `package.json` | Project dependencies & scripts |
| `turbo.json` | Monorepo build orchestration |
| `apps/server/src/index.ts` | Backend server setup |
| `apps/web/src/app/page.tsx` | Frontend home page |
| `packages/db/src/schema/index.ts` | Database schema |
| `client/lib/uploader.ts` | Upload logic |

---

## Useful Commands Cheatsheet

```bash
# Status checks
curl http://localhost:3000/        # Backend health
npm run check-types               # Type errors
npm run check                     # All issues

# Database
npm run db:push                   # Apply schema
npm run db:studio                 # Open UI
npm run db:start                  # Start Docker
npm run db:stop                   # Stop Docker

# Development
npm run dev                       # Start all
npm run fix                       # Fix code
npm run build                     # Build all

# Testing
node test-upload-flow.js          # Test pipeline
curl -X POST http://localhost:3000/api/upload ... # Manual test

# Debugging
tail -f /tmp/server.log          # Server logs
tail -f /tmp/web.log             # Frontend logs
npm run dev:server               # Run backend with logs
npm run dev:web                  # Run frontend with logs
```

---

## Learning Resources

- **Setup Guide**: [SETUP.md](SETUP.md)
- **Upload Flow**: [UPLOAD_FLOW_TEST.md](UPLOAD_FLOW_TEST.md)  
- **Test Results**: [TEST_RESULTS.md](TEST_RESULTS.md)
- **Architecture**: [README.md](README.md)
- **Code Standards**: [AGENTS.md](AGENTS.md)

---

## Getting Help

1. **Check logs**: `npm run dev:server` shows detailed error messages
2. **Read docs**: See references above
3. **Database issues**: Open Drizzle Studio `npm run db:studio`
4. **Storage issues**: Check MinIO at http://localhost:9000/minio/
5. **Network issues**: Check browser DevTools Network tab

---

**Last Updated**: April 5, 2026

