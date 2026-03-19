---
phase: 08-dynamic-daily-quest-generation
verified: 2026-03-19T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "All paths to quest generation use the dynamic engine (no fixed template bypasses)"
    status: partial
    reason: "questService.ts::generateDailyQuestsForUser() still uses 4 hardcoded static quests (Push-Ups 60, Squats 60, Sit-Ups 60, Running 4km) and is called by userService.ts for new user signup. New users receive fixed quests on their first day instead of level-adaptive dynamic quests."
    artifacts:
      - path: "src/lib/services/questService.ts"
        issue: "generateDailyQuestsForUser (lines 72-100) builds a static DailyQuestItem[] with fixed targets and 4 fixed types (PUSHUP, SQUAT, SITUP, RUNNING). No call to generateDynamicDailyQuests."
      - path: "src/lib/services/userService.ts"
        issue: "createUser() calls generateDailyQuestsForUser (line 65) — every new user gets the static path, bypassing the engine for their first daily quest set."
    missing:
      - "Update generateDailyQuestsForUser in questService.ts to call POST /api/quests/daily (via fetch) or call generateDynamicDailyQuests directly after fetching level + job_class."
      - "Alternatively, remove generateDailyQuestsForUser entirely and route userService.ts to call the POST /api/quests/daily route."
human_verification:
  - test: "Visual badge rendering — complete a full day cycle and observe EASY/NORMAL/HARD labels on quest cards"
    expected: "Each card shows a small badge in the top-right corner with correct color (green/cyan/red) matching the difficulty label"
    why_human: "CSS opacity-slash syntax and absolute positioning can only be confirmed in a rendered browser view"
  - test: "Anti-repeat across days — generate quests two days in a row and compare quest type lists"
    expected: "The second day's 4 types should differ from the first day's 4 types (no exact repeat set)"
    why_human: "Requires actual database state with a real user's yesterday row; cannot simulate with grep"
  - test: "Difficulty escalation — log in as a user with 3 consecutive all_completed=true days and trigger quest generation"
    expected: "Quests have difficulty=HARD and targets ~20% above the baseline for that level"
    why_human: "Requires real Supabase data and live POST /api/quests/daily call"
---

# Phase 8: Dynamic Daily Quest Generation — Verification Report

**Phase Goal:** Replace fixed quest templates with a level-adaptive generation engine. Quests scale in difficulty and variety based on hunter level and recent completion history.
**Verified:** 2026-03-19
**Status:** gaps_found — 4 of 5 must-haves verified; 1 partial (bypass path not updated)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Engine generates 4 quests scaled to hunter level with job-class modifiers | VERIFIED | `generateDynamicDailyQuests` uses `Math.max(10, Math.floor(level * 2))` base and applies `JOB_CLASS_MODIFIERS[jobClass]` per stat key (questEngine.ts lines 153-163) |
| 2 | Quest types rotate daily (date-seeded) and avoid yesterday's types (anti-repeat) | VERIFIED | `selectQuestTypes(dateStr, previousTypes)` hashes dateStr to LCG seed, filters previous types from pool, fills from excluded only if needed (questEngine.ts lines 81-102) |
| 3 | Difficulty adapts from last 3 days of completion history (±20%) | VERIFIED | `computeHistoryAdjustment` maps completion rate 0→1 to multiplier 0.8→1.2; route queries `.in("quest_date", threeDaysAgo)` and passes result to engine (route.ts lines 61-73, questEngine.ts lines 114-135) |
| 4 | QuestBoard displays difficulty badge per card (EASY/NORMAL/HARD) with correct colors | VERIFIED | Conditional badge block at QuestBoard.tsx lines 171-186 with aria-label, absolute top-right z-20, correct hex colors per UI-SPEC |
| 5 | All paths to quest generation use the dynamic engine (no fixed template bypasses) | PARTIAL | POST /api/quests/daily uses dynamic engine correctly. However `questService.ts::generateDailyQuestsForUser()` remains as a static-template fallback, called by `userService.ts::createUser()` for every new user signup |

