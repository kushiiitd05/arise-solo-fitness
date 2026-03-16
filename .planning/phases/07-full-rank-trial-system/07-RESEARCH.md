# Phase 7: Full Rank Trial System - Research

**Researched:** 2026-03-17
**Domain:** React component architecture, Supabase server routes, Framer Motion animation, game state management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Entry point: Profile rank block — INITIATE TRIAL button in the RANK_PROGRESSION block
- Button active only when both dual-gate conditions are met (minLevel AND minXp) AND no 24h cooldown
- Trial opens as a full-screen takeover — same pattern as WorkoutEngine
- Cooldown on failure: 24 hours, stored as `trial_last_failed_at` timestamp in user_stats
- Separate `RankTrialEngine` component — modelled after WorkoutEngine but trial-specific UI. WorkoutEngine stays unchanged.
- Trial requires all 4 exercise types: push-ups, squats, sit-ups, cardio
- Difficulty: 2× the hunter's current daily quest rep targets for each exercise
- No time limit
- Pass condition: complete all 4 exercises at 2× rep targets — binary, no intensity rank requirement
- Fail condition: hunter quits OR doesn't reach 2× targets for any exercise
- On failure: record `trial_last_failed_at` + fire SYSTEM notification ("Trial failed. Cooldown: 24h.")
- On pass: full-screen rank-up screen — RankUpCeremony component — animated badge reveal, reward summary
- Hunter dismisses RankUpCeremony to return to Dashboard
- Rewards: 5 stat points + rank-scaled XP bonus (E→D: 1000, D→C: 2000, C→B: 5000, B→A: 10000, A→S: 25000, S→NATIONAL: 50000)
- DB write: new `POST /api/rank/advance` route — validates dual-gate + trial pass, writes hunter_rank to users table, awards stat points to user_stats, dispatches XP via existing /api/xp/award

### Claude's Discretion

- Exact animation style for the rank badge reveal (Framer Motion pulse/scale — reuse existing animation patterns)
- Visual design of RankTrialEngine UI (use existing hex palette and exercise card patterns from WorkoutEngine as reference)
- How `trial_last_failed_at` is added to user_stats (new column in migration or stored in existing JSONB/metadata field)
- Exact stat point grant mechanism in `/api/rank/advance` (can increment `available_stat_points` directly in user_stats)

### Deferred Ideas (OUT OF SCOPE)

- Shadow slot unlock on rank advance — requires Shadow Army Mechanics system (Phase 10)
- Stat penalty on trial failure (XP deduction) — discussed but decided against
- Time-limited trial variant — potential future "hardcore mode"
</user_constraints>

---

## Summary

Phase 7 implements a formal rank progression gate for the ARISE fitness app. Hunters who meet the dual-gate thresholds (minLevel AND minXp for the next rank) can initiate a rank trial — a 4-exercise workout challenge requiring 2× their current daily quest targets. The trial flow is: check eligibility in Profile → initiate (full-screen takeover via RankTrialEngine) → complete all 4 exercises → pass/fail evaluation → rank-up ceremony (RankUpCeremony) or 24h cooldown.

The phase introduces two new full-screen components (`RankTrialEngine`, `RankUpCeremony`), one new server route (`POST /api/rank/advance`), one DB migration (adds `trial_last_failed_at` to `user_stats`), and modifications to `Profile.tsx` and `Dashboard.tsx`. All patterns are well-established in the codebase — the implementation copies the WorkoutEngine structure and the existing `/api/xp/award` + `/api/quests/update` route patterns exactly.

The key risk is double-execution of the rank advance write: `/api/rank/advance` must validate dual-gate server-side (not trust client state) and must be idempotent — if the hunter is already the next rank, it should return success without double-awarding rewards. This is the same guard that `/api/quests/update` uses with `wasAllCompleted`.

