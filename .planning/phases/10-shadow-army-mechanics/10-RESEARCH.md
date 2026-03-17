# Phase 10: Shadow Army Mechanics - Research

**Researched:** 2026-03-17
**Domain:** Shadow extraction system, server-side game mechanics, Supabase atomic writes, React callback patterns
**Confidence:** HIGH — all findings derived from direct codebase inspection

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Boss kill gates extraction — each boss kill grants exactly 1 extraction token
- Tokens stored as new column `extraction_tokens INT DEFAULT 0` on the `users` table
- Token grant happens inside `POST /api/boss/complete` — same call that awards XP; not a separate route
- ARISE button is disabled (opacity-30) when `extraction_tokens === 0`
- On successful extraction attempt: decrement token server-side atomically with the shadow insert
- Rank-scaled success rate: E=90%, D=80%, C=70%, B=50%, A=30%, S=15%
- All logic computed server-side in new `POST /api/shadows/extract` route
- No army size cap — hunter can collect all 17 SHADOWS_DB entries
- Soft rank gate: hunter rank determines weighted probability by shadow rank in draw pool (exact weights table in CONTEXT.md)
- Already-owned shadows excluded from pool before weighting (existing behaviour)
- Shadow buffs (multipliers) ARE wired into hunter stats — not army-power-only
- Stack order: `final_stat = (base_stat + item_bonuses) × shadow_multipliers`
- `calculateModifiedStats` already handles multiplicative stacking — pass item-boosted stats not raw base
- Applied at session init (same pattern as item bonuses in Phase 9)
- Re-applied after successful extraction so stats update immediately without reload
- Multiple shadows that buff same stat compound multiplicatively (two ×1.10 = ×1.21)
- Army power = sum of `base_power` values from all owned shadows joined via `shadows(*)` table
- Displayed in SHADOWS panel header: `TOKENS: 2 | ARMY POWER: 2,840` compact stat chip format
- On extraction notification: use `ADD_NOTIFICATION` type QUEST (4s auto-dismiss) — "SHADOW EXTRACTED: Igris" or "EXTRACTION FAILED"

### Claude's Discretion

- Exact weight lookup table format (array vs object, where to define it — can live in shadowSystem.ts)
- Whether token decrement and shadow insert happen in one DB transaction or two sequential calls
- Exact header layout/spacing for the dual stat display
- Animation/feedback on ARISE button when token count = 0 (tooltip, shake, etc.)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 10 formalises the shadow extraction loop end-to-end. The codebase already has substantial shadow infrastructure: `SHADOWS_DB` (17 UUID-keyed entries with rank and buff multipliers), `calculateModifiedStats` for multiplicative stacking, `ShadowArmy.tsx` UI, and `GET /api/shadows` route. What is missing is the server-side extraction authority — the `POST /api/shadows/extract` route with token gating, rank-scaled success, and weighted pool selection — plus the boss-complete route that grants the tokens in the first place.

The stat integration follows the exact same pattern established in Phase 9 for item bonuses. The only structural difference is that item bonuses are additive (base + item) while shadow bonuses are multiplicative (result × multiplier). `calculateModifiedStats` already implements this correctly; it just needs to receive the item-boosted stats as input rather than raw base stats.

The two delivery plans map cleanly to the two workstreams: Plan 01 builds the DB column, token grant, server extraction route, and `ShadowArmy.tsx` wiring; Plan 02 adds the army power computation, header display, and the `onExtractionChange` callback chain from `ShadowArmy` through `Dashboard` to `page.tsx` for immediate stat re-merge.