**Score:** 4/5 truths fully verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/game/questEngine.ts` | Core engine with 3 exports + pool + seeding helpers | VERIFIED | 178 lines, substantive. Exports `selectQuestTypes`, `computeHistoryAdjustment`, `generateDynamicDailyQuests`. All seeding internals (dateToSeed, makeRng, shuffle) present. |
| `src/lib/services/questService.ts` | `DailyQuestItem` extended with `difficulty?` | VERIFIED | Line 12: `difficulty?: "EASY" \| "NORMAL" \| "HARD"` present in interface |
| `src/app/api/quests/daily/route.ts` | POST handler uses dynamic engine; fetches 3-day history and yesterday's types | VERIFIED | Import is `generateDynamicDailyQuests` from questEngine (line 3). 3-day history query at lines 61-73. Yesterday's types extraction at lines 76-85. Engine called with all 5 args at line 88. |
| `src/components/arise/QuestBoard.tsx` | Difficulty badge on each quest card + empty state | VERIFIED | Badge block lines 171-186 (conditional on `quest.difficulty`, correct colors). Empty state block lines 241-250. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `route.ts` POST | `questEngine.ts` | `import { generateDynamicDailyQuests }` | WIRED | Line 3 import confirmed. Called at line 88 with `(level, jobClass, date, historyRows, previousTypes)` |
| `questEngine.ts` | `xpEngine.ts` | `import { JOB_CLASS_MODIFIERS }` | WIRED | Line 7 import confirmed. `JOB_CLASS_MODIFIERS` includes `NONE` key (xpEngine.ts line 170) — fallback resolves safely |
| `questEngine.ts` | `questService.ts` | `import { DailyQuestItem }` | WIRED | Line 8 import confirmed. Return type of `generateDynamicDailyQuests` is `DailyQuestItem[]` |
| `QuestBoard.tsx` | `questService.ts` | `getDailyQuests` fetch | WIRED | Line 6 import + called in useEffect (line 34). Quest data passed to card map with `quest.difficulty` reference at line 172. |
| `route.ts` | supabase `daily_quests` | 3-day history query | WIRED | `.select("all_completed").eq("user_id", userId).in("quest_date", threeDaysAgo)` at lines 67-71 |
| `route.ts` | supabase `daily_quests` | yesterday's types query | WIRED | `.select("quests").eq("user_id", userId).eq("quest_date", threeDaysAgo[0]).maybeSingle()` at lines 76-81 |
| `userService.ts` | `questService.ts` | `generateDailyQuestsForUser` (bypass) | ORPHANED/BROKEN | Called at userService.ts line 65 for new user creation. This function uses static hardcoded quests (4 fixed types, fixed targets), not the dynamic engine. New users receive static quests on signup. |

---

## Requirements Coverage

No `REQUIREMENTS.md` file exists in `.planning/`. Requirements were derived from plan frontmatter and phase goal. No orphaned requirement IDs to flag.

| Requirement | Source Plan | Description | Status |
|-------------|-------------|-------------|--------|
| 7-type quest pool with statKey modifiers | 08-01 | PUSHUP, SQUAT, SITUP, CARDIO, BURPEE, PLANK, LUNGE each mapped to strength/vitality/agility | SATISFIED |
| Date-seeded deterministic generation | 08-01 | Same date always produces same quest type set for all users | SATISFIED |
| Anti-repeat (exclude yesterday's types) | 08-01 | `selectQuestTypes` filters previousTypes from pool before shuffling | SATISFIED |
| 3-day history adaptation ±20% | 08-01 | `computeHistoryAdjustment` maps completion rate to 0.8–1.2 multiplier | SATISFIED |
| `difficulty` field on `DailyQuestItem` | 08-01 | Optional field with EASY/NORMAL/HARD union type | SATISFIED |
| POST route wired to dynamic engine | 08-02 | `generateDailyQuestTargets` replaced with `generateDynamicDailyQuests` in API route | SATISFIED |
| POST route fetches 3-day history | 08-02 | `.in("quest_date", threeDaysAgo)` query present | SATISFIED |
| POST route fetches yesterday's types | 08-02 | `.maybeSingle()` query on threeDaysAgo[0] present | SATISFIED |
| Difficulty badge in QuestBoard | 08-03 | Absolute top-right badge, conditional on `quest.difficulty` | SATISFIED |
| Empty state in QuestBoard | 08-03 | Renders when `dailyQuests.length === 0` and not loading/error | SATISFIED |
| New user quest generation uses dynamic engine | 08-02 (implicit) | Phase goal: "Replace fixed quest templates" | NOT SATISFIED — `generateDailyQuestsForUser` in questService.ts still uses static templates and is called by userService.ts for every new user |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/services/questService.ts` | 85-90 | Static hardcoded quest array: 4 fixed types, fixed targets (60/60/60/4), no level/jobClass lookup | BLOCKER | New users on signup always receive non-adaptive quests via `userService.ts::createUser()`. Phase goal ("replace fixed quest templates") is not fully achieved — the static path co-exists and is actively called. |
| `src/lib/services/questService.ts` | 72-100 | `generateDailyQuestsForUser` — entire function is a static-template fallback that predates the dynamic engine. It was not removed or updated when the API route was wired. | BLOCKER | Acts as a shadow implementation that silently bypasses the new engine for the new user path. |