**Primary recommendation:** Model `RankTrialEngine` closely on `WorkoutEngine.tsx` — same props signature, same MediaPipe/PostureGuard setup, same phase state machine ("select" → "active" → "complete"). Replace the exercise selection step with a fixed 4-exercise ordered list derived from `generateDailyQuestTargets`. The ceremony screen is a separate component, not a phase within RankTrialEngine.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + Next.js App Router | current project | Component rendering, server routes | Project foundation |
| Framer Motion | already installed | Animation for RankTrialEngine enter, RankUpCeremony badge sequence | Already imported in Dashboard.tsx, BossEvent.tsx |
| Supabase (supabaseServer) | already installed | Server route DB writes (service role, bypasses RLS) | Established Phase 3 principle — all write routes use supabaseServer |
| lucide-react | already installed | Icons (X, ArrowRight, Lock, CheckCircle2) | Already imported across all arise components |
| Tailwind CSS | already installed | Utility-class styling, all hex values | Project standard — no CSS variables in JSX |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MediaPipe Tasks Vision | already installed | PostureGuard / rep counting via camera | Optional AR mode — RankTrialEngine can include same AR toggle as WorkoutEngine |
| clsx + tailwind-merge | already installed | cn() utility for conditional class merging | Used in Profile.tsx and Dashboard.tsx already |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New migration column `trial_last_failed_at` | JSONB metadata field in existing user_stats | New column is cleaner for SQL queries and type-safe; JSONB avoids schema migration but makes cooldown check messier. **Use new column.** |
| `POST /api/rank/advance` calling `fetch('/api/xp/award')` internally | Writing XP directly in /api/rank/advance | Internal fetch preserves separation of concerns and reuses proven XP logic. Matches Phase 6 pattern (awardRaidReward). **Use internal fetch.** |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/arise/
│   ├── RankTrialEngine.tsx     # new — full-screen trial workout
│   └── RankUpCeremony.tsx      # new — full-screen rank-up ceremony
├── app/api/rank/
│   └── advance/
│       └── route.ts            # new — POST /api/rank/advance
supabase/migrations/
└── 20260318000000_trial_cooldown.sql  # adds trial_last_failed_at to user_stats
```

Existing files modified:
- `src/components/arise/Profile.tsx` — RANK_PROGRESSION block gets INITIATE TRIAL button + cooldown state
- `src/app/page.tsx` or `src/components/arise/Dashboard.tsx` — render `<RankTrialEngine />` conditional

### Pattern 1: Full-Screen Takeover Component

**What:** Components rendered conditionally over the whole screen. Controlled by a boolean state flag in Dashboard.
**When to use:** Any flow that replaces the current view entirely (WorkoutEngine, Profile, QuestBoard are all this pattern).

**How Dashboard wires WorkoutEngine — copy this exactly for RankTrialEngine:**
```typescript
// In Dashboard.tsx — existing pattern
const [showWorkout, setShowWorkout] = useState(false);

// In JSX:
{showWorkout && (
  <WorkoutEngine
    state={state}
    dispatch={dispatch}
    onClose={() => setShowWorkout(false)}
  />
)}
```

RankTrialEngine uses the same signature:
```typescript
// Props — match WorkoutEngine exactly
interface RankTrialEngineProps {
  state: GameState;
  dispatch: React.Dispatch<any>;
  onClose: () => void;
}
```

### Pattern 2: Multi-Phase State Machine in Full-Screen Component

WorkoutEngine uses `phase: "select" | "active" | "complete"`. RankTrialEngine needs a different set:

```typescript
type TrialPhase =
  | "intro"        // show trial summary, confirm start
  | "active"       // exercise loop — exerciseIndex 0-3
  | "failed"       // failure overlay
  | "passed"       // triggers RankUpCeremony from parent
```

**Why "intro" instead of "select":** Trial has no exercise selection — targets are fixed. The intro phase shows what 2× targets are, then hunter confirms. This is the one deviation from WorkoutEngine's phase pattern.

**Exercise loop inside "active" phase:**
```typescript
const [exerciseIndex, setExerciseIndex] = useState(0); // 0–3
const [exerciseReps, setExerciseReps] = useState<number[]>([0, 0, 0, 0]);

