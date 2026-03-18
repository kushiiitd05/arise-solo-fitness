---
phase: 11-battle-system-backend
plan: "01"
subsystem: battle-engine
tags: [battle, tdd, pure-functions, migration, vitest]
dependency_graph:
  requires: []
  provides:
    - src/lib/game/battleEngine.ts
    - supabase/migrations/20260319000000_arena_battles.sql
  affects:
    - src/app/api/arena/battle/route.ts (plan 11-02)
tech_stack:
  added: []
  patterns:
    - Pure function module (no side effects, no DB imports)
    - TDD RED→GREEN with vitest 4.1.0
    - Clamp utility for boundary enforcement
    - Weighted stat scoring (CPI formula)
    - ELO-adjacent draw zone detection
key_files:
  created:
    - src/lib/game/battleEngine.ts
    - src/lib/game/battleEngine.test.ts
    - supabase/migrations/20260319000000_arena_battles.sql
  modified: []
decisions:
  - "EXERCISE_WEIGHTS record uses str/agi/vit/int shorthand keys for brevity"
  - "rollOutcome uses single Math.random() call — draw-zone checked first, then win/loss"
  - "XP_BY_RANK draw values are floor(win/4) — D=38,C=63,B=100,A=150,S=250 per spec"
  - "generateOpponentStats offset pool uses [-1,0,1] all clamped — D player gets [D,D,C] (biased toward D), S gets [A,S,S]"
  - "arena_battles migration uses TEXT for outcome (not enum) with CHECK constraint — lighter than adding a new enum to init_schema"
  - "No pvp_rating migration needed — column already exists on user_stats as INTEGER DEFAULT 1000"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
  tests_added: 40
  tests_passing: 40
---

# Phase 11 Plan 01: battleEngine — Pure Combat Module + DB Migration Summary

**One-liner:** Pure combat math module (computeCPI, computeWinProbability, rollOutcome, computePerfMod, XP_BY_RANK, generateOpponentStats) with 40 vitest tests GREEN + arena_battles SQL migration with CHECK constraint and FK.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | battleEngine pure combat module (TDD) | ee4ea61 | src/lib/game/battleEngine.ts, src/lib/game/battleEngine.test.ts |
| 2 | DB migration — arena_battles table | a642ae2 | supabase/migrations/20260319000000_arena_battles.sql |

## What Was Built

### Task 1: battleEngine.ts (40 tests GREEN)

Pure TypeScript module with zero side effects and no framework imports:

- **computeCPI** — Weighted stat score using EXERCISE_WEIGHTS. All stats = 10 always returns 10 (weights sum to 1.0 per exercise type).
- **computePerfMod** — Performance modifier `clamp((reps/target - 1) * 0.3, -0.15, 0.15)`. At target = 0, above = positive, below = negative.
- **computeWinProbability** — `clamp(statRatio + perfMod, 0.05, 0.95)`. Equal CPI returns 0.5.
- **rollOutcome** — Single `Math.random()` call. Draw zone first (`|statRatio - 0.5| < 0.05 AND roll < 0.25`), then WIN/LOSS by win probability.
- **XP_BY_RANK** — D/C/B/A/S with win/draw/loss values per spec.
- **generateOpponentStats** — Rank ±1 bracket (clamped to D-S), variance stats, name from OPPONENT_NAMES array.

### Task 2: arena_battles Migration

New table `arena_battles` with:
- UUID primary key, user_id FK to users(id) ON DELETE CASCADE
- outcome CHECK constraint: `IN ('WIN', 'LOSS', 'DRAW')`
- Index on user_id for per-user battle history queries
- reps_submitted nullable (not required for draw/loss outcomes)

## Verification

```
npx vitest run src/lib/game/battleEngine.test.ts
Test Files  1 passed (1)
Tests       40 passed (40)
```

```
grep -c "CREATE TABLE" supabase/migrations/20260319000000_arena_battles.sql
→ 1
```

## Deviations from Plan

None — plan executed exactly as written. The TDD RED→GREEN cycle worked cleanly in one pass.

## Self-Check: PASSED

- [x] src/lib/game/battleEngine.ts — exists
- [x] src/lib/game/battleEngine.test.ts — exists
- [x] supabase/migrations/20260319000000_arena_battles.sql — exists
- [x] Commit ee4ea61 — confirmed in git log
- [x] Commit a642ae2 — confirmed in git log
- [x] 40/40 tests passing
- [x] Zero DB/Next.js imports in battleEngine.ts
