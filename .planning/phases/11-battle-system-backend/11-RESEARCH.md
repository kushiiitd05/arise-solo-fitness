# Phase 11: Battle System Backend - Research

**Researched:** 2026-03-19
**Domain:** Next.js API routes, Supabase writes, combat math, ELO rating, Arena.tsx integration
**Confidence:** HIGH

## Summary

Phase 11 replaces Arena.tsx's client-side mock battle with a real backend. Two new API routes handle everything: `POST /api/arena/battle` runs the full outcome computation and persists to a new `arena_battles` table, then chains to the existing `/api/xp/award` route for XP grants. `GET /api/arena/history` returns the player's battle log to replace `MOCK_HISTORY`. A DB migration adds the `arena_battles` table and a `pvp_rating` column to `user_stats` (which already has `pvp_wins` / `pvp_losses` columns — confirmed in the init schema).

The combat formula is purely server-side computation: no external libraries, no edge functions. The same pattern used in `POST /api/shadows/extract` (stat reads, computation, multi-step Supabase writes) is the direct template. The ELO rating helpers already exist in `src/lib/game/xpEngine.ts` (`calculateRatingChange`, K=32). Rank bracket lookup already exists via `RANK_THRESHOLDS` and `rankFromLevelAndXp`.

**Primary recommendation:** Model `POST /api/arena/battle` directly on the extract route pattern — read user row, compute outcome from stats, write arena_battles insert + user_stats update atomically in sequence, chain fetch to `/api/xp/award`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Opponents are synthetic AI — no real DB users, no multiplayer infra
- Opponent stats are rank-bracket scaled: server assigns opponent rank near player's rank (±1 rank), then generates opponent stats as a percentage of typical stats for that rank bracket
- Opponent names and ranks drawn from existing OPPONENT_NAMES / OPPONENT_RANKS arrays in Arena.tsx — server picks from them
- Player-selected exercise type carries through to the server — submitted with the battle request
- Win probability = f(stat ratio CPI + exercise-weighted stats + real-world performance modifier) + RNG uncertainty
- Exercise stat weighting: PUSH-UPS → STR dominant; SQUATS → AGI + STR; SIT-UPS → AGI + VIT; PLANKS → VIT + INT (endurance/focus)
- Player submits reps completed or time held via input field in Arena.tsx after accepting opponent — submitted alongside POST /api/arena/battle
- Performance modifier adjusts final win probability — better performance = higher win chance
- RNG still applies — outcome is never guaranteed
- Draw condition: when player and opponent combat power are within ~10% of each other; draws give ~25% of win XP
- New `arena_battles` table: id, user_id, opponent_name, opponent_rank, exercise, outcome (WIN/LOSS/DRAW), xp_change, rating_change, reps_submitted, created_at
- HISTORY tab wired to GET /api/arena/history — MOCK_HISTORY replaced
- Win = +XP (opponent-rank scaled), Loss = 0 XP, Draw = ~25% of win XP
- XP by opponent rank: D=150, C=250, B=400, A=600, S=1000 — exact values set by Claude
- pvp_rating stored as column on user_stats (already exists in init schema), updates per battle
- XP grant goes through existing POST /api/xp/award route

### Claude's Discretion
- Exact CPI formula (how to combine stat values into one combat power number)
- Exact weight percentages per exercise-stat mapping
- Performance modifier scale (how reps/time maps to probability bonus — linear? capped?)
- Rating delta values per outcome
- How rank-bracket scaling works numerically
- Whether pvp_wins / pvp_losses are added columns or computed from arena_battles at query time

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | existing | API route handlers | Already in use throughout project |
| Supabase JS v2 (`supabaseServer`) | existing | Service-role DB writes | Established pattern — all write routes use this |
| TypeScript | existing | Type safety | Project-wide |
| vitest | 4.1.0 | Unit tests for pure computation | Installed in Phase 6, config at vitest.config.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `xpEngine.ts` (local) | n/a | `calculateRatingChange`, `RANK_THRESHOLDS`, `rankFromLevelAndXp` | ELO delta + rank bracket lookup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sequential Supabase writes | DB transaction / RPC | RPC would be cleaner atomicity but project avoids adding infra — sequential writes with error logging match every prior phase |
| Computing pvp_wins/losses from arena_battles at query time | Storing as columns on user_stats | Query-time is cleaner but requires a COUNT query on every load; storing as columns matches existing pvp_wins/pvp_losses already in user_stats |

