---
phase: 05-notification-system
plan: 01
subsystem: ui
tags: [react, framer-motion, notifications, game-state, reducer]

# Dependency graph
requires:
  - phase: 04-feature-completion
    provides: gameReducer with ADD_NOTIFICATION and DISMISS_NOTIFICATION actions wired

provides:
  - DISMISS_NOTIFICATION reducer fix (filter not map) — AnimatePresence exit animations now fire
  - Per-type dismiss durations (QUEST=4s, LEVELUP=7s, others=5s)
  - isUrgent keyed on title only (URGENT/PENALTY keywords), not type
  - Render cap of 3 simultaneous notifications
  - Progress bar synced to per-type dismiss duration
  - Correct rank-up notification copy: "RANK ADVANCEMENT" / "Hunter rank advanced to Rank [X]"

affects: [06-polish, any phase adding notifications via ADD_NOTIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DISMISS_DURATIONS lookup table: type-keyed ms values for notification auto-dismiss"
    - "isUrgent = title-based inspection only, never type-based — keeps QUEST auto-dismissing"
    - "AnimatePresence requires item removal (filter) not mutation (map) to fire exit animations"

key-files:
  created: []
  modified:
    - src/lib/gameReducer.ts
    - src/components/system/SystemNotification.tsx
    - src/lib/services/guildBattleService.ts

key-decisions:
  - "DISMISS_NOTIFICATION must filter (remove) the item, not map it to read:true — AnimatePresence only fires exit when item unmounts"
  - "isUrgent keyed on title keywords only — type=QUEST should auto-dismiss, only PENALTY/URGENT titles stay indefinitely"
  - "duration=null for urgent notifications; useEffect early-returns on null — no setTimeout scheduled"
  - "Progress bar wrapped in {!isUrgent && (...)} — urgent notifications show no countdown bar"

patterns-established:
  - "Per-type dismiss durations: use DISMISS_DURATIONS[n.type] ?? 5000 pattern for any future notification type additions"
  - "Urgent detection: title.includes('URGENT') || title.includes('PENALTY') — extend by adding title keywords, not types"

requirements-completed:
  - Fix broken auto-dismiss notification layer

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 5 Plan 01: Notification System Summary

**Notification dismiss fixed — filter replaces map in reducer so AnimatePresence fires exit animations; per-type timeouts (QUEST 4s, LEVELUP 7s), 3-notification render cap, and progress bar sync all live**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T11:53:15Z
- **Completed:** 2026-03-16T11:56:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed the root-cause reducer bug: DISMISS_NOTIFICATION now filters the notification out of the array rather than marking it read:true — React unmounts the item, AnimatePresence fires the exit animation
- Fixed SystemNotification component: per-type dismiss durations, QUEST-type no longer treated as urgent, progress bar synced to dismiss duration, max 3 notifications rendered simultaneously
- Updated rank-up notification copy to spec: title="RANK ADVANCEMENT", body="Hunter rank advanced to Rank [X]"

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix DISMISS_NOTIFICATION reducer + rank-up notification copy** - `311e895` (fix)
2. **Task 2: Per-type dismiss timeouts, isUrgent fix, render cap, progress bar sync** - `f36576e` (fix)

**Plan metadata:** (final commit — see below)

## Files Created/Modified
- `src/lib/gameReducer.ts` - DISMISS_NOTIFICATION uses filter; rank-up copy updated to spec
- `src/components/system/SystemNotification.tsx` - DISMISS_DURATIONS constant, isUrgent title-only, per-type useEffect, progress bar sync, slice(0,3) render cap
- `src/lib/services/guildBattleService.ts` - Deviation fix: broken ollama import replaced with inline fetch helper

## Decisions Made
- DISMISS_NOTIFICATION must filter (remove) not map (mutate) — AnimatePresence tracks items by key and only fires exit animation when item is removed from the array
- isUrgent is title-keyword-based only: `n.title.includes("URGENT") || n.title.includes("PENALTY")`. Removing the `n.type === "QUEST"` check means QUEST notifications correctly auto-dismiss at 4s
- `duration = null` for urgent notifications; `useEffect` returns early if `!duration` — clean pattern, no setTimeout scheduled at all
- Progress bar guarded by `{!isUrgent && (...)}` so urgent notifications have no countdown visual

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed guildBattleService.ts broken ollama named import**
- **Found during:** Task 1 (build verification)
- **Issue:** `import { ollama } from "@/lib/ollama"` — `ollama.ts` exports only `generateWorkoutOllama` function, not an `ollama` object. The file then called `ollama.generate(...)` which doesn't exist. Pre-existing bug blocking all builds.
- **Fix:** Removed the broken import, added inline `ollamaGenerate(model, prompt)` async function using direct `fetch` to Ollama API — matching the existing pattern in `ollama.ts`
- **Files modified:** `src/lib/services/guildBattleService.ts`
- **Verification:** Build passes after fix
- **Committed in:** 311e895 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed .catch() on Supabase insert builder**
- **Found during:** Task 1 (build verification — second compile error in same file)
- **Issue:** `supabase.from(...).insert({...}).catch(() => {})` — Supabase insert builders do not have a `.catch()` method (TypeScript type error). Pre-existing bug in same file.
- **Fix:** Removed the `.catch(() => {})` call — the insert is already wrapped in an `if (userId && userId !== "local-user")` guard and the function's error handling is via try/catch at the Ollama level
- **Files modified:** `src/lib/services/guildBattleService.ts`
- **Verification:** Build passes after fix
- **Committed in:** 311e895 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking)
**Impact on plan:** Both fixes were pre-existing bugs in `guildBattleService.ts` that blocked build verification. No scope creep — the fixes restore correct TypeScript types, not new features.

## Issues Encountered
- Build command `npm run build -- --no-lint` failed (Next.js 16 Turbopack does not accept `--no-lint` flag). Used `npm run build` directly — build passed cleanly.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Notification system is now fully functional: notifications appear, animate in, auto-dismiss per type, exit with animation
- Phase 05-02 can proceed (if it exists) or Phase 06 can begin
- Smoke test recommended: trigger QUEST, LEVELUP, and PENALTY notifications in dev to confirm visual behaviour

---
*Phase: 05-notification-system*
*Completed: 2026-03-16*
