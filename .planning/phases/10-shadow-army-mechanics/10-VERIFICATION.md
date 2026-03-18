---
phase: 10-shadow-army-mechanics
verified: 2026-03-18T12:25:00Z
status: passed
score: 17/17 must-haves verified
re_verification: false
---

# Phase 10: Shadow Army Mechanics — Verification Report

**Phase Goal:** Build server-authoritative shadow army mechanics — extraction token economy, weighted shadow extraction, stat multipliers applied to player session, and army power display.
**Verified:** 2026-03-18T12:25:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Plan 01)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ARISE button disabled (opacity-30) when extraction_tokens = 0 | VERIFIED | ShadowArmy.tsx L158: `disabled={extracting \|\| loading \|\| extractionTokens === 0}` |
| 2 | Clicking ARISE calls POST /api/shadows/extract, not saveExtractedShadow | VERIFIED | ShadowArmy.tsx L70: `fetch("/api/shadows/extract"` — no saveExtractedShadow in handleArise |
| 3 | POST /api/shadows/extract returns 400 when extraction_tokens = 0 | VERIFIED | extract/route.ts L34-36: token guard returns 400 `"No extraction tokens"` |
| 4 | POST /api/shadows/extract decrements extraction_tokens on every attempt | VERIFIED | extract/route.ts L64: decrements before success/fail roll |
| 5 | POST /api/shadows/extract excludes already-owned shadows from draw pool | VERIFIED | extract/route.ts L56: `ownedIds = new Set(...)` passed to buildWeightedPool |
| 6 | Shadow pool uses hunter rank weighted distribution from RANK_WEIGHTS table | VERIFIED | shadowSystem.ts L53: RANK_WEIGHTS exported; extract/route.ts L59: `buildWeightedPool(userRow.hunter_rank, ownedIds)` |
| 7 | Success rate is rank-scaled: E=90%, D=80%, C=70%, B=50%, A=30%, S=15% | VERIFIED | extract/route.ts L13-15: SUCCESS_RATES constant matches exactly |
| 8 | POST /api/boss/complete increments extraction_tokens on the users row | VERIFIED | boss/complete/route.ts L30-33: read-then-write increments `current + 1` |
| 9 | shadows table contains 17 rows with matching UUIDs from SHADOWS_DB | VERIFIED | migration file L8-27: exactly 17 INSERT rows with a1b2c3d4-00XX UUIDs |
| 10 | ADD_NOTIFICATION dispatched on extraction result — QUEST type, 4s auto-dismiss | VERIFIED | ShadowArmy.tsx L87, L104: ADD_NOTIFICATION dispatched with type "QUEST" on both success and failure |