**Installation:** None. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/api/arena/
├── battle/route.ts   # POST — outcome computation, persistence, XP chain
└── history/route.ts  # GET  — paginated battle log for HISTORY tab
```

### Pattern 1: API Route with Multi-Step Supabase Writes (extract route template)
**What:** Read user row, run computation, write multiple tables in sequence, return result
**When to use:** Any route that needs to read state, compute, then update multiple tables
**Example (from `src/app/api/shadows/extract/route.ts`):**
```typescript
// Source: src/app/api/shadows/extract/route.ts
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userRow } = await supabase
    .from("users")
    .select("extraction_tokens, hunter_rank")
    .eq("id", userId)
    .maybeSingle();
  // ... computation ...
  // ... sequential writes ...
}
```

### Pattern 2: XP Chain Call (boss/complete → xp/award pattern)
**What:** After battle is resolved, POST to /api/xp/award with userId + amount. Non-fatal if unreachable.
**When to use:** Any route that awards XP — never write XP directly
**Example (from `src/lib/services/bossService.ts`):**
```typescript
// Source: src/lib/services/bossService.ts (Phase 6 established pattern)
await fetch("/api/xp/award", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId, amount: xpAmount, reason: "arena_battle_win" }),
});
```

### Pattern 3: Matchmaking Search → Accept with Performance Input (Arena.tsx UI flow)
**What:** Current `handleAccept` fires immediately. Phase 11 changes this: after accept, player sees a reps/time input field, then submits to POST /api/arena/battle.
**When to use:** This is the key UI change in Plan 11-02
**States needed:**
```typescript
type MatchStatus = "idle" | "searching" | "found" | "performing" | "resolving" | "result";
// "performing" = reps input shown after accept
// "resolving" = waiting for POST /api/arena/battle response
// "result" = outcome card shown (WIN/LOSS/DRAW)
```

### Pattern 4: GET route for history
**What:** Simple GET with Bearer auth, query arena_battles by user_id ORDER BY created_at DESC LIMIT 20
**When to use:** HISTORY tab replaces MOCK_HISTORY
**Example:**
```typescript
// Source: pattern mirrors GET /api/inventory route.ts
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("arena_battles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });
  return NextResponse.json({ battles: data ?? [] });
}
```

### Anti-Patterns to Avoid
- **Writing XP directly to DB from the battle route:** XP always goes through `/api/xp/award` — never duplicate XP logic
- **Multiplayer infrastructure:** No websockets, no real-time, no opponent DB users — opponents are synthetic
- **Client-side outcome computation:** The entire formula must live on the server — this is the point of Phase 11
- **Using `.single()` instead of `.maybeSingle()`:** Row may be missing; always use maybeSingle per Phase 1 decision
- **Shared getUserId helper:** Copy the function locally per Phase 3 principle

---

## Combat Formula Design (Claude's Discretion Resolved)

### CPI (Combat Power Index)
CPI is a single number combining all stats. Proposed formula:

```
CPI = (STR × exerciseWeight.str + AGI × exerciseWeight.agi + VIT × exerciseWeight.vit + INT × exerciseWeight.int) / 4
```

Exercise weights (must sum to 1.0 across active stats):

| Exercise | STR | AGI | VIT | INT |
|----------|-----|-----|-----|-----|
| PUSH-UPS | 0.6 | 0.2 | 0.1 | 0.1 |
| SQUATS   | 0.4 | 0.4 | 0.1 | 0.1 |
| SIT-UPS  | 0.2 | 0.4 | 0.3 | 0.1 |
| PLANKS   | 0.1 | 0.1 | 0.5 | 0.3 |

### Opponent Stat Generation
Rank bracket typical stat values (base stats at default allocations):
- D-rank: ~12 per stat (level 10, minimal allocation)
- C-rank: ~18 per stat (level 20)
- B-rank: ~30 per stat (level 35)
- A-rank: ~50 per stat (level 50)
- S-rank: ~80 per stat (level 70)

Opponent gets stats at 85–110% of typical for their rank bracket (random in range). This provides natural variance without needing a real user.

### Win Probability Formula
```
statRatio = playerCPI / (playerCPI + opponentCPI)  // 0→1, 0.5 = perfectly matched

// Performance modifier: reps submitted mapped to [-0.15, +0.15]
// Cap at typical target for exercise (e.g. 50 push-ups = neutral)
// Each 10% above target adds 0.03, capped at +0.15
// Below 50% of target applies -0.10 penalty
perfMod = clamp((repsSubmitted / TARGET_REPS - 1.0) * 0.3, -0.15, 0.15)

// Draw zone: abs(statRatio - 0.5) < 0.05 enables draw possibility
winProbability = clamp(statRatio + perfMod, 0.05, 0.95)

