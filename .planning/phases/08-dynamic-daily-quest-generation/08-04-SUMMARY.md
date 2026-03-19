---
phase: 08-dynamic-daily-quest-generation
plan: "08-04"
subsystem: api
tags: [quest-engine, dynamic-generation, questService, userService]

# Dependency graph
requires:
  - phase: 08-01
    provides: generateDynamicDailyQuests function in questEngine.ts
  - phase: 08-02
    provides: POST /api/quests/daily using dynamic engine for returning users
  - phase: 08-03
    provides: QuestBoard UI difficulty badge display
provides:
  - generateDailyQuestsForUser now calls generateDynamicDailyQuests (closes last static bypass path)
  - All new users on signup receive level-and-job-class-scaled daily quests
  - Static hardcoded 60/60/60/4km quest array fully eliminated from questService.ts
affects: [userService, questService, Phase 08 VERIFICATION truth 5]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fetch user row before generating quests — level + job_class determine scaling"
    - "Pass empty arrays for historyRows and previousTypes for brand-new users (no history yet)"

key-files:
  created: []
  modified:
    - src/lib/services/questService.ts

key-decisions:
  - "generateDailyQuestsForUser fetches level/job_class from users table with anon client (already used for existing-row guard)"
  - "Empty arrays passed for historyRows and previousTypes on new user signup — computeHistoryAdjustment returns NORMAL difficulty gracefully"
  - "Function signature (userId: string) kept unchanged — userService.ts call site at line 65 requires no modification"

patterns-established:
  - "Copy-don't-import pattern maintained — questService is self-contained, no new shared helpers added"

requirements-completed:
  - "New user quest generation uses dynamic engine"

# Metrics
duration: 8min
completed: 2026-03-19
---

# Phase 8 Plan 04: Gap Closure — Static Quest Array Removal Summary

**generateDailyQuestsForUser now calls generateDynamicDailyQuests, closing the last static bypass path so every new user signup receives level-adaptive, job-class-scaled daily quests instead of hardcoded 60/60/60/4km targets**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-19T12:05:00Z
- **Completed:** 2026-03-19T12:13:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced static quest array (Push-Ups 60, Squats 60, Sit-Ups 60, Running 4km) with `generateDynamicDailyQuests` call
- Added fetch of `level` and `job_class` from `users` table inside `generateDailyQuestsForUser` so quest targets scale correctly for new hunters
- Closed Phase 08 VERIFICATION truth 5: "All paths to quest generation use the dynamic engine"
- Kept `userService.ts` completely unchanged — call chain `userService → questService → questEngine` intact

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace static quest array with dynamic engine call** - `10607d8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/services/questService.ts` — added `generateDynamicDailyQuests` import, removed static array, added user row fetch + dynamic call

## Decisions Made

- Fetching `level` and `job_class` inline within `generateDailyQuestsForUser` using the existing anon supabase client — consistent with the existing-row guard query already in the function
- Empty arrays for `historyRows` and `previousTypes` are correct for new users: `computeHistoryAdjustment([])` returns `{ multiplier: 1.0, difficulty: "NORMAL" }` and `selectQuestTypes(today, [])` picks 4 types without exclusion constraints

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing unrelated TypeScript error in `src/__tests__/chapterMapping.test.ts:31` (TS2871 "always nullish") — not introduced by this change, out of scope, not fixed.

## Verification Results

```
# 1. Dynamic import present (2 matches: import line + call site)
2:import { generateDynamicDailyQuests } from "@/lib/game/questEngine";
96:  const quests = generateDynamicDailyQuests(level, jobClass, today, [], []);

# 2. Static array gone (0 matches)
grep -c "Push-Ups|Squats|Sit-Ups|target: 60|xp_reward: 150" => 0

# 3. userService.ts call site untouched (2 matches: import + call)
2:import { generateDailyQuestsForUser } from "@/lib/services/questService";
65:  await generateDailyQuestsForUser(params.id);

# 4. TypeScript: no errors in questService.ts, userService.ts, or questEngine.ts
```

## Next Phase Readiness

- Phase 08 fully complete — all 5 VERIFICATION truths now satisfied
- Dynamic quest engine is the sole path for all quest generation (new users via `generateDailyQuestsForUser`, returning users via POST `/api/quests/daily`)
- No blockers

---
*Phase: 08-dynamic-daily-quest-generation*
*Completed: 2026-03-19*
