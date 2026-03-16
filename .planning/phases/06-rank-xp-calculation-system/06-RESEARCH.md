# Phase 6: Rank XP Calculation System - Research

**Researched:** 2026-03-17
**Domain:** Game state management, XP/rank engine, React client reducer, Next.js API routes, Supabase server writes
**Confidence:** HIGH — all findings verified directly against codebase source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Rank XP Pool**
- Rank XP uses the same pool as `total_xp_earned` — no separate `rank_xp` column
- Boss kills, quest completions, and workouts all feed `total_xp_earned` as before
- One cumulative number drives rank thresholds (already in DB as `user_stats.total_xp_earned`)

**Client/Server Formula Unification**
- Client reducer must use `rankFromLevelAndXp(level, totalXpEarned)` — not `rankAtLevel(level)`
- `totalXpEarned` is already in client state at `state.user.stats.totalXpEarned`
- `rankFromLevelAndXp` is already in `src/lib/game/xpEngine.ts` — just import and use it
- The broken `rankAtLevel` (level-only) function in `gameReducer.ts` is replaced; keep it exported if other code references it but stop using it for rank derivation in `GAIN_XP` case

**Boss Kill XP — Scale by Boss Rank**
- Boss kill XP scales by boss rank using this lookup:

| Boss Rank | XP Awarded |
|-----------|------------|
| E         | 200        |
| D         | 500        |
| C         | 1,000      |
| B         | 2,000      |
| A         | 5,000      |
| S         | 10,000     |

- `BOSS_ROSTER` already has a `rank` field — use it to look up the XP value
- Every participant gets full XP on boss defeat — award XP to the current logged-in user when `result.bossDefeated === true` in `BossEvent.tsx`
- `awardRaidReward(userId, xpAmount)` in `bossService.ts` must route through `/api/xp/award`

**Rank Thresholds — Unchanged**
- Current thresholds stay: D=5k, C=20k, B=60k, A=150k, S=400k, NATIONAL=1M XP
- Dual gate stays: both `minLevel` AND `minXp` must be met
- `RANK_THRESHOLDS` in `xpEngine.ts` — no changes needed

**Rank Progress Display**
- Rank progress bar appears in two places: Dashboard stats HUD + STATUS panel (Profile.tsx)
- Both show the dual-gate view (XP progress + Level progress toward next rank)
- Dashboard HUD: compact inline version below or near the existing level XP bar
- STATUS panel: full version with rank badge, both progress bars, and "Next rank: X" label
- If player is at max rank (NATIONAL), show "MAX RANK" with full bars — no next rank label
- Derive from `state.user.stats.totalXpEarned` and `state.user.level`
- Helper: `nextRankInfo(currentRank)` returns `{ nextRank, xpThreshold, levelThreshold }`

**Scope Boundaries**
- No new XP column in the DB
- No changes to level XP system
- No new rank tiers
- No PvP-based rank XP

### Claude's Discretion
- Exact styling of rank progress bars (reuse existing bar components/Tailwind patterns)
- Whether `nextRankInfo` lives in `xpEngine.ts` or inline in components
- Whether the STATUS panel rank section replaces or augments the existing rank badge display

### Deferred Ideas (OUT OF SCOPE)
- None listed
</user_constraints>

---

## Summary

Phase 6 is a surgical, focused fix-and-wire phase with no new DB schema. Three concrete problems need solving: (1) the client reducer uses `rankAtLevel(level)` — a level-only formula that diverges from the server, (2) boss kills award a hardcoded 500 XP via the anon-client `awardXp()` helper rather than routing through `/api/xp/award`, and (3) there is no rank progress display anywhere in the UI.

All required infrastructure already exists. `rankFromLevelAndXp` is in `xpEngine.ts` and already used by `/api/xp/award`. `total_xp_earned` is already populated in `state.user.stats.totalXpEarned` from `dbStats.total_xp_earned` in `page.tsx`. `BOSS_ROSTER` already has a `rank` field on every boss. The `/api/xp/award` server route is the correct pipeline for XP + rank updates.