// RNG roll
roll = Math.random()
if (abs(statRatio - 0.5) < 0.05 && roll < 0.25):  outcome = DRAW
else if (roll < winProbability):  outcome = WIN
else:  outcome = LOSS
```

### XP Values (Claude sets exact values per CONTEXT.md)
| Opponent Rank | Win XP | Draw XP | Loss XP |
|--------------|--------|---------|---------|
| D | 150 | 38 | 0 |
| C | 250 | 63 | 0 |
| B | 400 | 100 | 0 |
| A | 600 | 150 | 0 |
| S | 1000 | 250 | 0 |

### Rating Deltas (ELO-inspired but simplified)
Use existing `calculateRatingChange(myRating, opponentRating, won)` from xpEngine.ts — returns ELO delta with K=32. For draws, use `Math.round(K * (0.5 - expected))` (standard ELO draw formula).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ELO rating delta | Custom formula | `calculateRatingChange` from xpEngine.ts | Already implemented with K=32, standard formula |
| Rank bracket lookup | Custom rank→stat table | `RANK_THRESHOLDS` from xpEngine.ts | Canonical source of rank level/XP thresholds |
| XP persistence | Direct DB write | `POST /api/xp/award` | Level-up computation, stat points, total_xp_earned all handled there |
| Auth | Custom token parsing | `getUserId()` copy-pattern | Bearer-only, established per Phase 3 |

**Key insight:** All core computation primitives exist already. Phase 11 is integration work, not new algorithm design.

---

## DB Schema Analysis

### Confirmed: pvp_rating / pvp_wins / pvp_losses already exist
From `supabase/migrations/20260311000000_init_schema.sql`, `user_stats` already has:
```sql
"pvp_rating"  INTEGER DEFAULT 1000,
"pvp_wins"    INTEGER DEFAULT 0,
"pvp_losses"  INTEGER DEFAULT 0,
```
**No new column needed on user_stats for pvp_rating.** The CONTEXT.md says "add pvp_rating column to users" — but it is already in `user_stats`. The migration only needs to create `arena_battles` and potentially add a pvp_rating column to the `users` table if the CONTEXT requires it there too. Looking at the CONTEXT.md: "pvp_rating stored as new column on users table". The schema shows pvp_rating in user_stats, not users. Resolution: use user_stats.pvp_rating (already exists) rather than adding a duplicate to users. This avoids a migration for a column that exists.

### New Migration Required: arena_battles table
```sql
CREATE TABLE "arena_battles" (
  "id"             UUID    NOT NULL DEFAULT uuid_generate_v4(),
  "user_id"        UUID    NOT NULL,
  "opponent_name"  TEXT    NOT NULL,
  "opponent_rank"  TEXT    NOT NULL,
  "exercise"       TEXT    NOT NULL,
  "outcome"        TEXT    NOT NULL,  -- 'WIN' | 'LOSS' | 'DRAW'
  "xp_change"      INTEGER NOT NULL DEFAULT 0,
  "rating_change"  INTEGER NOT NULL DEFAULT 0,
  "reps_submitted" INTEGER,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "arena_battles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "arena_battles_user_id_idx" ON "arena_battles"("user_id");
ALTER TABLE "arena_battles" ADD CONSTRAINT "arena_battles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
```

Migration file: `supabase/migrations/20260319000000_arena_battles.sql`

### pvp_wins / pvp_losses tracking
Both columns already exist on `user_stats`. Decision: increment them in the same UPDATE call that updates pvp_rating — no second query needed, no compute-on-read complexity.

---

## Common Pitfalls

### Pitfall 1: Double XP Grant
**What goes wrong:** Battle route writes XP directly AND chains to /api/xp/award, doubling the award.
**Why it happens:** Forgetting the route handles only persistence, XP goes through the chain.
**How to avoid:** Battle route writes arena_battles + updates pvp_rating/pvp_wins/pvp_losses only. XP is exclusively via chained fetch to /api/xp/award.
**Warning signs:** User level jumps 2× expected on win.

### Pitfall 2: pvp_rating Written to Wrong Table
**What goes wrong:** Writing pvp_rating to `users` table instead of `user_stats` table.
**Why it happens:** CONTEXT.md says "users table" but schema shows it in user_stats.
**How to avoid:** Always update `user_stats` for pvp_rating, pvp_wins, pvp_losses. Check init schema before writing.

### Pitfall 3: matchStatus State Machine Gap
**What goes wrong:** Arena.tsx handleAccept transitions to "idle" immediately — player never sees result.
**Why it happens:** Current handleAccept resets state and shows notification only. Plan 11-02 must add "performing" and "result" states.
**How to avoid:** Plan 11-02 must add reps input UI and outcome display card before resetting to "idle".

### Pitfall 4: Opponent Stats Not Matching Arena Rank Display
**What goes wrong:** Server generates opponent at rank C but Arena.tsx shows them as rank D (from client-side random selection).
**Why it happens:** Currently Arena.tsx selects opponent rank client-side. After Phase 11, opponent is generated server-side and returned in the POST /api/arena/battle response.
**How to avoid:** Remove client-side opponent selection from search. Instead, call POST /api/arena/matchmake (or include opponent data in POST /api/arena/battle response). The simpler path: keep the current search-and-found flow client-side for UX, but the accepted opponent data is re-validated/generated server-side in the battle call.

### Pitfall 5: Performance Modifier Input Validation
**What goes wrong:** Player submits reps=99999 to guarantee win.
**Why it happens:** No server-side cap on performance modifier.
**How to avoid:** Server caps reps at a reasonable max (e.g., 5× the typical target for that exercise) before computing perfMod. The modifier is already clamped to ±0.15 in the formula.

### Pitfall 6: Arena History Shows Empty Until Refresh
**What goes wrong:** After winning a battle, HISTORY tab still shows MOCK_HISTORY or empty.
**Why it happens:** Plan 11-02 must add a fetch call on tab switch to HISTORY, or refresh after battle outcome.
**How to avoid:** Arena.tsx should refetch history data after battle result is received, or always fetch on tab change to HISTORY.

---

## Code Examples

### Battle Route Skeleton
```typescript
// src/app/api/arena/battle/route.ts
// Source: extract route pattern (src/app/api/shadows/extract/route.ts)
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { calculateRatingChange, RANK_THRESHOLDS } from "@/lib/game/xpEngine";

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

const XP_BY_RANK: Record<string, number> = {
  D: 150, C: 250, B: 400, A: 600, S: 1000,
};

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { exercise, opponentName, opponentRank, repsSubmitted } = body || {};

  // 1. Read player stats
  const { data: statsRow } = await supabase
    .from("user_stats")
    .select("strength, agility, vitality, intelligence, pvp_rating, pvp_wins, pvp_losses")
    .eq("user_id", userId)
    .maybeSingle();

  // 2. Generate opponent stats from rank bracket
  // 3. Compute CPI for player and opponent
  // 4. Compute win probability with perfMod
  // 5. Roll outcome (WIN / LOSS / DRAW)
  // 6. Compute xpChange and ratingChange
  // 7. Insert arena_battles row
  // 8. Update user_stats (pvp_rating, pvp_wins/losses)
  // 9. Chain XP award (non-fatal)
  // 10. Return outcome

  return NextResponse.json({ outcome, xpChange, ratingChange, opponentName, opponentRank });
}
```

### Arena.tsx handleAccept Replacement
```typescript
// Source: Arena.tsx (src/components/arise/Arena.tsx) — current handleAccept to be replaced
// New flow: accept → show reps input (matchStatus = "performing") → submit → resolving → result

