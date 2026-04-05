# Getting Started - Boot Up Guide

## The Absolute Simplest Setup Ever

This is the bare minimum to get the project running. If this works, you're done!

---

## ✅ Step 1: Check Prerequisites (1 minute)

Copy and paste this entire block into your terminal:

```bash
echo "Checking Node.js..."
node --version

echo "Checking npm..."
npm --version

echo "Checking Git..."
git --version

echo "✓ All prerequisites met!"
```

**All show versions?** Great! Continue to Step 2.

**Something missing?** Install it:
- Node.js: https://nodejs.org (get v18+)
- npm: Comes with Node.js
- Git: https://git-scm.com

---

## ✅ Step 2: Clone & Install (1 minute)

```bash
# Navigate to where you want the project
cd ~/projects

# Clone the repository
git clone <repo-url>
cd Swades-AI-Hackathon

# Install everything (this might take 1-2 minutes)
npm install
```

**See "added XXX packages"?** Continue to Step 3.

**Got errors?** Try:
```bash
npm cache clean --force
npm install
```

---

## ✅ Step 3: Configure (30 seconds)

```bash
# Copy the example environment file
cp .env.example .env

# Verify it looks good
cat .env
```

**See DATABASE_URL, NEXT_PUBLIC_SERVER_URL, etc?** Perfect! Continue to Step 4.

---

## ✅ Step 4: Start Everything (30 seconds)

```bash
# Start all services
npm run dev
```

**Wait for output like this:**
```
✓ Ready in 201ms
- Local: http://localhost:3001
Backend: Started development server: http://localhost:3000
```

**See this output?** Perfect! Continue to Step 5.

**Stuck on "compiling"?** Just wait, it's normal. Can take 30-60 seconds first time.

---

## ✅ Step 5: Open in Browser

Open your browser and go to:
```
http://localhost:3001
```

**You see a page with "my-better-t-app"?** 🎉 **YOU'RE DONE!**

---

## ✅ Bonus: Verify Everything Works (2 minutes)

In a **new terminal** (leave the first one running):

```bash
# Navigate to the project folder
cd Swades-AI-Hackathon

# Run the test suite
node test-upload-flow.js
```

**All tests show ✅?** Everything is working perfectly!

---

## 🆘 Something Didn't Work?

### "npm install" failed or takes forever
```bash
npm cache clean --force
npm install
```

### Ports 3000 or 3001 already in use
```bash
# Find what's using the port
lsof -i :3000

# Kill it (replace 12345 with the process ID)
kill -9 12345

# Or just use a different port
PORT=3002 npm run dev:web
```

### Browser says "Cannot reach server"
Make sure the first terminal is still running with `npm run dev`. Check it shows:
```
✓ Ready in 201ms
Backend: Started development server: http://localhost:3000
```

### "npm run dev" exited immediately
```bash
# Check .env exists
ls -la .env

# If missing:
cp .env.example .env

# Try again
npm run dev
```

### Still stuck?
Check the full documentation:
- [README.md](README.md) - Main project documentation
- [SETUP.md](SETUP.md) - Detailed setup guide
- [TEST_VERIFICATION.md](TEST_VERIFICATION.md) - Troubleshooting

---

## 📋 Service URLs (after step 4)

| Service | URL |
|---------|-----|
| **Web App** | http://localhost:3001 |
| **API** | http://localhost:3000 |
| **Database** | `npm run db:studio` |
| **Test** | `node test-upload-flow.js` |

---

## 🎯 What's Next?

1. **Explore the code**: Check out `apps/web/` and `apps/server/`
2. **Read the architecture**: See [README.md](README.md)
3. **Run tests**: `node test-upload-flow.js`
4. **Check database**: `npm run db:studio`
5. **Develop**: Edit files and they auto-reload!

---

## 💡 Pro Tips

- **Multiple terminals**: Run `npm run dev:web` and `npm run dev:server` separately for better control
- **Database UI**: `npm run db:studio` opens a visual database editor
- **Code quality**: `npm run fix` auto-fixes code issues
- **Type checking**: `npm run check-types` validates TypeScript

---

**That's it! Happy coding! 🚀**