The work is three self-contained changes: fix the reducer, fix `awardRaidReward`, and add two rank progress bar UI blocks. No migrations. No new API routes. No new state shape.

**Primary recommendation:** Fix the reducer first (06-01), then wire boss XP and add rank progress displays (06-02). Keep changes file-scoped to avoid regressions.

---

## Standard Stack

### Core (no new installs required — all already in project)

| Library/Module | Location | Purpose |
|----------------|----------|---------|
| `rankFromLevelAndXp` | `src/lib/game/xpEngine.ts` | Correct dual-gate rank formula |
| `RANK_THRESHOLDS` | `src/lib/game/xpEngine.ts` | Rank XP/level thresholds |
| `HunterRank` type | `src/lib/game/xpEngine.ts` | TypeScript rank type |
| `/api/xp/award` | `src/app/api/xp/award/route.ts` | Server route for XP + rank writes |
| `supabaseServer` | `src/lib/supabase-server.ts` | Authenticated server-side Supabase client |
| Framer Motion (`motion.div`) | already in project | Animated progress bars |
| Tailwind CSS | already in project | Styling |

### No new dependencies needed

---

## Architecture Patterns

### Pattern 1: Reducer formula replacement (GAIN_XP / ADD_XP / COMPLETE_WORKOUT)

**What:** Replace `rankAtLevel(level)` call with `rankFromLevelAndXp(level, totalXpEarned)` inside the `ADD_XP` / `COMPLETE_WORKOUT` case in `gameReducer.ts`.

**Current broken code (lines ~250-251):**
```typescript
// src/lib/gameReducer.ts — ADD_XP / COMPLETE_WORKOUT case
while (xp >= xpForLevel(level)) { xp -= xpForLevel(level); level++; statPointsToAward += 3; }
const rank = rankAtLevel(level);  // <-- WRONG: level-only formula
```

**Fix:**
```typescript
// Add import at top of gameReducer.ts
import { rankFromLevelAndXp } from "@/lib/game/xpEngine";

// In ADD_XP / COMPLETE_WORKOUT case — replace the rank derivation line:
const totalXpAfter = state.user.stats.totalXpEarned + xpAmount;
const rank = rankFromLevelAndXp(level, totalXpAfter);
```

**Key detail:** `newStats.totalXpEarned` is already computed two lines later as `state.user.stats.totalXpEarned + xpAmount` — use that same value for rank derivation. Compute `totalXpAfter` once, use it for both `newStats.totalXpEarned` and `rankFromLevelAndXp`.

**Keep `rankAtLevel` exported** — `Dashboard.tsx` line 48 and `Dashboard.tsx` rank-gate logic (lines 63-65, 363) still call it. Do not remove it. Only stop calling it in the `ADD_XP` / `COMPLETE_WORKOUT` case.

### Pattern 2: Boss kill XP — rank-scaled lookup, server-routed

**What:** Replace the hardcoded `awardRaidReward(userId, 500)` in `BossEvent.tsx` with a rank-based XP lookup, and replace the anon-client `awardXp()` call inside `bossService.ts` with a `fetch('/api/xp/award', ...)` POST.

**Boss rank XP lookup (define in bossService.ts or constants):**
```typescript
const BOSS_RANK_XP: Partial<Record<string, number>> = {
  E: 200, D: 500, C: 1_000, B: 2_000, A: 5_000, S: 10_000,
};
```

**Important:** `BOSS_ROSTER` includes ranks `"MONARCH"` and `"NATIONAL"` which are NOT in the lookup table. The code must handle this with a fallback. The CONTEXT.md only specifies E through S. Recommendation: use `BOSS_RANK_XP[bossRank] ?? 500` as the fallback for MONARCH-rank bosses (they are the hardest bosses and grant 10k or more, but the spec is silent — 500 is a safe fallback and prevents exceptions).

