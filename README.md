# Reliable Recording Chunking Pipeline

A robust, production-grade chunking system that ensures recording data stays accurate in all cases — **no data loss, no silent failures**. Built as a monorepo with Next.js frontend, Hono backend, and PostgreSQL persistence.

## Overview

This system implements a **durable, fault-tolerant pipeline** for handling large recording uploads by breaking them into manageable chunks. It ensures data integrity through:

- **Client-side persistence** via Origin Private File System (OPFS)
- **Reliable upload tracking** with automatic retries
- **Database acknowledgment** for confirmed chunks
- **Reconciliation logic** to recover from bucket failures

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER CLIENT                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Record & chunk audio/video data                  │  │
│  │ 2. Persist each chunk to OPFS (durable buffer)      │  │
│  │ 3. Queue chunks for upload                          │  │
│  │ 4. Upload in batches with retry logic               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               HONO API SERVER (Bun)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ POST /api/upload                                    │  │
│  │ - Receive chunk                                     │  │
│  │ - Verify checksum                                  │  │
│  │ - Store in S3/MinIO bucket                         │  │
│  │ - Create DB acknowledgment                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
           ┌──────────────┐  ┌──────────────┐
           │ PostgreSQL   │  │ S3/MinIO     │
           │ Database     │  │ Storage      │
           └──────────────┘  └──────────────┘
```

## How It Works

### Flow Details

1. **Client-side chunking** — Recording data is split into chunks in the browser (typically 64KB-1MB per chunk)
2. **OPFS storage** — Each chunk is persisted to the Origin Private File System before any network call, ensuring nothing is lost if the tab closes or network drops
3. **Queue management** — Chunks are added to a local queue with status tracking (pending, uploading, failed)
4. **Batch upload** — Chunks are uploaded to the API server in configurable batches (default: 3 concurrent)
5. **Server verification** — Server validates checksum, stores in S3/MinIO bucket, and writes DB acknowledgment
6. **Reconciliation** — Client can query DB for chunk status; if DB shows ack but bucket is missing the chunk (e.g., due to purge or replication lag), client re-uploads from OPFS

### Data Flow with Recovery

```
Recording Start
    │
    ├─ Create session (sessionId, metadata)
    │
    ├─ For each audio/video chunk:
    │   ├─ Calculate checksum
    │   ├─ Save to OPFS (durable, indexed by chunkId)
    │   ├─ Add to queue {id, sessionId, chunkIndex, checksum, status}
    │   │
    │   └─ Upload when batch ready:
    │       ├─ POST /api/upload with FormData
    │       │   ├─ file (blob)
    │       │   ├─ sessionId
    │       │   ├─ chunkIndex
    │       │   └─ checksum
    │       │
    │       ├─ Server validates & stores
    │       ├─ DB insert: chunks table {chunkId, sessionId, checksum, status}
    │       │
    │       ├─ Success: mark chunk as done, delete from OPFS
    │       └─ Failure (retry < MAX_RETRIES): 
    │           ├─ Exponential backoff
    │           └─ Re-read from OPFS and retry
    │
    └─ Recording Complete
        └─ Verify all chunks acknowledged in DB
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | Next.js 16 (App Router) | Web UI, recording interface, chunk management |
| **Backend** | Hono 4 + Bun | High-performance API server |
| **Database** | PostgreSQL + Drizzle ORM | Chunk metadata, acknowledgments, sessions |
| **Storage** | AWS S3 / MinIO (S3-compatible) | Durable chunk storage |
| **Client Libraries** | Origin Private File System API | Client-side persistent storage |
| **UI Framework** | React 19 + TailwindCSS + shadcn/ui | Component library and styling |
| **Monorepo** | Turborepo | Build orchestration and task caching |
| **Code Quality** | Oxlint + Oxfmt (Ultracite) | Linting and formatting |
| **Runtime** | Bun | Fast JavaScript runtime for backend |

## Project Structure

