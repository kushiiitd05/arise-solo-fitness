---
phase: 08-dynamic-daily-quest-generation
plan: "02"
subsystem: api
tags: [quests, dynamic-generation, difficulty-scaling, supabase, history-adaptation]

requires:
  - phase: 08-01
    provides: generateDynamicDailyQuests function from questEngine.ts, HistoryRow type, DailyQuestItem with difficulty field
provides:
  - POST /api/quests/daily wired to dynamic engine with 3-day history + anti-repeat context
affects: [QuestBoard.tsx, daily quest generation for all users]

tech-stack:
  added: []
  patterns: [parallel supabase queries for history context before generation, JSONB transparency for new difficulty field]

key-files:
  created: []
  modified:
    - src/app/api/quests/daily/route.ts

key-decisions:
  - "3-day history fetched via .in(quest_date, threeDaysAgo) — single query covers adaptation window"
  - "Yesterday types extracted from quests JSONB column via .maybeSingle() — graceful empty array fallback"
  - "generateDynamicDailyQuests replaces generateDailyQuestTargets — no mapping step needed, engine returns full DailyQuestItem[]"
  - "difficulty field persists in JSONB transparently — no DB schema change required"

patterns-established:
  - "Context-first generation: fetch history/prior-types before calling generator to enable adaptation"
  - "Graceful fallback: historyRes.data ?? [] and previousTypes: string[] = [] ensure safe defaults for new users"

requirements-completed: []

duration: ~3min
completed: "2026-03-17"
---

# Phase 08 Plan 02: Update POST /api/quests/daily — Wire Dynamic Engine Summary

**POST /api/quests/daily now fetches 3-day completion history and yesterday's quest types before calling generateDynamicDailyQuests, enabling difficulty adaptation and anti-repeat rotation for all users**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-17
- **Completed:** 2026-03-17
- **Tasks:** 1 (single-file edit)
- **Files modified:** 1

## Accomplishments

- Replaced static `generateDailyQuestTargets` import with `generateDynamicDailyQuests` from questEngine
- Added 3-day history query using `.in("quest_date", threeDaysAgo)` — feeds `computeHistoryAdjustment` for ±20% difficulty scaling
- Added yesterday's quests JSONB query (`.maybeSingle()`) to extract `previousTypes` array for anti-repeat
- Single `generateDynamicDailyQuests(level, jobClass, date, historyRows, previousTypes)` call replaces old targets + map block
- Inserted JSONB now includes `difficulty` field transparently — no DB migration needed

## Task Commits

1. **Task 1: Wire dynamic quest engine into POST /api/quests/daily** - `8896027` (feat)

## Files Created/Modified

- `src/app/api/quests/daily/route.ts` - POST handler updated: import swapped, history/previousTypes queries added, generation call updated; GET handler unchanged

## Decisions Made

- 3-day history fetched as a single `.in()` query — covers the full adaptation window in one round trip
- `yesterdayRes.data?.quests` cast to `Array<{ type: string }>` with `Array.isArray` guard — handles null/non-array JSONB gracefully
- No mapping step after generation — `generateDynamicDailyQuests` already returns `DailyQuestItem[]` with all required fields

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dynamic quest API fully wired — Plan 08-03 can now add difficulty badge UI to QuestBoard (already completed as part of original phase execution)
- All acceptance criteria verified: import changed, history fetched, previousTypes extracted, engine called with correct signature, JSONB includes difficulty

---
*Phase: 08-dynamic-daily-quest-generation*
*Completed: 2026-03-17*
