# Phase 9: Inventory Item Effects - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Equippable items grant real permanent stat bonuses (STR, AGI, VIT, INT, PER) to the hunter.
Items are currently cosmetic — equipping only flips a boolean. This phase makes that boolean
compute real stat deltas that flow into Dashboard display and the gameReducer state.

Consumable use-mechanics (potion drinking, quantity depletion) are out of scope. Shadow Essence
effects are out of scope. Quest target/XP formula changes are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Stat flow into game state
- Bonuses computed on load: fetch all equipped items, sum their `effects` values, add to base `user_stats`
- Merged into `state.stats` — the total (base + bonuses) replaces stats on init, same as current pattern
- No separate bonus table, no writes to `user_stats` columns directly
- The `getUserInventory` fetch already returns equipped items with `effects` — reuse this to compute deltas at load time

### Schema normalization
- Fix `UserItem.items.stats_bonus` → `effects` to match the DB `items.effects` JSONB column
- Update `Inventory.tsx` display code and any other references from `stats_bonus` to `effects`
- Starter items already use `effects: { strength: 5 }` etc. — naming is consistent in DB, just broken in TS interface

### Equip/unequip route
- Create `POST /api/inventory/equip` server route — Bearer auth, supabaseServer (service-role)
- Replaces `toggleEquipItem` anon-client call in `Inventory.tsx`
- Response returns the updated item row
- Follows Phase 3 principle: all writes go through server API routes

### Consumable handling
- CONSUMABLE items (`Health Potion`, `Mana Stone`) do NOT show the EQUIP button
- They display item description + a disabled USE button as a placeholder
- No quantity depletion, no HP/MP restoration mechanic this phase
- `Shadow Essence` (SHADOW_FRAGMENT type) similarly shows no equip/use controls this phase

### Quest calculation wiring
- Stat bonuses affect stat display only — no changes to quest target formulas or XP rewards
- Quest engine (Phase 8) remains level-based; item stats are purely character sheet numbers
- "Wire to quest calculations" in ROADMAP.md is satisfied by stats being real in the state that feeds all systems

### Equip feedback
- On equip: fire `ADD_NOTIFICATION` per stat bonus (e.g., "STRENGTH +10")
- On unequip: fire `ADD_NOTIFICATION` per stat removed (e.g., "STRENGTH -10")
- Notification type: `QUEST` (4s auto-dismiss per Phase 5 pattern)
- Stats update in Dashboard reflect the change after the equip API call resolves (re-init or state patch)

### Stat display
- Total only everywhere (base + bonuses merged) — no base/bonus split shown
- Dashboard header continues to show single numbers for STR, AGI, VIT
- No layout changes to stat panels

### Inventory footer
- Wire footer to real computed data from equipped items:
  - `Active_Buffs`: list dominant bonus (e.g., "STR +15") or "NONE" if nothing equipped
  - `Defense_Rating`: total VIT bonus from equipped items (e.g., "VIT +10" or "0 BONUS")
  - `Global_Rarity`: highest rarity of any equipped item (LEGENDARY > EPIC > RARE > UNCOMMON > COMMON)
- Currently hardcoded — this phase makes it live data

### Claude's Discretion
- Exact notification message wording for multi-stat items (e.g., Iron Dagger gives STR+10 AND AGI+5 — one notification or two)
- Whether stats re-merge client-side optimistically on equip, or wait for server confirmation
- How `getUserInventory` is exposed to the Dashboard init flow (currently only called inside Inventory.tsx)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Inventory system
- `src/components/arise/Inventory.tsx` — Full inventory UI, current equip toggle flow, stats_bonus display code to fix
- `src/lib/services/inventoryService.ts` — UserItem interface (fix stats_bonus→effects), toggleEquipItem (replace with server route call), STARTER_ITEMS definition

### Stats and state
- `src/lib/gameReducer.ts` — UserStats interface, ALLOCATE_STAT pattern, SET_INITIAL_STATE — item bonuses must flow through this
- `src/types/database.ts` — UserStats shape (strength, vitality, agility, intelligence, perception, sense)

### DB schema
- `supabase/migrations/20260311000000_init_schema.sql` — `items.effects` JSONB column definition, `user_inventory.equipped` column

### Existing server route patterns (follow these)
- `src/app/api/quests/update/route.ts` — getUserId(), supabaseServer pattern, Bearer auth — mirror for /api/inventory/equip
- `src/app/api/xp/award/route.ts` — non-fatal secondary calls pattern (XP bonus may fail without blocking rank)

### Notification pattern
- `src/lib/gameReducer.ts` ADD_NOTIFICATION action — use for equip/unequip feedback (type: QUEST, 4s auto-dismiss)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Inventory.tsx` — Full UI already built. Only changes needed: fix effects key, replace equip API call, update footer, hide EQUIP for consumables
- `gameReducer.ts` ALLOCATE_STAT — shows the pattern for modifying individual stats; item effects follow same shape
- `ADD_NOTIFICATION` action — already used for quest/levelup events; wire equip notifications through this
- `getUserInventory()` — already joins `items (*)` and returns equipped status + effects; reuse for bonus computation

### Established Patterns
- Server routes copy `getUserId()` locally (Phase 3 decision) — do the same in `/api/inventory/equip`
- Use `supabaseServer` (service-role) not anon client for writes
- `.maybeSingle()` not `.single()` for single-row queries
- Non-fatal secondary operations wrapped in try/catch (Phase 7 pattern)

### Integration Points
- Dashboard init / `SET_INITIAL_STATE`: item bonus computation needs to happen at the same time as user_stats load, so merged totals enter state from the start
- `page.tsx` or wherever `getUserInventory` is called on init — this is where the bonus summation runs
- `Inventory.tsx` handleToggleEquip → replace `toggleEquipItem()` call with `fetch('/api/inventory/equip', ...)`

</code_context>

<specifics>
## Specific Ideas

- No specific references cited — decisions follow established project patterns

</specifics>

<deferred>
## Deferred Ideas

- Consumable use mechanic (potion drinking, quantity depletion, HP/MP restore) — future phase
- Shadow Essence activation / shadow extraction trigger — Phase 10 scope
- Quest target or XP formula changes based on stats — future enhancement if needed
- Equip slot limits (e.g., only 1 weapon equipped at a time) — not discussed, Claude's discretion or future phase

</deferred>

---

*Phase: 09-inventory-item-effects*
*Context gathered: 2026-03-17*