**Primary recommendation:** Build `POST /api/boss/complete` (token grant) and `POST /api/shadows/extract` (token consume + shadow insert) as the authoritative server layer; treat `ShadowArmy.tsx` as a dumb display/trigger component that calls these routes and delegates stat refresh back to `page.tsx` via callback.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js (server) | installed | Atomic DB writes via service-role client | All write routes use `supabaseServer` — never anon client |
| Next.js App Router API routes | 16.1.6 | `POST /api/shadows/extract`, `POST /api/boss/complete` | Established project pattern for all server writes |
| React useReducer + dispatch | 18 | `ADD_NOTIFICATION`, `SET_DATA` for stat re-merge | Used throughout — `gameReducer.ts` is the single state authority |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | installed | Extraction animation, AnimatePresence for shadow cards | Already used in `ShadowArmy.tsx` — keep existing animations |
| lucide-react | installed | Loader2 spinner during extraction, Zap/Ghost icons | Already imported in ShadowArmy |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two sequential DB calls (decrement then insert) | Single RPC transaction | Transaction is safer for atomicity but requires a Supabase function. Two sequential calls with error rollback are acceptable given low concurrency in a single-player app. |
| Weighted pool in TypeScript (server) | Weighted pool in DB stored procedure | TypeScript is simpler, testable, and keeps all game logic in one place. |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/api/boss/complete/route.ts   # NEW — grants extraction_tokens += 1
├── app/api/shadows/extract/route.ts # NEW — consumes token, inserts shadow
├── lib/game/shadowSystem.ts         # MODIFY — add weighted pool helper, success rate table
├── lib/services/shadowService.ts    # READ-ONLY (extraction writes go through server route)
├── components/arise/ShadowArmy.tsx  # MODIFY — wire server route, token display, onExtractionChange prop
└── components/arise/Dashboard.tsx   # MODIFY — add onExtractionChange handler (mirrors onEquipChange)
```

`page.tsx` gets a new `computeShadowBonuses` function (copy-don't-import pattern) that accepts the user's shadow ID array and applies `calculateModifiedStats` to the item-boosted stats.

### Pattern 1: Server Route for Atomic Token + Shadow Insert

**What:** `POST /api/shadows/extract` performs all three operations server-side: read current token count, draw from weighted pool, roll success, then atomically decrement token and insert `user_shadows` row.

**When to use:** Any write that touches multiple tables or requires a consistency guarantee.

**Example:**
```typescript
// POST /api/shadows/extract
// Mirrors src/app/api/inventory/equip/route.ts structure exactly

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { SHADOWS_DB } from "@/lib/game/shadowSystem";

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Read user row for token count + hunter_rank
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("extraction_tokens, hunter_rank")
    .eq("id", userId)
    .maybeSingle();

  if (userErr || !userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!userRow.extraction_tokens || userRow.extraction_tokens < 1) {
    return NextResponse.json({ error: "No extraction tokens" }, { status: 400 });
  }

  // 2. Fetch already-owned shadow IDs to exclude from pool
  const { data: ownedRows } = await supabase
    .from("user_shadows")
    .select("shadow_id")
    .eq("user_id", userId);
  const ownedIds = new Set((ownedRows || []).map(r => r.shadow_id));

  // 3. Build weighted pool (weightedPool helper in shadowSystem.ts)
  const available = buildWeightedPool(userRow.hunter_rank, ownedIds);
  if (available.length === 0) {
    return NextResponse.json({ complete: true }, { status: 200 });
  }

  // 4. Select target shadow
  const target = available[Math.floor(Math.random() * available.length)];

  // 5. Roll success
  const SUCCESS_RATES: Record<string, number> = { E: 0.9, D: 0.8, C: 0.7, B: 0.5, A: 0.3, S: 0.15 };
  const success = Math.random() < (SUCCESS_RATES[target.rank] ?? 0.5);

  // 6. Decrement token always (token is consumed regardless of success)
  await supabase
    .from("users")
    .update({ extraction_tokens: userRow.extraction_tokens - 1 })
    .eq("id", userId);

  if (!success) {
    return NextResponse.json({ success: false, shadow: null });
  }

  // 7. Insert shadow
  const { data: inserted } = await supabase
    .from("user_shadows")
    .insert({ user_id: userId, shadow_id: target.id, level: 1 })
    .select()
    .maybeSingle();

  return NextResponse.json({ success: true, shadow: target, row: inserted });
}
```

### Pattern 2: Boss Complete Route (Token Grant)

**What:** `POST /api/boss/complete` awards XP (existing logic to add) AND increments `extraction_tokens` on the `users` table.

**When to use:** Boss kill completion — single authoritative endpoint.

```typescript
// POST /api/boss/complete — NEW FILE
// Token grant: uses supabase.rpc or plain update with increment
await supabase
  .from("users")
  .update({ extraction_tokens: supabase.raw("extraction_tokens + 1") })
  .eq("id", userId);
