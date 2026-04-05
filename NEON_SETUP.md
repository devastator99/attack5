# Neon PostgreSQL Setup Guide

This project is configured to work with **Neon**, a serverless PostgreSQL platform. This guide walks through the setup.

## Quick Start (5 minutes)

### 1. Create a Neon Account
- Go to https://console.neon.tech
- Sign up (GitHub or email)
- Create a new project (free tier available)

### 2. Get Your Connection String
- In the Neon console, click **Connection string**
- Copy the URL (looks like): `postgresql://user:password@ep-xxxxx.neon.tech/dbname?sslmode=require`

### 3. Update `.env`
```dotenv
DATABASE_URL=postgresql://user:password@ep-xxxxx.neon.tech/dbname?sslmode=require
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
NODE_ENV=development
```

### 4. Initialize Database
```bash
npm install
npm run db:push
```

### 5. Start Development
```bash
npm run dev
```

Done! Your database is ready.

---

## Detailed Setup Steps

### Step 1: Sign Up on Neon

1. Visit https://console.neon.tech
2. Click **Sign up**
3. Choose GitHub or Email signup
4. Verify your email (if email signup)

### Step 2: Create a Project

1. In the console, click **New project**
2. Choose:
   - **Region**: us-east-1 (or closest to you)
   - **Database name**: `my-better-t-app` (or any name)
   - **Compute**: Shared (free tier)
3. Click **Create project**

### Step 3: Get Connection Details

1. After project creation, you'll see the **Connection string** panel
2. Make sure the dropdown shows **Pooled connection** (recommended)
3. Copy the full connection string

Example format:
```
postgresql://neon_user:password@ep-summer-firefly-xxxxx.us-east-1.neon.tech/my-better-t-app?sslmode=require
```

### Step 4: Configure Local Environment

1. In the project root, create or update `.env`:
   ```bash
   cat > .env << 'EOF'
   DATABASE_URL=postgresql://neon_user:yourpassword@ep-xxxxx.neon.tech/my-better-t-app?sslmode=require
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3001
   NODE_ENV=development
   EOF
   ```

2. Replace `postgresql://...` with your actual connection string from Neon

### Step 5: Verify Connection

```bash
# Install dependencies
npm install

# Push schema to Neon
npm run db:push
```

You should see:
```
✓ Your database is in sync with your schema. No migrations to run.
```

### Step 6: Start Development

```bash
npm run dev
```

Visit:
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:3000
- **Database UI**: `npm run db:studio` then http://localhost:5555

---

## Neon Features

### What's Included (Free Tier)

| Feature | Free Tier | Paid |
|---------|-----------|------|
| Projects | 3 | Unlimited |
| Storage | 0.5 GB | Up to 300 GB |
| Compute | Shared | Dedicated |
| Backups | Last 7 days | Last 30 days |
| PITR | 24 hours | Up to 30 days |
| Connections | Limited | Unlimited |

### Key Benefits

✅ **No server management** — Neon handles infrastructure  
✅ **Automatic scaling** — Scales compute on demand  
✅ **Instant backups** — Point-in-time recovery  
✅ **SSL by default** — Secure connections  
✅ **Connection pooling** — Built-in PgBouncer  
✅ **Free tier** — Perfect for development  

---

## Troubleshooting

### Connection String Issues

**Problem**: `ECONNREFUSED` or timeout
```bash
# Verify connection string format
echo $DATABASE_URL

# Should include:
# - postgresql://
# - @ep-xxxxx.neon.tech (Neon endpoint)
# - ?sslmode=require (SSL required)
```

**Solution**: Copy the connection string again from https://console.neon.tech/app/projects

### SSL/Certificate Errors

**Problem**: "SSL validation failed"

**Solution**: Ensure `?sslmode=require` is in the connection string
```bash
# Check if present
grep "sslmode=require" .env
```

### Database Not Syncing

**Problem**: `npm run db:push` hangs or fails

**Solution**:
```bash
# Check if database is accessible
npm run db:studio
# If this works, the connection is good

# Try pushing schema with verbose output
npm run db:push -- --verbose
```

### Too Many Connections

**Problem**: "remaining connection slots reserved for non-replication superuser connections"

**Solution**: Neon includes connection pooling. The error typically means:
1. Too many local services connecting
2. Connections not being closed properly

For development, this is rarely an issue. For production, upgrade to a dedicated compute tier.

---

## Production Deployment

### Environment Variables

For production, set these in your hosting platform:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@ep-prod.neon.tech/dbname?sslmode=require
NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com
CORS_ORIGIN=https://app.yourdomain.com
S3_BUCKET=recording-chunks
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=***
S3_SECRET_ACCESS_KEY=***
```

### Scaling on Neon

1. **Free tier**: Good for development and light production use
2. **Pro tier**: Recommended for production (dedicated compute, more storage)
3. **Enterprise**: Custom needs

Upgrade anytime from the Neon console.

---

## Useful Commands

```bash
# View database in UI
npm run db:studio

# Push schema changes
npm run db:push

# Generate migrations (if needed)
npm run db:generate

# View database URL (verify it's set)
echo $DATABASE_URL

# Test connection with psql (if installed)
psql $DATABASE_URL -c "SELECT version();"
```

---

## Documentation

- **Neon docs**: https://neon.tech/docs
- **Drizzle docs**: https://orm.drizzle.team
- **PostgreSQL docs**: https://www.postgresql.org/docs
- **Project README**: See [README.md](README.md)

---

## Support

- **Neon support**: https://neon.tech/docs/introduction/support
- **Project issues**: Check [README.md](README.md) Troubleshooting section