// When current exercise reaches target:
const handleExerciseComplete = () => {
  const next = exerciseIndex + 1;
  if (next >= 4) {
    setPhase("passed"); // all 4 done
  } else {
    setExerciseIndex(next);
    setReps(0);
  }
};
```

### Pattern 3: Server Route Auth — getUserId() Local Copy

Every server route copies this function locally. Do not import from a shared helper.

```typescript
// Source: src/app/api/quests/update/route.ts — established Phase 3 pattern
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
```

### Pattern 4: /api/rank/advance Route Logic

Server-side validation must re-derive the dual-gate from DB data — never trust client-sent rank state.

```typescript
// Source: pattern from /api/xp/award/route.ts + /api/quests/update/route.ts
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Fetch user from DB
  const { data: user } = await supabase
    .from("users")
    .select("level, current_xp, hunter_rank")
    .eq("id", userId)
    .maybeSingle();

  // 2. Re-derive rank from DB state — do not trust payload
  const derivedRank = rankFromLevelAndXp(user.level, totalXpFromStats);
  const nextInfo = nextRankInfo(user.hunter_rank as HunterRank);

  // 3. Verify dual-gate server-side
  const eligible = user.level >= nextInfo.levelThreshold && totalXp >= nextInfo.xpThreshold;
  if (!eligible) return NextResponse.json({ error: "Gate conditions not met" }, { status: 403 });

  // 4. Idempotency guard — if already at next rank, don't double-award
  if (user.hunter_rank === nextInfo.nextRank) {
    return NextResponse.json({ success: true, alreadyAdvanced: true });
  }

  // 5. Write new rank
  await supabase.from("users")
    .update({ hunter_rank: nextInfo.nextRank })
    .eq("id", userId);

  // 6. Award stat points (5 for rank advance)
  const { data: stats } = await supabase.from("user_stats")
    .select("available_stat_points")
    .eq("user_id", userId)
    .maybeSingle();
  await supabase.from("user_stats")
    .update({ available_stat_points: (stats?.available_stat_points || 0) + 5 })
    .eq("user_id", userId);

  // 7. Award XP bonus via internal fetch to /api/xp/award
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/xp/award`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, amount: XP_BONUS[currentRank], reason: "rank_advance" }),
  });

  return NextResponse.json({ success: true, newRank: nextInfo.nextRank, xpBonus, statPoints: 5 });
}
```

**Note on internal fetch URL:** Phase 6 (awardRaidReward) uses `fetch("/api/xp/award", ...)` from a client service. For a server route calling another server route, the URL must be absolute. Use `process.env.NEXT_PUBLIC_APP_URL` or a relative URL with Next.js route handlers. Alternatively, import and call the route's core logic as a shared utility function to avoid the HTTP round-trip. **Recommendation:** extract the XP award logic into a shared utility or call `/api/xp/award` with an absolute base URL.

### Pattern 5: Framer Motion Sequenced Animation (RankUpCeremony)

```typescript
// Source: Dashboard.tsx — AnimatePresence + motion.div already established
// Badge reveal sequence — staggered delays:
<motion.div
  initial={{ x: -60, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
>
  {/* Old rank badge */}
</motion.div>

<motion.div
  initial={{ opacity: 0, scale: 0.5 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, delay: 0.4 }}
>
  {/* ArrowRight icon */}
</motion.div>

<motion.div
  initial={{ scale: 0.3, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.7 }}
>
  {/* New rank badge — add animate-system-pulse class for glow */}
</motion.div>
```

### Anti-Patterns to Avoid

- **Mutating rank in the reducer client-side on trial pass:** Rank changes come from the server route response — dispatch `SET_USER` with updated rank from `/api/rank/advance` response, do not compute rank client-side and dispatch directly.
- **Calling generateDailyQuestTargets in the route handler:** The 2× targets are for UI display and completion validation only. The route does not need to know exercise targets — it only validates that the client reported a pass. Actual exercise completion is client-attested (same as WorkoutEngine).
- **Storing trial state in the reducer:** `trial_last_failed_at` lives in the DB only. The Profile component fetches it on mount (via user stats load in page.tsx). Do not add it to GameState — it would require reducer changes and a new action.
- **Rendering RankUpCeremony inside RankTrialEngine:** Keep them as sibling components. RankTrialEngine calls `onClose()` when the trial passes, and Dashboard renders `<RankUpCeremony />` as a separate conditional. This avoids nested full-screen stacking issues.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 2× trial rep targets | Custom target table per rank | `generateDailyQuestTargets(level, jobClass)` × 2 | Already handles level + job class modifiers — scales automatically with hunter progression |
| Dual-gate eligibility check | Re-implement threshold logic | `nextRankInfo(currentRank)` from xpEngine | Returns `{ nextRank, xpThreshold, levelThreshold }` — all you need |
| Rank colors in ceremony | Hardcode colors | `RANK_COLORS` from `src/lib/constants.ts` | Per-rank colors already defined: E=#9ca3af, D=#22c55e, C=#3b82f6, B=#a855f7, A=#f59e0b, S=#ef4444, NATIONAL=#f97316 |
| XP award on rank advance | Duplicate XP logic | `POST /api/xp/award` (via internal fetch) | Proven route with level-up loop, stat point awards, total_xp_earned tracking |
| Cooldown time formatting | Custom countdown | `Date` arithmetic: `new Date(trial_last_failed_at).getTime() + 24*3600*1000 - Date.now()` | Simple arithmetic, format to HH:MM:SS with string padding |
| Rep counting | Write CV logic | PostureGuard + EXERCISE_DB from `@/lib/vision/repCounter` | MediaPipe pose detection, already integrated in WorkoutEngine |