// NOTE: Supabase JS v2 does NOT support supabase.raw() in .update()
// Use: .update({ extraction_tokens: currentTokens + 1 }) after reading current value
// OR use a Postgres RPC: supabase.rpc("increment_extraction_tokens", { user_id: userId })
```

**Important:** Supabase JS v2 client does not have a `supabase.raw()` helper for update expressions. The increment must be done as: read current value → write current + 1. This is safe in single-player context. If true atomicity is needed, use a Postgres function via `supabase.rpc()`.

### Pattern 3: Weighted Pool in shadowSystem.ts

**What:** `buildWeightedPool(hunterRank, ownedIds)` returns a flat array where each shadow appears N times proportional to its weight. Random selection from this array naturally produces correct probability distribution.

**Example:**
```typescript
// In shadowSystem.ts — alongside SHADOWS_DB

const RANK_WEIGHTS: Record<string, Record<string, number>> = {
  E: { E: 50, D: 20, C: 15, B: 10, A: 4,  S: 1  },
  D: { E: 35, D: 20, C: 20, B: 15, A: 7,  S: 3  },
  C: { E: 20, D: 15, C: 25, B: 20, A: 14, S: 6  },
  B: { E: 10, D: 10, C: 23, B: 22, A: 25, S: 10 },
  A: { E: 5,  D: 5,  C: 15, B: 20, A: 35, S: 20 },
  S: { E: 10, D: 10, C: 17, B: 16, A: 24, S: 23 },
};

