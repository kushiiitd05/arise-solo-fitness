---
phase: 08-dynamic-daily-quest-generation
plan: "03"
subsystem: ui
tags: [react, tailwind, typescript, questboard, accessibility]

# Dependency graph
requires:
  - phase: 08-01
    provides: DailyQuestItem difficulty field (EASY/NORMAL/HARD) on quest objects
  - phase: 08-02
    provides: POST /api/quests/daily returning quests with difficulty populated
provides:
  - QuestBoard difficulty badge — absolute top-right, hex colors, aria-label
  - Empty state block for zero-quest scenario after successful load
affects: [QuestBoard, daily-quest-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline conditional className via cn() for badge color variants (EASY/NORMAL/HARD hex palette)"
    - "Conditional render guard (quest.difficulty &&) for backward compat with legacy rows lacking the field"

key-files:
  created: []
  modified:
    - src/components/arise/QuestBoard.tsx

key-decisions:
  - "Badge renders only when quest.difficulty is defined — backward compatible with existing rows lacking field"

patterns-established:
  - "Difficulty badge: absolute top-right z-20, 9px font-title tracking-[0.15em], border opacity /40, bg opacity /10"
  - "Empty state: NO_ACTIVE_MISSIONS_DETECTED with System-voice copy inside motion.div daily tab block"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 08 Plan 03: QuestBoard Difficulty Badge UI Summary

**Difficulty badge (EASY/NORMAL/HARD) added to each quest card in QuestBoard daily tab — absolute top-right, hex color-coded, aria-label, with empty state for zero-quest cycles**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-17
- **Completed:** 2026-03-17
- **Tasks:** 1 (badge + empty state implemented atomically)
- **Files modified:** 1

## Accomplishments
- Inline difficulty badge rendered at top-right of each quest card when `quest.difficulty` is defined
- Three-color system: green `#10B981` (EASY), cyan `#06B6D4` (NORMAL), red `#EF4444` (HARD) — bg/10, border/40, text at full opacity
- Badge has `aria-label="Difficulty: EASY|NORMAL|HARD"` for accessibility
- Badge absent (no render) when `quest.difficulty` is undefined — backward compatible with existing rows
- Empty state panel renders when `dailyQuests.length === 0` after load with no error: "NO_ACTIVE_MISSIONS_DETECTED" in System voice copy

## Task Commits

1. **Task 1: QuestBoard difficulty badge + empty state** - `830e96c` (feat)

**Plan metadata:** (pending — created in this execution)

## Files Created/Modified
- `src/components/arise/QuestBoard.tsx` — Added difficulty badge JSX inside card map (lines 171–186) and empty state block (lines 241–250)

## Decisions Made
- Badge renders only when `quest.difficulty` is defined — no breaking change for quests seeded before 08-01/08-02 were deployed
- Badge placed inside card outer `div` before the `z-10` content row — does not overlap XP reward text on the right side of the name row

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. TypeScript compiles clean on QuestBoard.tsx. Pre-existing error in `src/__tests__/chapterMapping.test.ts` is unrelated and predates this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Difficulty badges are visible in QuestBoard daily tab when the API returns quests with `difficulty` populated (08-02)
- Phase 08-04 (gap closure — wire dynamic engine into `generateDailyQuestsForUser`) is the remaining open plan in this phase

---
*Phase: 08-dynamic-daily-quest-generation*
*Completed: 2026-03-17*
