# Documentation Index

Complete guide to all documentation files in this project.

## Quick Navigation

| Document | Purpose | Best For |
|----------|---------|----------|
| [README.md](README.md) | Complete project guide | Everyone, start here |
| [NEON_SETUP.md](NEON_SETUP.md) | Neon PostgreSQL setup | Neon users |
| [NEON_MIGRATION.md](NEON_MIGRATION.md) | What changed with Neon | Understanding changes |
| [AGENTS.md](AGENTS.md) | Code quality standards | Developers |

---

## Document Descriptions

### [README.md](README.md) — Main Project Documentation

**Read this first!**

Contains:
- Project overview and architecture
- How the chunking pipeline works
- Data flow diagrams
- Tech stack details
- Complete setup instructions (Neon & Docker options)
- API reference
- Client-side architecture (OPFS, Queue, Uploader)
- Server-side architecture
- Database setup
- Performance & load testing guide
- Deployment instructions
- Troubleshooting guide
- Development workflow best practices

**Sections**:
1. Overview & Architecture
2. How It Works
3. Tech Stack
4. Project Structure
5. Getting Started (Prerequisites, Installation)
6. Development
7. Database Commands
8. Configuration
9. Building for Production
10. API Reference
11. Client-Side Architecture
12. Server-Side Architecture
13. Code Quality Standards
14. Performance & Load Testing
15. Deployment
16. Troubleshooting
17. Contributing

---

### [NEON_SETUP.md](NEON_SETUP.md) — Neon Quick Start Guide

**Read if you're using Neon**

Contains:
- 5-minute quick start
- Step-by-step Neon console walkthrough
- Connection string explanation
- Local environment configuration
- Neon features overview
- Free tier benefits
- Production deployment on Neon
- Troubleshooting Neon-specific issues
- Useful commands

**Best practices**:
- Follow the 5-minute quick start first
- Reference step-by-step setup if you get stuck
- Check troubleshooting for connection issues

---

### [NEON_MIGRATION.md](NEON_MIGRATION.md) — What Changed

**Read to understand the refactoring**

Contains:
- Summary of all changes made
- Files that were updated
- Why Neon was chosen
- Quick start comparison (Neon vs Docker)
- File changes summary
- Backward compatibility notes
- Commands that changed
- Benefits of refactoring

---

### [AGENTS.md](AGENTS.md) — Ultracite Code Standards

**Read before writing code**

Contains:
- Core principles (type safety, modern JS, React practices)
- Error handling guidelines
- Code organization best practices
- Security considerations
- Performance optimization tips
- Framework-specific guidance (Next.js, React 19+)
- Testing standards
- What Oxlint + Oxfmt can and cannot help with

---

## Setup Flowchart

```
START
  ↓
Read [README.md](README.md) Overview
  ↓
Choose Database Option:
  ├─ Neon? → Read [NEON_SETUP.md](NEON_SETUP.md) → Run `npm install` → Run `npm run db:push` → Run `npm run dev`
  └─ Docker? → Follow README Installation (Option B) → Run `npm run db:start` → Run `npm run db:push` → Run `npm run dev`
  ↓
Contributing Code?
  ├─ Yes → Read [AGENTS.md](AGENTS.md) for code standards
  └─ No → Continue to your task
  ↓
Issues? → Check [README.md](README.md) Troubleshooting section
  ↓
END
```

---

## Common Tasks → Which Document to Read

### "I want to set up this project for the first time"
1. Start: [README.md](README.md) → Installation section
2. Choose: Neon or Docker
3. If Neon: Read [NEON_SETUP.md](NEON_SETUP.md)
4. If Docker: Follow [README.md](README.md) → Installation → Option B

### "I'm getting a database connection error"
1. [README.md](README.md) → Troubleshooting → Database Connection Issues
2. If using Neon: Also check [NEON_SETUP.md](NEON_SETUP.md) → Troubleshooting

### "I want to understand the architecture"
1. [README.md](README.md) → Overview & Architecture
2. [README.md](README.md) → How It Works
3. [README.md](README.md) → Project Structure

### "I want to deploy to production"
1. [README.md](README.md) → Deployment
2. Choose database and follow instructions
3. Set environment variables according to chosen database

### "I want to contribute code"
1. [AGENTS.md](AGENTS.md) → Core Principles
2. [AGENTS.md](AGENTS.md) → Framework-Specific Guidance
3. [README.md](README.md) → Development Workflow (in Troubleshooting section)

### "I want to understand what changed with Neon"
1. [NEON_MIGRATION.md](NEON_MIGRATION.md) → Changes Made
2. [NEON_MIGRATION.md](NEON_MIGRATION.md) → File Changes Summary

### "I want to test the API"
1. [README.md](README.md) → API Reference
2. [README.md](README.md) → Load Testing

### "I need to configure environment variables"
1. [README.md](README.md) → Configuration section
2. Choose Neon or Docker example
3. Set `.env` file

---

## Documentation Standards

All documentation follows these principles:

✅ **Clear structure** — Use headings and sections  
✅ **Examples first** — Show code before explaining  
✅ **Troubleshooting** — Include common issues and solutions  
✅ **Links** — Cross-reference related sections  
✅ **Code blocks** — All code examples are tested  
✅ **Current** — Updated with each significant change  

---

## Updating Documentation

When making changes to the project:

1. **Added new feature?** → Update [README.md](README.md) API Reference or Architecture section
2. **Changed database setup?** → Update [README.md](README.md) Configuration and [NEON_SETUP.md](NEON_SETUP.md)
3. **Added new command?** → Update [README.md](README.md) Database Commands section
4. **Changed code standards?** → Update [AGENTS.md](AGENTS.md)
5. **Major refactoring?** → Create a MIGRATION.md file like [NEON_MIGRATION.md](NEON_MIGRATION.md)

---

## Quick Reference

### Important Links

- **Neon Console**: https://console.neon.tech
- **Drizzle ORM**: https://orm.drizzle.team
- **Next.js Docs**: https://nextjs.org/docs
- **Hono Docs**: https://hono.dev
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **TypeScript Docs**: https://www.typescriptlang.org

### Important Commands

```bash
npm run dev              # Start all services
npm run db:push         # Sync database schema
npm run db:studio       # Open database UI
npm run check-types     # Type check code
npm run check           # Lint code (Ultracite)
npm run fix             # Auto-fix code issues
```

### Important Directories

```
apps/web/               # Frontend (Next.js)
apps/server/            # Backend (Hono)
packages/db/            # Database schemas & migrations
packages/env/           # Environment variable validation
client/lib/             # Browser client library
server/lib/             # Backend utilities
```

---

## Document Version History

| Document | Last Updated | Key Changes |
|----------|--------------|-------------|
| [README.md](README.md) | 2026-04-05 | Added Neon setup, comprehensive sections |
| [NEON_SETUP.md](NEON_SETUP.md) | 2026-04-05 | Created, Neon quick start guide |
| [NEON_MIGRATION.md](NEON_MIGRATION.md) | 2026-04-05 | Created, change summary |
| [AGENTS.md](AGENTS.md) | Original | Code quality standards (unchanged) |

---

## Need Help?

1. **Check this file** — You're reading it!
2. **Check Troubleshooting** — [README.md](README.md) has common issues
3. **Check NEON_SETUP.md** — If using Neon
4. **Check specific document** — Navigate using the index above

Good luck! Happy coding! 🚀
