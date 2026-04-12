# my-better-t-app

<p align="center">
  <strong>Portfolio-grade, checksum-verified audio chunk ingestion pipeline.</strong>
</p>

<p align="center">
  <a href="#hiring-snapshot">Hiring Snapshot</a> |
  <a href="#engineering-highlights">Engineering Highlights</a> |
  <a href="#quickstart">Quickstart</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#api-contract">API Contract</a> |
  <a href="#contributing">Contributing</a> |
  <a href="#roadmap">Roadmap</a>
</p>

<p align="center">
  <img alt="Monorepo" src="https://img.shields.io/badge/monorepo-Turborepo-ef4444">
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-Next.js%2016-111827">
  <img alt="Backend" src="https://img.shields.io/badge/backend-Hono%20%2B%20Bun-0ea5e9">
  <img alt="Database" src="https://img.shields.io/badge/database-PostgreSQL%20%2B%20Drizzle-2563eb">
  <img alt="Storage" src="https://img.shields.io/badge/object%20storage-MinIO%20%2F%20S3-f59e0b">
  <img alt="Quality" src="https://img.shields.io/badge/lint-Ultracite-10b981">
</p>

## Hiring Snapshot

This README is intentionally written for recruiters, hiring managers, and senior engineers who want to evaluate delivery quality quickly.

### What this project demonstrates

- End-to-end ownership: frontend, API, persistence, storage, and local infrastructure.
- Reliability-first backend design: checksum validation, idempotent chunk IDs, and explicit status transitions.
- Practical product thinking: record audio in chunks, persist metadata, and store binaries in object storage.
- Engineering discipline: typed codebase, validated environment variables, documented runbooks, and clear roadmap.

### 60-second evaluator guide

