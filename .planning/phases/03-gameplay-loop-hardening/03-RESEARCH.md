# Phase 3: Gameplay Loop Hardening - Research

**Researched:** 2026-03-15
**Domain:** Next.js App Router API routes, Supabase server client, React state wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Stamina Display**
- Derived from `vitality` stat (no new DB column needed)
- Formula: `current/max` format where `max = vitality × 10`, current always equals max (no drain mechanic in this phase)
- Example: vitality 10 → "100/100", vitality 15 → "150/150"

**Mana Display**
- Derived from `intelligence` stat (no new DB column needed)
- Formula: `level × intelligence` → displayed as a raw number
- Example: level 1, intel 10 → 10; level 20, intel 20 → 400
- Wire to `state.user.level` and `state.stats.intelligence` from GameState

**POST /api/quests/update — Route Shape**
- Request body: `{ questId: string, newCurrent: number }`
- Server computes completion status (`newCurrent >= target`) — client does not send a `completed` flag
- If completing a quest causes all daily quests to complete, the server grants XP in the same call (progress + completion in one transaction)
- Auth: Bearer header only — `getUserId()` reads `Authorization` header, never URL params

**GET /api/inventory — Route Shape**
- GET only in this phase (no writes)
- Response: `{ equipped: [...], unequipped: [...] }` — pre-sorted by equip status
- Auth: Bearer header only

**GET /api/shadows — Route Shape**
- GET only in this phase (no writes, no extraction)
- Response: flat array `{ shadows: [...] }` — or match what ShadowArmy.tsx expects
- Auth: Bearer header only

### Claude's Discretion
- Exact error response format for API routes (consistent with existing routes)
- Whether to refactor `questService.updateQuestProgress` to call the new route, or update callers directly
- Shadow response shape details — match what `ShadowArmy.tsx` component expects

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| 03-01 | Create /api/inventory and /api/shadows server routes | Service functions getUserInventory() and getUserShadows() exist and are ready to call; Bearer auth pattern established |
| 03-02 | Wire Dashboard header stats + POST /api/quests/update route | Hardcoded values at Dashboard.tsx:147-148; questService.updateQuestProgress() is the direct-write function to replace; complete/route.ts is the exact model |
</phase_requirements>

---

## Summary

Phase 3 has two workstreams: creating server-only read routes for inventory and shadows (03-01), and wiring real stamina/mana stats into Dashboard while creating the quest-progress update route (03-02). All the necessary service-layer functions already exist in the codebase — this phase is purely about connecting them through the established server-route pattern and replacing the two hardcoded header values.

The project has a fully established API route pattern from Phase 1. All routes use: `supabaseServer` (service-role client), `getUserId()` reading `Authorization: Bearer`, `.maybeSingle()` for nullable queries, and service-layer calls rather than inline Supabase queries. Every new route in this phase follows that exact pattern. Zero new patterns need to be invented.

The key insight for the planner: `questService.updateQuestProgress()` does a direct anon-key write and must be replaced. The existing `/api/quests/complete/route.ts` is the reference implementation — the new `/api/quests/update` route follows the same structure but writes `current` progress instead of forcing `completed: true`.

**Primary recommendation:** Create three files — `src/app/api/quests/update/route.ts`, `src/app/api/inventory/route.ts`, `src/app/api/shadows/route.ts` — then patch Dashboard.tsx (two computed values) and update the QuestBoard/WorkoutEngine callers of `updateQuestProgress`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next/server NextRequest/NextResponse | Next.js 14+ | Route handler types | Already in every route |
| @supabase/supabase-js (supabaseServer) | v2 | Server-side DB access (bypasses RLS) | Established via supabase-server.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| inventoryService.getUserInventory() | local | Fetch user_inventory joined with items | Call from /api/inventory |
| shadowService.getUserShadows() | local | Fetch user_shadows joined with shadows | Call from /api/shadows |
| questService (existing) | local | Quest DB interaction | updateQuestProgress() is the function being replaced |

### No New Dependencies
This phase installs nothing. All imports already exist in the project.

---

## Architecture Patterns

### Established Route Structure (HIGH confidence)

Every API route in this project follows this pattern:

```typescript
// Source: src/app/api/user/route.ts (established pattern)
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... service call ...
}
```

This `getUserId()` function is copy-pasted into each route file (not exported from a shared module). New routes must include it locally, matching the established pattern.

### Recommended Project Structure for New Files
```
src/app/api/
├── quests/
│   ├── complete/route.ts   (EXISTS — model for update route)
│   ├── daily/route.ts      (EXISTS)
│   └── update/route.ts     (NEW — Phase 03-02)
├── inventory/
│   └── route.ts            (NEW — Phase 03-01)
├── shadows/
│   └── route.ts            (NEW — Phase 03-01)
├── user/route.ts           (EXISTS)
├── xp/award/route.ts       (EXISTS)
└── leaderboard/route.ts    (EXISTS)
```