**BossEvent.tsx change (line ~221):**
```typescript
// Before:
await awardRaidReward(userId, 500);

// After (look up boss rank from BOSS_ROSTER, then call with rank-scaled XP):
const bossTemplate = BOSS_ROSTER.find(b => b.name === boss.name);
const xpForKill = BOSS_RANK_XP[bossTemplate?.rank ?? ""] ?? 500;
await awardRaidReward(userId, xpForKill);

// Also update the victory screen static "+500 XP" display to show the real value
```

**bossService.ts change — route through server, not anon client:**
```typescript
// Before:
import { awardXp } from "./xpService";

export async function awardRaidReward(userId: string, xp: number) {
  if (!userId || userId === "local-user") return;
  await awardXp(userId, xp);  // anon client, wrong formula
}

// After:
export async function awardRaidReward(userId: string, xp: number) {
  if (!userId || userId === "local-user") return;
  try {
    await fetch("/api/xp/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: xp, reason: "boss_kill" }),
    });
  } catch (e) {
    console.error("[bossService] awardRaidReward error:", e);
  }
}
```

Remove the `import { awardXp }` from `bossService.ts` if it is no longer used anywhere else in that file.

### Pattern 3: `nextRankInfo` helper

**What:** A pure function that, given the current rank, returns the next rank's XP threshold and level threshold (for rendering progress bars).

**Recommended location:** `src/lib/game/xpEngine.ts` (keeps all rank logic co-located).

```typescript
// Source: xpEngine.ts — add after rankFromLevelAndXp
export function nextRankInfo(currentRank: HunterRank): {
  nextRank: HunterRank | null;
  xpThreshold: number;
  levelThreshold: number;
} {
  const order: HunterRank[] = ["E", "D", "C", "B", "A", "S", "NATIONAL"];
  const idx = order.indexOf(currentRank);
  if (idx === -1 || idx === order.length - 1) {
    return { nextRank: null, xpThreshold: RANK_THRESHOLDS["NATIONAL"].minXp, levelThreshold: RANK_THRESHOLDS["NATIONAL"].minLevel };
  }
  const next = order[idx + 1];
  return { nextRank: next, xpThreshold: RANK_THRESHOLDS[next].minXp, levelThreshold: RANK_THRESHOLDS[next].minLevel };
}
```

### Pattern 4: Rank progress bar UI — compact HUD (Dashboard header)

**What:** A compact dual-progress block inserted below the existing level XP bar in the Dashboard header (`Dashboard.tsx` lines ~165-176).

**Where exactly:** After the `</div>` that closes the XP bar + percentage row, inside the `<div>` with `className="flex items-center gap-8"` that holds level info.

**Data inputs:**
- `state.user.rank` (current rank — already `HunterRank` string from DB)
- `state.user.level`
- `state.user.stats.totalXpEarned`
- Call `nextRankInfo(state.user.rank as HunterRank)` to get thresholds

**Visual pattern to follow:** The existing quest progress bars in Dashboard (lines ~256-258) use `h-2 bg-white/5 rounded-full overflow-hidden border border-white/10` with `motion.div` fill. The rank progress bar should match this language.

**Compact HUD example structure:**
```tsx
// Below existing XP bar in header — compact inline
{nextInfo.nextRank && (
  <div className="flex items-center gap-3 mt-2">
    <span className="system-readout text-[9px] text-[#94A3B8] font-black tracking-widest uppercase">
      RANK {state.user.rank} → {nextInfo.nextRank}
    </span>
    {/* XP progress */}
    <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
      <motion.div
        animate={{ width: `${Math.min(100, (state.user.stats.totalXpEarned / nextInfo.xpThreshold) * 100)}%` }}
        className="h-full bg-gradient-to-r from-[#D97706] to-[#F59E0B]"
      />
    </div>
    <span className="system-readout text-[9px] text-[#D97706] font-black tabular-nums">
      {state.user.stats.totalXpEarned.toLocaleString()}/{nextInfo.xpThreshold.toLocaleString()}
    </span>
  </div>
)}
```

