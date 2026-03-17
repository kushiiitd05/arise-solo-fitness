# Phase 10: Shadow Army Mechanics - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Formalize shadow extraction and army management — extraction trigger events (boss kill token system), shadow stats wired into hunter game state, army composition rules (weighted pool by hunter rank), and army power display in the SHADOWS panel. Boss kill event and Battle system integration are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Extraction triggers
- Boss kill gates extraction — each boss kill grants exactly 1 extraction token
- Tokens stored as new column `extraction_tokens INT DEFAULT 0` on the `users` table
- Token grant happens inside `POST /api/boss/complete` — same call that awards XP; not a separate route
- ARISE button is disabled (opacity-30) when `extraction_tokens === 0`
- On successful extraction attempt: decrement token server-side atomically with the shadow insert

### Extraction success rate
- Rank-scaled success rate based on the shadow being extracted:
  - E-rank shadow: 90%
  - D-rank shadow: 80%
  - C-rank shadow: 70%
  - B-rank shadow: 50%
  - A-rank shadow: 30%
  - S-rank shadow: 15%
- All logic computed server-side in new `POST /api/shadows/extract` route

### Extraction pool (army composition)
- No army size cap — hunter can collect all 17 SHADOWS_DB entries ("YOUR ARMY IS COMPLETE" already handled)
- Soft rank gate: hunter rank determines weighted probability of which shadow rank appears in the draw pool
  - E-rank hunter: E/D shadows = 70% weight, C/B = 25%, A/S = 5%
  - D-rank hunter: E/D = 55%, C/B = 35%, A/S = 10%
  - C-rank hunter: E/D = 35%, C/B = 45%, A/S = 20%
  - B-rank hunter: E/D = 20%, C/B = 45%, A/S = 35%
  - A-rank hunter: E/D = 10%, C/B = 35%, A/S = 55%
  - S-rank hunter: even distribution across all ranks
- Already-owned shadows are excluded from pool before weighting (existing behaviour)

### Shadow stat contribution
- Shadow buffs (multipliers) ARE wired into hunter stats — not army-power-only
- Stack order: `final_stat = (base_stat + item_bonuses) × shadow_multipliers`
  - `calculateModifiedStats` already handles this — pass it item-boosted stats (not raw base stats)
- Applied at session init (same pattern as item bonuses in Phase 9)
- Re-applied after a successful extraction so stats update immediately without reload
- Multiple shadows that buff the same stat compound multiplicatively (e.g. two ×1.10 STR shadows = ×1.21)

### Army power display
- Army power = sum of `base_power` values from all owned shadows joined via `shadows(*)` table
- Displayed in the SHADOWS panel header alongside the SHADOW_ARMY title
- Format: `ARMY POWER: 2,840` as a compact stat chip (same style as rank HUD in Dashboard)
- Extraction token count also shown in header: `TOKENS: 2 | ARMY POWER: 2,840`
- On extraction notification: use `ADD_NOTIFICATION` type QUEST (4s auto-dismiss) — "SHADOW EXTRACTED: Igris" or "EXTRACTION FAILED"

### Claude's Discretion
- Exact weight lookup table format (array vs object, where to define it — can live in shadowSystem.ts)
- Whether token decrement and shadow insert happen in one DB transaction or two sequential calls
- Exact header layout/spacing for the dual stat display
- Animation/feedback on ARISE button when token count = 0 (tooltip, shake, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shadow system
- `src/lib/game/shadowSystem.ts` — SHADOWS_DB (17 entries with rank + buff multipliers), `calculateModifiedStats` function, `attemptExtraction` stub (replace with server-side logic)
- `src/lib/services/shadowService.ts` — `getUserShadows`, `saveExtractedShadow` (uses anon client — replace extraction write with server route call), `getAvailableShadows`
- `src/components/arise/ShadowArmy.tsx` — Existing UI (ARISE button, shadow cards, extraction flow) — needs: server route call, token display, weighted pool, rank-scaled success

### Server route patterns to follow
- `src/app/api/shadows/route.ts` — Existing GET route pattern for shadow fetching (Bearer auth, supabaseServer, getUserId local copy)
- `src/app/api/inventory/equip/route.ts` — Most recent write route — mirror this pattern for `POST /api/shadows/extract`
- `src/app/api/boss/complete/route.ts` (if exists) — Boss completion route to extend with token grant

### State and stat merge patterns
- `src/lib/gameReducer.ts` — SET_INITIAL_STATE, ADD_NOTIFICATION, ALLOCATE_STAT — item bonus merge pattern from Phase 9
- `src/app/page.tsx` — `computeItemBonuses` local function, `onEquipChange` re-init pattern — mirror for `onExtractionChange`

### DB schema
- `supabase/migrations/20260311000000_init_schema.sql` — `users` table (add `extraction_tokens` column), `user_shadows` table, `shadows` table with `base_power` column

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ShadowArmy.tsx` — Full UI already built. Changes needed: replace `saveExtractedShadow` call with `POST /api/shadows/extract`, add token display in header, add weighted pool + rank-scaled success server-side, wire army power computation
- `calculateModifiedStats` in `shadowSystem.ts` — Already does multiplicative buff application. Pass it item-boosted stats (not raw base) to get correct stacking
- `getUserShadows` — Already joins `shadows(*)` with `base_power` — reuse for army power sum computation
- `ADD_NOTIFICATION` — Already wired for extraction messages ("SHADOW_EXTRACTED: X", "EXTRACTION_FAILED") — keep existing messages

### Established Patterns
- Copy `getUserId()` locally into each new route (Phase 3) — do same in `POST /api/shadows/extract`
- `supabaseServer` (service-role) for all writes in API routes
- `onEquipChange` callback in Inventory.tsx → Dashboard re-init pattern — mirror as `onExtractionChange` in ShadowArmy.tsx
- `computeItemBonuses` defined locally in page.tsx — define `computeShadowBonuses` (or reuse `calculateModifiedStats`) locally the same way
- IIFE pattern for derived stat computations in JSX (Phase 9)

### Integration Points
- `POST /api/boss/complete` — Needs `extraction_tokens` increment (check if route exists; may need creation)
- `page.tsx` init flow — Add shadow fetch + `calculateModifiedStats` call after item bonus merge (order: base → +items → ×shadows)
- `ShadowArmy.tsx` → Dashboard → `page.tsx` callback chain for post-extraction stat update
- DB migration needed: `ALTER TABLE users ADD COLUMN extraction_tokens INT DEFAULT 0`

</code_context>

<specifics>
## Specific Ideas

No specific UI references given — open to standard ARISE aesthetic (purple glow, hex palette).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-shadow-army-mechanics*
*Context gathered: 2026-03-17*