### Pattern: Service Layer Calls from Route Handlers (HIGH confidence)

Routes call service functions, they do not inline Supabase queries directly. The service functions (`getUserInventory`, `getUserShadows`) import the anon-key client (`supabase` from `@/lib/supabase`). **For server routes, call these functions but pass the result through — or better, replicate the query using `supabaseServer`** to ensure service-role privileges are used.

**Key decision for planner:** `getUserInventory()` and `getUserShadows()` import the anon-key client, not the server client. The existing pattern (e.g., `/api/quests/complete`) calls `supabaseServer` directly in the route, not the service functions. The safest approach is to replicate the service queries inline in each new route using `supabaseServer`, keeping consistency with the existing route pattern.

### Pattern: Quest Progress Update Logic

The existing `updateQuestProgress()` in `questService.ts` shows the DB query shape:

```typescript
// Current direct-write (to be replaced)
// Source: src/lib/services/questService.ts:37-68
await supabase
  .from("daily_quests")
  .select("id, quests")
  .eq("user_id", userId)
  .eq("quest_date", today)
  .limit(1);
// then: update({ quests: updated, all_completed: allCompleted }).eq("id", data.id)
```

The new `/api/quests/update` mirrors `/api/quests/complete/route.ts` but:
- Accepts `{ questId, newCurrent }` not just `{ questId }`
- Sets `current: newCurrent` (partial progress) not `current: target` (forced complete)
- Computes `completed: newCurrent >= target` server-side
- If all quests complete after this update, grants XP in same call (same XP-award logic already in complete/route.ts)

### Pattern: Dashboard Stats Wiring (HIGH confidence)

The hardcoded values are at Dashboard.tsx lines 147-148:

```typescript
// Current (to replace):
{ label: "STAMINA", val: "94/100", col: "text-[#22C55E]" },
{ label: "MANA", val: "2,480", col: "text-[#7C3AED]" },
```

Replacement pulls from `state.stats` (already in scope as `const { user, stats, ... } = state`):

```typescript
// Stamina: vitality × 10 / vitality × 10 (always full in this phase)
const staminaMax = stats.vitality * 10;
const staminaVal = `${staminaMax}/${staminaMax}`;

// Mana: level × intelligence
const manaVal = (user.level * stats.intelligence).toLocaleString();
```

Both `stats.vitality` and `stats.intelligence` come from `GameState.stats` (type `UserStats` in gameReducer.ts). Both are numbers. `user.level` is also a number in scope.

### Anti-Patterns to Avoid

- **Inline Supabase queries in route handlers using the anon client:** Always use `supabaseServer` in route files.
- **Reading userId from URL params or body in auth-sensitive routes:** `getUserId()` reads `Authorization: Bearer` header only. The existing `quests/complete` route takes `userId` from the request body — new routes should use the Bearer pattern established in `user/route.ts` and `xp/award/route.ts`.
- **Using `.single()` instead of `.maybeSingle()`:** `.single()` throws 406 when no row found. Project-wide decision: use `.maybeSingle()`.
- **Sending `completed` flag from client:** The new update route computes completion server-side. Client sends only `{ questId, newCurrent }`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quest progress DB write | Custom Supabase query in QuestBoard | POST /api/quests/update route | Anon-key writes are a security hole |
| Inventory fetch | Another anon-key client call | GET /api/inventory (new) | Consistent with server-route pattern |
| Shadow list fetch | Another anon-key client call | GET /api/shadows (new) | Consistent with server-route pattern |
| Stamina/Mana calculation | New DB columns or separate query | Derive from existing stats in GameState | Decision locked: vitality×10 and level×intel |
| XP grant on quest completion | Separate POST to /api/xp/award | Inline in /api/quests/update same as complete route | Single atomic transaction, established pattern |

---

## Common Pitfalls

### Pitfall 1: questService Still Called Directly After Route Exists
**What goes wrong:** QuestBoard.tsx calls `getDailyQuests()` (read — fine) but if `updateQuestProgress()` is called anywhere it bypasses the server route.
**Why it happens:** The function still exists in questService.ts. Callers that aren't updated will silently continue direct writes.
**How to avoid:** Search all call sites of `updateQuestProgress` and update them to fetch `/api/quests/update` instead.
**Warning signs:** Quest progress updates succeed in DB but bypass server validation/XP logic.