```
.
├── apps/
│   ├── web/                    # Next.js frontend app (port 3001)
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   │   ├── layout.tsx # Root layout with theme
│   │   │   │   ├── page.tsx   # Home page
│   │   │   │   └── recorder/  # Recording interface
│   │   │   ├── components/    # Reusable UI components
│   │   │   │   ├── header.tsx
│   │   │   │   ├── loader.tsx
│   │   │   │   └── mode-toggle.tsx (dark/light theme)
│   │   │   └── hooks/         # React hooks
│   │   └── package.json
│   │
│   └── server/                 # Hono backend server (port 3000)
│       ├── src/
│       │   ├── index.ts       # Main Hono app setup
│       │   ├── routes/        # API route handlers
│       │   │   └── upload.ts  # POST /api/upload
│       │   └── [other routes]
│       └── package.json
│
├── client/                     # Browser client library (separate from web app)
│   ├── app/                   # Client-side routing
│   ├── lib/
│   │   ├── opfs.ts           # Origin Private File System utilities
│   │   ├── queue.ts          # Queue management (status tracking)
│   │   ├── uploader.ts       # Upload orchestration & retry logic
│   │   └── [other utilities]
│   └── workers/
│       └── upload.worker.ts  # Web Worker for background uploads
│
├── packages/                   # Shared libraries
│   ├── config/               # Shared ESLint, TypeScript, build configs
│   │   └── tsconfig.base.json # Base TypeScript configuration
│   │
│   ├── db/                   # Database layer
│   │   ├── src/
│   │   │   ├── index.ts     # Drizzle client & database exports
│   │   │   └── schema/      # Table schemas (chunks, sessions, etc.)
│   │   ├── drizzle.config.ts
│   │   ├── docker-compose.yml # PostgreSQL development container
│   │   └── package.json
│   │
│   ├── env/                  # Environment variable validation
│   │   ├── src/
│   │   │   ├── server.ts    # Server-side env schema (DATABASE_URL, etc.)
│   │   │   └── web.ts       # Client-side env schema (NEXT_PUBLIC_*)
│   │   └── package.json
│   │
│   └── ui/                   # Component library (shadcn/ui setup)
│       ├── src/
│       │   ├── components/  # UI components (button, card, input, etc.)
│       │   ├── hooks/       # Custom hooks
│       │   ├── lib/         # Utilities (class merge, etc.)
│       │   └── styles/      # Global CSS
│       └── package.json
│
├── server/                    # Alternative server structure (if used)
│   ├── lib/
│   │   ├── checksum.ts      # Chunk validation
│   │   ├── db.ts            # Database client
│   │   └── storage.ts       # S3/bucket operations
│   └── schema/
│       └── chunks.ts         # Schema definitions
│
├── .env                       # Environment variables (root)
├── package.json              # Root package manifest
├── turbo.json                # Turborepo build config
├── tsconfig.json             # TypeScript root config
├── bts.jsonc                 # Build/test settings
└── AGENTS.md                 # Code quality standards (Ultracite)
```

## Getting Started

### Prerequisites

- **Node.js 18+** and **npm 10+**
- **Bun 1.0+** (for backend runtime)
- **PostgreSQL 14+** (or use Docker)
- **Git**

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd Swades-AI-Hackathon
   npm install
   ```

2. **Set up PostgreSQL Database**:

   **Option A: Neon Serverless (Recommended for production & easier setup)**
   - Sign up at https://console.neon.tech (free tier available)
   - Create a new project
   - Copy the connection string (it looks like: `postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require`)
   - Paste it into `.env` as `DATABASE_URL`

   **Option B: Docker (Local development)**
   ```bash
   cd packages/db
   docker-compose up -d
   ```
   This starts PostgreSQL on `localhost:5432` with:
   - Database: `my-better-t-app`
   - User: `postgres`
   - Password: `password`

3. **Configure environment variables**:
   Create or update `.env` in the root directory:

   **For Neon**:
   ```dotenv
   DATABASE_URL=postgresql://user:password@ep-xxxxx.neon.tech/dbname?sslmode=require
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3001
   NODE_ENV=development
   ```

   **For Local Docker PostgreSQL**:
   ```dotenv
   DATABASE_URL=postgresql://postgres:password@localhost:5432/my-better-t-app
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3001
   NODE_ENV=development
   ```

4. **Initialize the database**:
   ```bash
   npm run db:push
   ```
   This applies Drizzle migrations and creates the schema.

### Development

**Important: Database must be accessible before starting development**

**If using Neon:**
- Just ensure `.env` has the correct `DATABASE_URL` from Neon
- No additional setup needed - Neon handles everything

**If using Docker PostgreSQL:**
```bash
# Start PostgreSQL in Docker (from packages/db directory)
npm run db:start

