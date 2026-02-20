# ⚡ Quick Start Guide

Get up and running in 5 minutes!

## Step 1: Get Adzuna API Credentials (2 min)

1. Go to https://developer.adzuna.com/signup
2. Sign up for a free account
3. You'll receive:
   - `app_id` (Application ID)
   - `app_key` (API Key)

## Step 2: Setup Environment (1 min)

```bash
# Copy environment template
cp .env.example .env

# Edit .env file and add your credentials
# ADZUNA_APP_ID=your_app_id_here
# ADZUNA_APP_KEY=your_app_key_here
```

## Step 3: Install Dependencies (2 min)

```bash
# Install all dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

## Step 4: Start the App (30 seconds)

```bash
# From the root directory
npm run dev
```

This will:

- ✅ Start backend API on http://localhost:3001
- ✅ Start frontend React app on http://localhost:3000
- ✅ Automatically sync jobs from Adzuna on startup

## Step 5: Open in Browser

Navigate to: **http://localhost:3000**

You should see the Trades Force job listing interface!

---

## Verify It's Working

1. **Backend health check**: http://localhost:3001/health
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **API test**: http://localhost:3001/api/external-jobs
   - Should return JSON with job listings

3. **Frontend**: http://localhost:3000
   - Should show job cards with filters

---

## Next Steps

- **Customize trade queries**: Edit `backend/src/jobs/syncJobs.js`
- **Adjust sync frequency**: Change `SYNC_INTERVAL_HOURS` in `.env`
- **Manual sync**: Run `cd backend && npm run sync`

---

## Troubleshooting

### "ADZUNA_APP_ID and ADZUNA_APP_KEY must be set"

→ Check that `.env` file exists and has valid credentials

### No jobs showing

→ Wait for initial sync to complete (check backend console logs)
→ Or run manual sync: `cd backend && npm run sync`

### Port already in use

→ Kill process on port 3001: `lsof -ti:3001 | xargs kill`
→ Or change PORT in `.env`

---

## Development Commands

```bash
# Run both servers
npm run dev

# Run backend only
cd backend && npm run dev

# Run frontend only
cd frontend && npm run dev

# Manual job sync
cd backend && npm run sync

# Build frontend for production
cd frontend && npm run build
```

---

## What Gets Created?

- `backend/data/jobs.sqlite` - Job listings database
- `backend/node_modules/` - Backend dependencies
- `frontend/node_modules/` - Frontend dependencies
- `node_modules/` - Root workspace dependencies

All of these are gitignored and safe to delete/rebuild.

---

🎉 **You're all set!** Check out the full README.md for advanced configuration options.
