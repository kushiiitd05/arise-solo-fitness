# Phase 6: Rank XP Calculation System - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Design and implement a multi-event rank XP model where workouts, quest completions, and boss kills all contribute to rank progression. Fix the client reducer to use the same rank formula as the server. Add rank progress display to Dashboard HUD and STATUS panel.

No new XP column in the DB. No changes to level XP system. No new rank tiers. No PvP-based rank XP.

</domain>

<decisions>
## Implementation Decisions

### Rank XP Pool
- Rank XP uses the **same pool as `total_xp_earned`** — no separate `rank_xp` column
- Boss kills, quest completions, and workouts all feed `total_xp_earned` as before
- One cumulative number drives rank thresholds (already in DB as `user_stats.total_xp_earned`)

### Client/Server Formula Unification
- **Client reducer must use `rankFromLevelAndXp(level, totalXpEarned)`** — not `rankAtLevel(level)`
- `totalXpEarned` is already in client state at `state.user.stats.totalXpEarned`
- `rankFromLevelAndXp` is already in `src/lib/game/xpEngine.ts` — just import and use it
- The broken `rankAtLevel` (level-only) function in `gameReducer.ts` is replaced; keep it exported if other code references it but stop using it for rank derivation in `GAIN_XP` case

### Boss Kill XP — Scale by Boss Rank
- Boss kill XP scales by boss rank using the following lookup:

| Boss Rank | XP Awarded |
|-----------|-----------|
| E         | 200        |
| D         | 500        |
| C         | 1,000      |
| B         | 2,000      |
| A         | 5,000      |
| S         | 10,000     |

- `BOSS_ROSTER` already has a `rank` field — use it to look up the XP value
- **Every participant gets full XP** on boss defeat — award XP to the current logged-in user when `result.bossDefeated === true` in `BossEvent.tsx`
- `awardRaidReward(userId, xpAmount)` in `bossService.ts` must route through `/api/xp/award` (the server route that updates `total_xp_earned` and recalculates rank)

### Rank Thresholds — Unchanged
- Current thresholds stay: D=5k, C=20k, B=60k, A=150k, S=400k, NATIONAL=1M XP
- **Dual gate stays**: both `minLevel` AND `minXp` must be met (prevents boss XP grinding past level requirement)
- `RANK_THRESHOLDS` in `xpEngine.ts` — no changes needed

### Rank Progress Display
- Rank progress bar appears in **two places**: Dashboard stats HUD + STATUS panel
- **Both show the dual-gate view:**
  ```
  [ RANK E ] ──────────────────────────
   XP:    3,200 / 5,000   ████████░░░░  64%
   Level: 8 / 10          ████████░░░░  80%
    Next rank: D
  ```
- Dashboard HUD: compact inline version (below or near the existing level XP bar)
- STATUS panel: full version with rank badge, both progress bars, and "Next rank: X" label
- If player is at max rank (NATIONAL), show "MAX RANK" with full bars — no next rank label
- Derive from `state.user.stats.totalXpEarned` and `state.user.level` (both in client state)
- Helper: `nextRankInfo(currentRank)` — returns `{ nextRank, xpThreshold, levelThreshold }` from `RANK_THRESHOLDS`

### Claude's Discretion
- Exact styling of rank progress bars (reuse existing bar components/Tailwind patterns from the codebase)
- Whether `nextRankInfo` lives in `xpEngine.ts` or inline in components
- Whether the STATUS panel rank section replaces or augments the existing rank badge display

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### XP / Rank engine
- `src/lib/game/xpEngine.ts` — `rankFromLevelAndXp`, `RANK_THRESHOLDS`, `HunterRank` type
- `src/lib/gameReducer.ts` — `GAIN_XP` case (lines ~245-275), `rankAtLevel` (lines ~92-100), `totalXpEarned` in state
- `src/lib/services/xpService.ts` — `awardXp()` client helper (uses anon supabase — note server routes are preferred per project decisions)

### Boss kill entry point
- `src/components/arise/BossEvent.tsx` — `awardRaidReward(userId, 500)` call on `result.bossDefeated` (line ~221)
- `src/lib/services/bossService.ts` — `awardRaidReward` function to inspect/update
- `src/lib/data/bossRoster.ts` — `BOSS_ROSTER` with `rank` field per boss

### Rank display surfaces
- `src/components/arise/Dashboard.tsx` — stats panel where rank bar goes (HUD section)
- `src/components/arise/Profile.tsx` or STATUS panel — detailed rank view location
- `src/app/page.tsx` — line 41, where `totalXpEarned` is loaded from DB into client state

### Server XP route
- `src/app/api/xp/award/route.ts` — POST endpoint that updates `total_xp_earned`, recalculates level + rank, returns `{ newRank, rankChanged, newLevel, leveledUp }`

</canonical_refs>

<code_context>
## Existing Code Insights

### What already works
- `rankFromLevelAndXp(level, totalXp)` exists in `xpEngine.ts` and is used by `/api/xp/award`
- `RANK_THRESHOLDS` is complete and correct — no changes needed
- `state.user.stats.totalXpEarned` is populated from `dbStats.total_xp_earned` on load (page.tsx:41)
- `/api/xp/award` already handles level-up loops, rank calculation, stat point awards, and `total_xp_earned` update
- `BOSS_ROSTER` has `rank` field — boss XP lookup can be a simple object literal

### What's broken / missing
- `gameReducer.ts` `GAIN_XP` case calls `rankAtLevel(level)` (level-only) — client rank diverges from DB
- `awardRaidReward(userId, 500)` hardcodes 500 XP and doesn't wire through the proper XP + rank pipeline
- No rank XP progress bar anywhere in the UI

### Key constraint
- Server writes must use `supabaseServer` (not anon client) — follow established Phase 3 pattern
- `awardRaidReward` should POST to `/api/xp/award` rather than calling supabase directly from the client

</code_context>
