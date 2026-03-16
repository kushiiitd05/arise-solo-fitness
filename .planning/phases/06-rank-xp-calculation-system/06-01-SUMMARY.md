---
phase: 06-rank-xp-calculation-system
plan: "01"
subsystem: game-engine
tags: [tdd, xp-engine, rank-calculation, bug-fix, test-infrastructure]
dependency_graph:
  requires: []
  provides:
    - vitest test runner configured
    - nextRankInfo helper exported from xpEngine.ts
    - rankFromLevelAndXp used in reducer ADD_XP case
    - total_xp_earned unconditionally updated in /api/xp/award
  affects:
    - src/lib/game/xpEngine.ts
    - src/lib/gameReducer.ts
    - src/app/api/xp/award/route.ts
tech_stack:
  added:
    - vitest 4.1.0
    - "@vitest/ui"
  patterns:
    - TDD red-green cycle
    - dual-gate rank formula (level AND xp both required)
key_files:
  created:
    - vitest.config.ts
    - src/lib/game/xpEngine.test.ts
    - src/lib/gameReducer.test.ts
  modified:
    - package.json
    - src/lib/game/xpEngine.ts
    - src/lib/gameReducer.ts
    - src/app/api/xp/award/route.ts
decisions:
  - vitest 4.1.0 chosen — compatible with Next.js 16.1.6, no jest-next transform needed
  - rankAtLevel kept exported for Dashboard.tsx backward compatibility — only ADD_XP case migrated
  - available_stat_points update remains leveledUp-gated; only total_xp_earned made unconditional
metrics:
  duration: "~8 minutes"
  completed_date: "2026-03-17"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 4
---

# Phase 06 Plan 01: XP Engine Test Infrastructure + Rank Bug Fixes Summary

**One-liner:** vitest installed with dual-gate rank tests; nextRankInfo added to xpEngine and ADD_XP reducer fixed to use rankFromLevelAndXp(level, totalXpAfter); total_xp_earned now updates unconditionally on every XP award.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install vitest and scaffold test files (RED) | 1241d47 | package.json, vitest.config.ts, xpEngine.test.ts, gameReducer.test.ts |
| 2 | Add nextRankInfo + fix reducer ADD_XP formula (GREEN) | 25381e2 | xpEngine.ts, gameReducer.ts |
| 3 | Fix /api/xp/award unconditional total_xp_earned | 53a9b16 | src/app/api/xp/award/route.ts |

## What Was Built

### Test Infrastructure
- `vitest.config.ts` with node environment and `@/` path alias pointing to `./src`
- `src/lib/game/xpEngine.test.ts`: 8 tests covering `rankFromLevelAndXp` boundary conditions and `nextRankInfo` for all rank transitions
- `src/lib/gameReducer.test.ts`: 2 tests confirming ADD_XP dual-gate rank derivation (level AND XP both must meet threshold)

### xpEngine.ts: nextRankInfo export
New function added after `rankFromLevelAndXp`:
- `nextRankInfo(currentRank)` returns `{ nextRank, xpThreshold, levelThreshold }`
- NATIONAL rank returns `{ nextRank: null, xpThreshold: 1_000_000, levelThreshold: 90 }`
- Used by plan 02 (UI progress bars) and plan 03 (rank-up event system)

### gameReducer.ts: ADD_XP formula fix
- Added `import { rankFromLevelAndXp } from "@/lib/game/xpEngine"`
- Replaced `rankAtLevel(level)` with `rankFromLevelAndXp(level, totalXpAfter)` in ADD_XP/COMPLETE_WORKOUT case
- `totalXpAfter` variable introduced to avoid double-computing `state.user.stats.totalXpEarned + xpAmount`
- `rankAtLevel` remains exported — still used by AWAKEN case and Dashboard.tsx

### /api/xp/award/route.ts: unconditional total_xp_earned
- Removed `if (leveledUp && statPointsAwarded > 0)` guard around user_stats select/update
- `total_xp_earned` now increments on every call where user_stats row exists
- `available_stat_points` update remains inside `...(leveledUp && statPointsAwarded > 0 ? {...} : {})` spread

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `npx vitest run` exits 0: 10/10 tests pass across 2 test files
- `grep rankAtLevel gameReducer.ts`: export present on line 93, ADD_XP case no longer calls it
- `grep rankFromLevelAndXp gameReducer.ts`: import on line 3, usage on line 253
- `grep nextRankInfo xpEngine.ts`: export on line 77
- Route.ts: no `if (leveledUp` guards the user_stats update block

## Self-Check: PASSED

All files verified present. All commits verified in git log.

| Check | Result |
|-------|--------|
| vitest.config.ts exists | FOUND |
| xpEngine.test.ts exists | FOUND |
| gameReducer.test.ts exists | FOUND |
| commit 1241d47 exists | FOUND |
| commit 25381e2 exists | FOUND |
| commit 53a9b16 exists | FOUND |
