---
phase: 06-rank-xp-calculation-system
verified: 2026-03-17T01:22:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
---

# Phase 06: Rank XP Calculation System Verification Report

**Phase Goal:** Implement a correct, tested rank XP calculation system — fix engine bugs causing client/server divergence and data loss, add rank-scaled boss rewards, and surface rank progression UI in Dashboard and Profile.
**Verified:** 2026-03-17T01:22:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `rankFromLevelAndXp(5, 3000)` returns `'E'` and `rankFromLevelAndXp(10, 5000)` returns `'D'` | VERIFIED | xpEngine.test.ts lines 14-19 cover exact boundary; `npx vitest run` 21/21 pass |
| 2 | `nextRankInfo('E')` returns `{ nextRank: 'D', xpThreshold: 5000, levelThreshold: 10 }` | VERIFIED | xpEngine.test.ts lines 23-28; function exported from xpEngine.ts lines 77-97 |
| 3 | `nextRankInfo('NATIONAL')` returns `{ nextRank: null, xpThreshold: 1000000, levelThreshold: 90 }` | VERIFIED | xpEngine.test.ts lines 35-38; NATIONAL guard at xpEngine.ts line 84 |
| 4 | Reducer ADD_XP case derives rank using `rankFromLevelAndXp(level, totalXpAfter)` not `rankAtLevel(level)` | VERIFIED | gameReducer.ts line 253: `const rank = rankFromLevelAndXp(level, totalXpAfter);` — `rankAtLevel` is exported but not called in ADD_XP case |
| 5 | `/api/xp/award` route updates `total_xp_earned` in `user_stats` regardless of whether a level-up occurred | VERIFIED | route.ts lines 49-63: unconditional select+update block with comment "Always update total_xp_earned" — no `if (leveledUp` gate on the stats block |
| 6 | Boss kills award XP scaled to boss rank (E=200, D=500, C=1000, B=2000, A=5000, S=10000, MONARCH=10000) | VERIFIED | bossService.ts lines 5-13: `BOSS_RANK_XP` export with all 7 keys; bossService.test.ts 8 passing tests |
| 7 | `awardRaidReward` POSTs to `/api/xp/award`, never calls `awardXp` from xpService | VERIFIED | bossService.ts line 113: `fetch("/api/xp/award", ...)`; no `import { awardXp }` or xpService reference anywhere in bossService.ts |
| 8 | MONARCH-rank bosses receive a defined XP value — no silent 400 error from `/api/xp/award` | VERIFIED | `BOSS_RANK_XP["MONARCH"] = 10_000`; bossService.test.ts "MONARCH rank awards 10000 XP" passes |
| 9 | Victory screen displays the actual XP awarded, not the hardcoded '+500 XP' | VERIFIED | BossEvent.tsx line 305: `+{raidXp.toLocaleString()} XP`; state var `raidXp` set from `xpForKill` at line 222 |
| 10 | Boss defeat notification body shows actual boss name and actual XP amount | VERIFIED | BossEvent.tsx line 225+: dispatch with `` `${boss.name} has fallen. +${xpForKill.toLocaleString()} XP awarded.` `` |
| 11 | Dashboard HUD shows a compact rank progress bar below the level XP bar | VERIFIED | Dashboard.tsx line 196: `RANK {user.rank} → {nextInfo.nextRank}`; gold gradient bar `from-[#D97706] to-[#F59E0B]` at line 202 |
| 12 | Dashboard rank bar shows current rank → next rank label, total XP progress, and XP numbers | VERIFIED | Dashboard.tsx lines 182-205: totalXp derivation, RANK label, progress bar, XP numbers all present |
| 13 | At max rank (NATIONAL), the Dashboard bar shows 'MAX RANK' — no next rank arrow | VERIFIED | Dashboard.tsx line 187: `MAX RANK` text in NATIONAL branch |
| 14 | Profile STATUS panel shows a full RANK_PROGRESSION block with both XP and Level progress bars | VERIFIED | Profile.tsx lines 117-178: `RANK_PROGRESSION` comment, `xpPct` bar and `levelPct` bar both rendered |
| 15 | Both UI surfaces derive data from `state.user.rank`, `state.user.level`, `state.user.stats.totalXpEarned` — no new API calls | VERIFIED | Both files use IIFE pattern with `user.rank`, `user.level`, `user.stats.totalXpEarned` — no fetch calls added |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vitest.config.ts` | Test runner config | VERIFIED | Exists at project root; node environment + `@/` alias |
| `src/lib/game/xpEngine.test.ts` | Unit tests for xpEngine | VERIFIED | 8 tests covering rankFromLevelAndXp boundaries and nextRankInfo for all rank transitions; all pass |
| `src/lib/gameReducer.test.ts` | Unit tests for ADD_XP rank derivation | VERIFIED | 2 tests covering dual-gate promotion and level-gate block; all pass |
| `src/lib/game/xpEngine.ts` | nextRankInfo helper exported | VERIFIED | Lines 77-97: function present, exported, returns correct shape including null for NATIONAL |
| `src/lib/gameReducer.ts` | Fixed ADD_XP using rankFromLevelAndXp | VERIFIED | Line 3: import present; lines 252-253: `totalXpAfter` + `rankFromLevelAndXp(level, totalXpAfter)` |
| `src/app/api/xp/award/route.ts` | Fixed total_xp_earned unconditional update | VERIFIED | Lines 49-63: unconditional stats update block; no `if (leveledUp` wrapping the select/update |
| `src/lib/services/bossService.ts` | BOSS_RANK_XP lookup + fetch-based awardRaidReward | VERIFIED | Lines 5-13: BOSS_RANK_XP with 7 keys; line 113: fetch("/api/xp/award") |
| `src/components/arise/BossEvent.tsx` | Rank-scaled XP lookup on boss defeat + dynamic victory display | VERIFIED | Line 161: raidXp state; lines 220-225: BOSS_RANK_XP lookup; line 305: dynamic XP render |
| `src/lib/services/bossService.test.ts` | Unit tests for BOSS_RANK_XP and awardRaidReward | VERIFIED | 11 tests; all pass |
| `src/components/arise/Dashboard.tsx` | Compact rank HUD bar below level XP bar | VERIFIED | Lines 181-206: IIFE with nextRankInfo, gold progress bar, MAX RANK branch |
| `src/components/arise/Profile.tsx` | Full RANK_PROGRESSION block between SYNCHRONIZATION_PROGRESS and CORE_STAT_MATRIX | VERIFIED | Lines 117-178: dual-gate block with xpPct and levelPct bars, "Next rank:" label, "MAX RANK ACHIEVED" |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/gameReducer.ts` | `src/lib/game/xpEngine.ts` | `import { rankFromLevelAndXp }` | WIRED | Line 3 import; line 253 call in ADD_XP case |
| `src/app/api/xp/award/route.ts` | `user_stats` table | `supabase.from('user_stats').update` unconditional | WIRED | Lines 50-63: fetch+update outside any leveledUp gate |
| `src/components/arise/BossEvent.tsx` | `src/lib/services/bossService.ts` | `awardRaidReward(userId, xpForKill)` | WIRED | Line 6 import includes awardRaidReward + BOSS_RANK_XP; line 225 call |
| `src/lib/services/bossService.ts` | `/api/xp/award` | `fetch('/api/xp/award', { method: 'POST', body: JSON.stringify({ userId, amount: xp, reason: 'boss_kill' }) })` | WIRED | Lines 113-117 |
| `src/components/arise/Dashboard.tsx` | `src/lib/game/xpEngine.ts` | `import { nextRankInfo }` | WIRED | Line 6 import; line 181 call inside IIFE |
| `src/components/arise/Profile.tsx` | `src/lib/game/xpEngine.ts` | `import { nextRankInfo }` | WIRED | Line 6 import; line 119 call inside IIFE |

---

### Requirements Coverage

No requirement IDs declared in any plan for this phase (`requirements: []` in all three plans). No REQUIREMENTS.md entries mapped to Phase 06.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/lib/services/bossService.test.ts` line 11 | `// Mock xpService (currently imported by bossService — will be removed in GREEN phase)` — stale comment left after GREEN phase | Info | Comment is misleading; xpService import was removed in bossService.ts but comment remains in test file. No functional impact. |

No TODO/FIXME/placeholder stubs. No empty implementations. No hardcoded return stubs in any relevant route or component.

---

### Human Verification Required

The following behaviors are correct in code but require a running app to confirm visual rendering:

#### 1. Dashboard gold rank bar visual placement

**Test:** Open the app, navigate to Dashboard. Inspect the header HUD area.
**Expected:** A compact gold progress bar labeled "RANK E -> D" (or current rank) appears below the cyan level XP bar, with XP numbers on the right.
**Why human:** Visual layout — CSS position and z-index behavior cannot be confirmed by grep.

#### 2. Profile RANK_PROGRESSION block insertion order

**Test:** Open the app, navigate to Profile > STATUS tab. Scroll to the section between the sync bar and the stat matrix.
**Expected:** A "RANK_PROGRESSION" labeled block with two animated progress bars (XP gate in rank color, Level gate in cyan) appears between SYNCHRONIZATION_PROGRESS and CORE_STAT_MATRIX.
**Why human:** Visual insertion order between components cannot be confirmed without rendering.

#### 3. Boss kill victory screen with real boss name and XP

**Test:** Trigger a boss kill in the BossEvent view.
**Expected:** Victory screen shows `+{actual XP}` matching the boss's rank (e.g. S-rank boss: +10,000 XP). Notification shows real boss name and XP value.
**Why human:** Requires live game state with an active world boss.

---

### Gaps Summary

No gaps. All 15 observable truths are verified against the codebase. All artifacts exist, are substantive, and are wired. All key links confirmed. Test suite 21/21 green.

The one stale comment in `bossService.test.ts` line 11 is informational only — the mock is still needed (Supabase URL is not set in the test environment) so the mock itself is correct; only the comment's rationale is outdated.

---

_Verified: 2026-03-17T01:22:00Z_
_Verifier: Claude (gsd-verifier)_