export function buildWeightedPool(
  hunterRank: string,
  ownedIds: Set<string>
): Shadow[] {
  const weights = RANK_WEIGHTS[hunterRank] ?? RANK_WEIGHTS["E"];
  const pool: Shadow[] = [];
  for (const shadow of SHADOWS_DB) {
    if (ownedIds.has(shadow.id)) continue;
    const w = weights[shadow.rank] ?? 1;
    for (let i = 0; i < w; i++) pool.push(shadow);
  }
  return pool;
}
```

Note: The exact weights per bucket (E/D, C/B, A/S) are defined in CONTEXT.md. The table above uses approximate per-rank values that reproduce those bucket ratios. The planner should normalise these to match the exact CONTEXT.md percentages.

### Pattern 4: onExtractionChange Callback (mirrors onEquipChange)

**What:** After successful extraction, `ShadowArmy.tsx` calls a prop callback to trigger stat re-merge in `page.tsx` / `Dashboard.tsx`.

**When to use:** Post-extraction — same flow as post-equip.

```typescript
// Dashboard.tsx — SHADOWS tab
{activeTab === "SHADOWS" && (
  <ShadowArmy
    userId={user.id}
    shadows={shadows}
    stats={stats}
    extractionTokens={extractionTokens}       // new prop
    onExtractionChange={async () => {         // new prop
      // Re-fetch shadows and recompute shadow multipliers
      const { getUserShadows } = await import("@/lib/services/shadowService");
      const userShadows = await getUserShadows(user.id);
      const shadowIds = userShadows.map(s => s.shadow_id);
      const { calculateModifiedStats } = await import("@/lib/game/shadowSystem");
      // Build a partial GameState with item-boosted stats + new shadow list
      const boosted = { ...state, shadows: shadowIds };
      const withShadows = calculateModifiedStats(boosted);
      dispatch({ type: "SET_DATA", payload: { shadows: shadowIds, stats: withShadows } });
    }}
  />
)}
```

### Pattern 5: Session Init — Shadow Bonus Merge

**What:** In `page.tsx` `syncSession`, after item bonus merge, fetch user shadows and apply `calculateModifiedStats`.

```typescript
// page.tsx — after computing mergedStats (item bonuses already applied)
const shadowRows = await getUserShadows(session.user.id).catch(() => []);
const shadowIds = shadowRows.map(s => s.shadow_id);
// calculateModifiedStats reads state.shadows — build partial state
const stateWithShadows = {
  ...initialState,
  stats: mergedStats,   // already has item bonuses
  shadows: shadowIds,
};
const finalStats = calculateModifiedStats(stateWithShadows as GameState);
dispatch({
  type: "SET_USER",
  payload: { ...baseState, stats: finalStats },
});
// Also dispatch shadow IDs so ShadowArmy renders correctly
dispatch({ type: "SET_DATA", payload: { shadows: shadowIds } });
```

### Pattern 6: Army Power Computation

**What:** Sum `base_power` from `user_shadows` joined to `shadows(*)`. Already available via `getUserShadows` return shape (`ps.shadows?.base_power`).

```typescript
// Inside ShadowArmy.tsx or Dashboard — IIFE pattern (same as Phase 9 footer stats)
const armyPower = persistentShadows.reduce((sum, ps) => sum + (ps.shadows?.base_power ?? 0), 0);
```

### Anti-Patterns to Avoid

- **Client-side extraction writes:** `saveExtractedShadow` uses the anon client. It must NOT be called for the extraction flow — use `POST /api/shadows/extract` only.
- **Raw base stats passed to calculateModifiedStats:** Must pass item-boosted stats, not `state.user.stats` raw values. Phase 9 already established this with item bonuses.
- **Token decrement in client:** Token count is a security-sensitive value. Never decrement from the client. Server route owns this.
- **Calling attemptExtraction (client stub):** `shadowSystem.ts` exports `attemptExtraction = (rank) => Math.random() < 0.1` — this is a placeholder with a hardcoded 10% rate. Replace entirely with server-side logic; do not call this function.
- **Supabase `.raw()` in update:** Not supported in `@supabase/supabase-js` v2. Use read-then-write or `supabase.rpc()` for increment operations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weighted random selection | Custom weighted RNG | Flat array repeat + `Math.floor(Math.random() * pool.length)` | This IS the standard algorithm — no library needed, but understand it |
| Shadow stat application | Custom multiplier loop | `calculateModifiedStats` already in `shadowSystem.ts` | Already handles multiplicative stacking correctly |
| Auth in API routes | Custom auth middleware | `getUserId()` copy-don't-import pattern (Phase 3) | Established project convention |
| Service-role DB writes | Anon-client direct writes | `supabaseServer` from `@/lib/supabase-server` | All write routes use service-role to bypass RLS |

**Key insight:** The extraction logic is simple enough to implement directly — the complexity is in wiring it correctly (right stat merge order, right callback chain, atomic token handling).

---

## Common Pitfalls

### Pitfall 1: Wrong Stat Input to calculateModifiedStats

**What goes wrong:** Shadow multipliers are applied to raw base stats instead of item-boosted stats, producing understated final values.

**Why it happens:** `calculateModifiedStats` reads `state.stats` — if `state.stats` hasn't been updated with item bonuses yet, the multiplication happens on the wrong base.

**How to avoid:** Ensure `page.tsx` init flow order is: raw base → +item bonuses → ×shadow multipliers. When building the partial GameState for `calculateModifiedStats`, use `mergedStats` (post-item) as the `stats` field.

**Warning signs:** Shadow-buffed stats look lower than expected when items are also equipped.

### Pitfall 2: Double Shadow Application on Extraction

**What goes wrong:** After extraction, `onExtractionChange` recomputes shadow bonuses, but `state.stats` at that point might already include shadow bonuses from init (if init ran `calculateModifiedStats`). Applying them again produces ×1.10 × ×1.10 = ×1.21 on a stat that should only be ×1.10.

**Why it happens:** `SET_DATA` with shadow-multiplied stats doesn't know the previous `state.stats` already included shadow multipliers.

**How to avoid:** The `onExtractionChange` callback must re-derive from `state.user.stats` (the raw base stored at login, before any multipliers), add item bonuses, then apply shadow multipliers on the result. Never chain multipliers on top of already-multiplied values.

**Warning signs:** Stats increase every time a shadow is extracted even when a second copy of the same shadow is drawn (impossible since owned shadows are excluded, but logic leaks still cause runaway growth).

### Pitfall 3: Boss Complete Route Does Not Exist

**What goes wrong:** Planning assumes `POST /api/boss/complete` exists. It does not — confirmed via filesystem search. Plan 01 must create this route from scratch.

**Why it happens:** The route was referenced in design but never implemented.

**How to avoid:** Plan 01 explicitly includes creating `src/app/api/boss/complete/route.ts`. The route pattern to follow is `src/app/api/inventory/equip/route.ts`.

**Warning signs:** If the plan references extending an existing boss route, stop — it must be created.

### Pitfall 4: Token Column Missing in users Table

**What goes wrong:** API routes query `users.extraction_tokens` but the column doesn't exist — query silently returns null.

**Why it happens:** DB migration hasn't been applied yet.

**How to avoid:** Plan 01 Wave 0 must include the DB migration: `ALTER TABLE users ADD COLUMN extraction_tokens INT DEFAULT 0`. This is the first deliverable.

**Warning signs:** `extraction_tokens` always reads as null or undefined even after boss kill.

### Pitfall 5: ARISE Button Token Check Bypassed Client-Side

**What goes wrong:** Token count prop is `undefined` (not yet wired into `ShadowArmy` props), so the `opacity-30` disabled state never activates.

**Why it happens:** `ShadowArmy` currently takes `userId`, `shadows`, `stats` — no `extractionTokens` prop exists yet.

**How to avoid:** Plan 01 adds `extractionTokens: number` to `ShadowArmyProps` and threads it from `Dashboard`. `Dashboard` needs to read it from game state. This means `extraction_tokens` must be loaded in `page.tsx` init and stored in `GameState` or passed down explicitly.

**Warning signs:** ARISE button is always active regardless of token count.

### Pitfall 6: extractionTokens Not in GameState

**What goes wrong:** Token count fetched at init but nowhere to store it — `GameState` has no `extractionTokens` field.

**Why it happens:** `GameState` type in `gameReducer.ts` has no such field today.

**How to avoid:** Plan 01 must decide: (a) add `extractionTokens: number` to `GameState` and a reducer action to update it, or (b) store it as a local `useState` in `Dashboard`. Option (b) is simpler and consistent with how `Dashboard` handles `arenaJustUnlocked` (local state). Fetch it from `users.extraction_tokens` via a dedicated fetch in the init flow or a separate `GET /api/shadows` extension.

**Recommendation:** Use `useState` in `Dashboard` seeded from a token-fetch at mount. This avoids touching `GameState` for a UI-only concern.

### Pitfall 7: shadows Table UUID Mismatch

**What goes wrong:** `SHADOWS_DB` UUIDs (a1b2c3d4-000X) don't match the `shadows` table rows in Supabase. The `getUserShadows` join (`user_shadows.shadow_id` → `shadows.id`) returns null for `ps.shadows` because no matching row exists.

**Why it happens:** The `shadows` DB table was created in the migration but may not be seeded with the same 17 UUIDs. `base_power` is only available via the DB join — it's NOT in `SHADOWS_DB`.

**How to avoid:** Plan 01 must verify `shadows` table is seeded with matching UUIDs, or add a migration that inserts the 17 rows. If `base_power` comes from the DB join but the rows don't exist, army power will always be 0.

**Warning signs:** `ps.shadows` is `undefined` / `null` for all `persistentShadows` entries.

---

## Code Examples

### Existing calculateModifiedStats (verified)

```typescript
// Source: src/lib/game/shadowSystem.ts
export const calculateModifiedStats = (state: GameState) => {
  const mod = { ...state.stats };
  state.shadows.forEach(sid => {
    const s = SHADOWS_DB.find(x => x.id === sid);
    if (s) {
      const cur = mod[s.buff.stat] as number;
      (mod[s.buff.stat] as number) = Math.round(cur * s.buff.multiplier);
    }
  });
  return mod;
};
```

This function reads `state.stats` (the stats field) and `state.shadows` (array of shadow UUIDs). To apply after item bonuses: pass a partial state where `stats = mergedStats` (item-boosted) and `shadows = shadowIds`.

### Existing getUserShadows Return Shape (verified)

```typescript
// Source: src/lib/services/shadowService.ts
export interface UserShadow {
  id: string;
  user_id: string;
  shadow_id: string;
  level: number;
  acquired_at: string;
  shadows?: {
    name: string;
    rarity: string;
    job_class: string;
    base_power: number;     // <-- army power uses this
    icon_url: string | null;
  }
}
```

Army power: `shadowRows.reduce((sum, ps) => sum + (ps.shadows?.base_power ?? 0), 0)`

### Existing ARISE Button (to extend with token gating)

```typescript
// Source: src/components/arise/ShadowArmy.tsx (lines 95-107)
<button
  onClick={handleArise}
  disabled={extracting || loading}   // ADD: || extractionTokens === 0
  className="relative px-8 py-4 group disabled:opacity-30 corner-cut"