**Key insight:** Almost everything needed is already built. The phase is primarily composition: wire existing utilities into two new component files and one new route.

---

## Common Pitfalls

### Pitfall 1: Double Rank Advance on Retry

**What goes wrong:** Hunter completes trial, `/api/rank/advance` succeeds, but network timeout causes the client to retry. Route runs twice — hunter gets double stat points and double XP.

**Why it happens:** No idempotency guard in the route.

**How to avoid:** Check `user.hunter_rank === nextInfo.nextRank` before writing. If already at the target rank, return `{ success: true, alreadyAdvanced: true }` without writing.

**Warning signs:** Available stat points higher than expected; hunter rank shows correct value but XP was double-credited.

---

### Pitfall 2: trial_last_failed_at Not Loaded on Profile Mount

**What goes wrong:** Hunter fails a trial. They close Profile and reopen it. The INITIATE TRIAL button is available because `trial_last_failed_at` was never stored in component state.

**Why it happens:** The cooldown timestamp is in the DB but `page.tsx` `mapDbUserToState` does not currently map it. It only maps fields already in `user_stats`.

**How to avoid:** When adding the `trial_last_failed_at` column to `user_stats`, also update `mapDbUserToState` in `page.tsx` to read `dbStats.trial_last_failed_at` and expose it via `GameState` user.stats, OR fetch it fresh in Profile.tsx on mount with a lightweight Supabase client query.

**Recommendation:** Store as `trialLastFailedAt: string | null` in `UserStats` interface and map it in `mapDbUserToState`. This keeps all user state in one place.

**Warning signs:** Cooldown not showing after failure; hunter can immediately re-initiate a failed trial.

---

### Pitfall 3: generateDailyQuestTargets Cardio Units (km vs reps)

**What goes wrong:** The 4th exercise is "Running (km)" with a `target` of `Math.round(base * 0.3)`. At level 10, base = 20, so target = 6. 2× target = 12 km. That's unreasonable as a rep-count exercise in RankTrialEngine.

**Why it happens:** `generateDailyQuestTargets` returns `target` for all 4 exercises, but the cardio entry represents kilometers, not reps. The trial engine doubles it naively.

**How to avoid:** In RankTrialEngine, cap the cardio target or convert units. The UI-SPEC says the rep counter shows `"{2× target} reps"` — for cardio, the display should say `"{2× target} minutes"` or use a different unit. Review the actual numbers at target player levels before shipping.

**Practical numbers at relevant ranks:**
- E→D trial (level 10, NONE class): base=20, push-ups=20 reps, squats=20, sit-ups=20, cardio=6. 2× = 40/40/40/12. 12 km cardio is extreme — needs a unit decision.
- The current WorkoutEngine does not use this function for targets — it uses `baseDifficulty = 10 + Math.floor(userLevel * 0.75)`. Consider whether RankTrialEngine should follow the same approach for cardio.

**Warning signs:** Cardio target displaying double-digit km values; testers complaining about the cardio gate.

---

### Pitfall 4: COMPLETE_WORKOUT Dispatch vs Trial Pass

**What goes wrong:** After a trial pass, developer dispatches `COMPLETE_WORKOUT` to record XP, which also triggers the rank change logic in the reducer. The rank change fires twice — once from `COMPLETE_WORKOUT` in the reducer and once from the `/api/rank/advance` response.

**Why it happens:** WorkoutEngine dispatches `COMPLETE_WORKOUT` as a side effect. A naive copy-paste carries this forward.

