# Audio Chunk Ingestion Pipeline

<p align="center">
  <strong>Portfolio-grade, checksum-verified audio chunk ingestion pipeline.</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a> |
  <a href="#features">Features</a> |
  <a href="#tech-stack">Tech Stack</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#getting-started">Getting Started</a> |
  <a href="#api-reference">API Reference</a> |
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img alt="Monorepo" src="https://img.shields.io/badge/monorepo-Turborepo-ef4444">
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-Next.js%2016-111827">
  <img alt="Backend" src="https://img.shields.io/badge/backend-Hono%20%2B%20Bun-0ea5e9">
  <img alt="Database" src="https://img.shields.io/badge/database-PostgreSQL%20%2B%20Drizzle-2563eb">
  <img alt="Storage" src="https://img.shields.io/badge/object%20storage-MinIO%2FS3-f59e0b">
  <img alt="TypeScript" src="https://img.shields.io/badge/language-TypeScript-3178c6">
</p>

## Overview

A production-minded audio recording pipeline with end-to-end checksum validation, idempotent chunk ingestion, and S3-compatible object storage. Built as a monorepo with Turborepo, demonstrating reliability-first backend design and practical product thinking.

## Why This Project

Most recording pipelines fail in subtle ways: dropped chunks, corrupted payloads, duplicated writes, and weak observability during retries. This project is built to make those failure modes explicit and manageable.

## Features

- **Data Integrity**: Server recomputes SHA-256 checksums and rejects tampered/corrupted chunks before acceptance.
- **Idempotent Ingestion**: Deterministic chunk keys (`sessionId-chunkIndex`) prevent duplicate writes.
- **Auditable Processing State**: Chunk rows move through explicit statuses (`pending` → `uploaded`).
- **S3-Compatible Storage**: Works locally with MinIO and ready for cloud deployment (AWS S3, Cloudflare R2).
- **Type-Safe Architecture**: Full TypeScript coverage with Zod validation and typed contracts.
- **Monorepo Structure**: Turborepo keeps frontend, backend, and shared packages synchronized.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Hono (Bun runtime) |
| Database | PostgreSQL with Drizzle ORM |
| Object Storage | MinIO (S3-compatible) |
| Build System | Turborepo |
| Linting | Ultracite, oxlint, oxfmt |

## Architecture

```mermaid
flowchart LR
  A[Recorder UI<br/>Next.js] -->|FormData: file + checksum + metadata| B[/POST /api/upload<br/>Hono API]
  B --> C{SHA-256 matches?}
  C -->|No| D[400 Checksum mismatch]
  C -->|Yes| E[Insert chunk row<br/>status=pending]
  E --> F[Upload binary to MinIO/S3]
  F --> G[Update chunk row<br/>status=uploaded + etag + key]
  G --> H[200 OK]
```

### Repository Layout

```
apps/
  web/        # Next.js frontend (recorder UI)
  server/     # Hono API (Bun runtime)
packages/
  db/         # Drizzle schema + db scripts + docker compose
  env/        # Runtime env validation (zod)
  upload/     # Queue/OPFS/uploader primitives for resilient client upload flows
  ui/         # Shared UI components
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- Bun 1.x (required for `apps/server`)
- Docker (for local PostgreSQL + MinIO via `packages/db/docker-compose.yml`)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create environment files from the example:

```bash
cp .env.example .env
cp .env.example apps/web/.env
cp .env.example apps/server/.env
```

Update the following values in `.env` and `apps/server/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/audio-pipeline
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
BUCKET=chunks
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY=minioadmin
R2_SECRET_KEY=minioadmin
```

### 3. Start Data Services

```bash
npm run db:start
node create-bucket.js
```

Services started:
- PostgreSQL: `localhost:5432`
- MinIO API: `localhost:9000`
- MinIO Console: `http://localhost:9001` (credentials: `minioadmin`/`minioadmin`)

### 4. Run the Application

**Full stack (recommended):**
```bash
npm run dev
```
- Frontend: `http://localhost:3001`
- Backend health: `http://localhost:3000/`

