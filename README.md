# Selecta — Modern Radio

A reinvention of radio for the modern era. Human curation, live broadcasts, no algorithms.

## Concept

Traditional radio reimagined:
- **Stations** = Curators/DJs with their own shows
- **Vibes** = Radio frequencies (88 FM, 92 FM, etc.)
- **Shows** = Recurring programs (like "Monday Night Jazz")
- **Episodes** = Individual broadcasts (live or archived)
- **The Dial** = Tune between vibes to discover what's live

## Tech Stack

| Feature | Package | Why |
|---------|---------|-----|
| Live streaming | **LiveKit** | WebRTC SFU, no server maintenance |
| Audio playback | **Howler.js** | Gapless playback, crossfade |
| Real-time sync | **LiveKit DataChannel** | Dial position sync across listeners |
| Database | **PostgreSQL + Prisma** | Reliable, typed ORM |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Station   │────▶│    Show     │────▶│   Episode   │
│  (Curator)  │     │  (Program)  │     │ (Broadcast) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                  │
       └────────────────────┴──────────────────┘
                          │
                    ┌─────────────┐
                    │    Vibe     │
                    │ (Frequency) │
                    └─────────────┘
```

## Database Models

- **Station** — Curator profile, LiveKit identity
- **Vibe** — Radio frequency (the dial positions)
- **Show** — Recurring program, belongs to station
- **Episode** — Individual broadcast (live or archived)
- **Broadcast** — Active LiveKit session
- **NowPlaying** — Singleton for current dial state

## API Endpoints

```
GET  /vibes              → List frequencies (the dial)
GET  /vibes/:slug/live   → What's live on this frequency
GET  /stations           → All curators
GET  /stations/:slug     → Station profile + shows
POST /broadcast/start    → Start live broadcast (LiveKit token)
POST /broadcast/join     → Join live broadcast (LiveKit token)
GET  /now-playing        → Current state across all vibes
```

## Environment

```
DATABASE_URL=postgresql://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://...livekit.cloud
```

## Running

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## No AI Policy

- ❌ No generated music
- ❌ No recommendation algorithms
- ❌ No "smart" playlists
- ✅ Human curation only
- ✅ Live performance
- ✅ Discovery through tuning
