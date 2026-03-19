---
phase: 15-exercise-guidance-system
plan: 03
subsystem: ui
tags: [react, framer-motion, lucide-react, workout, mana, modal]

requires:
  - phase: 15-01
    provides: GET /api/exercise-guide route and POST /api/exercise-guide/visual-unlock route
  - phase: 15-02
    provides: ExerciseGuideModal component with all 5 visual states

provides:
  - Guide button (HelpCircle, cyan, absolute top-right) on each exercise card in WorkoutEngine select phase
  - ExerciseGuideModal wired into WorkoutEngine with exercise data, userId, mana, and dispatch

affects:
  - WorkoutEngine (modified)
  - ExerciseGuideModal (consumed as integration target)

tech-stack:
  added: []
  patterns:
    - Guide button nested inside card button — uses e.stopPropagation() to prevent card selection when tapping guide
    - AnimatePresence wrapper outside phase AnimatePresence block — modal renders independently of phase transitions
    - Modal rendered at motion.div sibling level (not inside inner panel) so its z-[60] overlay covers entire screen

key-files:
  created: []
  modified:
    - src/components/arise/WorkoutEngine.tsx

key-decisions:
  - "GuideExercise state initialized to null — modal hidden by default, set on guide button tap"
  - "e.stopPropagation() applied on guide button onClick — prevents card selection while opening guide"
  - "ExerciseGuideModal rendered outside inner panel motion.div but inside outer motion.div — modal's own z-[60] overlay handles full-screen coverage"
  - "userId extracted directly from state.user.id (string field in GameState) — no any cast needed"
  - "onManaSpent dispatches USE_MANA: 1 via arrow function — WorkoutEngine owns dispatch, modal owns no reducer knowledge"

requirements-completed: [EG-01, EG-02, EG-03, EG-04, EG-05, EG-06]

duration: 8min
completed: 2026-03-19
---

# Phase 15 Plan 03: Exercise Guidance System — WorkoutEngine Integration Summary

**HelpCircle guide button added to each exercise card in WorkoutEngine; ExerciseGuideModal wired via AnimatePresence with userId, mana, and USE_MANA dispatch**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-19T11:10:00Z
- **Completed:** 2026-03-19T16:50:00Z
- **Tasks:** 2 of 2 (all complete — visual verification approved)
- **Files modified:** 1

## Accomplishments
- Added HelpCircle icon (cyan, opacity-60, hover opacity-100) as absolute top-right button on each exercise card
- Guide button uses e.stopPropagation() — tapping guide does not select the exercise card
- ExerciseGuideModal renders in separate AnimatePresence block, receives exercise id/name/description, userId, currentMana, onClose, onManaSpent
- Mana deduction wired: onManaSpent dispatches USE_MANA payload 1 to reducer
- Workout timer and rep counter are completely unaffected — modal is pure overlay, no workout state modification

## Task Commits

1. **Task 1: Wire guide button and ExerciseGuideModal into WorkoutEngine** - `59335a2` (feat)
2. **Task 2: Visual verification** - approved by user (human checkpoint passed)

## Files Created/Modified
- `src/components/arise/WorkoutEngine.tsx` — HelpCircle import, ExerciseGuideModal import, guideExercise state, userId extraction, guide button per card, AnimatePresence modal render

## Decisions Made
- e.stopPropagation() applied on guide button per RESEARCH.md pitfall 6 analysis — prevents exercise card from being selected when user intends only to open the guide
- ExerciseGuideModal rendered as sibling to inner max-w-md panel (not inside it) since modal has its own fixed inset-0 z-[60] overlay that covers the full screen regardless of DOM position
- userId pulled directly from state.user.id (typed as string in GameState) — no any cast needed unlike the mana field

## Deviations from Plan
None - plan executed exactly as written. The e.stopPropagation() note in the plan interfaces already flagged this as the correct behavior, and it was applied as specified.

## Issues Encountered
None — TypeScript compiled cleanly for WorkoutEngine.tsx and ExerciseGuideModal.tsx. One pre-existing TS error in src/__tests__/chapterMapping.test.ts exists but is unrelated to this plan.

## User Setup Required
None - no external service configuration required.

## Verification Results

- `npx vitest run src/app/api/exercise-guide`: 10 tests across 2 test files — all passed
- `npx tsc --noEmit`: 0 errors in WorkoutEngine.tsx and ExerciseGuideModal.tsx (one pre-existing error in unrelated chapterMapping.test.ts)
- Human visual verification: all 10 steps approved

## Next Phase Readiness
- Phase 15 (Exercise Guidance System) is fully complete — all 3 plans delivered
- DB/API layer (15-01), modal component (15-02), and WorkoutEngine integration (15-03) all shipped and verified
- No blockers for subsequent phases

---
*Phase: 15-exercise-guidance-system*
*Completed: 2026-03-19*
