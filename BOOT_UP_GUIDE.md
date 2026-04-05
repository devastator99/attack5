# Boot Up Process - Visual Guide

## The 5-Step Boot Up Process

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Check Prerequisites (1 min)                           │
│  ✓ node --version                                              │
│  ✓ npm --version                                               │
│  ✓ git --version                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Clone & Install (1-2 min)                            │
│  git clone <repo-url>                                          │
│  cd Swades-AI-Hackathon                                        │
│  npm install                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Configure (30 sec)                                    │
│  cp .env.example .env                                          │
│  cat .env   # Verify it looks good                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Start Everything (30 sec)                            │
│  npm run dev                                                   │
│  Wait for: ✓ Ready in 201ms                                    │
│  Backend: Started development server: http://localhost:3000   │
│  Frontend: http://localhost:3001                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Open Browser (30 sec)                                │
│  open http://localhost:3001                                    │
│  See: "my-better-t-app" header                                │
│  ✓ You're ready!                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Command Reference

### Quickest Path to Success
```bash
# Terminal 1
git clone <repo-url>
cd Swades-AI-Hackathon
npm install
cp .env.example .env
npm run dev

# Terminal 2 (after servers start)
node test-upload-flow.js
```

### What Each Command Does
```bash
npm run dev                  # Start frontend + backend (default)
npm run dev:web             # Frontend only (Next.js on :3001)
npm run dev:server          # Backend only (Hono on :3000)
npm run db:studio           # Open database editor
npm run check-types         # Check TypeScript
npm run fix                 # Auto-fix code issues
node test-upload-flow.js    # Run end-to-end test
```

---

## Success Indicators

### After `npm run dev` Completes

**You should see:**
```
✓ Ready in 201ms
- Local: http://localhost:3001
- Network: http://192.168.x.x:3001
Backend: Started development server: http://localhost:3000
```

**You should NOT see:**
- ❌ `Error: listen EADDRINUSE` (port in use)
- ❌ `Cannot find module` (missing dependency)
- ❌ `DATABASE_URL` not set (env issue)

### After Opening http://localhost:3001

**You should see:**
- ✅ Page loads without errors
- ✅ "my-better-t-app" header visible
- ✅ Navigation links present
- ✅ No red errors in console (F12)

### After Running `node test-upload-flow.js`

**You should see:**
```
✅ Server is running
✅ Generated 256KB chunk
✅ Upload successful
✅ MinIO/S3 endpoint is accessible
✅ All tests completed!
```

---

## File Structure After Setup

```
Swades-AI-Hackathon/
├── .env                           # ← Environment configuration
├── package.json                   # ← Root package.json
├── README.md                      # ← Main documentation
├── GETTING_STARTED.md             # ← Simple step-by-step guide
├── TEST_VERIFICATION.md           # ← Test status and access URLs
│
├── apps/
│   ├── web/                       # ← Frontend (Next.js on :3001)
│   │   └── src/app/page.tsx       # Home page
│   │
│   └── server/                    # ← Backend (Hono on :3000)
│       └── src/index.ts           # Main server
│
├── packages/
│   ├── db/                        # ← Database layer
│   │   └── docker-compose.yml     # Optional Docker setup
│   ├── env/                       # ← Environment validation
│   └── ui/                        # ← Shared UI components
│
└── node_modules/                  # ← Dependencies (created by npm install)
```

---

## Common Port Issues

### Port Already in Use?

**Find what's using the port:**
```bash
lsof -i :3000    # Find port 3000
lsof -i :3001    # Find port 3001
```

**Output will look like:**
```
COMMAND     PID   USER    FD   TYPE   DEVICE SIZE/OFF NODE NAME
node      12345  user    10u  IPv4  0x12345  0      0  TCP *:3000 (LISTEN)
```

**Kill the process:**
```bash
kill -9 12345      # Replace 12345 with the PID from above
```

**Or use different ports:**
```bash
PORT=3002 npm run dev:web
HONO_PORT=3002 npm run dev:server
```

---

## Database Access

### View Database UI
```bash
npm run db:studio
```

Open: http://localhost:5555

You can:
- ✓ View all tables
- ✓ See stored chunks
- ✓ Run SQL queries
- ✓ Edit data directly

### Database Configuration

The `.env` file contains:
```
DATABASE_URL=postgresql://...    # Connection string
```

For local development, it's pre-configured to work automatically.

---

## Troubleshooting Decision Tree

```
Is the browser showing content?
├─ YES → Are there red console errors?
│  ├─ NO → ✓ You're good! All working
│  └─ YES → Check browser DevTools console for details
│
└─ NO → Is npm run dev still running?
   ├─ NO → npm run dev  (restart servers)
   └─ YES → Check URL is http://localhost:3001
      └─ Still not loading? Check if ports are in use (see Port Issues)
```

---

## Emergency Restart

If something feels stuck or broken:

```bash
# Terminal 1: Stop current process
# Press: Ctrl+C

# Clear and reinstall
rm -rf node_modules
npm install

# Reset environment
cp .env.example .env

# Start fresh
npm run dev
```

---

## Next Steps After Successful Boot

1. **Explore the code**
   ```bash
   code .    # Open in VS Code
   ```

2. **Make a change**
   - Edit a file in `apps/web/src/app/page.tsx`
   - Save and watch the browser auto-reload!

3. **View the database**
   ```bash
   npm run db:studio
   ```

4. **Run the test**
   ```bash
   node test-upload-flow.js
   ```

5. **Read the architecture**
   - Open [README.md](README.md)
   - Check [UPLOAD_FLOW_TEST.md](UPLOAD_FLOW_TEST.md)

---

## Getting Help

- **Quick questions?** Check [GETTING_STARTED.md](GETTING_STARTED.md)
- **Setup issues?** See [SETUP.md](SETUP.md)
- **Architecture?** Read [README.md](README.md)
- **Test results?** View [TEST_END2END_REPORT.md](TEST_END2END_REPORT.md)
- **Quick reference?** Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

**You've got this! 🚀**
