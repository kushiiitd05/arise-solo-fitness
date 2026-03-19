---
phase: 08-dynamic-daily-quest-generation
plan: "08-01"
subsystem: quest-engine
tags: [quests, dynamic-generation, prng, difficulty-scaling, game-engine]

requires:
  - phase: 07-full-rank-trial-system
    provides: [xpEngine.ts JOB_CLASS_MODIFIERS, questService.ts DailyQuestItem]
provides:
  - questEngine.ts with selectQuestTypes, computeHistoryAdjustment, generateDynamicDailyQuests
  - DailyQuestItem.difficulty optional field (EASY/NORMAL/HARD)
affects: [08-02, POST /api/quests/daily, QuestBoard.tsx]

tech-stack:
  added: [LCG seeded PRNG, Fisher-Yates shuffle]
  patterns: [date-seeded determinism, 3-day history adaptation, anti-repeat pool filtering]

key-files:
  created:
    - src/lib/game/questEngine.ts
  modified:
    - src/lib/services/questService.ts

key-decisions:
  - "LCG PRNG (dateToSeed + makeRng) chosen for determinism without external deps"
  - "Anti-repeat uses filtered pool first, then fills from excluded if needed (graceful fallback when <4 unique types survive)"
  - "history rate 0→1 maps linearly to multiplier 0.8→1.2; EASY below -0.1 adjustment, HARD above +0.1"
  - "difficulty field stored in JSONB transparently — no DB schema change needed"

patterns-established:
  - "LCG pattern: dateToSeed(str) → makeRng(seed) → shuffle(arr, rng) for deterministic seeded randomness"
  - "History adaptation: 3-row completion rate drives ±20% multiplier with labeled difficulty tier"

requirements-completed: []

duration: ~5min
completed: "2026-03-17"
---

# Phase 8 Plan 08-01: questEngine.ts — Pool, Seeding, History Adaptation Summary

**7-type quest pool with date-seeded LCG rotation, anti-repeat filtering, and 3-day history ±20% difficulty adaptation exported as pure TypeScript engine with no external deps**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-17
- **Completed:** 2026-03-17
- **Tasks:** 2 (add difficulty field + create questEngine.ts)
- **Files modified:** 2

## Accomplishments

- Created `src/lib/game/questEngine.ts` with 3 exported functions: `selectQuestTypes`, `computeHistoryAdjustment`, `generateDynamicDailyQuests`
- Implemented date-seeded LCG PRNG (no external deps) for deterministic same-day quest rotation across all users
- Extended `DailyQuestItem` interface with optional `difficulty?: "EASY" | "NORMAL" | "HARD"` field — backward compatible

## Task Commits

Each task was committed atomically:

1. **Step 1: Add difficulty to DailyQuestItem + Step 2: Create questEngine.ts** - `536a5d6` (feat)

## Files Created/Modified

- `src/lib/game/questEngine.ts` — Full quest generation engine: QUEST_POOL (7 types), dateToSeed, makeRng (LCG), shuffle (Fisher-Yates), selectQuestTypes, computeHistoryAdjustment, generateDynamicDailyQuests
- `src/lib/services/questService.ts` — Added `difficulty?: "EASY" | "NORMAL" | "HARD"` to DailyQuestItem interface

## Decisions Made

- LCG PRNG (dateToSeed + makeRng) chosen for determinism without external deps — produces same 4 types for all users on same calendar date
- Anti-repeat logic: filtered pool (excluding yesterday's types) used first; if fewer than 4 survive, excluded types fill in (graceful fallback)
- history rate 0→1 maps linearly to multiplier 0.8→1.2; threshold at ±0.1 for EASY/HARD labels
- difficulty field is in the returned DailyQuestItem objects and stored in JSONB transparently — no DB schema change needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- questEngine.ts exports ready to be imported by POST /api/quests/daily (plan 08-02)
- DailyQuestItem.difficulty field available for QuestBoard badge rendering (plan 08-03)

---
*Phase: 08-dynamic-daily-quest-generation*
*Completed: 2026-03-17*