>
```

### ADD_NOTIFICATION dispatch for extraction result

```typescript
// Source: gameReducer.ts — ADD_NOTIFICATION action type
dispatch({
  type: "ADD_NOTIFICATION",
  payload: {
    type: "QUEST",   // 4s auto-dismiss (Phase 5 decision: QUEST=4s)
    title: success ? `SHADOW EXTRACTED: ${target.name}` : "EXTRACTION FAILED",
    body: success ? `${target.rank}-rank shadow added to your army` : "The soul resisted extraction",
    icon: success ? "👤" : "💀",
  }
});
```

### Header stat chip format (decision from CONTEXT.md)

```tsx
// TOKENS: 2 | ARMY POWER: 2,840 — compact stat chip, same style as rank HUD
<div className="flex items-center gap-4 text-[9px] font-system font-black tracking-[0.3em] uppercase">
  <span className="text-[#7C3AED]">TOKENS: {extractionTokens}</span>
  <span className="text-white/20">|</span>
  <span className="text-[#E2E8F0]">ARMY POWER: {armyPower.toLocaleString()}</span>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `saveExtractedShadow` (anon client direct write) | `POST /api/shadows/extract` (service-role) | Phase 10 | Security — client can no longer insert arbitrary shadows |
| `attemptExtraction` stub (10% hardcoded) | Rank-scaled server-side rate table | Phase 10 | Correct game balance, tamper-proof |
| Client-side random pool selection | Weighted pool on server | Phase 10 | Hunter rank properly gates shadow quality |
| No token system (unlimited ARISE) | Boss-kill token gate | Phase 10 | Meaningful economy — extraction tied to combat achievement |

