---
phase: 03-gameplay-loop-hardening
plan: 02
subsystem: api
tags: [nextjs, supabase, quest-system, xp, bearer-auth, react]

# Dependency graph
requires:
  - phase: 01-foundation-fixes
    provides: Bearer-header auth pattern (getUserId helper), maybeSingle query pattern, server-route write principle
provides:
  - POST /api/quests/update — server-side quest progress write with Bearer auth and XP grant
  - WorkoutEngine fetches /api/quests/update instead of direct anon-key DB write
  - Dashboard STAMINA and MANA header stats derived from real GameState.stats values
affects: [04-social-features, 05-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getUserId() reading Authorization Bearer header only — no body userId in new routes"
    - "wasAllCompleted guard prevents double XP grant on repeated quest updates"
    - "IIFE in JSX for inline computed constants that depend on component scope"

key-files:
  created:
    - src/app/api/quests/update/route.ts
  modified:
    - src/components/arise/WorkoutEngine.tsx
    - src/components/arise/Dashboard.tsx

key-decisions:
  - "Use xp_reward field name (from DailyQuestItem interface) not xp (used in complete/route.ts) for XP sum in update route"
  - "IIFE pattern used in Dashboard JSX to keep computed staminaMax/manaVal in scope without lifting to component body — avoids unnecessary refactor"
  - "getSession() called inside the quest write loop for each matching quest (safe — session is cached by Supabase client)"

patterns-established:
  - "Server computes completed flag — client sends only (questId, newCurrent)"
  - "XP grant gated on allCompleted && !wasAllCompleted transition — fetch row before mutation, compare after"

requirements-completed: [03-02]

# Metrics
duration: 12min
completed: 2026-03-15
---

# Phase 3 Plan 02: Quest Update Route + Dashboard Stats Wiring Summary

**POST /api/quests/update with Bearer auth and double-XP guard, WorkoutEngine migrated from anon-key write to server route, Dashboard stamina/mana wired to real vitality and intelligence stats**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-15T15:10:00Z
- **Completed:** 2026-03-15T15:22:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created `src/app/api/quests/update/route.ts` — server-side quest progress write using Bearer auth, server-computes the `completed` flag, grants XP only on the `false → true` all-completed transition
- Migrated WorkoutEngine.tsx from calling `updateQuestProgress()` (anon-key direct DB write) to `fetch('/api/quests/update', { Bearer })` — closes the client-side write security hole
- Wired Dashboard header STAMINA to `vitality*10/vitality*10` and MANA to `level*intelligence`, replacing hardcoded "94/100" and "2,480" placeholders

## Task Commits

Each task was committed atomically:

1. **Task 1: Create POST /api/quests/update route** - `6a79db5` (feat)
2. **Task 2: Replace WorkoutEngine direct write + wire Dashboard stats** - `1214f1e` (feat)

**Plan metadata:** (final docs commit follows)

## Files Created/Modified
- `src/app/api/quests/update/route.ts` - New server route: Bearer auth, partial progress write, XP grant on allCompleted transition
- `src/components/arise/WorkoutEngine.tsx` - Removed updateQuestProgress import; added supabase import; quest write-back now fetches /api/quests/update with Bearer token
- `src/components/arise/Dashboard.tsx` - STAMINA/MANA header now uses computed staminaMax and manaVal derived from GameState.stats

## Decisions Made
- Used `xp_reward` field name (matches `DailyQuestItem` interface in questService.ts) not `xp` (used in the reference `complete/route.ts`)
- Used IIFE pattern in Dashboard JSX to keep computed constants in scope without lifting state or adding new component-level variables — minimises change surface
- `getSession()` called per loop iteration in WorkoutEngine — acceptable because Supabase JS client caches the session internally

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- `complete/route.ts` uses field name `xp` (line 36: `?.xp`) but `DailyQuestItem` interface defines the field as `xp_reward`. Plan correctly specified `xp_reward` — confirmed before writing the route.
- Pre-existing TypeScript errors in BossEvent, GuildHall, guildBattleService were not introduced by these changes and are out of scope (logged as pre-existing).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Quest update flow is now fully server-side and authenticated
- Dashboard header stats reflect real player data
- Phase 3 plan 03-01 (inventory/shadows routes) is a sibling plan in wave 1 — both plans independently executable
- Phase 3 completion criteria met on this plan's scope: quest updates server-side, stamina/mana show real data

---
*Phase: 03-gameplay-loop-hardening*
*Completed: 2026-03-15*
