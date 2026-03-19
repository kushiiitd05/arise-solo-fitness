---
phase: 15-exercise-guidance-system
plan: 02
subsystem: ui
tags: [framer-motion, react, typescript, animation, mana-gate, exercise-guide]

# Dependency graph
requires:
  - phase: 15-01
    provides: GET /api/exercise-guide and POST /api/exercise-guide/visual-unlock routes with ExerciseGuide type

provides:
  - ExerciseGuideModal component — self-contained modal with all 5 UI states, animations, API calls, mana gating
  - Drop-in component ready for WorkoutEngine integration in Plan 15-03

affects:
  - 15-03 (WorkoutEngine integration imports ExerciseGuideModal)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-contained modal pattern: all fetch calls, state machines, and animations inside component — nothing bleeds to parent"
    - "Framer Motion shake via variants with conditional animate prop (shouldShake ? 'shake' : 'idle')"
    - "AnimatePresence used for image reveal, tooltip, and outer overlay exit animation"
    - "onManaSpent callback with alreadyUnlocked guard: parent dispatches USE_MANA only on first unlock, not idempotent re-open"
    - "Cancellation token pattern (cancelled flag) on fetch to prevent setState after unmount"

key-files:
  created:
    - src/components/arise/ExerciseGuideModal.tsx
  modified: []

key-decisions:
  - "ExerciseGuideModal wraps its own overlay div (not SystemWindow) to match WorkoutEngine fixed inset-0 pattern — SystemWindow adds y:20 translate which conflicts with fixed-position overlay"
  - "shouldShake and showInsufficientTooltip as separate booleans — avoids coupling visual shake trigger to tooltip display (tooltip could be dismissed independently)"
  - "alreadyUnlocked guard in handleVisualUnlock prevents double mana deduction when user reopens a guide they already unlocked"
  - "Hover glow uses Tailwind arbitrary shadow value (hover:shadow-[...]) for CSS-native hover, static glow uses inline style on base state"

patterns-established:
  - "5-state modal pattern: loading | text-only | visual-pending | visual-unlocked | mana-insufficient"
  - "Shake animation: x:[0,-4,4,-4,4,0] 300ms linear via Framer Motion variants"
  - "Image reveal: initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} 400ms ease-out"

requirements-completed: [EG-01, EG-02, EG-03, EG-04, EG-05, EG-06]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 15 Plan 02: ExerciseGuideModal Summary

**Self-contained exercise guide modal with 5 visual states: loading skeleton, text guide (STEPS/MISTAKES/BREATHING/THE SYSTEM), visual pending, visual unlocked with fade-in image, and mana-insufficient shake — all Framer Motion animated.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T11:03:40Z
- **Completed:** 2026-03-19T11:07:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `ExerciseGuideModal.tsx` (345 lines) with full implementation — all 5 UI states, exact copy strings, and animation contracts from 15-UI-SPEC.md
- Shake animation (`x: [0, -4, 4, -4, 4, 0]`, 300ms linear) + INSUFFICIENT MANA tooltip for zero-mana click
- Image reveal animation (opacity 0→1, scale 0.95→1, 400ms ease-out) after successful visual unlock via POST /api/exercise-guide/visual-unlock
- `onManaSpent()` fires with `alreadyUnlocked` guard — no double mana deduction on reopened guides

## Task Commits

Each task was committed atomically:

1. **Task 1: ExerciseGuideModal component — all states and animations** - `e49130e` (feat)

**Plan metadata:** (docs commit — this summary)

## Files Created/Modified

- `src/components/arise/ExerciseGuideModal.tsx` — Standalone guide modal, all 5 visual states, API calls, mana-gating, shake + image animations

## Decisions Made

- ExerciseGuideModal wraps its own `motion.div` overlay (not SystemWindow) to match WorkoutEngine fixed inset-0 pattern — SystemWindow's `y: 20` translate conflicts with fixed-position overlay animation
- `alreadyUnlocked` guard in `handleVisualUnlock` prevents double mana deduction when user reopens a previously unlocked guide
- Hover glow uses Tailwind arbitrary shadow value for CSS-native hover state; static base glow uses inline style prop

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled cleanly. Single pre-existing error in `src/__tests__/chapterMapping.test.ts` (line 31, `TS2871`) is out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `ExerciseGuideModal` is a drop-in component ready for Plan 15-03 WorkoutEngine integration
- Import: `import { ExerciseGuideModal } from "@/components/arise/ExerciseGuideModal"`
- Props needed from WorkoutEngine: `exercise`, `userId`, `currentMana`, `onClose`, `onManaSpent`

---
*Phase: 15-exercise-guidance-system*
*Completed: 2026-03-19*