**Deprecated/outdated:**
- `attemptExtraction` export in `shadowSystem.ts`: Replace body or leave as no-op stub. The server route owns extraction logic.
- `saveExtractedShadow` in `shadowService.ts`: No longer called for extraction. Can remain for potential admin/seeding use but must not be called from UI.

---

## Open Questions

1. **Token count storage in client state**
   - What we know: `GameState` has no `extractionTokens` field; `users` table will have the column after migration
   - What's unclear: Whether to add it to `GameState` or keep as `Dashboard` local state
   - Recommendation: `useState` in `Dashboard.tsx`, seeded by a fetch at mount or via the existing `GET /api/shadows` route extended to return token count. Avoids touching `gameReducer.ts` for a UI-only concern.

2. **Token consumed on fail vs. only on success**
   - What we know: CONTEXT.md says "decrement token server-side atomically with the shadow insert" — implies decrement only on attempt, not only on success
   - What's unclear: The exact wording could mean decrement + insert are atomic (implying decrement always happens). This is the most natural game-design reading (like a gacha pull — you spend the token regardless).
   - Recommendation: Decrement on every attempt. The locked decision supports this ("atomically with the shadow insert" means the token is spent before the insert). Codify in route comment.

3. **shadows table seeding**
   - What we know: `shadows` table exists in migration schema. No seed SQL found. `getUserShadows` joins `user_shadows.shadow_id → shadows.id`. `base_power` is in this table.
   - What's unclear: Whether the 17 SHADOWS_DB UUID-keyed rows have been inserted into the `shadows` table.
   - Recommendation: Plan 01 Wave 0 must include a migration that inserts/upserts the 17 shadow rows with matching UUIDs and appropriate `base_power` values.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from config.json — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | vitest.config.ts (Phase 6 install) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| `buildWeightedPool` returns correct rank distribution for each hunter rank | unit | `npx vitest run tests/shadowSystem.test.ts -t "buildWeightedPool"` | Pure function, no DB needed |
