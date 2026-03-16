---
phase: 07-full-rank-trial-system
plan: "02"
subsystem: ui
tags: [react, framer-motion, next.js, gamification, rank-system]

requires:
  - phase: 07-01
    provides: trial_last_failed_at DB column + UserStats.trialLastFailedAt type extension + Wave 0 test scaffolds

provides:
  - RankTrialEngine.tsx full-screen trial workout component (intro/active/failed/passed phases)
  - Profile.tsx INITIATE RANK TRIAL button with dual-gate eligibility and 24h cooldown display
  - Dashboard.tsx showTrial state + RankTrialEngine conditional render wired to onTrialPass

affects:
  - 07-03 (creates /api/rank/advance route — RankTrialEngine already calls it)
  - RankUpCeremony (Plan 03 creates this, Dashboard.tsx has commented import + showRankUp state ready)

tech-stack:
  added: []
  patterns:
    - "4-exercise trial loop with per-exercise rep counter, progress bar, and auto-advance on target completion"
    - "handleTrialFail dispatches ADD_NOTIFICATION SYSTEM + calls /api/rank/advance trialPassed:false for cooldown record"
    - "IIFE pattern inside JSX for eligibility + cooldown display in Profile RANK_PROGRESSION block"
    - "useMemo for trial targets derivation to avoid recompute on every render"

key-files:
  created:
    - src/components/arise/RankTrialEngine.tsx
  modified:
    - src/components/arise/Profile.tsx
    - src/components/arise/Dashboard.tsx

key-decisions:
  - "RankTrialEngine uses useMemo for trialTargets — level/jobClass rarely change, memoize to avoid recalculating on every render"
  - "handleTrialFail is async so cooldown POST to /api/rank/advance fires even when abandon overlay triggers onClose immediately"
  - "Dashboard.tsx showRankUp + rankUpResult state vars added now so Plan 03 only needs to add RankUpCeremony import and render — no re-wiring needed"

patterns-established:
  - "Trial fail path: setTrialPhase(failed) -> POST /api/rank/advance trialPassed:false -> dispatch ADD_NOTIFICATION SYSTEM"
  - "Trial pass path: POST /api/rank/advance trialPassed:true -> dispatch SET_USER rank -> call onTrialPass callback"

requirements-completed: []

duration: 12min
completed: 2026-03-17
---

# Phase 7 Plan 02: Rank Trial UI Summary

**Full-screen RankTrialEngine with 4-exercise loop, Profile INITIATE TRIAL button (3 states: eligible/locked/disabled), and Dashboard showTrial wiring — trial pass calls /api/rank/advance (active in Plan 03)**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-16T23:26:57Z
- **Completed:** 2026-03-16T23:38:57Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- RankTrialEngine.tsx: complete full-screen component with intro/active/failed/passed phases, 4 exercise cards with 2x targets, per-exercise +1 REP counter, abandon confirmation overlay at z-[300]
- Profile.tsx: INITIATE RANK TRIAL button shows 3 states — active gold (dual gates met), disabled/faded (gates not met), TRIAL LOCKED countdown when 24h cooldown active via trialLastFailedAt
- Dashboard.tsx: showTrial state, onTrialStart callback wired from Profile, RankTrialEngine renders as full-screen takeover on trial start

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RankTrialEngine.tsx** - `7906dbe` (feat)
2. **Task 2: Wire Profile.tsx + Dashboard.tsx** - `1d449e4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/arise/RankTrialEngine.tsx` - Full-screen trial workout component (new)
- `src/components/arise/Profile.tsx` - Added onTrialStart prop + INITIATE TRIAL button block inside RANK_PROGRESSION
- `src/components/arise/Dashboard.tsx` - Added RankTrialEngine import, showTrial/showRankUp/rankUpResult state, Profile.onTrialStart wiring

## Decisions Made

- RankTrialEngine uses `useMemo` for trialTargets — level/jobClass rarely change, memoize to avoid recompute
- `handleTrialFail` is async so cooldown POST fires even when abandon overlay triggers `onClose()` immediately after
- Dashboard state vars `showRankUp` and `rankUpResult` added now so Plan 03 only needs to add the RankUpCeremony import and render — no re-wiring needed in Plan 03

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The only TypeScript error at verification is the pre-existing test stub `src/app/api/rank/advance/route.test.ts` referencing `./route` which doesn't exist yet — this is the expected Wave 0 test scaffold from Plan 01, to be replaced by Plan 03.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RankTrialEngine already calls `POST /api/rank/advance` — Plan 03 creates that route and the stubs become real assertions
- Dashboard has `showRankUp` + `rankUpResult` state ready; Plan 03 adds `RankUpCeremony` component and uncomments the import
- TypeScript compiles cleanly (only error is expected Plan 03 missing route)

---
*Phase: 07-full-rank-trial-system*
*Completed: 2026-03-17*

## Self-Check: PASSED

- FOUND: src/components/arise/RankTrialEngine.tsx
- FOUND: src/components/arise/Profile.tsx
- FOUND: src/components/arise/Dashboard.tsx
- FOUND commit: 7906dbe (RankTrialEngine)
- FOUND commit: 1d449e4 (Profile + Dashboard wiring)