# Wait for database to be ready (~10 seconds)
npm run db:push  # Initialize schema
```

**Start all services in watch mode**:
```bash
npm run dev
```

This starts:
- **Web app**: http://localhost:3001 (Next.js dev server)
- **API server**: http://localhost:3000 (Hono server via Bun)
- Both watch for file changes automatically

**Troubleshooting startup issues**:
```bash
# If port 3000 or 3001 already in use, find and kill processes
lsof -i :3000
lsof -i :3001
kill -9 <PID>

# Or run services individually in separate terminals
npm run dev:web      # Terminal 1: Next.js only
npm run dev:server   # Terminal 2: Hono API only
```

**Verify setup is working**:
```bash
# In another terminal, test the API
curl http://localhost:3000/
# Should return: OK

# Visit web app
open http://localhost:3001
```

### Database Commands

**If using Neon:**
```bash
# Push schema changes (auto-migrates on Neon)
npm run db:push

# View/edit database in Drizzle Studio
npm run db:studio
# Open http://localhost:5555
```

**If using Docker PostgreSQL:**
```bash
# Start PostgreSQL container
npm run db:start

# Stop PostgreSQL container
npm run db:stop

# Push schema changes (dev only, auto-migrates)
npm run db:push

# Generate new Drizzle migrations
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Open Drizzle Studio (visual database editor on port 5555)
npm run db:studio

# Tear down and reset database (removes all data)
npm run db:down
npm run db:start
npm run db:push
```

### Building for Production

```bash
npm run build          # Build all packages
npm run check-types    # Type-check all packages
npm run check          # Lint code (Ultracite)
npm run fix            # Auto-fix code issues
```

Build outputs:
- Web: `.next/` directory
- Server: `dist/` directory (compiled with tsdown)

### Running in Production

**Frontend**:
```bash
cd apps/web
npm run build
npm run start
```

**Backend**:
```bash
cd apps/server
npm run build
npm run start
```

Or use the compiled Bun executable:
```bash
cd apps/server
npm run compile    # Compiles to standalone binary
./server           # Run the binary
```

## API Reference

### Endpoints

#### `POST /api/upload`

Upload a chunk with metadata.

**Request** (FormData):
```
file: Blob                 # Chunk data
sessionId: string          # Recording session ID
chunkIndex: number         # Chunk sequence number
checksum: string           # SHA256 hash of chunk (for verification)
```

**Response** (JSON):
```json
{
  "success": true,
  "chunkId": "ulid-string",
  "message": "Chunk stored"
}
```

**Status Codes**:
- `200` — Chunk accepted and stored
- `400` — Invalid request (missing fields, invalid checksum)
- `409` — Duplicate chunk (already acknowledged)
- `500` — Server error

### Error Handling

The system implements **exponential backoff retry logic** on the client:
- Max retries: 5
- Backoff: exponential (2^attempt × base delay)
- Failure recovery: chunks remain in OPFS for manual re-upload or reconciliation

## Client-Side Architecture

### OPFS (Origin Private File System)

Chunks are stored persistently in OPFS before upload. This ensures data survives:
- Tab closures
- Network interruptions
- Browser crashes
- Page refreshes

**Browser Support**: Chrome/Edge 86+, Firefox 111+, Safari 15.1+

**Key functions** ([client/lib/opfs.ts](client/lib/opfs.ts)):
```typescript
writeChunk(id: string, blob: Blob)        // Store chunk to OPFS
readChunk(id: string): ArrayBuffer        // Retrieve chunk from OPFS
deleteChunk(id: string)                   // Remove chunk after confirmation
listChunks(): Promise<string[]>           // Enumerate all stored chunks
getRoot(): FileSystemDirectoryHandle      // Access OPFS root directory
```

**OPFS API Details**:
- Storage location: Browser's private, isolated storage (not accessible to other origins)
- Quota: Typically 50% of available disk space (varies by browser)
- Performance: High-speed synchronous-like access (actually async but optimized)
- Persistence: Survives browser restarts, cleared only on cache clear

**TypeScript note**: The `FileSystemDirectoryHandle` type from TS lib.dom may not include all OPFS methods. We use type casting `as any` where needed for `.entries()` iteration, which is a valid OPFS API at runtime.

**Example usage**:
```typescript
// Save recording chunk to OPFS
const chunkBlob = new Blob([audioData], { type: 'audio/wav' });
await writeChunk('chunk-123', chunkBlob);