const handleBattleSubmit = async (repsSubmitted: number) => {
  setMatchStatus("resolving");
  const token = // get from state.user.id session — passed as Bearer
  const res = await fetch("/api/arena/battle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userId}`,
    },
    body: JSON.stringify({
      exercise: selectedExercise,
      opponentName: opponent?.name,
      opponentRank: opponent?.rank,
      repsSubmitted,
    }),
  });
  const data = await res.json();
  setBattleResult(data);
  setMatchStatus("result");
  dispatch({
    type: "ADD_NOTIFICATION",
    payload: {
      type: "PVP",
      title: data.outcome === "WIN" ? `BATTLE WON: +${data.xpChange} XP` : data.outcome === "DRAW" ? `DRAW: +${data.xpChange} XP` : "BATTLE LOST",
      body: `vs ${data.opponentName}`,
      icon: "⚔️",
    },
  });
};
```

### History Fetch in Arena.tsx
```typescript
// On tab switch to HISTORY
useEffect(() => {
  if (activeTab !== "HISTORY") return;
  const fetchHistory = async () => {
    const res = await fetch("/api/arena/history", {
      headers: { "Authorization": `Bearer ${userId}` },
    });
    const data = await res.json();
    setBattleHistory(data.battles ?? []);
  };
  fetchHistory();
}, [activeTab]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side `setTimeout` outcome simulation | Server-authoritative POST /api/arena/battle | Phase 11 | Real stat-based outcomes, persistent history |
| MOCK_HISTORY hardcoded array | GET /api/arena/history from DB | Phase 11 | Real battle log |
| Random pvpRating (no server write) | user_stats.pvp_rating updated per battle | Phase 11 | Live MMR tracking |

**Deprecated/outdated:**
- `MOCK_HISTORY` in Arena.tsx: replaced by API fetch in Plan 11-02
- `handleAccept` timeout + notification only: replaced by full battle API flow

---

## Open Questions

1. **Opponent shown to player before battle vs. server validation**
   - What we know: Current Arena.tsx generates opponent client-side (name + rank). Server needs to compute battle using opponent stats.
   - What's unclear: Should POST /api/arena/battle accept the client-supplied opponent name/rank and use them, or should the server independently re-generate the opponent?
   - Recommendation: Accept client-supplied opponentName and opponentRank (already shown in UI) — server uses the rank to generate stats independently. This keeps the UI opponent display consistent with server computation without a separate matchmake endpoint.

2. **Auth pattern: userId from Bearer vs session**
   - What we know: All existing routes use Bearer token carrying userId directly.
   - What's unclear: Arena.tsx needs access to userId to construct the Bearer header.
   - Recommendation: Same as all other client-to-API calls — get userId from `state.user.id` and pass as Bearer header. Consistent with established pattern.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/game/battleEngine.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BATTLE-01 | CPI computation produces correct weighted stat score | unit | `npx vitest run src/lib/game/battleEngine.test.ts -t "CPI"` | Wave 0 |
| BATTLE-02 | Win probability clamped to [0.05, 0.95] | unit | `npx vitest run src/lib/game/battleEngine.test.ts -t "winProbability"` | Wave 0 |
| BATTLE-03 | Draw condition triggers when statRatio within 10% | unit | `npx vitest run src/lib/game/battleEngine.test.ts -t "draw"` | Wave 0 |
| BATTLE-04 | Performance modifier clamped to [-0.15, +0.15] | unit | `npx vitest run src/lib/game/battleEngine.test.ts -t "perfMod"` | Wave 0 |
| BATTLE-05 | XP values correct per opponent rank (D=150, C=250...) | unit | `npx vitest run src/lib/game/battleEngine.test.ts -t "xpByRank"` | Wave 0 |
| BATTLE-06 | POST /api/arena/battle returns 401 without auth | unit | `npx vitest run src/app/api/arena/battle/route.test.ts -t "auth"` | Wave 0 |
| BATTLE-07 | Battle persisted to arena_battles table | unit | `npx vitest run src/app/api/arena/battle/route.test.ts -t "persistence"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/game/battleEngine.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/game/battleEngine.ts` — pure computation module (CPI, winProbability, outcome roll, perfMod, XP lookup)
- [ ] `src/lib/game/battleEngine.test.ts` — unit tests for all pure functions
- [ ] `src/app/api/arena/battle/route.test.ts` — auth + persistence contract tests (vi.mock supabase)
- [ ] `supabase/migrations/20260319000000_arena_battles.sql` — arena_battles table migration

---

## Sources

### Primary (HIGH confidence)
- `src/app/api/shadows/extract/route.ts` — Multi-step write pattern template
- `src/app/api/boss/complete/route.ts` — Simpler write pattern template
- `src/app/api/inventory/equip/route.ts` — Bearer auth + ownership check pattern
- `src/app/api/xp/award/route.ts` — XP chain call target
- `src/lib/game/xpEngine.ts` — `calculateRatingChange`, `RANK_THRESHOLDS`, `rankFromLevelAndXp`
- `src/lib/gameReducer.ts` — `UserStats` type, `ADD_NOTIFICATION` action, `pvpRating/pvpWins/pvpLosses` fields
- `src/components/arise/Arena.tsx` — Full UI to integrate with
- `supabase/migrations/20260311000000_init_schema.sql` — Confirmed `pvp_rating/pvp_wins/pvp_losses` in `user_stats`
- `vitest.config.ts` — Test framework config

### Secondary (MEDIUM confidence)
- ELO formula with K=32 — standard well-known formula, verified in xpEngine.ts implementation

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies confirmed present in codebase
- Architecture: HIGH — all patterns verified from existing routes
- Combat formula: MEDIUM — values are design decisions (Claude's discretion), not externally validated
- DB schema: HIGH — confirmed from init_schema.sql
- Pitfalls: HIGH — sourced directly from existing code patterns and prior phase decisions

**Research date:** 2026-03-19
**Valid until:** 2026-04-18 (stable — no fast-moving deps)