**Run individually:**
```bash
npm run dev:web    # Frontend only
npm run dev:server # Backend only
```

### 5. Verify with Smoke Test

```bash
node test-upload-flow.js
```

## Developer Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start all workspace dev tasks |
| `npm run dev:web` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run build` | Build all packages/apps |
| `npm run check-types` | Type-check all workspaces |
| `npm run check` | Lint/check with Ultracite |
| `npm run fix` | Auto-fix style/lint issues |
| `npm run db:start` | Start Postgres + MinIO containers |
| `npm run db:stop` | Stop containers |
| `npm run db:down` | Stop and remove containers |
| `npm run db:push` | Push schema with drizzle-kit |
| `npm run db:studio` | Open Drizzle Studio |

## API Reference

### POST /api/upload

Uploads an audio chunk with metadata and checksum validation.

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | Blob/File | Audio file data |
| `sessionId` | string | Unique session identifier |
| `chunkIndex` | string/number | Chunk index within session |
| `checksum` | string | SHA-256 hash (hex format) |

**Success Response (200):**
```json
{
  "ok": true,
  "id": "session-1710000000000-0",
  "key": "chunks/session-1710000000000/0.wav",
  "size": 123456
}
```

**Error Responses:**
- `400` - Invalid input or checksum mismatch
- `409` - Duplicate chunk (idempotent protection)
- `500` - Upload failure

### GET /health

Health check endpoint for the backend service.

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Data Model

### chunks table

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key (sessionId-chunkIndex) |
| `sessionId` | string | Session identifier |
| `chunkIndex` | number | Chunk index |
| `checksum` | string | SHA-256 hash |
| `storageKey` | string | S3/MinIO object key |
| `etag` | string | Storage ETag |
| `status` | enum | `pending` → `uploaded` |
| `createdAt` | timestamp | Creation timestamp |

## Reliability Guarantees

- **Integrity First**: Server recomputes SHA-256 and rejects mismatches.
- **Idempotency by Key**: Deterministic chunk IDs prevent duplicate writes.
- **State Traceability**: Database status + storage key/etag provide full auditability.
- **Resilience Primitives**: `packages/upload` includes OPFS queue and retry logic.

## Roadmap

- [x] Chunked recording UI and server upload endpoint
- [x] Server-side checksum validation
- [x] PostgreSQL metadata persistence
- [x] MinIO/S3 chunk storage
- [ ] Wire OPFS + worker queue path into primary recorder flow
- [ ] Add automated integration tests in CI
- [ ] Add observability dashboards (error rate, retry rate, latency percentiles)
- [ ] Add production deployment guide (cloud object storage + managed Postgres)

## Contributing

Contributions are welcome from both first-time and experienced contributors.

### How to Contribute

1. Fork and create a feature branch.
2. Make focused changes with clear commit messages.
3. Run local quality checks:
   - `npm run check-types`
   - `npm run check`
   - `node test-upload-flow.js` (when backend is running)
4. Open a PR with:
   - Problem statement
   - Approach summary
   - Testing notes
   - Screenshots/GIFs for UI changes

### Good First Issues

- Add structured request logging and correlation IDs.
- Improve uploader worker integration in the recorder UI.
- Add retries + dead-letter visibility in dashboard form.
- Expand test coverage for duplicate/chunk-order edge cases.

## Troubleshooting

### `sh: bun: command not found`
Install Bun and retry backend/full-stack commands.

### `NEXT_PUBLIC_SERVER_URL` is invalid/undefined
Ensure `apps/web/.env` exists and includes `NEXT_PUBLIC_SERVER_URL=http://localhost:3000`.

### Port already in use
Stop conflicting processes or use different ports.

### Upload fails with storage errors
Verify MinIO is running and bucket exists:
```bash
npm run db:start
node create-bucket.js
```

## Security Considerations

- Never commit real credentials to `.env` files.
- Use least-privilege keys in non-production environments.
- Review CORS and authentication strategy before internet exposure.

## License

MIT License - See [LICENSE](LICENSE) for details.

---

Built with reliability-first principles for robust audio processing workflows.