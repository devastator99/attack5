# Project Setup Guide

Complete instructions for setting up and running the Reliable Recording Chunking Pipeline locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18 (v24+ recommended)
- **Bun** >= 1.0 (JavaScript runtime for backend)
- **Docker** & **Docker Compose** (for local PostgreSQL and MinIO)
- **git** (for version control)

### Installation Verification

```bash
# Check Node.js
node --version  # Should be >= 18

# Check Bun (install if needed: curl -fsSL https://bun.sh/install | bash)
bun --version

# Check Docker
docker --version
docker-compose --version
```

---

## Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd Swades-AI-Hackathon

# Install dependencies (uses npm workspaces)
npm install

# This installs packages for:
# - Root project dependencies
# - apps/web (Next.js frontend)
# - apps/server (Hono backend)
# - packages/db (Database layer)
# - packages/ui (Shared UI components)
# - packages/config (Build configurations)
# - packages/env (Environment validation)
```

---

## Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Or configure manually:

```dotenv
# Database (using Neon cloud PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Frontend URL (for CORS)
CORS_ORIGIN=http://localhost:3001

# Backend API URL (for frontend to call)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# MinIO/S3 Storage Configuration
BUCKET=chunks
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY=minioadmin
R2_SECRET_KEY=minioadmin
```

> **Note**: The project uses **Neon PostgreSQL** (cloud database) for production-ready setup. For local-only development without the cloud database, you can use Docker PostgreSQL instead.

---

## Step 3: Set Up Database

### Option A: Use Remote Neon Database (Recommended)

The `.env` file already points to a Neon database. Simply ensure your `DATABASE_URL` is set.

### Option B: Use Local Docker PostgreSQL

```bash
# Start PostgreSQL container
cd packages/db
docker-compose up -d

# This starts PostgreSQL on port 5432
# Update .env: DATABASE_URL=postgresql://postgres:password@localhost:5432/my-better-t-app?sslmode=disable
```

### Push Database Schema

Regardless of which database you use, push the schema:

```bash
npm run db:push
```

This creates all necessary tables (chunks, sessions, etc.) using Drizzle ORM.

Verify schema was created:

```bash
npm run db:studio

# Opens Drizzle Studio in browser for database inspection
# (Default: http://localhost:5555)
```

---

## Step 4: Start MinIO S3-Compatible Storage

MinIO provides AWS S3-compatible storage locally.

```bash
# Option A: Using Docker Compose (includes in packages/db)
cd packages/db
docker-compose up -d

# MinIO starts on http://localhost:9000
# Access Console: http://localhost:9000/minio/
# Username: minioadmin
# Password: minioadmin

# Option B: Using Homebrew (macOS)
brew install minio/stable/minio
minio server ~/miniodata

# Option C: Using Docker directly
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio:latest server /data --console-address ":9001"
```

### Create the `chunks` Bucket

```bash
# Use MinIO CLI to create bucket
# First, configure MinIO CLI:
mc alias set local http://localhost:9000 minioadmin minioadmin

# Create bucket
mc mb local/chunks

# Verify
mc ls local
```

Or through the MinIO web console:
1. Open http://localhost:9000/minio/
2. Login with `minioadmin` / `minioadmin`
3. Create a new bucket named `chunks`

---

## Step 5: Start Development Servers

### Start All Services Together

```bash
# From project root
npm run dev

# This starts:
# - Backend (Hono) on http://localhost:3000
# - Frontend (Next.js) on http://localhost:3001
```

### Start Services Individually

```bash
# Terminal 1: Start Backend
npm run dev:server
# Backend runs on http://localhost:3000

# Terminal 2: Start Frontend
npm run dev:web
# Frontend runs on http://localhost:3001
```

### Verify Services Are Running

```bash
# Test backend
curl http://localhost:3000/
# Should return: OK

# Test frontend
curl http://localhost:3001/ | head -20
# Should return HTML content
```

---

## Step 6: Access the Application

### Frontend (Recording Interface)

Open your browser and navigate to:

```
http://localhost:3001
```

You should see the home page with a link to the recorder.

### Recorder Page

Navigate to:

```
http://localhost:3001/recorder
```

This is where you can:
1. Record audio
2. View chunks generated from recording
3. Upload chunks to the server

### MinIO Console (Storage Inspection)

Navigate to:

```
http://localhost:9000/minio/
```

Login with:
- Username: `minioadmin`
- Password: `minioadmin`

You can see uploaded chunks in the `chunks` bucket.

### Drizzle Studio (Database Inspection)

```bash
npm run db:studio
```

Navigate to:

```
http://localhost:5555
```

You can inspect the `chunks` table and other database records.

---

## Step 7: Test the Upload Flow

### Automated Test

Run the included test script to verify the complete upload pipeline:

```bash
node test-upload-flow.js
```

This will:
- ✅ Verify backend is running
- ✅ Generate test chunk data
- ✅ Upload chunk to server
- ✅ Verify in database
- ✅ Verify in storage
- ✅ Test error scenarios

### Manual Browser Test

1. Open http://localhost:3001/recorder
2. Click "Record" button
3. Speak or play audio for 5-10 seconds
4. You should see chunks appear in the list
5. Click "Upload" button
6. Monitor upload progress
7. Verify in MinIO console and Drizzle Studio

### Direct API Test

```bash
# Create test chunk
dd if=/dev/urandom of=/tmp/test.bin bs=1024 count=256