// Later, retrieve and upload
const buffer = await readChunk('chunk-123');
const formData = new FormData();
formData.append('file', new Blob([buffer]));
await fetch('/api/upload', { method: 'POST', body: formData });

// Clean up after confirmation
await deleteChunk('chunk-123');

// List all pending chunks
const chunks = await listChunks();
console.log(`${chunks.length} chunks waiting to upload`);
```

**Capacity monitoring**:
```typescript
// Check available OPFS space (if API available)
if ('storage' in navigator) {
  const estimate = await navigator.storage.estimate();
  const percentUsed = (estimate.usage / estimate.quota) * 100;
  console.log(`OPFS usage: ${percentUsed.toFixed(2)}%`);
}
```

### Queue Management

Local queue tracks upload status and retry logic (`client/lib/queue.ts`):

```typescript
type QueueItem = {
  id: string              // Unique chunk ID
  sessionId: string       // Recording session
  chunkIndex: number      // Sequential index
  checksum: string        // Content hash
  retries: number         // Retry count
  status: "pending" | "uploading" | "failed"
}
```

**Queue functions**:
```typescript
addToQueue(item: QueueItem)           // Add new chunk
getNextBatch(limit: 3): QueueItem[]   // Get pending chunks
markUploading(id: string)             // Update status
markFailed(id: string)                // Mark failed, increment retry
markDone(id: string)                  // Remove after success
```

### Uploader

Handles the upload orchestration with retries (`client/lib/uploader.ts`):

```typescript
uploadItem(item: QueueItem)  // Upload single chunk with retries
```

**Upload flow**:
1. Mark as uploading
2. Read from OPFS
3. Create FormData
4. POST to `/api/upload`
5. Handle response (success or retry)

### Web Worker

Optional background upload worker (`client/workers/upload.worker.ts`) for non-blocking uploads.

## Server-Side Architecture

### Hono API Server

Lightweight, high-performance API built with Hono (`apps/server/src/index.ts`):

```typescript
app.use(logger())              // Request logging
app.use(cors())                // CORS middleware
app.get("/", health check)     // Health endpoint
app.post("/api/upload", handler) // Chunk upload handler
```

### Checksum Validation

(`server/lib/checksum.ts`) — Validates chunk integrity:
```typescript
function validateChecksum(data: Buffer, checksum: string): boolean
```

### Database Integration

(`server/lib/db.ts`) — Drizzle ORM client for PostgreSQL:
```typescript
// Insert chunk acknowledgment
await db.insert(chunks).values({
  chunkId,
  sessionId,
  checksum,
  status: "confirmed",
})
```

### Storage Backend

(`server/lib/storage.ts`) — S3/MinIO integration:
```typescript
putObject(bucket, key, data)           // Store chunk
getObject(bucket, key): Promise<Buffer>// Retrieve chunk
deleteObject(bucket, key)              // Remove chunk
```

## Code Quality Standards

This project uses **Ultracite** (Oxlint + Oxfmt) for strict code quality enforcement. See [AGENTS.md](AGENTS.md) for detailed standards.

### Quick Commands

```bash
npm run check    # Check for lint issues
npm run fix      # Auto-fix issues
```

**Key principles**:
- Type safety: explicit types, avoid `any`
- Modern JS: arrow functions, const/let, async/await
- React best practices: functional components, hooks, keys on lists
- Error handling: meaningful error messages, no silent failures
- Security: rel="noopener", no dangerouslySetInnerHTML, input validation
- Performance: minimal rerenders, optimized dependencies

## Performance & Load Testing

Target: **300,000 requests** validates the chunking pipeline under heavy concurrent load.

### Load Test with k6

Install k6: https://k6.io

Example test (`loadtest.js`):
```javascript
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    chunk_uploads: {
      executor: "constant-arrival-rate",
      rate: 5000,              // 5,000 req/s
      timeUnit: "1s",
      duration: "60s",         // → 300K requests in 60s
      preAllocatedVUs: 500,
      maxVUs: 1000,
    },
  },
};