**How to avoid:** RankTrialEngine should NOT dispatch `COMPLETE_WORKOUT`. It should call `/api/rank/advance` instead, then dispatch `SET_USER` with the updated rank and stats from the response. No XP is awarded through the normal workout flow for a trial — the rank advance route handles all rewards.

**Warning signs:** Rank changes appearing twice in notifications; available_stat_points inflated.

---

### Pitfall 5: RLS Bypass Missing in New Route

**What goes wrong:** New `/api/rank/advance` route uses the anon Supabase client instead of `supabaseServer`. Writes to `users` table fail silently or return RLS permission errors.

**Why it happens:** Developer imports from `@/lib/supabase` (anon client) instead of `@/lib/supabase-server` (service role client).

**How to avoid:** Every server route in this project uses `import { supabaseServer as supabase } from "@/lib/supabase-server"`. This is the Phase 3 security principle. Copy the import from any existing route file.

---

### Pitfall 6: Abandon Confirmation Overlay Z-Index

**What goes wrong:** The abandon confirmation overlay (rendered as absolute-positioned div inside RankTrialEngine) appears behind other elements.

**Why it happens:** RankTrialEngine itself is `z-50` (following WorkoutEngine). An absolute child defaults to the same stacking context.

**How to avoid:** The UI-SPEC specifies `z-[300]` for the abandon confirmation overlay. WorkoutEngine uses `z-50` for its outer container. Set RankTrialEngine at `z-50` and the abandon overlay at `z-[300]` within it.

---

## Code Examples

### Deriving 2× Trial Targets
```typescript
// Source: src/lib/game/xpEngine.ts — generateDailyQuestTargets
import { generateDailyQuestTargets } from "@/lib/game/xpEngine";

// In RankTrialEngine:
const baseTargets = generateDailyQuestTargets(state.user.level, state.user.jobClass);
const trialTargets = baseTargets.map(t => ({ ...t, target: t.target * 2 }));
// trialTargets[0] = push-ups, [1] = squats, [2] = sit-ups, [3] = cardio
```

### Eligibility Check in Profile
```typescript
// Source: src/lib/game/xpEngine.ts — nextRankInfo
import { nextRankInfo } from "@/lib/game/xpEngine";
import type { HunterRank } from "@/lib/game/xpEngine";

const nextInfo = nextRankInfo(user.rank as HunterRank);
const totalXp = user.stats?.totalXpEarned ?? 0;
const gatesMet = nextInfo.nextRank !== null
  && user.level >= nextInfo.levelThreshold
  && totalXp >= nextInfo.xpThreshold;

// Cooldown check (trialLastFailedAt from user.stats):
const cooldownMs = 24 * 60 * 60 * 1000;
const cooldownActive = user.stats?.trialLastFailedAt
  ? Date.now() - new Date(user.stats.trialLastFailedAt).getTime() < cooldownMs
  : false;

const canInitiate = gatesMet && !cooldownActive;
```

### Notification Dispatch — Failure
```typescript
// Source: src/lib/gameReducer.ts — ADD_NOTIFICATION action
dispatch({
  type: "ADD_NOTIFICATION",
  payload: {
    type: "SYSTEM",
    title: "TRIAL FAILED",
    body: "Trial failed. Cooldown: 24h.",
    icon: "❌",
  },
});
```

### Notification Dispatch — Rank Advance
```typescript
dispatch({
  type: "ADD_NOTIFICATION",
  payload: {
    type: "SYSTEM",
    title: `RANK ADVANCED: ${oldRank} → ${newRank}`,
    body: `+5 stat points and +${xpBonus} XP awarded.`,
    icon: "⬆️",
  },
});
```

### XP Bonus Lookup Table
```typescript
// Place in RankTrialEngine or /api/rank/advance route
const RANK_ADVANCE_XP: Partial<Record<string, number>> = {
  E: 1_000,   // E → D
  D: 2_000,   // D → C
  C: 5_000,   // C → B
  B: 10_000,  // B → A
  A: 25_000,  // A → S
  S: 50_000,  // S → NATIONAL
};
// Usage: RANK_ADVANCE_XP[currentRank]
```

### DB Migration — trial_last_failed_at
```sql
-- supabase/migrations/20260318000000_trial_cooldown.sql
ALTER TABLE "user_stats"
  ADD COLUMN IF NOT EXISTS "trial_last_failed_at" TIMESTAMPTZ DEFAULT NULL;
```

