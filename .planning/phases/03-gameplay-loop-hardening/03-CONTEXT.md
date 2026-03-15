# Phase 3: Gameplay Loop Hardening - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Move all client-side DB quest-progress writes through server API routes. Wire real stamina/mana values into the Dashboard header. Create read-only server routes for inventory and shadows.

New features, write operations for inventory/shadows, and UI redesign are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Stamina Display
- Derived from `vitality` stat (no new DB column needed)
- Formula: `current/max` format where `max = vitality × 10`, current always equals max (no drain mechanic in this phase)
- Example: vitality 10 → "100/100", vitality 15 → "150/150"

### Mana Display
- Derived from `intelligence` stat (no new DB column needed)
- Formula: `level × intelligence` → displayed as a raw number
- Example: level 1, intel 10 → 10; level 20, intel 20 → 400
- Wire to `state.user.level` and `state.stats.intelligence` from GameState

### POST /api/quests/update — Route Shape
- Request body: `{ questId: string, newCurrent: number }`
- Server computes completion status (`newCurrent >= target`) — client does not send a `completed` flag
- If completing a quest causes all daily quests to complete, the server grants XP in the same call (progress + completion in one transaction)
- Auth: Bearer header only — `getUserId()` reads `Authorization` header, never URL params (Phase 1 established pattern)

### GET /api/inventory — Route Shape
- GET only in this phase (no writes)
- Response: `{ equipped: [...], unequipped: [...] }` — pre-sorted by equip status
- Auth: Bearer header only

### GET /api/shadows — Route Shape
- GET only in this phase (no writes, no extraction)
- Response: flat array `{ shadows: [...] }` — or match what ShadowArmy.tsx expects
- Auth: Bearer header only

### Claude's Discretion
- Exact error response format for API routes (consistent with existing routes)
- Whether to refactor `questService.updateQuestProgress` to call the new route, or update callers directly
- Shadow response shape details — match what `ShadowArmy.tsx` component expects

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getUserId()` helper in existing API routes — reuse for Bearer auth pattern
- `supabase-server.ts` — server-side Supabase client for new routes
- `src/app/api/quests/complete/` — existing route to model new `update` route after
- `src/lib/services/inventoryService.ts` — `getUserInventory()` and `getUserItems()` ready to call from API route
- `src/lib/services/shadowService.ts` — `getUserShadows()` ready to call from API route

### Established Patterns
- All API routes use Bearer-only auth (`Authorization: Bearer <token>`) — established in Phase 1
- Use `.maybeSingle()` not `.single()` for nullable Supabase queries
- Server routes call service layer functions (don't inline Supabase queries in route handlers)

### Integration Points
- `Dashboard.tsx:147-148` — hardcoded STAMINA/MANA strings, replace with computed values from `state.stats.vitality` and `state.user.level × state.stats.intelligence`
- `src/lib/services/questService.ts:updateQuestProgress()` — direct anon-key write, must be replaced with a fetch to `/api/quests/update`
- `src/app/api/quests/` — add `update/route.ts` alongside existing `complete/` and `daily/`

</code_context>

<specifics>
## Specific Ideas

- STAMINA and MANA in Dashboard header are in the `xl:` breakpoint hidden zone — existing layout preserved, only values change
- Quest update route should follow the same structure as `/api/quests/complete/route.ts`

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-gameplay-loop-hardening*
*Context gathered: 2026-03-15*