1. Read [Engineering Highlights](#engineering-highlights) for technical signal.
2. Run [Quickstart](#quickstart) to validate setup and execution quality.
3. Review [API Contract](#api-contract) and [Roadmap](#roadmap) for system thinking and planning maturity.

## Why This Project

Most recording pipelines fail in subtle ways: dropped chunks, corrupted payloads, duplicated writes, and weak observability during retries. This project is built to make those failure modes explicit and manageable.

### What it does well today

- Checksums are verified server-side before any chunk is accepted.
- Chunk identity is deterministic (`sessionId-chunkIndex`) for idempotency.
- Upload metadata is persisted in PostgreSQL with status transitions.
- Binary data is stored in S3-compatible object storage (MinIO locally).
- Monorepo design keeps frontend, backend, shared packages, and infra aligned.

## Engineering Highlights

- Data integrity by design: server recomputes SHA-256 and rejects tampered/corrupted chunks.
- Idempotent ingestion: deterministic key format (`sessionId-chunkIndex`) reduces duplicate risk.
- Auditable processing state: chunk rows move through explicit statuses (`pending` -> `uploaded`).
- Storage abstraction: S3-compatible implementation works locally with MinIO and is cloud-ready.
- Monorepo execution: Turborepo workflows keep apps/packages synchronized with shared tooling.
- Production-minded DX: env validation (`zod`), typed contracts, health endpoint, and smoke-test script.

## Tech Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4
- Backend: Hono running on Bun
- Database: PostgreSQL with Drizzle ORM / drizzle-kit
- Object Storage: MinIO (S3-compatible)
- Tooling: Turborepo, TypeScript, Ultracite, oxlint, oxfmt

## Architecture

```mermaid
flowchart LR
  A[Recorder UI<br/>Next.js] -->|FormData: file + checksum + metadata| B[/POST /api/upload\nHono API]
  B --> C{SHA-256 matches?}
  C -->|No| D[400 Checksum mismatch]
  C -->|Yes| E[Insert chunk row<br/>status=pending]
  E --> F[Upload binary to MinIO/S3]
  F --> G[Update chunk row<br/>status=uploaded + etag + key]
  G --> H[200 OK]
```

### Repository Layout

```text
apps/
  web/        # Next.js frontend (recorder UI)
  server/     # Hono API (Bun runtime)
packages/
  db/         # Drizzle schema + db scripts + docker compose
  env/        # Runtime env validation (zod)
  upload/     # Queue/OPFS/uploader primitives for resilient client upload flows
  ui/         # Shared UI components
```

## Quickstart

### Prerequisites

- Node.js 18+
- npm 10+
- Bun 1.x (required for `apps/server`)
- Docker (for local PostgreSQL + MinIO via `packages/db/docker-compose.yml`)

### 1) Install dependencies

```bash
npm install
```

### 2) Create env files

This repo currently reads env values from multiple locations. Sync these three files:

```bash
cp .env.example .env
cp .env.example apps/web/.env
cp .env.example apps/server/.env
```

Set `DATABASE_URL` in both `.env` and `apps/server/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/my-better-t-app
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
BUCKET=chunks
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY=minioadmin
R2_SECRET_KEY=minioadmin
```

### 3) Start data services

```bash
npm run db:start
node create-bucket.js
```

Services:

- PostgreSQL: `localhost:5432`
- MinIO API: `localhost:9000`
- MinIO Console: `http://localhost:9001`

### 4) Run the app

### Full stack (recommended)

```bash
npm run dev
```

- Frontend: `http://localhost:3001`
- Backend health: `http://localhost:3000/`

### Run services individually

```bash
npm run dev:web
npm run dev:server
```

### 5) Smoke test upload flow

```bash
node test-upload-flow.js
```

## Developer Commands

| Command | Purpose |
|---|---|
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

## API Contract

### `POST /api/upload`

Accepts `multipart/form-data`:

- `file` (Blob/File)
- `sessionId` (string)
- `chunkIndex` (string/number)
- `checksum` (hex SHA-256)

Success response (`200`):

```json
{
  "ok": true,
  "id": "session-1710000000000-0",
  "key": "chunks/session-1710000000000/0.wav",
  "size": 123456
}
```

Common errors:

- `400` invalid input
- `400` checksum mismatch
- `409` duplicate chunk (idempotent protection)
- `500` upload failure

## Data Model

Current `chunks` table fields:

- `id` (primary key)
- `sessionId`
- `chunkIndex`
- `checksum`
- `storageKey`
- `etag`
- `status` (`pending` -> `uploaded`)
- `createdAt`

## Reliability Notes

- Integrity first: server recomputes SHA-256 and rejects mismatches.
- Idempotency by key: deterministic chunk IDs prevent duplicate writes.
- State traceability: database status + storage key/etag give auditability.
- Resilience primitives: `packages/upload` includes OPFS queue and retry logic for more durable browser upload behavior.

## Project Management

### Current Maturity Snapshot

- Core ingestion path: stable
- End-to-end local testing script: available
- Client-side durable queue integration in recorder UI: planned
- CI automation and deployment docs: planned

### Delivery Approach

- Scope decomposition: split into UI capture, API ingestion, DB persistence, and object storage.
- Risk control: prioritize correctness checkpoints (schema, checksum, idempotency) before feature expansion.
- Quality gates used in development: type checks, linting, and end-to-end smoke verification.
- Incremental roadmap: reliability first, then observability, CI hardening, and deployment readiness.

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

### How to contribute

1. Fork and create a feature branch.
2. Make focused changes with clear commit messages.
3. Run local quality checks:
   - `npm run check-types`
   - `npm run check`
   - `node test-upload-flow.js` (when backend is running)
4. Open a PR with:
   - problem statement
   - approach summary
   - testing notes
   - screenshots/GIFs for UI changes

### Good first contribution ideas

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

Use a different port or stop conflicting processes.

### Upload fails with storage errors

Make sure MinIO is running and bucket exists:

```bash
npm run db:start
node create-bucket.js
```

## Security & Privacy

- Do not commit real credentials to `.env`.
- Use least-privilege keys in non-local environments.
- Review CORS and auth strategy before internet exposure.

## Job Application Notes

Use this section when sharing with recruiters:

- Target role: `Backend Engineer` / `Full-Stack Engineer` / `Platform Engineer`
- Portfolio link: `https://your-portfolio.example`
- Resume: `https://your-resume.example`
- Contact: `your.email@example.com`

Remove placeholder values before sending.

## License

No license file is currently defined in this repository.

If you want outside contributors to use and redistribute this project confidently, adding a license should be prioritized.

---

If this project is useful to you, open an issue or PR and tell us what workflow you want to make more reliable. That's the fastest way to shape the roadmap.
