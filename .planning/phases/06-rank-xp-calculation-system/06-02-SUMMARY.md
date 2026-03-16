---
phase: 06-rank-xp-calculation-system
plan: "02"
subsystem: boss-event
tags: [boss, xp, raid-reward, fetch, tdd]
dependency_graph:
  requires: ["06-01"]
  provides: ["boss-kill-xp-scaling", "awardRaidReward-server-route"]
  affects: ["BossEvent.tsx", "bossService.ts"]
tech_stack:
  added: []
  patterns: ["fetch-based server route call", "rank-keyed XP lookup constant"]
key_files:
  created:
    - src/lib/services/bossService.test.ts
  modified:
    - src/lib/services/bossService.ts
    - src/components/arise/BossEvent.tsx
decisions:
  - "BOSS_RANK_XP includes MONARCH key (=10000) to prevent silent 400 from /api/xp/award when boss.rank is MONARCH"
  - "awardRaidReward switched from awardXp (anon client, broken formula) to fetch POST /api/xp/award (server route, correct formula)"
  - "raidXp state initialized at 500 as safe fallback — BOSS_RANK_XP lookup has ?? 500 guard for unknown ranks"
  - "vi.mock('@/lib/supabase') required in bossService.test.ts to prevent Supabase URL crash at import time"
metrics:
  duration_seconds: 168
  completed_date: "2026-03-17"
  tasks_completed: 2
  files_changed: 3
---

# Phase 06 Plan 02: Boss Rank-Scaled XP and awardRaidReward Server Route Summary

**One-liner:** Replaced hardcoded 500 XP boss kill reward with BOSS_RANK_XP rank lookup (E=200 to MONARCH=10000) and rerouted awardRaidReward from the broken anon-client xpService to a fetch POST to /api/xp/award.

## What Was Built

### Task 1: BOSS_RANK_XP + fetch-based awardRaidReward (TDD)

- Added `BOSS_RANK_XP: Record<string, number>` exported constant to `bossService.ts` with 7 keys: E=200, D=500, C=1000, B=2000, A=5000, S=10000, MONARCH=10000
- Removed `import { awardXp } from "./xpService"` — the anon-client route that uses the broken rankAtLevel formula
- Replaced `awardRaidReward` body with `fetch("/api/xp/award", { method: "POST", ... })` routing through the server-side route that correctly updates `total_xp_earned`
- Created `bossService.test.ts` with 11 tests: 8 for BOSS_RANK_XP rank values + 3 for awardRaidReward fetch routing. All passing.

RED → GREEN cycle: Tests wrote against non-existent BOSS_RANK_XP (9 failed), then GREEN after updating bossService.ts (11 passed).

### Task 2: BossEvent.tsx victory flow wired to rank-scaled XP

- Added `BOSS_RANK_XP` to bossService import line
- Added `const [raidXp, setRaidXp] = useState(500)` state variable
- Boss-defeated block now does: `BOSS_ROSTER.find(b => b.name === boss.name)` to get template, then `BOSS_RANK_XP[bossTemplate?.rank ?? ""] ?? 500` to get xpForKill
- `setRaidXp(xpForKill)` before `setShowVictory(true)`
- `awardRaidReward(userId, xpForKill)` — no more hardcoded 500
- Notification body: `` `${boss.name} has fallen. +${xpForKill.toLocaleString()} XP awarded.` `` — dynamic boss name and XP
- Victory screen JSX: `+{raidXp.toLocaleString()} XP` — dynamic display

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added vi.mock for @/lib/supabase to prevent import-time crash in tests**

- **Found during:** Task 1 (RED phase run)
- **Issue:** `bossService.ts` imports `supabase` from `../supabase`, which calls `createClient(supabaseUrl, ...)` at module initialization. In the test environment without `.env.local`, supabaseUrl is undefined → `supabaseUrl is required` throws before any test runs.
- **Fix:** Added `vi.mock("@/lib/supabase", ...)` and `vi.mock("@/lib/services/xpService", ...)` at top of test file (before dynamic import)
- **Files modified:** `src/lib/services/bossService.test.ts`
- **Commit:** efb7299

## Commits

| Hash | Message |
|------|---------|
| efb7299 | feat(06-02): add BOSS_RANK_XP lookup and fix awardRaidReward in bossService |
| e075235 | feat(06-02): wire rank-scaled XP into BossEvent victory flow |

## Self-Check: PASSED

- [x] `src/lib/services/bossService.ts` — exists, contains BOSS_RANK_XP with MONARCH key, contains fetch /api/xp/award, no awardXp import
- [x] `src/lib/services/bossService.test.ts` — exists, 11 tests all green
- [x] `src/components/arise/BossEvent.tsx` — exists, imports BOSS_RANK_XP, contains raidXp state, no hardcoded 500 XP
- [x] `npx vitest run` — 21/21 tests pass (3 test files)
- [x] Commits efb7299 and e075235 present in git log
