---
phase: 07-full-rank-trial-system
plan: "03"
subsystem: api
tags: [rank, trial, supabase, framer-motion, vitest, next-api-routes]

# Dependency graph
requires:
  - phase: 07-full-rank-trial-system
    plan: "01"
    provides: "trial_last_failed_at DB column + UserStats type + route stub tests"
  - phase: 07-full-rank-trial-system
    plan: "02"
    provides: "RankTrialEngine full-screen UI + showRankUp/rankUpResult state in Dashboard"

provides:
  - "POST /api/rank/advance — sole authority for rank advancement with dual-gate server validation"
  - "RankUpCeremony — animated badge reveal ceremony screen with Framer Motion sequences"
  - "Dashboard wired to show RankUpCeremony after trial pass, dismiss cleanly"
  - "/api/xp/award patched — no longer auto-advances hunter_rank"

affects:
  - "All future features that depend on rank gating — rank is now a hard gate via trial only"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-gate rank validation: level >= levelThreshold AND totalXp >= xpThreshold, re-derived server-side"
    - "Idempotency guard: if user.hunter_rank === nextInfo.nextRank return alreadyAdvanced:true"
    - "Non-fatal XP bonus: fetch to /api/xp/award in try/catch — rank advances even if XP fetch fails"
    - "RankUpCeremony fires ADD_NOTIFICATION on mount via useEffect with empty deps"

key-files:
  created:
    - src/app/api/rank/advance/route.ts
    - src/components/arise/RankUpCeremony.tsx
  modified:
    - src/app/api/rank/advance/route.test.ts
    - src/components/arise/Dashboard.tsx
    - src/app/api/xp/award/route.ts

key-decisions:
  - "XP bonus fetch to /api/xp/award is non-fatal — rank already persisted before fetch attempt"
  - "newRank and rankChanged removed from /api/xp/award response — downstream callers unaffected (rank only via /api/rank/advance)"
  - "RankUpCeremony onDismiss does not dispatch SET_USER — rank state set in RankTrialEngine.handleTrialPass before ceremony shows"
  - "hunter_rank removed from users select in xp/award — not needed once rank write removed"

patterns-established:
  - "Rank authority: hunter_rank written only by /api/rank/advance — xp/award, quests/update, and all other routes must not touch this column"

requirements-completed: []

# Metrics
duration: 34min
completed: 2026-03-17
---

# Phase 7 Plan 03: Rank Advancement Route + Ceremony Summary

**POST /api/rank/advance with dual-gate server validation, RankUpCeremony animated badge reveal, and hunter_rank bypass removed from /api/xp/award — trial is the sole path to rank promotion**

## Performance

- **Duration:** ~34 min
- **Started:** 2026-03-17T05:08:25Z
- **Completed:** 2026-03-17T05:41:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- POST /api/rank/advance handles 6 distinct cases: 401 (no auth), 404 (no user), 403 (dual-gate unmet), 200+failureRecorded (trial fail), 200+alreadyAdvanced (idempotent), 200+newRank+xpBonus (success)
- RankUpCeremony delivers sequenced Framer Motion badge reveal: old rank slides from left, arrow fades in at delay 0.4s, new rank springs in with glow at delay 0.7s
- /api/xp/award patched — hunter_rank column no longer written, rankFromLevelAndXp import removed, response cleaned up
- 7 new route tests all pass; full suite 33/33 green; TypeScript compiles clean

## Task Commits

1. **Task 1: Create POST /api/rank/advance route** - `dde26f6` (feat)
2. **Task 2: Create RankUpCeremony + wire Dashboard** - `a770db9` (feat)
3. **Task 3: Remove hunter_rank auto-advance from xp/award** - `ebcd26c` (fix)

## Files Created/Modified

- `src/app/api/rank/advance/route.ts` — New route: dual-gate validation, idempotency, failure recording, rank write, +5 stat points, XP bonus fetch
- `src/app/api/rank/advance/route.test.ts` — Replaced stub tests with 7 real tests covering all route branches
- `src/components/arise/RankUpCeremony.tsx` — Full-screen animated rank-up ceremony with badge reveal sequence and ACKNOWLEDGE RANK UP button
- `src/components/arise/Dashboard.tsx` — Uncommented RankUpCeremony import, replaced Plan 02 placeholder comment with live render
- `src/app/api/xp/award/route.ts` — Removed hunter_rank from select, update, and response; removed rankFromLevelAndXp import

## Decisions Made

- XP bonus fetch is non-fatal: wrapped in try/catch so rank persists even if /api/xp/award is unreachable during server-side fetch
- Removed `newRank` and `rankChanged` from /api/xp/award response — no consumers expected these post-patch; cleaner contract
- RankUpCeremony `onDismiss` does not redispatch SET_USER — rank state was already set by RankTrialEngine.handleTrialPass before the ceremony was shown; double-dispatch would be redundant

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed stale `newRank`/`rankChanged` variables from xp/award response**
- **Found during:** Task 3 (patch xp/award)
- **Issue:** After removing `rankFromLevelAndXp` call and hunter_rank update, the response still referenced `newRank` and `rankChanged` which were now undefined — would cause a TypeScript error
- **Fix:** Removed both variables from the response object; also removed `hunter_rank` from the DB select since it was only used for `rankChanged` calculation
- **Files modified:** src/app/api/xp/award/route.ts
- **Verification:** `grep -c "hunter_rank" route.ts` returns 0; `npx tsc --noEmit` exits 0
- **Committed in:** ebcd26c (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Required cleanup from removing rank derivation. No scope creep.

## Issues Encountered

None — all tasks executed cleanly.

## Next Phase Readiness

- Full trial flow is end-to-end complete: initiate trial → complete exercises → server validates + advances rank → animated ceremony → return to Dashboard
- Rank advancement is now a hard gate — only via /api/rank/advance after passing the trial
- Phase 07 plan 03 is the final implementation plan; phase is complete pending any verification tasks

---
*Phase: 07-full-rank-trial-system*
*Completed: 2026-03-17*