---

## Integration Points

### Where RankTrialEngine Renders

`Dashboard.tsx` already manages all full-screen overlays via boolean state. The new flag follows the exact same pattern as `showWorkout`:

```typescript
// In Dashboard.tsx — add alongside existing state flags
const [showTrial, setShowTrial] = useState(false);

// Wire Profile's onTrialStart callback:
<Profile
  state={state}
  onClose={() => setShowProfile(false)}
  onTrialStart={() => { setShowProfile(false); setShowTrial(true); }}
/>

// Render conditional:
{showTrial && (
  <RankTrialEngine
    state={state}
    dispatch={dispatch}
    onClose={() => setShowTrial(false)}
    onTrialPass={(result) => {
      setShowTrial(false);
      setShowRankUp(true);
      setRankUpResult(result);
    }}
  />
)}
```

Profile currently does not have an `onTrialStart` prop — Profile.tsx must be updated to accept it.

### Profile.tsx RANK_PROGRESSION Block Modification

The RANK_PROGRESSION block is inside an IIFE at line 118. The INITIATE TRIAL button and cooldown display are added below the existing progress bars, inside the `nextInfo.nextRank ? (...)` branch. The button calls `onTrialStart()` from props.

### page.tsx mapDbUserToState Update

The `trial_last_failed_at` column must be mapped:
```typescript
// In page.tsx mapDbUserToState — add to stats object:
trialLastFailedAt: dbStats.trial_last_failed_at ?? null,
```

