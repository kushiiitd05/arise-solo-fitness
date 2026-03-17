---
phase: 8
plan: "08-01 + 08-02 + 08-03"
subsystem: quest-engine
tags: [quests, dynamic-generation, difficulty-scaling, ui-badge]
dependency_graph:
  requires: [xpEngine.ts, questService.ts, supabase daily_quests table]
  provides: [questEngine.ts, difficulty-adaptive quests, difficulty badge UI]
  affects: [POST /api/quests/daily, QuestBoard.tsx]
tech_stack:
  added: [LCG seeded PRNG, Fisher-Yates shuffle, 3-day history adaptation]
  patterns: [date-seeded deterministic generation, ±20% adaptive difficulty, JSONB transparency]
key_files:
  created:
    - src/lib/game/questEngine.ts
  modified:
    - src/lib/services/questService.ts
    - src/app/api/quests/daily/route.ts
    - src/components/arise/QuestBoard.tsx
decisions:
  - LCG PRNG (dateToSeed + makeRng) chosen for determinism without external deps
  - Anti-repeat uses filtered pool first, then fills from excluded if needed (graceful fallback)
  - history rate 0→1 maps linearly to multiplier 0.8→1.2; EASY below -0.1, HARD above +0.1
  - difficulty field stored in JSONB transparently — no DB schema change needed
  - Badge renders only when quest.difficulty is defined — backward compatible with existing rows
metrics:
  duration: "~8 minutes"
  completed_date: "2026-03-17"
  tasks_completed: 3
  files_created: 1
  files_modified: 3
---

# Phase 8 Plans 08-01/02/03: Dynamic Daily Quest Generation Summary

Dynamic quest generation engine with 7-type pool, date-seeded LCG rotation, 3-day history adaptation (±20%), and difficulty badges per quest card in QuestBoard.

## What Was Built

### Plan 08-01 — questEngine.ts + DailyQuestItem extension

Created `src/lib/game/questEngine.ts` with:

- `QUEST_POOL`: 7 quest types (PUSHUP, SQUAT, SITUP, CARDIO, BURPEE, PLANK, LUNGE) each with statKey, baseMult, xpMult
- Internal `dateToSeed` (djb2-style hash), `makeRng` (LCG), `shuffle` (Fisher-Yates) helpers
- `selectQuestTypes(dateStr, previousTypes)` — date-seeded, anti-repeat selection of 4 types
- `computeHistoryAdjustment(historyRows)` — 3-day completion rate → 0.8–1.2 multiplier + difficulty label
- `generateDynamicDailyQuests(level, jobClass, dateStr, historyRows, previousTypes)` — full DailyQuestItem[] with difficulty

Extended `DailyQuestItem` interface with `difficulty?: "EASY" | "NORMAL" | "HARD"`.

### Plan 08-02 — POST /api/quests/daily route

- Replaced `generateDailyQuestTargets` import with `generateDynamicDailyQuests` from questEngine
- Added 3-day history query using `.in("quest_date", threeDaysAgo)` for adaptation input
- Added yesterday's quests JSONB query (`.maybeSingle()`) to extract `previousTypes` for anti-repeat
- Single `generateDynamicDailyQuests(...)` call replaces old targets/map block
- Inserted JSONB now includes `difficulty` field transparently

### Plan 08-03 — QuestBoard difficulty badge + empty state

- Difficulty badge: absolute top-right z-20, inside each quest card outer div
- Colors: EASY `#10B981`, NORMAL `#06B6D4`, HARD `#EF4444` (bg/10, border/40, text full)
- Font: `font-title font-black text-[9px] tracking-[0.15em] uppercase`
- `aria-label="Difficulty: EASY"` (or NORMAL/HARD) for accessibility
- Badge conditional on `quest.difficulty` — backward compatible with existing rows lacking field
- Empty state block: renders when `dailyQuests.length === 0` and not loading/error

## Commits

| Hash    | Plan  | Description |
|---------|-------|-------------|
| 536a5d6 | 08-01 | feat: questEngine 7-type pool, seeding, history adaptation |
| 8896027 | 08-02 | feat: wire dynamic engine into POST /api/quests/daily |
| 830e96c | 08-03 | feat: QuestBoard difficulty badge + empty state |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/lib/game/questEngine.ts: FOUND
- src/lib/services/questService.ts: FOUND
- src/app/api/quests/daily/route.ts: FOUND
- src/components/arise/QuestBoard.tsx: FOUND
- Commit 536a5d6: FOUND
- Commit 8896027: FOUND
- Commit 830e96c: FOUND
- TypeScript: no errors