# Calculate checksum
CHECKSUM=$(sha256sum /tmp/test.bin | awk '{print $1}')

# Upload
SESSION_ID="test-$(date +%s)"
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/tmp/test.bin" \
  -F "sessionId=$SESSION_ID" \
  -F "chunkIndex=0" \
  -F "checksum=$CHECKSUM"

# Expected response:
# {"ok":true,"id":"test-1234567890-0","key":"chunks/test-1234567890/0.wav","size":262144}
```

---

## Common Issues & Troubleshooting

### Issue: Port 3000 or 3001 Already in Use

```bash
# Kill processes using those ports
killall -9 node npm bun next

# Or find and kill specific process
lsof -i :3000  # Find process
kill -9 <PID>

# Then restart servers
npm run dev
```

### Issue: Database Connection Timeout

**Solution**: Ensure your `DATABASE_URL` is correct and the database is accessible.

```bash
# Test connection
psql $DATABASE_URL -c "SELECT NOW();"

# If using local Docker PostgreSQL:
psql postgresql://postgres:password@localhost:5432/my-better-t-app -c "SELECT NOW();"
```

### Issue: MinIO Bucket Not Found

```bash
# Create bucket
mc mb local/chunks

# Verify bucket exists
mc ls local

# Check .env file has correct BUCKET name
grep BUCKET .env
```

### Issue: Chunks Table Not Found

```bash
# Push schema to database
npm run db:push

# Verify tables were created
npm run db:studio
# Check "chunks" table exists in left sidebar
```

### Issue: Upload Fails with "Checksum Mismatch"

**Likely cause**: File is corrupted during transfer or SHA256 calculation differs.

- Verify you're using SHA256 for both client and server
- Check file size matches
- Look at server logs: `npm run dev:server`

### Issue: Frontend Can't Connect to Backend

**Solution**: Check CORS settings and URLs.

```bash
# Verify environment variables
grep -E "CORS_ORIGIN|NEXT_PUBLIC_SERVER_URL" .env

# Should be:
# CORS_ORIGIN=http://localhost:3001
# NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Check backend is actually running
curl -v http://localhost:3000/
```

---

## Development Commands Reference

```bash
# Development
npm run dev                # Start all services
npm run dev:web           # Start frontend only
npm run dev:server        # Start backend only

# Database
npm run db:push           # Push schema to database
npm run db:studio         # Open Drizzle Studio UI
npm run db:generate       # Generate migration files
npm run db:migrate        # Run migrations
npm run db:start          # Start local PostgreSQL
npm run db:stop           # Stop local PostgreSQL
npm run db:down           # Remove containers and volumes

# Code Quality
npm run check             # Run linter/type checker
npm run fix               # Auto-fix linting issues

# Build
npm run build             # Build all packages

# Type Checking
npm run check-types       # Type check all packages

# Testing
node test-upload-flow.js  # Run upload flow tests
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER                                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Recorder UI (Next.js @ :3001)                      │  │
│  │  - Record audio                                     │  │
│  │  - Split into chunks                               │  │
│  │  - Persist to OPFS                                 │  │
│  │  - Upload batches with retry                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │
              │ (FormData POST)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Hono @ :3000)                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /api/upload                                   │  │
│  │  - Verify checksum                                  │  │
│  │  - Store in MinIO bucket                            │  │
│  │  - Save metadata to DB                              │  │
│  │  - Return success/error                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │
       ┌──────┴──────────────────┐
       ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│ PostgreSQL (DB)  │    │ MinIO S3 (Files) │
│                  │    │                  │
│ chunks table:    │    │ chunks/          │
│ - id             │    │ ├─ {sessionId}/  │
│ - sessionId      │    │ │  ├─ 0.wav      │
│ - checksum       │    │ │  ├─ 1.wav      │
│ - status         │    │ │  └─ ...        │
│ - storageKey     │    │ └─ ...           │
└──────────────────┘    └──────────────────┘
```

---

## Next Steps

1. **Verify the setup**: Run `node test-upload-flow.js`
2. **Test manually**: Go to http://localhost:3001/recorder
3. **Inspect data**: Use MinIO console and Drizzle Studio
4. **Check logs**: Monitor `npm run dev:server` terminal output
5. **Read documentation**: See [UPLOAD_FLOW_TEST.md](UPLOAD_FLOW_TEST.md) for detailed flow info

---

## Support & Documentation

- **Full Architecture**: See [README.md](README.md)
- **Upload Flow Details**: See [UPLOAD_FLOW_TEST.md](UPLOAD_FLOW_TEST.md)
- **Code Standards**: See [AGENTS.md](AGENTS.md)
- **API Documentation**: Review [apps/server/src/routes/upload.ts](apps/server/src/routes/upload.ts)
- **Database Schema**: See [packages/db/src/schema/index.ts](packages/db/src/schema/index.ts)

