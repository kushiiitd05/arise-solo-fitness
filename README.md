# ARISE — Solo Leveling Fitness

> *"Arise, Hunter. Your body is your dungeon."*

A gamified fitness tracker inspired by Solo Leveling. Complete daily quests, earn XP, extract shadows, fight arena battles, and rank up from E to S class — all driven by real workouts.

**Stack:** Next.js 15 · Supabase · Three.js · Framer Motion · Tailwind CSS · Ollama AI

---

## Current Status

> **Running locally only** — not deployed yet. Can be deployed to Vercel (see [Deployment](#deployment) section at the bottom).

### What's built and working

- Full auth flow (signup → awakening → job class selection → dashboard)
- All 17 API routes tested end-to-end — user, XP, quests, rank, shadows, arena, boss, inventory, leaderboard, exercise guide, visual unlock
- 3D Dungeon Gate portal (Three.js / React Three Fiber)
- 118/118 unit tests passing
- Supabase DB fully migrated with all tables, RLS policies, and shadow data seeded

### What you need to add to run it yourself

| What | Where to get it |
|------|----------------|
| Supabase project (free) | [supabase.com](https://supabase.com) → New Project |
| `.env.local` with 3 keys | Supabase Dashboard → Project Settings → API |
| Run one SQL file | Paste `supabase/APPLY_IN_SUPABASE_SQL_EDITOR.sql` into Supabase SQL editor |
| Ollama (optional) | [ollama.ai](https://ollama.ai) — app works without it, guides fall back to static |

That's it — no other services, no paid APIs required to run locally.

---

## Features

| System | Description |
|--------|-------------|
| **Hunter HUD** | Live XP bar, rank badge, stat panel (STR/VIT/AGI/INT/PER/SEN), streak counter |
| **Daily Quests** | Dynamically generated quests with penalty mechanic if skipped |
| **XP & Levelling** | Award XP → auto level-up → stat points unlocked |
| **Shadow Army** | Extract shadows with token economy + rank-weighted probability pools |
| **Arena PvP** | ELO-rated battles — choose exercise, submit reps, win or lose rating |
| **Boss Events** | Complete boss fights to earn extraction tokens + unlock manhwa chapters |
| **Exercise Guide** | AI-generated form guides via Ollama (cached in DB, no repeated LLM calls) |
| **Visual Unlock** | Spend mana to unlock exercise images via Pollinations AI |
| **Dungeon Gate** | 3D animated portal scene (Three.js / React Three Fiber) |
| **Leaderboard** | Global ranking by level across all hunters |
| **Inventory** | Item storage with equip/unequip system |
| **Manhwa Reader** | Unlock chapters by completing boss fights |
| **Awakening Flow** | Full onboarding: animated intro → auth → job class selection → dashboard |

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **3D / Animation:** Three.js, React Three Fiber, Framer Motion
- **Backend:** Next.js API Routes (server-side, Supabase service role)
- **Database:** Supabase (PostgreSQL + RLS policies)
- **Auth:** Supabase Auth (email/password)
- **AI:** Ollama (local LLM for exercise guides), Pollinations.ai (exercise images)
- **UI:** Radix UI, Lucide icons, custom Solo Leveling design system

---

## Setup

### What you need

- Node.js 18+
- A free [Supabase](https://supabase.com) account + new project
- [Ollama](https://ollama.ai) (optional — app works without it)

### 1. Clone & install

```bash
git clone https://github.com/kushiiitd05/arise-solo-fitness.git
cd arise-solo-fitness
npm install
```

### 2. Add your environment variables

Create a file called `.env.local` in the project root (this file is gitignored — never committed):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find these at: **Supabase Dashboard → your project → Project Settings → API**

### 3. Set up the database

This is a one-time step. Go to:
**https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new**

Open `supabase/APPLY_IN_SUPABASE_SQL_EDITOR.sql` from this repo, paste the entire contents into the SQL editor, and click **Run**.

That single file creates every table, index, RLS policy, auth trigger, and seeds the 17 shadow rows. You only run it once.

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign up and go through the awakening flow.

---

## Optional: Ollama (AI exercise guides)

Without Ollama the app works fine — exercise guides fall back to a built-in static template.

If you want live AI-generated guides:

```bash
# macOS
brew install ollama

# Pull a model (small, fast, good JSON output)
ollama pull qwen2.5-coder:1.5b

# Ollama runs automatically at http://localhost:11434
```

Once a guide is generated for an exercise, it's cached in the `exercise_guides` table permanently — no repeated LLM calls.

---

## API Routes

All routes are server-side. Auth uses `Authorization: Bearer <userId>` (UUID).

| Method | Route | What it does |
|--------|-------|--------------|
| GET | `/api/user` | Profile + stats |
| POST | `/api/user` | Create/upsert on signup |
| PATCH | `/api/user` | Update fields |
| POST | `/api/xp/award` | Award XP, auto level-up |
| GET | `/api/quests/daily` | Today's quests |
| POST | `/api/quests/update` | Update quest progress |
| POST | `/api/quests/complete` | Complete quest + XP |
| POST | `/api/rank/advance` | Rank advancement gate |
| GET | `/api/shadows` | Shadow army |
| POST | `/api/shadows/extract` | Extract attempt (costs 1 token) |
| GET | `/api/leaderboard` | Global rankings |
| GET | `/api/inventory` | Equipped + unequipped items |
| POST | `/api/inventory/equip` | Equip/unequip item |
| POST | `/api/arena/battle` | Run PvP battle |
| GET | `/api/arena/history` | Last 20 battles |
| POST | `/api/boss/complete` | Boss clear → earn token |
| GET | `/api/exercise-guide` | AI guide (cached) |
| POST | `/api/exercise-guide/visual-unlock` | Unlock image with mana |

---

## Database Tables

```
users                  — profile, rank, level, XP, job class, extraction tokens
user_stats             — STR/VIT/AGI/INT/PER/SEN, PvP rating, XP earned, streaks
daily_quests           — JSONB quest list per user per day
user_shadows           — owned shadows (FK → shadows)
shadows                — 17 shadows catalogue, E–S rank
arena_battles          — PvP match history with ELO deltas
user_inventory         — items owned (FK → items)
items                  — item catalogue
exercise_guides        — AI guide cache, shared across all users
user_exercise_images   — per-user unlocked exercise images
user_chapters          — unlocked manhwa chapter records
```

---

## Game Logic

### XP & Levelling
- `POST /api/xp/award` takes `{ amount, reason }`
- Auto level-up: loops while `xp >= xpForLevel(level)`, awards 3 stat points per level
- Rank gates: E→D = 1,000 XP · D→C = 2,000 · C→B = 5,000 · B→A = 10,000 · A→S = 25,000

### Shadow Extraction
- Costs 1 token per attempt — tokens earned from boss clears
- Success rate by shadow rank: E=90% · D=80% · C=70% · B=50% · A=30% · S=15%
- Pool is weighted and excludes already-owned shadows
- 17 unique shadows total (Igris, Beru, Tank, Bellion, Kaisel, ...)

### Arena PvP
- Exercises: `PUSH-UPS` · `SQUATS` · `SIT-UPS` · `PLANKS`
- CPI (Combat Power Index) calculated from stats + exercise weights
- ELO K=32, opponent rating generated server-side per rank bracket
- Reps capped at 5× target server-side (cheat protection)

### Mana
- Pool = `intelligence × level`
- Spent on exercise image unlocks (1 mana per unlock)
- Tracked in `user_stats.mana_spent`

---

## Project Structure

```
src/
├── app/
│   ├── api/              # 17 server-side API routes
│   ├── dashboard/        # Main game dashboard page
│   └── page.tsx          # Awakening / landing
├── components/
│   ├── arise/            # All game UI (Dashboard, ShadowArmy, DungeonGate, ...)
│   └── system/           # ErrorBoundary, ManaEffect, StatBar, SystemWindow
├── lib/
│   ├── game/
│   │   ├── xpEngine.ts       # XP / level / rank — pure functions, unit tested
│   │   ├── battleEngine.ts   # PvP math — pure functions, unit tested
│   │   ├── questEngine.ts    # Quest generation — pure functions, unit tested
│   │   └── shadowSystem.ts   # Shadow pool — pure functions, unit tested
│   ├── supabase.ts           # Client-side Supabase
│   └── supabase-server.ts    # Server-side Supabase (service role)
└── types/database.ts
supabase/
├── migrations/                       # Individual SQL migration files
└── APPLY_IN_SUPABASE_SQL_EDITOR.sql  # Combined one-shot setup file
```

---

## Tests

```bash
npm run test        # 118 unit tests (xpEngine, battleEngine, questEngine, gameReducer)
npm run test:e2e    # Playwright E2E
```

---

## Deployment

> Currently local only. When ready to deploy publicly:

### Vercel (recommended)

1. Push this repo to GitHub (already done)
2. Go to [vercel.com](https://vercel.com) → Import Project → select `arise-solo-fitness`
3. Add these environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_SITE_URL   ← set to your Vercel domain (e.g. https://arise-solo-fitness.vercel.app)
   ```
4. Deploy — Vercel auto-detects Next.js, no build config needed

> **Note:** Ollama (local AI) won't work on Vercel since it's a local server. For deployed exercise guides, swap `ollamaClient.ts` to use OpenAI or Groq API. Until then, the static fallback guide serves all requests.

---

## License

MIT