### Pitfall 2: inventoryService/shadowService Use Anon Client
**What goes wrong:** If you call `getUserInventory()` or `getUserShadows()` from a route handler, the query runs with the anon key, not the service role key.
**Why it happens:** Both service files import `supabase` from `@/lib/supabase` (anon client), not `supabaseServer`.
**How to avoid:** In route handlers, replicate the DB query using `supabaseServer` directly, mirroring the query shape from the service but swapping the client.
**Warning signs:** 401/403 errors in production when RLS is enforced.

### Pitfall 3: stats.intelligence vs stats.availablePoints Confusion
**What goes wrong:** GameState.UserStats has both `intelligence` (the stat value) and `availablePoints`. Using the wrong field gives nonsense Mana values.
**Why it happens:** The type has many numeric fields.
**How to avoid:** Mana formula uses `stats.intelligence` (the combat stat). Verified in gameReducer.ts defaultStats: `intelligence: 10`.
**Warning signs:** Mana shows "0" or a very large unexpected number.

### Pitfall 4: Inventory Response Shape Mismatch
**What goes wrong:** Inventory.tsx expects `item.items.rarity`, `item.items.type`, `item.items.stats_bonus`, `item.items.name`, `item.items.description` from a joined query. A flat response breaks the UI.
**Why it happens:** The component uses the `UserItem` interface with nested `items?: { ... }` shape from inventoryService.
**How to avoid:** The GET /api/inventory route must use `.select("*, items(*)")` to include the join. Confirm the `items` table column name is `stats_bonus` (not `stat_bonus` — Phase 2 fixed this, but verify).
**Warning signs:** Item cards render with no name, no description, and "NO_MODIFIERS_DETECTED" even for equipped items.

### Pitfall 5: XP Grant in /api/quests/update Duplicates Logic
**What goes wrong:** Copying the XP-grant block from complete/route.ts into update/route.ts without understanding it causes double XP grants if the route is called multiple times at 100% progress.
**Why it happens:** The update route grants XP only when `allCompleted` transitions from false to true — must check previous state before granting.
**How to avoid:** Fetch the existing `all_completed` flag before updating. Only grant XP if it was `false` and is now `true`.
**Warning signs:** Users gain XP on every progress update once a quest is completed.

---

## Code Examples

### getUserId Helper (copy this pattern exactly)
```typescript
// Source: src/app/api/user/route.ts
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
```

### Inventory Join Query (replicate from service, use supabaseServer)
```typescript
// Source: src/lib/services/inventoryService.ts:21-37 (query shape)
// Use supabaseServer in route handler, not the anon client
const { data, error } = await supabase
  .from("user_inventory")
  .select("*, items(*)")
  .eq("user_id", userId);
```

### Inventory Response Shape (pre-sort by equip status)
```typescript
// Locked decision: { equipped: [...], unequipped: [...] }
const equipped = (data || []).filter((item: any) => item.equipped);
const unequipped = (data || []).filter((item: any) => !item.equipped);
return NextResponse.json({ equipped, unequipped });
```

### Shadows Join Query
```typescript
// Source: src/lib/services/shadowService.ts:20-34 (query shape)
const { data, error } = await supabase
  .from("user_shadows")
  .select("*, shadows(*)")
  .eq("user_id", userId);
// Return: { shadows: data || [] }
```

### Dashboard Stamina/Mana Replacement
```typescript
// Source: src/components/arise/Dashboard.tsx:42 — stats already destructured
// const { user, stats, ... } = state;
const staminaMax = stats.vitality * 10;
const manaVal    = user.level * stats.intelligence;

// Replace the static array at lines 146-149:
[
  { label: "STAMINA", val: `${staminaMax}/${staminaMax}`, col: "text-[#22C55E]" },
  { label: "MANA",    val: manaVal.toLocaleString(),       col: "text-[#7C3AED]" },
]
```

### Quest Update Route — Core Logic
```typescript
// Model: src/app/api/quests/complete/route.ts (full reference)
// Key difference: set current = newCurrent, compute completed = newCurrent >= target
const updatedQuests = (row.quests as any[]).map((q: any) =>
  q.id === questId
    ? { ...q, current: newCurrent, completed: newCurrent >= q.target }
    : q
);
const allCompleted = updatedQuests.every((q: any) => q.completed);
const wasAllCompleted = row.all_completed; // fetch this BEFORE update

// Only grant XP if this update triggers completion
if (allCompleted && !wasAllCompleted) {
  // XP grant logic (copy from complete/route.ts)
}
```

---

## Caller Audit: Where updateQuestProgress is Called

**HIGH confidence** — checked by reading source files.

The direct write `updateQuestProgress()` from `questService.ts` must be traced to its callers:

- `src/components/arise/QuestBoard.tsx` — only calls `getDailyQuests()` (read, not write). No `updateQuestProgress` call found in this file.
- `src/components/arise/WorkoutEngine.tsx` — not yet read. **Planner must verify this file** as the likely caller of `updateQuestProgress`. WorkoutEngine receives `dispatch` and likely calls the service on workout completion.

The search result: `updateQuestProgress` is defined in questService.ts. It must be called somewhere — QuestBoard only reads. WorkoutEngine.tsx is the probable write caller and must be checked and updated.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct anon-key writes from client services | Server API routes with service-role key | Phase 1 established | Security + RLS bypass under control |
| `.single()` Supabase calls | `.maybeSingle()` everywhere | Phase 1 fixed | No more 406 crashes on missing rows |
| Hardcoded Dashboard stats | Derived from GameState.stats | Phase 3 (this phase) | Real data in UI |

---

## Open Questions

1. **Where is updateQuestProgress actually called from?**
   - What we know: QuestBoard.tsx only calls getDailyQuests (read). WorkoutEngine.tsx is the most likely caller but was not read.
   - What's unclear: Whether WorkoutEngine calls updateQuestProgress directly or dispatches an action that triggers it elsewhere.
   - Recommendation: Planner must read WorkoutEngine.tsx as first step of 03-02 plan and locate the call site before writing the plan task.

2. **Does inventoryService's items join use `stats_bonus` or `stat_bonus`?**
   - What we know: Phase 2 fixed STARTER_ITEMS column names to match schema. inventoryService.ts shows `stats_bonus` in the UserItem interface (line 15). Inventory.tsx accesses `item.items.stats_bonus` (line 189).
   - What's unclear: Whether the `items` table DB column is named `stats_bonus` or `effects` (Phase 2 STARTER_ITEMS used `effects` for the `items` table insert).
   - Recommendation: Planner should note that the join query `items(*)` will return whatever columns exist in the `items` table. The Inventory component accesses `stats_bonus` — if the column is actually `effects`, Phase 3 may reveal a pre-existing data mismatch. This is not a blocker for creating the route.

---

## Validation Architecture

`workflow.nyquist_validation` is not set in config.json — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test directories found |
| Config file | None |
| Quick run command | N/A — no test runner configured |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| 03-01 | GET /api/inventory returns { equipped, unequipped } with joined items | smoke (manual curl) | `curl -H "Authorization: Bearer <token>" /api/inventory` | N/A |
| 03-01 | GET /api/shadows returns { shadows: [...] } | smoke (manual curl) | `curl -H "Authorization: Bearer <token>" /api/shadows` | N/A |
| 03-02 | POST /api/quests/update updates progress, computes completion | smoke (manual curl) | `curl -X POST -d '{"questId":"dq1","newCurrent":30}' /api/quests/update` | N/A |
| 03-02 | Dashboard STAMINA shows vitality×10/vitality×10 format | visual | Load app, check header | N/A |
| 03-02 | Dashboard MANA shows level×intelligence as number | visual | Load app, check header | N/A |

### Wave 0 Gaps
- No test framework is installed. All verification for this phase is manual (visual inspection + curl smoke tests).
- If automated testing is desired: `npm install --save-dev vitest @vitejs/plugin-react` — but this is out of scope for Phase 3.

*(No existing test infrastructure — all phase verification is manual/visual)*

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `src/app/api/quests/complete/route.ts` — complete route reference implementation
- Direct file reads: `src/app/api/user/route.ts` — getUserId() pattern and Bearer auth standard
- Direct file reads: `src/components/arise/Dashboard.tsx` — confirmed hardcoded values at lines 146-149
- Direct file reads: `src/lib/gameReducer.ts` — GameState and UserStats type definitions
- Direct file reads: `src/lib/services/inventoryService.ts` — getUserInventory() query shape
- Direct file reads: `src/lib/services/shadowService.ts` — getUserShadows() query shape
- Direct file reads: `src/lib/supabase-server.ts` — server client setup
- Direct file reads: `src/components/arise/ShadowArmy.tsx` — what getUserShadows() data shape the component needs
- Direct file reads: `src/components/arise/Inventory.tsx` — what item join shape the component needs

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — confirmed established project decisions (maybeSingle, Bearer-only, service-role writes)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in codebase, no new dependencies
- Architecture: HIGH — route pattern verified directly from existing route files
- Pitfalls: HIGH — identified from direct code reading, not speculation
- Caller audit: MEDIUM — QuestBoard confirmed (read), WorkoutEngine not yet read

**Research date:** 2026-03-15
**Valid until:** Stable — no external dependencies changing; codebase is the authoritative source