And `UserStats` interface in gameReducer.ts needs:
```typescript
trialLastFailedAt?: string | null;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| rankAtLevel() — level-only rank | rankFromLevelAndXp() — dual-gate rank | Phase 6 | Trial eligibility must use dual-gate formula, not rankAtLevel |
| awardXp() client service (anon key) | POST /api/xp/award server route | Phase 6 | All XP awards must go through server route; awardRaidReward was already switched in Phase 6 |
| Rank derived automatically from XP | Rank only changes via explicit /api/rank/advance | Phase 7 (new) | /api/xp/award must NOT auto-advance rank anymore — see below |

**Critical: /api/xp/award currently auto-advances rank.** Looking at the existing route code (line 39: `const newRank = rankFromLevelAndXp(level, (user.current_xp + amount))`), the XP award route already updates `hunter_rank` on every XP grant. This means `/api/rank/advance` writing `hunter_rank` is consistent with that pattern.

However, this creates a tension: if a hunter earns enough XP to meet the dual-gate threshold through normal workouts, the XP award route will NOT automatically advance rank (because rank advance via trial is the formal gate). **But the current xp/award route DOES update hunter_rank** based on `rankFromLevelAndXp`. This means:

- The XP award route uses `rankFromLevelAndXp` which returns the "earned" rank based on thresholds
- Phase 7's trial is supposed to be the formal gate for rank advance
- These two mechanisms conflict — a hunter could reach D-rank XP+level thresholds and have `hunter_rank` updated automatically by the XP award route, bypassing the trial entirely

**Resolution (Claude's discretion):** The planner should decide whether to (a) remove the auto-rank-advance from `/api/xp/award` so rank only updates via `/api/rank/advance`, or (b) accept that the XP route handles rank internally and `/api/rank/advance` just adds the ceremony + stat rewards on top. Option (a) is the cleaner design but requires modifying an existing tested route.

---

## Open Questions

1. **Cardio unit handling in 2× targets**
   - What we know: `generateDailyQuestTargets` returns cardio target in km (e.g., 6 km at level 10). 2× = 12 km which is unreasonable as a rep-style exercise.
   - What's unclear: Should cardio be in minutes? Should it use a separate formula? Should RankTrialEngine skip AR rep counting for cardio and use a manual "I completed X km" entry?
   - Recommendation: Cap the cardio 2× target at a reasonable value (e.g., max 5 km) or convert to minutes (target × 10 minutes). WorkoutEngine handles cardio the same way as other exercises (rep count). Follow that pattern but document the unit in the UI.

2. **Auto-rank-advance conflict with /api/xp/award**
   - What we know: The existing `/api/xp/award` route calls `rankFromLevelAndXp` and writes `hunter_rank` — meaning meeting the dual-gate through XP gain already advances rank without a trial.
   - What's unclear: Is this intentional? Should Phase 7 change this behavior?
   - Recommendation: For Phase 7's trial to be a meaningful gate, the planner should decide: either strip `hunter_rank` updates from `/api/xp/award` (route already existed before trial system) or accept the current behavior and treat the trial as a bonus ceremony only. **This decision should be flagged to the user before plan execution.**

3. **Internal fetch from /api/rank/advance to /api/xp/award**
   - What we know: Phase 6 used `fetch("/api/xp/award", ...)` from a client-side service. From a server route, a relative URL will not work — needs absolute URL.
   - What's unclear: Is `NEXT_PUBLIC_APP_URL` set in the project? Alternatively, the XP logic could be extracted to a shared utility.
   - Recommendation: Extract the core XP award logic into `src/lib/game/awardXpToUser.ts` callable from both the route and the RankTrialEngine. This avoids the HTTP round-trip entirely.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `nextRankInfo` returns correct thresholds for each rank | unit | `npx vitest run src/lib/game/xpEngine.test.ts` | Check — likely exists from Phase 6 |
| `generateDailyQuestTargets` × 2 computes correct trial targets | unit | `npx vitest run src/lib/game/xpEngine.test.ts` | Check |
| `/api/rank/advance` rejects when gates not met | unit | `npx vitest run src/app/api/rank/advance/route.test.ts` | Wave 0 gap |
| `/api/rank/advance` is idempotent (already advanced) | unit | same file | Wave 0 gap |
| `/api/rank/advance` writes hunter_rank + stat points | unit | same file | Wave 0 gap |
| 24h cooldown check correctly blocks re-initiation | unit | `npx vitest run src/components/arise/RankTrialEngine.test.ts` | Wave 0 gap |
| Trial pass triggers RankUpCeremony render | manual smoke | — | N/A |

### Wave 0 Gaps
- [ ] `src/app/api/rank/advance/route.test.ts` — covers route validation, idempotency, stat point grant (requires `vi.mock('@/lib/supabase-server')` pattern from Phase 6)
- [ ] `supabase/migrations/20260318000000_trial_cooldown.sql` — adds `trial_last_failed_at` column

*(Check whether `src/lib/game/xpEngine.test.ts` exists from Phase 6 — if so, it may already cover `nextRankInfo` and `generateDailyQuestTargets`.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/lib/game/xpEngine.ts` — `generateDailyQuestTargets`, `nextRankInfo`, `RANK_THRESHOLDS`, `rankFromLevelAndXp`
- Direct code inspection: `src/components/arise/WorkoutEngine.tsx` — component structure, phase state machine, MediaPipe integration
- Direct code inspection: `src/components/arise/Profile.tsx` — RANK_PROGRESSION block, nextRankInfo usage, props interface
- Direct code inspection: `src/app/api/xp/award/route.ts` — server route pattern, getUserId, supabaseServer usage
- Direct code inspection: `src/app/api/quests/update/route.ts` — getUserId local copy pattern, .maybeSingle(), idempotency guard
- Direct code inspection: `src/lib/gameReducer.ts` — GameState type, UserStats, ADD_NOTIFICATION action
- Direct code inspection: `src/app/page.tsx` — Dashboard render pattern, mapDbUserToState, full-screen component wiring
- Direct code inspection: `src/lib/constants.ts` — RANK_COLORS, COLORS hex values
- Direct code inspection: `supabase/migrations/20260311000000_init_schema.sql` — user_stats table columns, users table columns
- Direct code inspection: `vitest.config.ts` — test environment: node, globals: true

### Secondary (MEDIUM confidence)
- `07-CONTEXT.md` — locked decisions, canonical refs, deferred items
- `07-UI-SPEC.md` — component inventory, animation specs, color assignments, copy contracts
- `STATE.md` — Phase 06 decisions (gold color convention, vitest version, auth patterns)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed and verified in package structure
- Architecture patterns: HIGH — derived from direct code inspection of WorkoutEngine, existing routes, and reducer
- Pitfalls: HIGH for DB/auth pitfalls (verified against live code), MEDIUM for cardio units (requires runtime testing)
- Integration points: HIGH — prop signatures and conditional render patterns verified from Dashboard.tsx and page.tsx

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable architecture, no fast-moving dependencies)