export default function () {
  const chunkData = new ArrayBuffer(65536); // 64KB chunk
  const payload = new FormData();
  payload.append("file", new Blob([chunkData]));
  payload.append("sessionId", `session-${__VU}`);
  payload.append("chunkIndex", String(__ITER));
  payload.append("checksum", "sha256-hash-here");

  const res = http.post("http://localhost:3000/api/upload", payload);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });
}
```

Run: `k6 run loadtest.js`

### Key Metrics to Monitor

- **Throughput**: Requests per second
- **Latency**: p50, p95, p99 response times
- **Error rate**: Failed uploads vs. total
- **Memory**: Server memory under load
- **DB connections**: Active PostgreSQL connections

## Deployment

### Quick Start with Neon (Recommended)

**For production deployment**:

1. Create a Neon project at https://console.neon.tech (free tier available)
2. Get your production connection string (includes automatic connection pooling)
3. Set `DATABASE_URL` to your Neon connection string in production environment
4. Deploy frontend and backend (see Docker section below)

**Neon handles**:
- Automatic backups and PITR (Point-In-Time Recovery)
- Connection pooling and scaling
- SSL encryption
- Multi-database support
- Free tier: 3 projects, 0.5 GB storage, shared compute

### Docker

**Build backend container**:
```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY . .
RUN bun install --production

EXPOSE 3000
CMD ["bun", "run", "apps/server/src/index.ts"]
```

**Build frontend container**:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

EXPOSE 3001
CMD ["npm", "start", "-w", "apps/web"]
```

**Production deployment with Neon**:
```bash
# Build containers
docker build -f Dockerfile.server -t myapp-server .
docker build -f Dockerfile.web -t myapp-web .

# Set production env (includes Neon connection string)
export DATABASE_URL=postgresql://user:pass@ep-prod.neon.tech/db?sslmode=require
export NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com
export CORS_ORIGIN=https://app.yourdomain.com

# Run containers
docker run -p 3000:3000 -e DATABASE_URL myapp-server
docker run -p 3001:3001 -e NEXT_PUBLIC_SERVER_URL myapp-web
```

### Configuration

Create a `.env` file in the root directory with the following variables:

**Using Neon Serverless (Recommended)**:
```dotenv
# Get this from https://console.neon.tech
# Format: postgresql://username:password@endpoint.neon.tech/dbname?sslmode=require
DATABASE_URL=postgresql://user:password@ep-xxxxx.neon.tech/my-better-t-app?sslmode=require

# Frontend server (what the backend expects)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# CORS origin (what frontend origin is allowed)
CORS_ORIGIN=http://localhost:3001

# Environment (development, production, test)
NODE_ENV=development

# Optional: S3/MinIO configuration
S3_BUCKET=recording-chunks
S3_REGION=us-east-1
```

**Using Local Docker PostgreSQL**:
```dotenv
# Local PostgreSQL connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/my-better-t-app

# Frontend server
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# CORS origin
CORS_ORIGIN=http://localhost:3001

# Environment
NODE_ENV=development
```

**Key variables explained**:

| Variable | Where It's Used | Example | Required |
|----------|------------------|---------|----------|
| `DATABASE_URL` | Backend (apps/server) | `postgresql://...` or Neon URL | Yes |
| `NEXT_PUBLIC_SERVER_URL` | Frontend (apps/web) | `http://localhost:3000` | Yes |
| `CORS_ORIGIN` | Backend API CORS config | `http://localhost:3001` | Yes |
| `NODE_ENV` | Build/runtime environment | `development` | No (default: development) |
| `S3_*` | Backend storage | MinIO/AWS credentials | Only if using S3/MinIO |