| `calculateModifiedStats` applies multipliers on item-boosted stats correctly | unit | `npx vitest run tests/shadowSystem.test.ts -t "calculateModifiedStats"` | Existing function |
| `POST /api/shadows/extract` returns 400 when extraction_tokens = 0 | unit | `npx vitest run tests/api/shadows-extract.test.ts -t "no tokens"` | Mock supabaseServer |
| `POST /api/shadows/extract` decrements token on attempt | unit | `npx vitest run tests/api/shadows-extract.test.ts -t "decrement"` | Mock supabaseServer |
| `POST /api/shadows/extract` excludes owned shadows from pool | unit | `npx vitest run tests/api/shadows-extract.test.ts -t "excludes owned"` | Mock supabaseServer |
| Army power sum from base_power values | unit | `npx vitest run tests/shadowSystem.test.ts -t "army power"` | Pure reduce, no DB |

### Wave 0 Gaps
- [ ] `tests/shadowSystem.test.ts` — covers `buildWeightedPool` and `calculateModifiedStats` stacking
- [ ] `tests/api/shadows-extract.test.ts` — covers extraction route token gate, decrement, success/fail
- [ ] `supabase/migrations/20260318000000_extraction_tokens.sql` — adds column + seeds 17 shadow rows
- [ ] `src/app/api/boss/complete/route.ts` — must be created (does not exist)
- [ ] `src/app/api/shadows/extract/route.ts` — must be created (does not exist)

*(No existing test files cover shadow extraction — all test infrastructure is new for this phase)*

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `src/lib/game/shadowSystem.ts` — SHADOWS_DB, calculateModifiedStats, attemptExtraction stub
- Direct file read: `src/lib/services/shadowService.ts` — getUserShadows, saveExtractedShadow, UserShadow interface
- Direct file read: `src/components/arise/ShadowArmy.tsx` — full UI, handleArise flow, existing props
- Direct file read: `src/app/api/shadows/route.ts` — GET route pattern
- Direct file read: `src/app/api/inventory/equip/route.ts` — POST write route pattern to mirror
- Direct file read: `src/lib/gameReducer.ts` — GameState type, ADD_NOTIFICATION, EXTRACT_SHADOW, SET_DATA
- Direct file read: `src/app/page.tsx` — init flow, computeItemBonuses, onEquipChange pattern
- Direct file read: `supabase/migrations/20260311000000_init_schema.sql` — users, shadows, user_shadows tables
- Direct file read: `src/components/arise/Dashboard.tsx` — ShadowArmy render point, onEquipChange pattern
- Direct filesystem search: confirmed `src/app/api/boss/` does not exist

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — historical decisions, established patterns from Phases 1-9
- `.planning/phases/10-shadow-army-mechanics/10-CONTEXT.md` — locked decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already in use, no new dependencies
- Architecture: HIGH — patterns directly observed in existing routes; `equip/route.ts` is the blueprint
- Pitfalls: HIGH — all pitfalls derived from direct code inspection (missing route, missing column, stat order issue are concrete gaps, not speculation)
- Weighted pool logic: HIGH — standard algorithm, no library dependency

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain — no external dependencies changing)
