---
phase: 11-battle-system-backend
plan: "02"
subsystem: arena-api-routes
tags: [battle, api-routes, tdd, supabase, elo]
dependency_graph:
  requires:
    - src/lib/game/battleEngine.ts (plan 11-01)
    - supabase/migrations/20260319000000_arena_battles.sql (plan 11-01)
  provides:
    - src/app/api/arena/battle/route.ts
    - src/app/api/arena/history/route.ts
    - src/app/api/arena/battle/route.test.ts
    - src/app/api/arena/history/route.test.ts
  affects:
    - src/components/arise/Arena.tsx (plan 11-03 wires these routes)
tech_stack:
  added: []
  patterns:
    - Copy-don't-import getUserId() per Phase 3 principle
    - Sequential Supabase writes (no transactions)
    - Non-fatal XP chain via fetch /api/xp/award
    - supabaseServer (service-role) for all DB writes
    - opponentName passthrough from client body to arena_battles
key_files:
  created:
    - src/app/api/arena/battle/route.ts
    - src/app/api/arena/history/route.ts
    - src/app/api/arena/battle/route.test.ts
    - src/app/api/arena/history/route.test.ts
  modified: []
decisions:
  - "opponentName from client body flows into arena_battles.opponent_name — client showed this name during matchmaking so history must match"
  - "repsSubmitted capped at 5x TARGET_REPS before computePerfMod — server-side cheating protection"
  - "DRAW rating formula inlined (not via calculateRatingChange) — ELO draw uses actual=0.5, standard calculateRatingChange only handles win/loss"
  - "XP chain is non-fatal: fetch().catch() silently logs; battle result still returned on xp/award failure"
  - "pvp_rating floored at 0 via Math.max(0, myRating + ratingChange) — rating cannot go negative"
  - "History route returns raw snake_case DB column names — camelCase mapping done in Arena.tsx (Plan 11-03)"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-18"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 0
  tests_added: 4
  tests_passing: 4
---

# Phase 11 Plan 02: Arena API Routes Summary

**One-liner:** Server-authoritative battle outcome computation route (POST /api/arena/battle) with ELO rating, XP chain, and arena_battles persistence, plus paginated history route (GET /api/arena/history), backed by 4 vitest stubs all GREEN.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 0 | Wave 0 — Create route test stub files | 2d112e6 | src/app/api/arena/battle/route.test.ts, src/app/api/arena/history/route.test.ts |
| 1 | POST /api/arena/battle route | 5c1671a | src/app/api/arena/battle/route.ts |
| 2 | GET /api/arena/history route | c5b1881 | src/app/api/arena/history/route.ts |

## What Was Built

### Task 0: Wave 0 Test Stubs (4 tests GREEN)

Created both route.test.ts files before routes existed so RED→GREEN TDD cycle could verify correctness:

- `route.test.ts` for battle: vi.mock(supabase-server), vi.mock(battleEngine), vi.mock(xpEngine); 2 tests (401, 400)
- `route.test.ts` for history: vi.mock(supabase-server); 2 tests (401, success shape)

### Task 1: POST /api/arena/battle

Server-authoritative battle route with full computation pipeline:

- **Auth gate:** 401 without Bearer token; 400 on missing exercise or repsSubmitted
- **User data:** Reads hunter_rank from users table; reads stats + pvp columns from user_stats
- **Opponent:** generateOpponentStats(playerRank) for stat computation; opponentName from request body preserved for arena_battles insert
- **Cheating protection:** repsSubmitted capped at 5× TARGET_REPS[exercise]
- **Computation:** computeCPI → computePerfMod → computeWinProbability → rollOutcome via battleEngine
- **XP:** XP_BY_RANK[resolvedRank][outcome.toLowerCase()]
- **Rating:** WIN/LOSS via calculateRatingChange(ELO K=32); DRAW formula inlined (actual=0.5 ELO variant)
- **Persistence:** INSERT into arena_battles with opponent_name from body; UPDATE user_stats pvp_rating/pvp_wins/pvp_losses
- **XP chain:** Non-fatal fetch to /api/xp/award when xpChange > 0
- **Response:** { outcome, xpChange, ratingChange, newRating, opponentName, opponentRank, winProbability }

### Task 2: GET /api/arena/history

Paginated battle history route:

- **Auth gate:** 401 without Bearer token
- **Query:** arena_battles ordered by created_at DESC, limit 20, filtered by user_id
- **Response:** { battles: [] } — raw snake_case column names; camelCase mapping in Arena.tsx (Plan 11-03)

## Verification

```
npx vitest run src/app/api/arena/battle/route.test.ts src/app/api/arena/history/route.test.ts
Test Files  2 passed (2)
Tests       4 passed (4)
```

```
npx tsc --noEmit | grep "arena/(battle|history)"
(no output — TypeScript clean)
```

```
grep -n "total_xp|current_xp" src/app/api/arena/battle/route.ts
OK: no direct XP writes
```

## Deviations from Plan

None — plan executed exactly as written. DRAW formula was already specified as inline in the plan; the TDD RED→GREEN cycle passed on first attempt for both routes.

## Self-Check: PASSED

- [x] src/app/api/arena/battle/route.test.ts — exists
- [x] src/app/api/arena/history/route.test.ts — exists
- [x] src/app/api/arena/battle/route.ts — exists
- [x] src/app/api/arena/history/route.ts — exists
- [x] Commit 2d112e6 — test stubs confirmed in git log
- [x] Commit 5c1671a — battle route confirmed in git log
- [x] Commit c5b1881 — history route confirmed in git log
- [x] 4/4 tests passing
- [x] No direct XP writes in battle route
- [x] xp/award chain exists in battle route
- [x] opponentName from body flows into arena_battles insert
- [x] TypeScript no errors for arena routes
