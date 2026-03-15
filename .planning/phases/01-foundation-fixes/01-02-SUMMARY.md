---
phase: "01"
plan: "02"
subsystem: "quest-completion"
tags: [bug-fix, xp-engine, level-up, game-loop]
dependency_graph:
  requires: []
  provides: [quest-xp-level-persistence]
  affects: [users-table, user_stats-table, quest-completion-api]
tech_stack:
  added: []
  patterns: [level-up-loop, supabase-server-route]
key_files:
  modified:
    - src/app/api/quests/complete/route.ts
decisions:
  - Declare level-up state variables before the if(user) block so they are in scope for the response
  - Reuse the same rankFromLevelAndXp formula already in xpEngine rather than duplicating logic
metrics:
  duration: "~8 minutes"
  completed: "2026-03-15T11:49:31Z"
  tasks_completed: 3
  files_modified: 1
---

# Phase 01 Plan 02: Quest Completion Level-Up Persistence Summary

**One-liner:** Added level-up loop to `/api/quests/complete` so `users.level`, `users.hunter_rank`, and `user_stats.available_stat_points` persist correctly after every quest XP award.

## What Was Built

The quest completion API endpoint was awarding XP to users but only writing `current_xp` back to the database. The level-up logic was handled client-side in `gameReducer` and lost on refresh. This fix inlines the same level-up loop pattern used in `/api/xp/award` directly into the quest completion handler.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Import `xpForLevel` and `rankFromLevelAndXp` from xpEngine | `810a76b` | `route.ts` |
| 2 | Replace simple XP increment with full level-up loop | `66232e6` | `route.ts` |
| 3 | Add `leveledUp`, `newLevel`, `newRank`, `statPointsAwarded` to JSON response | `66232e6` | `route.ts` |

## Changes Made

### `src/app/api/quests/complete/route.ts`

- Extended the existing `shouldTriggerPenalty` import to also import `xpForLevel` and `rankFromLevelAndXp`
- Replaced `update({ current_xp: user.current_xp + xpEarned })` with a `while` loop that drains XP thresholds and increments `level` and `statPointsAwarded` per level gained
- Single `supabase.update()` now writes `current_xp`, `level`, and `hunter_rank` atomically
- On level-up, fetches `user_stats.available_stat_points` and increments by 3 per level gained
- Response JSON extended with `leveledUp`, `newLevel`, `newRank`, `statPointsAwarded`

## Deviations from Plan

None — plan executed exactly as written.

## TypeScript Verification

`npx tsc --noEmit` produced 4 errors, all pre-existing in unrelated files:
- `src/components/arise/Dashboard.tsx` — prop type mismatch (pre-existing)
- `src/components/arise/GuildHall.tsx` — RealtimeChannel type mismatch (pre-existing)
- `src/lib/services/guildBattleService.ts` — missing export and wrong method (pre-existing)

No new errors introduced. Modified file (`route.ts`) compiles cleanly.

## Self-Check: PASSED