### Observable Truths (Plan 02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 11 | Shadow stat multipliers applied at session init (base → +items → ×shadows) | VERIFIED | page.tsx L111-131: getUserShadows + calculateModifiedStats called after mergedStats dispatch |
| 12 | Stats update immediately after a successful extraction without page reload | VERIFIED | Dashboard.tsx L402-457: onExtractionChange re-derives full stat chain from raw base and dispatches SET_DATA |
| 13 | Shadow bonuses apply on top of item bonuses, not on raw base stats | VERIFIED | Dashboard.tsx L419: starts from `state.user.stats`, applies item bonuses first, then calculateModifiedStats |
| 14 | Army power (sum of base_power) displays in SHADOWS panel header | VERIFIED | ShadowArmy.tsx L141: `persistentShadows.reduce((sum, ps) => sum + (ps.shadows?.base_power ?? 0), 0)` |
| 15 | Header shows TOKENS: {n} \| ARMY POWER: {n,nnn} in correct colors | VERIFIED | ShadowArmy.tsx L144-149: TOKENS and ARMY POWER in header chip |
| 16 | TOKENS count uses text-[#7C3AED] / text-[#7C3AED]/40 when zero | VERIFIED | ShadowArmy.tsx L144: `extractionTokens > 0 ? "text-[#7C3AED]" : "text-[#7C3AED]/40"` |
| 17 | ARMY POWER value uses text-[#E2E8F0] with toLocaleString formatting | VERIFIED | ShadowArmy.tsx L148-149: `text-[#E2E8F0]`, `armyPower.toLocaleString()` |

**Score:** 17/17 truths verified

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/20260318000000_extraction_tokens.sql` | VERIFIED | ALTER TABLE + exactly 17 shadow INSERT rows, ON CONFLICT DO NOTHING |
| `src/app/api/boss/complete/route.ts` | VERIFIED | POST export, read-then-write token increment, 1325 bytes |
| `src/app/api/shadows/extract/route.ts` | VERIFIED | POST export, token gate, weighted pool, rank-scaled success, shadow insert, 3653 bytes |
| `src/lib/game/shadowSystem.ts` | VERIFIED | `buildWeightedPool` exported (L67), `RANK_WEIGHTS` exported (L53), `SHADOWS_DB` and `calculateModifiedStats` preserved |
| `src/components/arise/ShadowArmy.tsx` | VERIFIED | extractionTokens prop, token-gated ARISE button, server route fetch, ADD_NOTIFICATION dispatch, ARMY POWER header chip |
| `src/app/page.tsx` | VERIFIED | Shadow merge in syncSession (L111-131) and onAuthStateChange SIGNED_IN handler (L192-204) |
| `tests/shadowSystem.test.ts` | VERIFIED | 6 tests, all passing |
| `tests/api/shadows-extract.test.ts` | VERIFIED | 3 tests, all passing |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| ShadowArmy.tsx handleArise | POST /api/shadows/extract | `fetch("/api/shadows/extract"` with Bearer header | WIRED | ShadowArmy.tsx L70-72 |
| POST /api/shadows/extract | buildWeightedPool in shadowSystem.ts | `import { SHADOWS_DB, buildWeightedPool }` | WIRED | extract/route.ts L3, L59 |
| ARISE button | extractionTokens prop | `disabled={extracting \|\| loading \|\| extractionTokens === 0}` | WIRED | ShadowArmy.tsx L158 |
| page.tsx syncSession | calculateModifiedStats | dynamic import + called with item-boosted stats | WIRED | page.tsx L112, L122 |
| ShadowArmy.tsx onExtractionChange | page.tsx stat re-init | callback triggers full re-derive in Dashboard.tsx L402 | WIRED | Dashboard.tsx L402, L442-444 |
| ShadowArmy.tsx header | persistentShadows.reduce base_power | IIFE in JSX at L141 | WIRED | ShadowArmy.tsx L141 |
| Dashboard.tsx | ShadowArmy extractionTokens prop | `extractionTokens={extractionTokens}` at L400 | WIRED | Dashboard.tsx L400 |
| Dashboard.tsx | ShadowArmy dispatch prop | `dispatch={dispatch}` at L401 | WIRED | Dashboard.tsx L401 |

---

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/shadowSystem.test.ts | 6 | PASS (all green) |
| tests/api/shadows-extract.test.ts | 3 | PASS (all green) |
| **Total** | **9** | **9/9 passed** |

TypeScript: `npx tsc --noEmit` exits 0 — no errors.

---

## Requirements Coverage

No requirement IDs were declared for this phase (`requirements: []` in both plans). Coverage is established through the must-haves and success criteria defined in PLAN frontmatter.

---

## Anti-Patterns Found

| File | Pattern | Severity | Notes |
|------|---------|----------|-------|
| boss/complete/route.ts L8 | `return null` | Info | getUserId helper — correct behavior (returns null when no auth header), not a stub |
| extract/route.ts L9 | `return null` | Info | Same getUserId pattern — not a stub |

No blockers. No warnings. The `return null` occurrences are in the auth helper function and are the correct sentinel value for "no user ID found", handled by the caller as a 401.

---

## Human Verification Required

### 1. ARISE button tooltip display

**Test:** Log in, ensure extraction_tokens = 0 on your user row, navigate to SHADOWS tab, hover the ARISE button.
**Expected:** Tooltip appears reading "Defeat a boss to earn extraction tokens".
**Why human:** CSS/title tooltip rendering cannot be verified programmatically.

### 2. Token chip dim state visually correct

**Test:** With extraction_tokens = 0, open SHADOWS tab and inspect the TOKENS chip.
**Expected:** "TOKENS: 0" appears noticeably dimmer (40% opacity purple) vs. a non-zero count which should be full purple.
**Why human:** Color rendering at opacity/40 requires visual confirmation.

### 3. Army power updates post-extraction

**Test:** Complete a boss kill to earn 1 token, then hit ARISE on a new account with no shadows. On success, confirm army power chip updates without page reload.
**Expected:** Army power value increases immediately and TOKENS count drops by 1.
**Why human:** Real-time state update after live DB round-trip requires manual testing.

### 4. Double-application prevention under real session

**Test:** Log out and log back in with at least 2 shadows owned. Check that stats displayed in STATUS tab are not double-multiplied compared to expected values.
**Expected:** Stats match `base + item_bonuses × shadow_multipliers` exactly once — not twice.
**Why human:** Requires a real Supabase session with known base stats to compute expected values.

---

## Gaps Summary

No gaps. All 17 must-have truths verified. All 8 artifacts exist and are substantive. All 8 key links confirmed wired. 9/9 tests pass. TypeScript clean.

---

_Verified: 2026-03-18T12:25:00Z_
_Verifier: Claude (gsd-verifier)_