---

## Commit Verification

All three commits claimed in SUMMARY.md verified in git log:

| Hash | Plan | Description | Status |
|------|------|-------------|--------|
| `536a5d6` | 08-01 | feat(08-01): questEngine — 7-type pool, date-seeded rotation, history adaptation | CONFIRMED |
| `8896027` | 08-02 | feat(08-02): wire dynamic quest engine into POST /api/quests/daily | CONFIRMED |
| `830e96c` | 08-03 | feat(08-03): QuestBoard difficulty badge + empty state | CONFIRMED |

---

## Human Verification Required

### 1. Difficulty Badge Visual Rendering

**Test:** Load QuestBoard for a user with generated quests, inspect each card in the top-right corner.
**Expected:** A small labeled badge (EASY/NORMAL/HARD) appears in the top-right of each quest card with matching color (green/cyan/red) and does not overlap the XP display.
**Why human:** CSS opacity-slash syntax (`bg-[#10B981]/10`) and z-index stacking require a rendered browser to confirm visual correctness.

### 2. Anti-Repeat Validation Across Days

**Test:** Generate quests on day 1, record the 4 types. Advance date, trigger quest generation for day 2, record types.
**Expected:** Day 2's 4 types exclude at least some of day 1's types (anti-repeat logic active).
**Why human:** Requires actual Supabase state with a real user and date-advancing; cannot be simulated with static file analysis.

### 3. Difficulty Escalation with History

**Test:** Seed a user with 3 consecutive `all_completed=true` rows in `daily_quests`, then call `POST /api/quests/daily`.
**Expected:** Response quests have `difficulty="HARD"` and targets ~20% above baseline for the user's level.
**Why human:** Requires live Supabase data and an active server to trace the full request path.

---

## Gaps Summary

The primary gap is a **static-template bypass path** that was not removed when the dynamic engine was wired into the API route.

**Root cause:** Plan 08-02 focused on updating `POST /api/quests/daily`. It did not address the secondary quest generation path in `questService.ts::generateDailyQuestsForUser()`, which predates the engine and continues to be called by `userService.ts::createUser()` for every new account.

**Impact scope:** Every new user receives their first daily quest set via the static path. Returning users (who already have a today-row) hit the API route and get dynamic quests. The split creates inconsistent behavior depending on whether the user is new or returning.

**Fix required:** `generateDailyQuestsForUser` in `questService.ts` should be updated to call `POST /api/quests/daily` (via `fetch`) or removed and replaced with a direct call to `generateDynamicDailyQuests` after fetching `level` and `job_class` from Supabase. The static quest array at lines 85-90 must be eliminated.

---

_Verified: 2026-03-19_
_Verifier: Claude (gsd-verifier)_
