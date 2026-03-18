---
phase: 11-battle-system-backend
verified: 2026-03-19T02:52:00Z
status: human_needed
score: 11/11 must-haves verified
human_verification:
  - test: "Run the full battle flow end-to-end in a browser"
    expected: "Accept battle → reps input appears → submit → resolving spinner → result card showing WIN/LOSS/DRAW with XP and rating change → notification fires → HISTORY tab shows new entry"
    why_human: "Full state-machine flow (performing → resolving → result) and real Supabase writes can only be confirmed in a live browser session with a real auth token"
  - test: "pvpRating updates in player card immediately after battle"
    expected: "MMR value in the player card (top of MATCHMAKING tab) changes to the post-battle value returned by newRating without a page reload"
    why_human: "SET_DATA dispatch correctness verified in code, but the rendered value requires visual confirmation with live state"
  - test: "HISTORY tab shows real battles, not empty state"
    expected: "After completing one battle the HISTORY tab shows the battle with correct opponent name, exercise, outcome, and XP gained"
    why_human: "Requires a live Supabase connection with arena_battles migration applied; can't verify DB writes programmatically without running the app"
---

# Phase 11: Battle System Backend — Verification Report

**Phase Goal:** Implement the complete battle system backend — battle engine computation, API routes, DB persistence, and Arena.tsx wired to real APIs.
**Verified:** 2026-03-19T02:52:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                              | Status     | Evidence                                                                                      |
|----|----------------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| 1  | CPI calculation produces a deterministic weighted stat score for any exercise type                 | VERIFIED   | `computeCPI` in battleEngine.ts line 53-64; 40/40 tests GREEN                                |
| 2  | Win probability is always clamped between 0.05 and 0.95                                           | VERIFIED   | `computeWinProbability` uses `clamp(statRatio + perfMod, 0.05, 0.95)` (line 87)              |
| 3  | Draw condition triggers when statRatio is within 10% of 0.5 and RNG roll < 0.25                   | VERIFIED   | `rollOutcome` line 102: `Math.abs(statRatio - 0.5) < 0.05 && roll < 0.25 → DRAW`            |
| 4  | Performance modifier is clamped to [-0.15, +0.15] regardless of reps submitted                    | VERIFIED   | `computePerfMod` line 73: `clamp(..., -0.15, 0.15)`; test suite covers 0, target, and max    |
| 5  | XP lookup returns exact values: D=150, C=250, B=400, A=600, S=1000                                | VERIFIED   | `XP_BY_RANK` lines 27-32; dedicated tests confirm each rank win value                        |
| 6  | arena_battles migration SQL exists with correct schema                                             | VERIFIED   | `supabase/migrations/20260319000000_arena_battles.sql` — CREATE TABLE with CHECK, FK, index  |
| 7  | POST /api/arena/battle returns 401 without Bearer token                                            | VERIFIED   | `route.test.ts` test passes; `getUserId` guard at route line 23-24                           |
| 8  | POST /api/arena/battle returns battle outcome with xpChange and ratingChange                       | VERIFIED   | Route returns `{ outcome, xpChange, ratingChange, newRating, ... }` (lines 127-135)          |
| 9  | Battle is persisted to arena_battles after route completes                                         | VERIFIED   | supabase insert at route lines 89-100; error branch returns 500 on insert failure             |
| 10 | user_stats.pvp_rating, pvp_wins, pvp_losses are updated per battle outcome                        | VERIFIED   | Route lines 108-115: update user_stats with newRating, newWins, newLosses                    |
| 11 | XP is awarded via chain call to POST /api/xp/award (never written directly)                       | VERIFIED   | Route lines 117-125: `fetch(.../api/xp/award, ...)`; no total_xp/current_xp writes found    |
| 12 | GET /api/arena/history returns 401 without auth, battles array when authenticated                  | VERIFIED   | history/route.test.ts 2/2 tests GREEN; route returns `{ battles: data ?? [] }`               |
| 13 | opponentName from the client POST body is stored in arena_battles                                  | VERIFIED   | Route line 54: `resolvedName = opponentName || opponent.name`; used in insert line 93        |
| 14 | MOCK_HISTORY removed — HISTORY tab fetches real data from GET /api/arena/history                  | VERIFIED   | `grep -c "MOCK_HISTORY" Arena.tsx` = 0; useEffect at Arena.tsx lines 94-104                  |
| 15 | ADD_NOTIFICATION fires with correct outcome text after battle resolves                             | VERIFIED   | Arena.tsx lines 150-163: ADD_NOTIFICATION with PVP type, conditional title per outcome       |
| 16 | pvpRating in player card reflects post-battle value via SET_DATA dispatch                          | VERIFIED   | Arena.tsx lines 143-148: `dispatch({ type: "SET_DATA", payload: { stats: { pvpRating: data.newRating } } })`; gameReducer line 228 does shallow merge on stats |
| 17 | Player can submit reps/time via input field after accepting an opponent                             | VERIFIED   | Arena.tsx lines 379-409: "performing" state block with `<input type="number">` and Submit button |
| 18 | Battle outcome (WIN/LOSS/DRAW) displayed in result card with XP gained                            | VERIFIED   | Arena.tsx lines 425-449: "result" state block renders OUTCOME_STYLES, xpChange, ratingChange |
| 19 | HISTORY tab refreshes with real battles after a battle completes                                   | VERIFIED   | handleBattleSubmit lines 165-172: re-fetches `/api/arena/history` and updates battleHistory   |