Use `#D97706` (gold) as the rank bar color to differentiate it from the cyan level XP bar already present.

### Pattern 5: Rank progress bar UI — full STATUS panel (Profile.tsx)

**What:** Add a rank progress section to `Profile.tsx` after the SYNCHRONIZATION_PROGRESS (level XP) block (around line 113), before the CORE_STAT_MATRIX section.

**Where exactly:** After the closing `</div>` of the `SYNCHRONIZATION_PROGRESS` block (line ~113), before the `<div className="space-y-6">` that starts CORE_STAT_MATRIX.

**Visual language to follow:** The existing SYNCHRONIZATION_PROGRESS block uses `p-10 bg-black/60 border border-white/10 corner-cut` with a `motion.div` inside `h-4 bg-white/5 corner-cut overflow-hidden border border-white/5`. Use the same wrapper for the rank section.

**Full STATUS panel structure:**
```tsx
// Rank Progress section — insert after SYNCHRONIZATION_PROGRESS block
<div className="p-10 bg-black/60 border border-white/10 corner-cut group relative overflow-hidden">
  <div className="flex justify-between items-end text-[11px] font-system font-black tracking-[0.4em] uppercase mb-4 italic">
    <span style={{ color: rankColor }}>RANK_PROGRESSION</span>
    <span className="text-[#94A3B8]">RANK_{user.rank}</span>
  </div>

  {nextInfo.nextRank ? (
    <>
      {/* XP gate */}
      <div className="mb-6">
        <div className="flex justify-between text-[10px] font-system text-[#94A3B8] mb-2 uppercase tracking-widest">
          <span>XP</span>
          <span>{(user.stats?.totalXpEarned || 0).toLocaleString()} / {nextInfo.xpThreshold.toLocaleString()}</span>
        </div>
        <div className="h-3 bg-white/5 corner-cut overflow-hidden border border-white/5">
          <motion.div
            style={{ background: `linear-gradient(90deg, ${rankColor}, #7C3AED)` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, ((user.stats?.totalXpEarned || 0) / nextInfo.xpThreshold) * 100)}%` }}
            transition={{ duration: 2, ease: "circOut" }}
            className="h-full"
          />
        </div>
      </div>

      {/* Level gate */}
      <div>
        <div className="flex justify-between text-[10px] font-system text-[#94A3B8] mb-2 uppercase tracking-widest">
          <span>LEVEL</span>
          <span>{user.level} / {nextInfo.levelThreshold}</span>
        </div>
        <div className="h-3 bg-white/5 corner-cut overflow-hidden border border-white/5">
          <motion.div
            style={{ background: `linear-gradient(90deg, #06B6D4, #7C3AED)` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (user.level / nextInfo.levelThreshold) * 100)}%` }}
            transition={{ duration: 2, ease: "circOut" }}
            className="h-full"
          />
        </div>
      </div>

      <div className="text-[10px] font-system text-[#94A3B8] mt-4 uppercase tracking-widest">
        Next rank: <span style={{ color: rankColor }}>{nextInfo.nextRank}</span>
      </div>
    </>
  ) : (
    <div className="text-[12px] font-system font-black tracking-[0.4em] uppercase" style={{ color: rankColor }}>
      MAX RANK ACHIEVED
    </div>
  )}
</div>
```

`rankColor` is already computed at the top of `Profile.tsx` as `RANK_COLORS[user.rank]`.

### Anti-Patterns to Avoid

- **Using anon Supabase client for XP writes:** `xpService.ts`'s `awardXp()` uses the anon client and calls `rankAtLevel` (the broken formula). Never call `awardXp()` for boss kills or any new XP events. Use `fetch('/api/xp/award', ...)` instead.
- **Calling `rankAtLevel` for rank derivation in new code:** Keep it exported for Arena gate checks but never use it to derive rank for XP events.
- **Adding a new DB column for rank XP:** The CONTEXT.md explicitly forbids this. `total_xp_earned` is the single source of truth.
- **Dispatching rank-up notifications from the reducer:** The Phase 5 fix removed an erroneous dispatch in Dashboard. The reducer's existing `notification` creation in `ADD_XP` / `COMPLETE_WORKOUT` (lines ~263-268) handles this correctly — it only fires on `level > state.user.level`. Do not add a separate rank-change notification; the level-up notification body already says "Hunter rank advanced to Rank X" when `rankChanged` is true.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Rank formula | Custom level-to-rank mapping | `rankFromLevelAndXp` in `xpEngine.ts` |
| Next rank thresholds | Inline object literal in components | `nextRankInfo` helper + `RANK_THRESHOLDS` |
| XP + rank server write | Direct Supabase update from client | `POST /api/xp/award` route |
| Animated progress bars | Custom CSS animations | Framer Motion `motion.div` with `animate={{ width }}` |

---

## Common Pitfalls

### Pitfall 1: `total_xp_earned` not updated on every XP award via `/api/xp/award`

**What goes wrong:** `/api/xp/award` (lines 50-63) only updates `total_xp_earned` in `user_stats` when `leveledUp === true`. If XP is awarded but doesn't trigger a level-up (common for small XP amounts), `total_xp_earned` never increments.

**Why it happens:** The conditional `if (leveledUp && statPointsAwarded > 0)` guards the stats update. A boss kill of 200 XP may not level anyone up.

**How to avoid:** The `total_xp_earned` update must happen regardless of level-up. Move the `user_stats` update out of the `if (leveledUp)` block, or run a separate unconditional update for `total_xp_earned`. This is a pre-existing bug that Phase 6 must fix as part of 06-01.

**Current broken section in `/api/xp/award/route.ts` (lines 50-63):**
```typescript
// BUG: total_xp_earned only updated when leveledUp
if (leveledUp && statPointsAwarded > 0) {
  const { data: stats } = await supabase
    .from("user_stats")
    .select("total_xp_earned, available_stat_points")
    .eq("user_id", userId)
    .maybeSingle();

  if (stats) {
    await supabase.from("user_stats").update({
      total_xp_earned: (stats.total_xp_earned || 0) + amount,   // only runs on level-up
      available_stat_points: (stats.available_stat_points || 0) + statPointsAwarded,
    }).eq("user_id", userId);
  }
}
```

**Fix pattern — split the two updates:**
```typescript
// Always update total_xp_earned
await supabase
  .from("user_stats")
  .update({ total_xp_earned: supabase.rpc("increment_total_xp", ...) })
  // ...or read-then-write pattern already used:

// Simpler: always read stats and update total_xp_earned; only add stat points if leveledUp
const { data: stats } = await supabase
  .from("user_stats")
  .select("total_xp_earned, available_stat_points")
  .eq("user_id", userId)
  .maybeSingle();

if (stats) {
  await supabase.from("user_stats").update({
    total_xp_earned: (stats.total_xp_earned || 0) + amount,
    ...(leveledUp && statPointsAwarded > 0
      ? { available_stat_points: (stats.available_stat_points || 0) + statPointsAwarded }
      : {}),
  }).eq("user_id", userId);
}
```

### Pitfall 2: Victory screen hardcodes "+500 XP" text

**What goes wrong:** `BossEvent.tsx` line 297 renders `<div>+500 XP</div>` statically. After the boss rank XP change, this will display the wrong value.

**How to avoid:** Lift the computed `xpForKill` value into component state (`const [raidXp, setRaidXp] = useState(500)`) and set it before calling `awardRaidReward`. Then render `+{raidXp.toLocaleString()} XP` in the victory screen.

### Pitfall 3: MONARCH rank bosses not in the BOSS_RANK_XP lookup

**What goes wrong:** `BOSS_ROSTER` contains bosses with `rank: "MONARCH"` (Legia, Querehsha, Antares). If the lookup table only has E/D/C/B/A/S, these bosses will return `undefined`, causing `awardRaidReward(userId, undefined)` — which becomes `amount: undefined` in the POST body, and the `/api/xp/award` route returns `400 Missing userId or invalid amount`.

**How to avoid:** Add a fallback: `BOSS_RANK_XP[bossRank] ?? 500` or extend the lookup with a `MONARCH` key. The CONTEXT.md spec only covers E–S; a reasonable `MONARCH: 10_000` or higher is at Claude's discretion, or fallback to `S` tier XP (10,000).

### Pitfall 4: `rankAtLevel` still used in Dashboard rank-gate logic

**What goes wrong:** `Dashboard.tsx` imports `rankAtLevel` (line 5) and uses it at line 48 (`const rank = rankAtLevel(user.level)`) for the Arena gate check. This is a different use case — it computes a display rank for the Arena gate UI, not for XP events.

**How to avoid:** Do not remove `rankAtLevel` from `gameReducer.ts` exports. Do not change the Dashboard's gate logic. Only the reducer's `ADD_XP` / `COMPLETE_WORKOUT` case gets the formula fix.

### Pitfall 5: `Profile.tsx` uses `user.rank` (from state) not recomputed rank

**What goes wrong:** Profile.tsx reads `user.rank` from `GameState.user.rank`. After fixing the reducer, `user.rank` in client state will now correctly reflect `rankFromLevelAndXp`. However, if users have stale state from a session before Phase 6 (where rank may have diverged), the displayed rank in Profile may be outdated until next reload.

**How to avoid:** This is a non-issue for planning purposes — the DB is the source of truth, and the server route already uses `rankFromLevelAndXp`. On page load, `state.user.rank` is set from `dbUser.hunter_rank` (page.tsx line 28), which the server keeps correct. The reducer fix ensures subsequent client-side rank updates stay in sync. No special handling needed.

### Pitfall 6: `xpService.ts` still imports `rankAtLevel` from `gameReducer`

**What goes wrong:** `xpService.ts` line 2 imports `rankAtLevel` and uses it in `awardXp()`. After Phase 6, `awardRaidReward` will no longer call `awardXp()`, but `xpService.ts` is still broken for any other callers. The XP service is the old, wrong codepath.

**How to avoid:** Phase 6 does not need to fix `xpService.ts` globally — the CONTEXT.md says nothing about it. The fix is targeted: `bossService.ts` stops calling `awardXp` and starts calling `fetch('/api/xp/award', ...)`. Leave `xpService.ts` as-is unless other callers are discovered.

---

## Code Examples

### Complete reducer fix — ADD_XP / COMPLETE_WORKOUT case

```typescript
// src/lib/gameReducer.ts — add import at top
import { rankFromLevelAndXp } from "@/lib/game/xpEngine";

// In the ADD_XP / COMPLETE_WORKOUT case (around line 244):
case "ADD_XP":
case "COMPLETE_WORKOUT": {
  const xpAmount = action.type === "COMPLETE_WORKOUT" ? action.payload.xpEarned : action.payload;
  let xp = state.user.currentXp + xpAmount;
  let level = state.user.level;
  let statPointsToAward = 0;
  while (xp >= xpForLevel(level)) { xp -= xpForLevel(level); level++; statPointsToAward += 3; }

  // FIX: use totalXp to derive rank, not level alone
  const totalXpAfter = state.user.stats.totalXpEarned + xpAmount;
  const rank = rankFromLevelAndXp(level, totalXpAfter);  // was: rankAtLevel(level)

  const rankChanged = rank !== state.user.rank;
  const newStats: UserStats = {
    ...state.user.stats,
    availablePoints: state.user.stats.availablePoints + statPointsToAward,
    totalWorkouts: action.type === "COMPLETE_WORKOUT"
      ? state.user.stats.totalWorkouts + 1
      : state.user.stats.totalWorkouts,
    totalXpEarned: totalXpAfter,  // use same variable
    // ...rest unchanged
  };
  // ...rest of case unchanged
}
```

### `/api/xp/award` total_xp_earned fix

```typescript
// src/app/api/xp/award/route.ts — replace the conditional stats update block
// Always update total_xp_earned; only add stat points on level-up

const { data: stats } = await supabase
  .from("user_stats")
  .select("total_xp_earned, available_stat_points")
  .eq("user_id", userId)
  .maybeSingle();

if (stats) {
  await supabase.from("user_stats").update({
    total_xp_earned: (stats.total_xp_earned || 0) + amount,
    ...(leveledUp && statPointsAwarded > 0
      ? { available_stat_points: (stats.available_stat_points || 0) + statPointsAwarded }
      : {}),
  }).eq("user_id", userId);
}
```

### Boss rank XP constant + awardRaidReward fix

```typescript
// src/lib/services/bossService.ts

// Add near top:
const BOSS_RANK_XP: Record<string, number> = {
  E: 200, D: 500, C: 1_000, B: 2_000, A: 5_000, S: 10_000, MONARCH: 10_000,
};

// Replace awardRaidReward:
export async function awardRaidReward(userId: string, xp: number) {
  if (!userId || userId === "local-user") return;
  try {
    await fetch("/api/xp/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: xp, reason: "boss_kill" }),
    });
  } catch (e) {
    console.error("[bossService] awardRaidReward error:", e);
  }
}
```

### BossEvent.tsx — rank-based XP + dynamic victory display

```typescript
// src/components/arise/BossEvent.tsx
// Add state for raid XP:
const [raidXp, setRaidXp] = useState(500);

// In handleAttackComplete, before calling awardRaidReward:
if (result.bossDefeated) {
  const bossTemplate = BOSS_ROSTER.find(b => b.name === boss.name);
  const xpForKill = BOSS_RANK_XP[bossTemplate?.rank ?? ""] ?? 500;
  setRaidXp(xpForKill);
  setShowVictory(true);
  await awardRaidReward(userId, xpForKill);
  dispatch({
    type: "ADD_NOTIFICATION",
    payload: {
      type: "LEVELUP",
      title: "BOSS DEFEATED",
      body: `${boss.name} has fallen. +${xpForKill.toLocaleString()} XP awarded.`,
      icon: "🏆",
    }
  });
}

// In victory screen JSX — replace hardcoded "+500 XP":
<div className="text-3xl font-orbitron font-black text-yellow-400">
  +{raidXp.toLocaleString()} XP
</div>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `rankAtLevel(level)` — level-only | `rankFromLevelAndXp(level, totalXp)` — dual gate | Rank correctly requires both level AND XP milestones |
| `awardXp()` via anon Supabase client | `fetch('/api/xp/award', ...)` via server route | Consistent rank formula, server-side auth, correct `total_xp_earned` update |
| Hardcoded 500 XP per boss kill | Rank-scaled lookup (200–10,000 XP) | Boss difficulty now meaningfully affects progression |
| No rank progress display | Dual progress bars (XP + level gates) | Players can see exactly what blocks their rank-up |

---

## Open Questions

1. **MONARCH bosses XP value**
   - What we know: `BOSS_ROSTER` has rank `"MONARCH"` for Legia, Querehsha, Antares — not in the E–S spec
   - What's unclear: Whether Monarch-rank bosses should award more than S-rank (10k) or simply match S-rank
   - Recommendation: Use `MONARCH: 10_000` in the lookup to match S-rank, at Claude's discretion. Could also use `15_000` or `20_000` for narrative consistency (they are stronger than S-rank).

2. **`total_xp_earned` increments via `increment_total_xp` RPC vs read-then-write**
   - What we know: `xpService.ts` calls `supabase.rpc("increment_total_xp", ...)`. The `/api/xp/award` route does a read-then-write. Both are present in the codebase.
   - What's unclear: Whether the Supabase `increment_total_xp` RPC exists in the migrations or is dead code.
   - Recommendation: Use the read-then-write pattern already in `/api/xp/award/route.ts` for the Phase 6 fix. The RPC path in `xpService.ts` is part of the old anon-client code being deprecated.

---

## Validation Architecture

Config `workflow.nyquist_validation` key is absent from `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test/ directory found |
| Config file | None — Wave 0 must scaffold |
| Quick run command | `npx vitest run --reporter=verbose` (after Wave 0 setup) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RANK-01 | `rankFromLevelAndXp` returns correct rank for level+XP combos | unit | `npx vitest run src/lib/game/xpEngine.test.ts` | Wave 0 |
| RANK-02 | `nextRankInfo` returns correct next rank, XP threshold, level threshold | unit | `npx vitest run src/lib/game/xpEngine.test.ts` | Wave 0 |
| RANK-03 | Reducer `ADD_XP` case produces correct rank (dual-gate formula) | unit | `npx vitest run src/lib/gameReducer.test.ts` | Wave 0 |
| RANK-04 | `awardRaidReward` POSTs to `/api/xp/award`, not anon client | unit/mock | `npx vitest run src/lib/services/bossService.test.ts` | Wave 0 |
| RANK-05 | Boss rank XP lookup returns correct XP for E/D/C/B/A/S/MONARCH | unit | `npx vitest run src/lib/services/bossService.test.ts` | Wave 0 |
| RANK-06 | `/api/xp/award` always updates `total_xp_earned` (no level-up required) | integration/manual | Manual — test with small XP award that doesn't trigger level-up | N/A |
| RANK-07 | Rank progress bars render in Dashboard HUD and Profile STATUS panel | visual/manual | Manual — verify in browser at various XP levels | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/game/xpEngine.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/game/xpEngine.test.ts` — unit tests for `rankFromLevelAndXp`, `nextRankInfo`, `RANK_THRESHOLDS`
- [ ] `src/lib/gameReducer.test.ts` — unit tests for `ADD_XP` case rank derivation
- [ ] `src/lib/services/bossService.test.ts` — tests for `BOSS_RANK_XP` lookup and `awardRaidReward` routing
- [ ] `vitest.config.ts` (or `jest.config.ts`) — test runner configuration
- [ ] Install: `npm install -D vitest @vitest/ui` if not present

---

## Sources

### Primary (HIGH confidence — direct source code inspection)
- `src/lib/game/xpEngine.ts` — `rankFromLevelAndXp`, `RANK_THRESHOLDS`, `HunterRank`, `nextRankInfo` design
- `src/lib/gameReducer.ts` — `ADD_XP`/`COMPLETE_WORKOUT` case (lines ~244-280), `rankAtLevel` (lines ~92-99)
- `src/app/api/xp/award/route.ts` — server route logic, `total_xp_earned` update bug (lines 50-63)
- `src/lib/services/bossService.ts` — `awardRaidReward` using anon `awardXp()` (line ~100-107)
- `src/lib/services/xpService.ts` — `awardXp()` using anon client and wrong `rankAtLevel`
- `src/components/arise/BossEvent.tsx` — hardcoded `awardRaidReward(userId, 500)` (line ~221)
- `src/lib/data/bossRoster.ts` — `BOSS_ROSTER` with `rank` and `MONARCH` entries
- `src/components/arise/Dashboard.tsx` — existing XP bar location (lines ~165-176), STATUS tab, `rankAtLevel` usage
- `src/components/arise/Profile.tsx` — SYNCHRONIZATION_PROGRESS block (lines ~99-113), rank badge, stat bars
- `src/app/page.tsx` — `totalXpEarned: dbStats.total_xp_earned` mapping (line ~41)
- `src/lib/constants.ts` — `RANK_COLORS` palette for rank-colored progress bars

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — project decisions confirming server-route-for-writes pattern, `rankFromLevelAndXp` reuse decision
- `.planning/phases/06-rank-xp-calculation-system/06-CONTEXT.md` — locked implementation decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — verified exact line numbers and code shapes in source files
- Pitfalls: HIGH — bugs identified directly in source (not inferred)
- UI patterns: HIGH — existing bar components read and documented

**Research date:** 2026-03-17
**Valid until:** Stable for 30 days — no external dependencies