**Neon-specific notes**:
- Free tier includes: 3 projects, 0.5 GB storage, shared compute
- Connection pooling is built-in on Neon
- Use `sslmode=require` in connection string for security
- Automatic backups included

## Troubleshooting

### Database Connection Issues

**Problem: `connect ECONNREFUSED 127.0.0.1:5432` (Neon)**
```bash
# Verify DATABASE_URL is set correctly
echo $DATABASE_URL
# Should start with: postgresql://

# Check Neon connection string format
# Must include: ?sslmode=require at the end
# Example: postgresql://user:pass@ep-xxxxx.neon.tech/dbname?sslmode=require

# Verify credentials in https://console.neon.tech/app/projects
# Copy connection string again if needed
```

**Problem: `connect ECONNREFUSED 127.0.0.1:5432` (Docker PostgreSQL)**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start the database container
npm run db:start

# Wait a few seconds for startup, then try again
sleep 5
npm run db:push
```

**Problem: Neon connection string includes database that doesn't exist**
```bash
# Verify database name in connection string
# Format: ...@ep-xxxxx.neon.tech/dbname?sslmode=require
#                                 ^^^^^^

# If wrong, update .env and retry:
# DATABASE_URL=postgresql://user:pass@ep-xxxxx.neon.tech/correct-dbname?sslmode=require
```

**Problem: "SSL validation failed" with Neon**
- Ensure connection string includes `?sslmode=require`
- Some network environments require additional SSL configuration
- Solution: Add to connection string: `&sslmode=require`

**Problem: Database already exists or migration conflicts**
```bash
# Reset using Drizzle Studio
npm run db:studio
# Use UI to delete tables and reset

# Or with Docker PostgreSQL, completely reset
npm run db:down
npm run db:start
npm run db:push
```

**Problem: Port 5432 already in use (Docker only)**
```bash
# Find what's using the port
lsof -i :5432

# Stop that process or use a different port
DATABASE_URL=postgresql://user:pass@localhost:5433/db npm run db:push
```

### Development Server Issues

**Problem: Port 3000 or 3001 already in use**
```bash
# Find processes using the ports
lsof -i :3000
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or let npm pick a different port
PORT=3002 npm run dev:web
```

**Problem: `npm run dev` exits with code 1**
```bash
# Check for environment variable issues
cat .env

# Verify all required env vars are set
echo $DATABASE_URL
echo $NEXT_PUBLIC_SERVER_URL
echo $CORS_ORIGIN

# Try running with explicit env file
node -r dotenv/config apps/web/next.config.ts
```

**Problem: Module not found or TypeScript errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Rebuild TypeScript
npm run check-types

# Fix code issues automatically
npm run fix
```

### OPFS-Related Issues

**Problem: "OPFS not available" or undefined navigator.storage**
- OPFS requires a secure context (HTTPS or localhost)
- Not available in all browsers yet (check browser support above)
- Solution: Use a modern browser (Chrome 86+, Firefox 111+, Safari 15.1+)

**Problem: "QuotaExceededError" when writing chunks**
```typescript
// Check available space before recording
const estimate = await navigator.storage.estimate();
if (estimate.usage > estimate.quota * 0.9) {
  console.warn('OPFS nearly full, consider clearing old recordings');
  // Clear old sessions from OPFS
  const chunks = await listChunks();
  for (const chunk of chunks) {
    await deleteChunk(chunk);
  }
}
```

**Problem: TypeScript errors with FileSystemDirectoryHandle**
- The browser's OPFS API may have methods not reflected in TypeScript lib.dom types
- Solution: Use type casting `(obj as any).methodName()` for advanced OPFS methods
- See [client/lib/opfs.ts](client/lib/opfs.ts) for examples

### Upload/API Issues

**Problem: 404 on `/api/upload`**
```bash
# Ensure backend is running on port 3000
curl http://localhost:3000/
# Should return: OK

# Check API server logs
npm run dev:server
# Look for "Listening on" message
```

**Problem: CORS errors on chunk upload**
```bash
# Verify CORS_ORIGIN env var matches client origin
echo $CORS_ORIGIN

# Should match the web app origin (e.g., http://localhost:3001)
# Update in .env if needed and restart server
```

