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

2. **Set up PostgreSQL** (if not already running):
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

**Start all services in watch mode**:
```bash
npm run dev
```

This starts:
- **Web app**: http://localhost:3001 (Next.js dev server)
- **API server**: http://localhost:3000 (Hono server via Bun)

**Or run individually**:
```bash
npm run dev:web      # Next.js only
npm run dev:server   # Hono API only
```

### Database Commands

```bash
# Generate Drizzle migrations
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Push schema changes (dev only)
npm run db:push

# Open Drizzle Studio (visual database editor)
npm run db:studio

# Stop database container
npm run db:stop

# Tear down database
npm run db:down
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

**Key functions** (`client/lib/opfs.ts`):
```typescript
writeChunk(id: string, blob: Blob)        // Store chunk
readChunk(id: string): ArrayBuffer        // Retrieve chunk
deleteChunk(id: string)                   // Remove after upload
listChunks(): Promise<string[]>           // Enumerate stored chunks
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

### Environment Variables

**Production `.env`**:
```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db-host/dbname
NEXT_PUBLIC_SERVER_URL=https://api.example.com
CORS_ORIGIN=https://app.example.com
S3_BUCKET=recording-chunks
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=***
S3_SECRET_ACCESS_KEY=***
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# View PostgreSQL logs
docker logs my-better-t-app-postgres

# Restart database
npm run db:stop && docker-compose up -d

# Reset database
npm run db:down
npm run db:start
npm run db:push
```

### Upload Failures

- **Checksum mismatch**: Verify chunk data integrity before upload
- **Network timeout**: Increase retry timeout or reduce batch size
- **OPFS quota exceeded**: Browser local storage full; delete old sessions
- **CORS error**: Check `CORS_ORIGIN` env var matches client origin

### Performance Issues

- **Slow uploads**: Reduce batch size (default: 3) or chunk size (64KB-1MB)
- **Database lag**: Add indexes to `chunks` table on `sessionId` and `chunkIndex`
- **Memory spike**: Monitor server memory; consider connection pooling for DB

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
