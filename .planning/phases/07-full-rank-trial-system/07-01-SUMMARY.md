---
phase: 07-full-rank-trial-system
plan: 01
subsystem: database
tags: [supabase, typescript, vitest, gameReducer, xpEngine]

# Dependency graph
requires:
  - phase: 06-xp-rank-hardening
    provides: rankFromLevelAndXp, nextRankInfo, vitest test infrastructure
provides:
  - trial_last_failed_at TIMESTAMPTZ column migration for user_stats table
  - UserStats.trialLastFailedAt optional field in TypeScript interface
  - mapDbUserToState mapping trial_last_failed_at from DB row to game state
  - xpEngine trial targets test coverage (generateDailyQuestTargets × 2)
  - Wave 0 route test stubs for /api/rank/advance with vi.mock scaffolds
affects:
  - 07-02-PLAN: uses trialLastFailedAt from UserStats for cooldown UI
  - 07-03-PLAN: route.test.ts stubs define contract; adds route.ts implementation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Trial cooldown tracked via nullable TIMESTAMPTZ column — null means no failed trial, timestamp means last failure for 24h gate
    - Wave 0 test stubs with placeholder expect(true).toBe(true) until implementation exists (RED contract)
    - vi.mock supabase-server + xpEngine at module top before imports in route tests

key-files:
  created:
    - supabase/migrations/20260318000000_trial_cooldown.sql
    - src/app/api/rank/advance/route.test.ts
  modified:
    - src/lib/gameReducer.ts
    - src/app/page.tsx
    - src/lib/game/xpEngine.test.ts

key-decisions:
  - "trial_last_failed_at stored as TIMESTAMPTZ nullable — null=no failure, timestamp=cooldown active; checked at advance time"
  - "UserStats.trialLastFailedAt is optional (?) to avoid breaking existing code that constructs UserStats without it"
  - "Wave 0 route stubs use expect(true).toBe(true) placeholders — contract-first approach, plan 03 replaces them"
  - "generateDailyQuestTargets import added to xpEngine.test.ts import line to avoid duplicate import block"

patterns-established:
  - "Trial cooldown pattern: DB timestamp nullable field + optional TS interface field + mapDbUserToState mapping chain"
  - "Wave 0 test scaffold: create test file with vi.mock boilerplate, stub tests pass, gate tests RED until implementation"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 07 Plan 01: Full Rank Trial System — Foundation

**trial_last_failed_at TIMESTAMPTZ column added to user_stats, UserStats TS type extended, mapDbUserToState wired, and Wave 0 test scaffolds for xpEngine trial targets + /api/rank/advance route stubs**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-17T04:50:05Z
- **Completed:** 2026-03-17T04:52:11Z
- **Tasks:** 2
- **Files modified:** 4 (+ 2 created)

## Accomplishments
- DB migration created: `trial_last_failed_at TIMESTAMPTZ DEFAULT NULL` on user_stats table
- `UserStats` interface extended with `trialLastFailedAt?: string | null` (non-breaking optional field)
- `mapDbUserToState` in page.tsx maps `dbStats.trial_last_failed_at ?? null` to `trialLastFailedAt`
- xpEngine.test.ts has 5 new passing trial target assertions using `generateDailyQuestTargets`
- `src/app/api/rank/advance/route.test.ts` created with full vi.mock boilerplate (supabase-server + xpEngine) and 5 stub tests

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration + UserStats type + mapDbUserToState mapping** - `18a375b` (feat)
2. **Task 2: Wave 0 test scaffolds — xpEngine trial targets + route stubs** - `8b88b65` (test)

## Files Created/Modified
- `supabase/migrations/20260318000000_trial_cooldown.sql` - ALTER TABLE user_stats ADD COLUMN trial_last_failed_at TIMESTAMPTZ
- `src/lib/gameReducer.ts` - UserStats interface gains trialLastFailedAt?: string | null
- `src/app/page.tsx` - mapDbUserToState stats block gains trialLastFailedAt: dbStats.trial_last_failed_at ?? null
- `src/lib/game/xpEngine.test.ts` - generateDailyQuestTargets import added + new trial targets describe block (5 tests)
- `src/app/api/rank/advance/route.test.ts` - New file: vi.mock supabase-server + xpEngine, stub tests for dual-gate validation, idempotency, stat points, cooldown recording

## Decisions Made
- `UserStats.trialLastFailedAt` is optional (`?`) to avoid breaking any existing code that constructs UserStats without it
- `trial_last_failed_at` stored as TIMESTAMPTZ nullable — null means no prior failure, a timestamp means the cooldown is active
- Wave 0 route test uses `expect(true).toBe(true)` stubs for tests that need route.ts (Plan 03 fills them in)
- `generateDailyQuestTargets` added to existing import line rather than a separate import block

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Migration will be applied to Supabase when running `supabase db push` or `supabase migration up`.

## Next Phase Readiness
- Plan 02 (Trial cooldown UI) can now read `state.user.stats.trialLastFailedAt` to show TRIAL LOCKED countdown in Profile
- Plan 03 (advance route) has its test scaffolds ready — vi.mock boilerplate already in place, stubs just need implementation
- All 13 xpEngine tests green (8 existing + 5 new), no regressions

## Self-Check: PASSED
- supabase/migrations/20260318000000_trial_cooldown.sql: FOUND
- src/lib/gameReducer.ts contains trialLastFailedAt: FOUND
- src/app/page.tsx contains trialLastFailedAt mapping: FOUND
- src/app/api/rank/advance/route.test.ts: FOUND
- Commits 18a375b and 8b88b65: FOUND

---
*Phase: 07-full-rank-trial-system*
*Completed: 2026-03-17*
