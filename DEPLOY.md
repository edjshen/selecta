# Selecta — Render Deployment Guide

## Prerequisites

1. Push code to GitHub
2. Create Render account (render.com)
3. Sign up for LiveKit Cloud (livekit.io)

## Deploy Steps

### 1. Create Blueprint Instance

In Render dashboard:
- Click **New +** → **Blueprint**
- Connect your GitHub repo
- Render will read `render.yaml` and create:
  - Web service (`selecta-api`)
  - PostgreSQL database (`selecta-db`)

### 2. Set Environment Variables

After blueprint deploys, add secrets to web service:

```
LIVEKIT_API_KEY=your_key_here
LIVEKIT_API_SECRET=your_secret_here
LIVEKIT_URL=wss://your-project.livekit.cloud
```

Get these from [LiveKit Cloud Console](https://cloud.livekit.io)

### 3. Verify Deployment

```bash
curl https://your-service.onrender.com/health
# Expected: {"status":"ok","service":"selecta-radio"}
```

## Local Development

```bash
# 1. Install
npm install

# 2. Set up local Postgres (or use Render's)
cp .env.example .env
# Edit DATABASE_URL

# 3. Run migrations
npm run db:migrate

# 4. Seed
npm run db:seed

# 5. Dev server
npm run dev
```

## Architecture on Render

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Render     │────▶│   Render    │
│  (Browser)  │◀────│   Web       │◀────│   Postgres  │
│             │     │   Service   │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  LiveKit    │
                    │   Cloud     │
                    └─────────────┘
```

## Free Tier Limits

- **Web service:** 512MB RAM, spins down after 15min idle (30s cold start)
- **Postgres:** 1GB storage, shared CPU
- **Bandwidth:** 100GB/mo

## Upgrade Path

If cold starts hurt UX:
1. Upgrade web service to **Starter** ($7/mo) — always on
2. Upgrade Postgres to **Starter** ($15/mo) — dedicated CPU

Or migrate to Railway for simpler scaling.
