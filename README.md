# ARISE — Solo Leveling Fitness

> *"Arise, Hunter. Your body is your dungeon."*

A gamified fitness tracker inspired by Solo Leveling. Complete daily quests, earn XP, extract shadows, fight arena battles, and rank up from E to S class — all driven by real workouts.

**Stack:** Next.js 15 · Supabase · Three.js · Framer Motion · Tailwind CSS · Ollama AI

---

## Features

| System | Description |
|--------|-------------|
| **Hunter HUD** | Live XP bar, rank badge, stat panel (STR/VIT/AGI/INT/PER/SEN), streak counter |
| **Daily Quests** | Dynamically generated quests with penalty system if skipped |
| **XP & Levelling** | Award XP → auto level-up → stat points unlocked |
| **Shadow Army** | Extract shadows with token economy + rank-weighted probability pools |
| **Arena PvP** | ELO-rated battles — choose exercise, submit reps, win or lose rating |
| **Boss Events** | Complete boss fights to earn extraction tokens + unlock manhwa chapters |
| **Exercise Guide** | AI-generated form guides via Ollama (cached in Supabase) |
| **Visual Unlock** | Spend mana to unlock exercise images (Pollinations AI) |
| **Dungeon Gate** | 3D animated portal scene built in Three.js / React Three Fiber |
| **Leaderboard** | Global ranking by level across all hunters |
| **Inventory** | Item storage with equip/unequip system |
| **Manhwa Reader** | Unlock chapters by completing boss fights |
| **Awakening Flow** | Full 5-step onboarding: intro → auth → job class → dashboard |

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **3D / Animation:** Three.js, React Three Fiber, Framer Motion
- **Backend:** Next.js API Routes (server-side, service role Supabase)
- **Database:** Supabase (PostgreSQL + RLS policies)
- **Auth:** Supabase Auth (email/password)
- **AI:** Ollama (local LLM for exercise guides), Pollinations.ai (exercise images)
- **UI:** Radix UI primitives, Lucide icons, custom Solo Leveling design system

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- [Ollama](https://ollama.ai) running locally (optional — falls back to static guides)

### 1. Clone & install

```bash
git clone https://github.com/kushiiitd05/arise-solo-fitness.git
cd arise-solo-fitness
npm install
```

### 2. Environment variables

Create `.env.local` in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these from: **Supabase Dashboard → Project Settings → API**

### 3. Apply database migrations

Go to your Supabase SQL editor:
**https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new**

Paste and run the file at:
```
supabase/APPLY_IN_SUPABASE_SQL_EDITOR.sql
```

This creates all tables, RLS policies, indexes, auth trigger, and seeds shadow data.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Reference

All routes use `Authorization: Bearer <userId>` (UUID from Supabase auth).

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/user` | Fetch user profile + stats |
| POST | `/api/user` | Create/upsert user on signup |
| PATCH | `/api/user` | Update user fields |
| POST | `/api/xp/award` | Award XP + auto level-up |
| GET | `/api/quests/daily` | Get today's quest list |
| POST | `/api/quests/update` | Update quest progress |
| POST | `/api/quests/complete` | Mark quest complete + award XP |
| POST | `/api/rank/advance` | Trigger rank advancement gate |
| GET | `/api/shadows` | Get user's shadow army |
| POST | `/api/shadows/extract` | Attempt shadow extraction (costs token) |
| GET | `/api/leaderboard` | Global leaderboard |
| GET | `/api/inventory` | User inventory (equipped + unequipped) |
| POST | `/api/inventory/equip` | Equip/unequip an item |
| POST | `/api/arena/battle` | Run a PvP battle |
| GET | `/api/arena/history` | Battle history (last 20) |
| POST | `/api/boss/complete` | Complete boss → earn extraction token |
| GET | `/api/exercise-guide` | Get AI exercise guide (cached) |
| POST | `/api/exercise-guide/visual-unlock` | Unlock exercise image with mana |

---

## Database Schema

Key tables (all in `public` schema):

```
users                  — profile, rank, level, XP, job class, tokens
user_stats             — STR/VIT/AGI/INT/PER/SEN, PvP rating, streaks
daily_quests           — JSONB quest array per user per day
user_shadows           — owned shadows (FK → shadows)
shadows                — shadow catalogue (17 shadows, E–S rank)
arena_battles          — PvP history with ELO tracking
user_inventory         — items owned (FK → items)
items                  — item catalogue
exercise_guides        — AI guide cache (shared, by exercise ID)
user_exercise_images   — per-user unlocked images
user_chapters          — unlocked manhwa chapters
```

---

## Game Systems

### XP & Ranking
- Award XP via `/api/xp/award` with `{ amount, reason }`
- Auto level-up loop: `while (xp >= xpForLevel(level))`
- Rank gates: E→D needs 1,000 total XP · D→C needs 2,000 · C→B needs 5,000
- Rank advance requires `trialPassed: true` + XP gate met

### Shadow Extraction
- Costs 1 `extraction_tokens` per attempt (earn tokens via boss fights)
- Success rate scales with shadow rank: E=90% → S=15%
- Weighted pool excludes already-owned shadows
- 17 unique shadows across E–S rank

### Arena Battle
- Valid exercises: `PUSH-UPS` · `SQUATS` · `SIT-UPS` · `PLANKS`
- ELO rating change calculated server-side (standard K=32 formula)
- Reps capped at 5× target (server-side cheat protection)
- Win → +XP + rating · Loss → −rating · Draw → small rating change

### Mana System
- Available mana = `intelligence × level`
- Spent on visual exercise image unlocks
- Tracked server-side in `user_stats.mana_spent`

---

## Project Structure

```
src/
├── app/
│   ├── api/                  # All API routes (server-side, service role)
│   │   ├── arena/battle/
│   │   ├── arena/history/
│   │   ├── boss/complete/
│   │   ├── exercise-guide/
│   │   ├── exercise-guide/visual-unlock/
│   │   ├── inventory/
│   │   ├── inventory/equip/
│   │   ├── leaderboard/
│   │   ├── quests/daily/
│   │   ├── quests/complete/
│   │   ├── quests/update/
│   │   ├── rank/advance/
│   │   ├── shadows/
│   │   ├── shadows/extract/
│   │   ├── user/
│   │   └── xp/award/
│   ├── dashboard/            # Main game dashboard
│   └── page.tsx              # Awakening / landing
├── components/
│   ├── arise/                # Game UI components
│   │   ├── Dashboard.tsx
│   │   ├── ShadowArmy.tsx
│   │   ├── DungeonGate.tsx   # Three.js 3D portal scene
│   │   ├── WorkoutEngine.tsx
│   │   ├── AwakeningScreen.tsx
│   │   └── ...
│   └── system/               # Utility UI (ErrorBoundary, ManaEffect...)
├── lib/
│   ├── game/
│   │   ├── xpEngine.ts       # Level/rank calculations (pure, unit tested)
│   │   ├── battleEngine.ts   # PvP computation (pure, unit tested)
│   │   ├── questEngine.ts    # Quest generation (pure, unit tested)
│   │   └── shadowSystem.ts   # Shadow pool logic (pure, unit tested)
│   ├── supabase.ts           # Client-side Supabase client
│   └── supabase-server.ts    # Server-side client (service role, bypasses RLS)
└── types/
    └── database.ts
supabase/
├── migrations/               # SQL migrations (ordered)
└── APPLY_IN_SUPABASE_SQL_EDITOR.sql  # Combined one-shot migration for setup
```

---

## Ollama Setup (optional)

Exercise guides are generated by a local Ollama model. Without it, the system uses a built-in fallback guide automatically.

```bash
# Install Ollama (macOS)
brew install ollama

# Pull a model
ollama pull qwen2.5-coder:1.5b

# Ollama runs at http://localhost:11434 by default
```

Generated guides are cached permanently in the `exercise_guides` table — subsequent requests are instant with no LLM call.

---

## Running Tests

```bash
# Unit tests (xpEngine, battleEngine, questEngine, gameReducer)
npm run test

# E2E tests (Playwright)
npm run test:e2e
```

118 unit tests, all passing.

---

## License

MIT