**Score:** 11/11 must-haves from PLAN frontmatter verified (plus 8 additional truths from derived goal — all pass)

---

## Required Artifacts

| Artifact                                              | Expected                                          | Status      | Details                                                                   |
|-------------------------------------------------------|---------------------------------------------------|-------------|---------------------------------------------------------------------------|
| `src/lib/game/battleEngine.ts`                        | Pure battle computation module                    | VERIFIED    | 141 lines; exports computeCPI, computeWinProbability, rollOutcome, computePerfMod, XP_BY_RANK, generateOpponentStats, EXERCISE_WEIGHTS, TARGET_REPS, OPPONENT_NAMES |
| `src/lib/game/battleEngine.test.ts`                   | Unit tests for all pure functions                 | VERIFIED    | 40/40 tests GREEN                                                         |
| `supabase/migrations/20260319000000_arena_battles.sql`| arena_battles DDL with FK, index, check constraint| VERIFIED    | CREATE TABLE with outcome CHECK IN ('WIN','LOSS','DRAW'), FK to users, user_id index |
| `src/app/api/arena/battle/route.ts`                   | POST /api/arena/battle — full pipeline            | VERIFIED    | 137 lines; auth gate, computation, DB insert, user_stats update, XP chain |
| `src/app/api/arena/battle/route.test.ts`              | Vitest stubs for battle route                     | VERIFIED    | 2/2 tests GREEN (401, 400)                                                |
| `src/app/api/arena/history/route.ts`                  | GET /api/arena/history                            | VERIFIED    | 29 lines; auth gate, arena_battles query ordered DESC limit 20            |
| `src/app/api/arena/history/route.test.ts`             | Vitest stubs for history route                    | VERIFIED    | 2/2 tests GREEN (401, success shape)                                      |
| `src/components/arise/Arena.tsx`                      | Arena UI wired to real battle API                 | VERIFIED    | MatchStatus extended to 6 states; handleBattleSubmit; MOCK_HISTORY removed; history useEffect |

---

## Key Link Verification

| From                                      | To                              | Via                                    | Status  | Details                                                              |
|-------------------------------------------|---------------------------------|----------------------------------------|---------|----------------------------------------------------------------------|
| `src/app/api/arena/battle/route.ts`       | `src/lib/game/battleEngine.ts`  | named imports                          | WIRED   | Lines 4-13: imports computeCPI, computePerfMod, computeWinProbability, rollOutcome, generateOpponentStats, XP_BY_RANK, TARGET_REPS |
| `src/app/api/arena/battle/route.ts`       | `src/lib/game/xpEngine.ts`      | calculateRatingChange import           | WIRED   | Line 3: `import { calculateRatingChange } from "@/lib/game/xpEngine"` |
| `src/app/api/arena/battle/route.ts`       | `/api/xp/award`                 | fetch chain call (non-fatal)           | WIRED   | Lines 120-124: `fetch(\`${baseUrl}/api/xp/award\`, ...)`             |
| `src/app/api/arena/history/route.ts`      | `arena_battles` table           | supabaseServer query                   | WIRED   | Line 16: `.from("arena_battles").select(...).eq("user_id", userId)` |
| `src/components/arise/Arena.tsx`          | `/api/arena/battle`             | fetch in handleBattleSubmit            | WIRED   | Lines 120-132: `fetch("/api/arena/battle", { method: "POST", ... })` |
| `src/components/arise/Arena.tsx`          | `/api/arena/history`            | fetch in useEffect on HISTORY tab      | WIRED   | Lines 94-104 (useEffect) and 166-172 (post-battle refresh)           |
| `src/components/arise/Arena.tsx`          | `state.user.id`                 | Bearer auth header construction        | WIRED   | Lines 99, 124, 167: `Authorization: \`Bearer ${userId}\``            |
| `handleBattleSubmit`                      | `gameReducer SET_DATA`          | dispatch with pvpRating                | WIRED   | Lines 143-148: `dispatch({ type: "SET_DATA", payload: { stats: { pvpRating: data.newRating } } })` |

---

## Requirements Coverage

Phase 11 plans declare the following requirement IDs:

| Requirement   | Source Plan | Description                                              | Status       |
|---------------|-------------|----------------------------------------------------------|--------------|
| BATTLE-ENGINE | 11-01       | Pure battle computation module with CPI, perfMod, ELO   | SATISFIED    |
| BATTLE-01     | 11-01       | computeCPI with exercise weights                         | SATISFIED    |
| BATTLE-02     | 11-01       | computePerfMod clamped to [-0.15, +0.15]                | SATISFIED    |
| BATTLE-03     | 11-01       | computeWinProbability clamped to [0.05, 0.95]           | SATISFIED    |
| BATTLE-04     | 11-01       | rollOutcome with draw zone detection                     | SATISFIED    |
| BATTLE-05     | 11-01       | XP_BY_RANK with exact values per rank                   | SATISFIED    |
| MIGRATION     | 11-01       | arena_battles table DDL                                  | SATISFIED    |
| BATTLE-06     | 11-02       | POST /api/arena/battle — server-authoritative outcome    | SATISFIED    |
| BATTLE-07     | 11-02       | DB persistence + user_stats update per battle           | SATISFIED    |
| HISTORY-API   | 11-02       | GET /api/arena/history                                   | SATISFIED    |
| BATTLE-API    | 11-02       | Auth gates, 400 validation, XP chain                    | SATISFIED    |
| ARENA-STATE   | 11-03       | MatchStatus extended to performing/resolving/result      | SATISFIED    |
| MOCK-REMOVAL  | 11-03       | MOCK_HISTORY removed, real API data used                 | SATISFIED    |
| HISTORY-UI    | 11-03       | History tab wired to GET /api/arena/history              | SATISFIED    |

All 14 declared requirement IDs satisfied.

---

## Anti-Patterns Found

| File              | Line | Pattern        | Severity | Impact                             |
|-------------------|------|----------------|----------|------------------------------------|
| `Arena.tsx`       | 397  | `placeholder=` | Info     | HTML input placeholder attribute — not a stub; this is correct UI copy for the reps input field |

No blocker or warning anti-patterns found. The single `placeholder` match is a legitimate HTML attribute in the reps input, not a code stub.

---

## Human Verification Required

### 1. Full Battle Flow (End-to-End)

**Test:** Start the dev server with `npm run dev`. Sign in and navigate to the Arena. On the MATCHMAKING tab, select an exercise (e.g. PUSH-UPS) and click "Find Opponent". When the opponent appears (~2.5 seconds), click "Accept Battle". Enter a rep count (e.g. 30) and click "Submit Battle".

**Expected:** The UI transitions through "performing" (reps input visible), "resolving" (spinner with "Computing Outcome..."), then "result" (outcome card showing WIN/LOSS/DRAW, XP gained, and rating delta with +/- prefix). No JS errors in console.

**Why human:** The full async flow from client to Supabase and back requires a live environment. The vitest stubs mock the DB; only a real session can confirm the full pipeline works including the Supabase insert and user_stats update.

### 2. pvpRating Live Update in Player Card

**Test:** After completing a battle that resolves as WIN or LOSS, observe the player card in the MATCHMAKING tab before clicking "Return to Arena".

**Expected:** The MMR value in the player card reads the post-battle rating (matching the `newRating` shown in the result card). This update must happen without a page reload.

**Why human:** The SET_DATA dispatch and gameReducer merge are verified in code, but rendered state can only be confirmed visually in a live browser session.

### 3. HISTORY Tab Populates After First Battle

**Test:** After completing a battle, click "Return to Arena" then navigate to the HISTORY tab.

**Expected:** The battle just completed appears as the first entry in the list, showing correct opponent name (matching what was shown during matchmaking), exercise type, outcome (WIN/LOSS/DRAW), and XP change. The empty-state "NO BATTLES ON RECORD" message should not appear.

**Why human:** Requires the arena_battles migration to be applied to the Supabase instance. The history fetch is wired correctly in code but DB writes can only be confirmed with a real connection.

---

## Summary

All automated checks pass. The battle system backend is fully implemented:

- **Plan 11-01:** `battleEngine.ts` is a clean pure-function module with zero side effects — 40/40 unit tests GREEN. All six exported functions (computeCPI, computePerfMod, computeWinProbability, rollOutcome, XP_BY_RANK, generateOpponentStats) verified against spec. The `arena_battles` migration has the correct schema.

- **Plan 11-02:** Both API routes exist, are fully wired to battleEngine and xpEngine, use the copy-don't-import `getUserId` pattern, write to the correct tables (arena_battles for insert, user_stats for pvp columns), and the XP chain is non-fatal. 4/4 vitest stubs GREEN. TypeScript reports zero errors.

- **Plan 11-03:** Arena.tsx extended from 3 to 6 MatchStatus states. `handleAccept` no longer uses setTimeout — it transitions to "performing". `handleBattleSubmit` POSTs to the real API with Bearer auth, dispatches SET_DATA for pvpRating, fires ADD_NOTIFICATION, and refreshes history. MOCK_HISTORY is completely removed (confirmed 0 occurrences). History tab fetches live data on tab activation.

Three items are flagged for human verification — all require a live browser session with Supabase connected.

---

_Verified: 2026-03-19T02:52:00Z_
_Verifier: Claude (gsd-verifier)_