**Problem: Checksum validation failures**
- Chunk may be corrupted during upload
- Solution: Check network stability, reduce batch size (in [client/lib/uploader.ts](client/lib/uploader.ts))
- Inspect failed chunks in browser DevTools → Application → OPFS

### Performance Issues

**Problem: Slow uploads**
```bash
# Check network (DevTools Network tab)
# Check server logs for processing time
# Reduce batch size in client/lib/queue.ts from 3 to 1

# Monitor database connections
npm run db:studio
# View active queries and connections
```

**Problem: High memory usage on server**
```bash
# Monitor process
top -p $(pgrep -f 'bun.*index.ts')

# Check for connection leaks in database client
# Ensure connections are properly closed in handlers
```

**Problem: Database connection pool exhausted**
```bash
# Restart server (will close all connections)
npm run dev:server

# Or check active connections in Drizzle Studio
npm run db:studio
```

### Development Workflow

**Best practices for smooth development**:

1. **Always start database first**:
   ```bash
   npm run db:start
   npm run db:push  # Ensure schema is current
   ```

2. **Run services in separate terminals**:
   ```bash
   # Terminal 1: Frontend
   npm run dev:web
   
   # Terminal 2: Backend
   npm run dev:server
   
   # Terminal 3: Optional - database UI
   npm run db:studio
   ```

3. **Check code before committing**:
   ```bash
   npm run check-types   # TypeScript errors
   npm run check         # Lint errors
   npm run fix           # Auto-fix issues
   ```

4. **Use DevTools for debugging**:
   - **Application tab**: Inspect OPFS storage
   - **Network tab**: Monitor API calls and response times
   - **Console**: Check for JavaScript errors
   - **Performance tab**: Profile rendering and network

5. **Monitor database state**:
   ```bash
   npm run db:studio
   # Open http://localhost:5555 for visual editing

## Contributing

Follow the **Ultracite code standards** defined in [AGENTS.md](AGENTS.md):

1. Run `npm run check` before committing
2. Auto-fix issues: `npm run fix`
3. Type-check: `npm run check-types`
4. Write tests for critical paths

## License

See LICENSE file for details.

## Load Testing

Target: **300,000 requests** to validate the chunking pipeline under heavy load.

### Setup

Use a load testing tool like [k6](https://k6.io), [autocannon](https://github.com/mcollina/autocannon), or [artillery](https://artillery.io) to simulate concurrent chunk uploads.

Example with **k6**:

```js
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    chunk_uploads: {
      executor: "constant-arrival-rate",
      rate: 5000,           // 5,000 req/s
      timeUnit: "1s",
      duration: "1m",       // → 300K requests in 60s
      preAllocatedVUs: 500,
      maxVUs: 1000,
    },
  },
};

export default function () {
  const payload = JSON.stringify({
    chunkId: `chunk-${__VU}-${__ITER}`,
    data: "x".repeat(1024), // 1KB dummy chunk
  });

  const res = http.post("http://localhost:3000/api/chunks/upload", payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "status 200": (r) => r.status === 200,
  });
}
```

Run:

```bash
k6 run load-test.js
```

### What to Validate

- **No data loss** — every ack in the DB has a matching chunk in the bucket
- **OPFS recovery** — chunks survive client disconnects and can be re-uploaded
- **Throughput** — server handles sustained 5K req/s without dropping chunks
- **Consistency** — reconciliation catches and repairs any bucket/DB mismatches after the run

## Project Structure

```
recoding-assignment/
├── apps/
│   ├── web/         # Frontend (Next.js) — chunking, OPFS, upload logic
│   └── server/      # Backend API (Hono) — bucket upload, DB ack
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── db/          # Drizzle ORM schema & queries
│   ├── env/         # Type-safe environment config
│   └── config/      # Shared TypeScript config
```

## Available Scripts

- `npm run dev` — Start all apps in development mode
- `npm run build` — Build all apps
- `npm run dev:web` — Start only the web app
- `npm run dev:server` — Start only the server
- `npm run check-types` — TypeScript type checking
- `npm run db:push` — Push schema changes to database
- `npm run db:generate` — Generate database client/types
- `npm run db:migrate` — Run database migrations
- `npm run db:studio` — Open database studio UI
