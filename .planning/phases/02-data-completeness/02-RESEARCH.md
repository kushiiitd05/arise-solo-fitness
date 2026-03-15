# Phase 2: Data Completeness - Research

**Researched:** 2026-03-15
**Domain:** Supabase seed data, shadow roster expansion, leaderboard integration, items catalog wiring
**Confidence:** HIGH (all findings sourced directly from reading codebase files)

---

## Summary

Phase 2 is primarily a data-wiring and seeding phase — no new architecture is needed, only populating existing tables and connecting an existing component. The shadows catalog (`SHADOWS_DB` in `shadowSystem.ts`) has exactly 1 entry (Igris) and must be expanded to 15+ entries. The `shadows` Supabase table has a UUID primary key, while `SHADOWS_DB` uses short string IDs like `"s1"`. These two ID spaces are currently completely misaligned: `ShadowArmy.tsx` uses `SHADOWS_DB.find(s => s.id === ps.shadow_id)` to resolve display data, which will always fail because Supabase `shadow_id` is a UUID and `SHADOWS_DB` entries have `id: "s1"`. This is the central ID alignment problem that must be resolved.

The Leaderboard component already exists as a modal (`fixed inset-0` overlay) that accepts `{ state, onClose }` props and is self-fetching via `getLeaderboard()` from `leaderboardService.ts`. Dashboard currently has no trigger for it — adding a button or panel-link to the STATUS tab is sufficient; a new LEADERBOARD tab would also work cleanly. The items catalog issue is straightforward: `seedStarterItems()` does an idempotent seed (skips if any item exists) and `grantStarterItemsToUser()` looks up by name — no schema changes needed, only the seed must run before user creation.

**Primary recommendation:** Fix the ID alignment strategy for shadows first (single source of truth: SHADOWS_DB IDs must match what gets saved to `user_shadows.shadow_id`), expand SHADOWS_DB to 15+ entries, run the shadow seed for the Supabase `shadows` table in parallel with items seed, then wire the Leaderboard as a new LEADERBOARD tab in Dashboard.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| 2-SC1 | New user after awakening sees 5 starter items in STORAGE tab | `seedStarterItems()` + `grantStarterItemsToUser()` already coded; items catalog table must be populated before first user creation — seed script needed |
| 2-SC2 | Shadow extraction has 15+ unique shadows available | `SHADOWS_DB` must grow from 1 to 15+ entries; `shadows` Supabase table must be seeded to match; ID alignment between the two must be resolved |
| 2-SC3 | Leaderboard panel visible on Dashboard | `Leaderboard` component fully built; needs import + trigger in `Dashboard.tsx`; one bug to fix (undefined `supabase` import at bottom of file) |
</phase_requirements>

---

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | existing | DB queries, realtime | Already wired throughout project |
| Next.js API routes | existing | Server-side seed endpoints | Security principle established in Phase 1 |
| TypeScript | existing | Type-safe shadow/item objects | Existing pattern |
| framer-motion | existing | Leaderboard modal animation | Already used in Leaderboard.tsx |

### No New Dependencies Required
All libraries needed for Phase 2 are already installed. Phase 2 is purely data + wiring work.

---

## Architecture Patterns

### Recommended File Changes
```
src/lib/game/
└── shadowSystem.ts          # Expand SHADOWS_DB from 1 to 15+ entries; change IDs from "s1" to UUID-style or name-slug

src/components/arise/
└── Dashboard.tsx            # Add LEADERBOARD tab + import Leaderboard component

src/components/arise/
└── Leaderboard.tsx          # Fix: undefined supabase reference at line 187-188 (import misplaced)

src/app/api/seed/
└── route.ts                 # New: POST endpoint to seed shadows + items catalog (server-side)
OR
src/app/api/user/
└── route.ts                 # Alternatively: call seeds from createUser path (already partially done for items)
```

### Pattern 1: Shadow ID Alignment (CRITICAL)
**What:** SHADOWS_DB `id` field is currently short strings (`"s1"`). `ShadowArmy.tsx` resolves display data with `SHADOWS_DB.find(s => s.id === ps.shadow_id)`. `user_shadows.shadow_id` is a UUID foreign key to the `shadows` Supabase table. If these IDs differ, the shadow card renders nothing.

**Root cause confirmed (line 127 of ShadowArmy.tsx):**
```typescript
const shadow = SHADOWS_DB.find(s => s.id === ps.shadow_id);
if (!shadow) return null;  // silently renders nothing
```

**Two viable alignment strategies:**

**Option A — SHADOWS_DB IDs become UUIDs (recommended):** Seed the `shadows` Supabase table and use the returned UUIDs in SHADOWS_DB. This means running the seed once, capturing the UUIDs, then hardcoding them in SHADOWS_DB. Cleanest long-term.

**Option B — Add a `supabase_id` field to SHADOWS_DB:** Keep short IDs for internal use, add a `supabase_id?: string` field populated after seeding. `saveExtractedShadow` saves `supabase_id`, `ShadowArmy.tsx` resolves with `SHADOWS_DB.find(s => s.supabase_id === ps.shadow_id)`. Requires a migration step but keeps SHADOWS_DB human-readable.

**Option C — Use shadow name as stable lookup key (simplest):** Store `shadow_id` as the shadow's `name` slug (e.g., `"igris"`) in `user_shadows`. Requires `shadows.id` to be name-based OR a separate `slug` column. Breaks FK integrity unless `shadows.id` is changed to text.

**Recommended: Option A.** Seed the `shadows` table in a deterministic migration SQL file, capture UUIDs as constants in shadowSystem.ts. This keeps FK integrity and is fully type-safe. The seed SQL should use explicit UUIDs (`uuid_generate_v4()` values written into the migration) so they are stable across environments.

**Pattern: Use explicit UUID constants in a seed migration:**
```sql
-- In a new migration file: 20260316000000_seed_shadows.sql
INSERT INTO shadows (id, name, rank, shadow_type, base_power, rarity, emoji, ability) VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 'Igris', 'S', 'COMMANDER', 2000, 'LEGENDARY', '⚔️', '{"name":"Commander Presence","buff":"strength","multiplier":1.1}'),
  ...
```
Then mirror those exact UUIDs in `SHADOWS_DB`:
```typescript
export const SHADOWS_DB: Shadow[] = [
  { id: "a1b2c3d4-0001-0000-0000-000000000001", name: "Igris", ... },
  ...
];
```

### Pattern 2: Leaderboard Integration in Dashboard
**What:** Add Leaderboard as a new nav tab ("RANKINGS") in Dashboard TABS array. On tab activation, render `<Leaderboard state={state} onClose={() => setActiveTab("STATUS")} />` inline (removing the modal wrapper behavior or keeping it).

**Recommended approach:** Add a new tab entry to the `TABS` array in Dashboard.tsx, and add a corresponding `activeTab === "RANKINGS"` branch in the AnimatePresence block. Pass `state` and an `onClose` that returns to STATUS. This is consistent with how ShadowArmy, Inventory, DungeonGate, and BossEvent are all rendered as tab content.

**Important:** Leaderboard currently renders as a `fixed inset-0` overlay (modal). When embedded as a tab, this will cover the entire screen over the Dashboard layout. Two options:
1. Wrap the Leaderboard tab with a container that cancels the `fixed inset-0` (pass a prop `embedded={true}` and conditionally change positioning)
2. Simpler: add a "RANKINGS" button in the STATUS view right-side panel (similar to the SHADOW_ARMY_COMMAND panel that is a clickable link to the SHADOWS tab), and keep Leaderboard as a modal triggered by `showLeaderboard` state.

**Recommended for minimum-diff: Option 2 — add `showLeaderboard` state and a trigger panel/button in STATUS view.** This mirrors the existing Settings/QuestBoard/WorkoutEngine pattern in Dashboard.tsx (lines 291-294) where overlays are toggled with `showX` state booleans.

```typescript
// In Dashboard.tsx state:
const [showLeaderboard, setShowLeaderboard] = useState(false);

// In STATUS tab, add trigger button/panel next to SHADOW_ARMY_COMMAND panel:
<div className="system-panel p-10 ... cursor-pointer" onClick={() => setShowLeaderboard(true)}>
  <h3>WORLD_RANKINGS</h3>
  <Trophy ... />
</div>

// In AnimatePresence at bottom (line 290+):
{showLeaderboard && <Leaderboard state={state} onClose={() => setShowLeaderboard(false)} />}
```

### Pattern 3: Items Catalog Seed
**What:** `seedStarterItems()` in `inventoryService.ts` inserts 5 items if the `items` table is empty. It's already called from the `/api/user` route (Phase 1 fix). However, the `items` table schema has different column names than what `seedStarterItems()` inserts.

**Schema mismatch confirmed:**
- `items` table schema (from migration): columns are `item_type`, `effects`, `emoji`
- `STARTER_ITEMS` in `inventoryService.ts` uses: `type`, `stat_bonus`/`effect`, `image_url`

The insert will either fail silently or insert with null values for typed enum columns. `item_type` is a required `NOT NULL` field typed as `"ItemType"` enum (`EQUIPMENT`, `CONSUMABLE`, `COSMETIC`, `CHAPTER`, `SHADOW_FRAGMENT`). The seed uses `type: "EQUIPMENT"` which may work if Postgres is lenient, but `SPECIAL` (used for Shadow Essence) is NOT in the `ItemType` enum — this will cause an insert error.

**Fix needed in `seedStarterItems()`:**
- Rename `type` → `item_type`
- Remove/rename `stat_bonus` → `effects` (JSONB, not a separate column in schema)
- Change `image_url` → `emoji` (schema has `emoji`, not `image_url`)
- Change `SPECIAL` rarity to a valid `ItemType` enum value — use `SHADOW_FRAGMENT`

### Anti-Patterns to Avoid
- **Do not use `supabase.from('shadows').insert()` from client-side for catalog seeding** — use a server-side migration SQL file or a POST `/api/seed` endpoint with service role key. The `shadows` table will have RLS enabled.
- **Do not leave the stale `supabase` import at line 187 of Leaderboard.tsx** — it creates a reference before import, causing runtime errors. Move the import to the top of the file.
- **Do not use `.single()` for shadow/item lookups** — confirmed project pattern is `.maybeSingle()` (Phase 1 decision).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Shadow UUID generation | Custom ID scheme | Explicit UUID constants in seed migration |
| Real-time leaderboard | Custom WebSocket | `subscribeToLeaderboardChanges` already implemented in `leaderboardService.ts` |
| Items schema mapping | Runtime transform | Fix column names in `STARTER_ITEMS` to match schema |
| Shadow seed idempotency | Complex version checks | `INSERT ... ON CONFLICT DO NOTHING` in migration SQL |

---

## Common Pitfalls

### Pitfall 1: Shadow ID Mismatch Causes Silent Empty Render
**What goes wrong:** Shadow extraction "succeeds" and saves a UUID to `user_shadows.shadow_id`, but `ShadowArmy.tsx` does `SHADOWS_DB.find(s => s.id === ps.shadow_id)` and gets `undefined`, rendering nothing.
**Why it happens:** `SHADOWS_DB.id` values are `"s1"`, `"s2"` etc.; Supabase `user_shadows.shadow_id` is a UUID.
**How to avoid:** Use explicit UUID constants in SHADOWS_DB that match the seeded Supabase rows.
**Warning signs:** Shadow cards render 0 entries despite `persistentShadows.length > 0`.

### Pitfall 2: `ItemType` Enum Rejects "SPECIAL"
**What goes wrong:** `seedStarterItems()` tries to insert `Shadow Essence` with `type: "SPECIAL"`. The `items` table has a Postgres enum `ItemType` that does NOT include `SPECIAL`. The insert fails with a 400/422 from Supabase.
**Why it happens:** Schema enum was defined as `EQUIPMENT, CONSUMABLE, COSMETIC, CHAPTER, SHADOW_FRAGMENT`. Code used a value outside this list.
**How to avoid:** Change Shadow Essence `type` to `"SHADOW_FRAGMENT"` in STARTER_ITEMS.
**Warning signs:** `seedStarterItems()` logs an error but the try/catch swallows it silently.

### Pitfall 3: Leaderboard `supabase` Import at Line 187
**What goes wrong:** `Leaderboard.tsx` line 187 has `import { supabase } from "@/lib/supabase"` AFTER the component's closing brace and after it's used in `useEffect` (line 51: `supabase.removeChannel(sub)`). This is a hoisting non-issue in TypeScript/ESM (imports are hoisted), but it's confusing and some bundlers or linters will flag it. More critically, the cleanup in `useEffect` return calls `supabase.removeChannel(sub)` directly rather than `sub.unsubscribe()`, which may not work correctly with Supabase's channel API.
**How to avoid:** Move the import to the top of the file; use `sub.unsubscribe()` in the cleanup.
**Warning signs:** Memory leak on Leaderboard unmount; dev console warnings about channel cleanup.

### Pitfall 4: `seedStarterItems` Column Name Mismatch
**What goes wrong:** `STARTER_ITEMS` objects use `stat_bonus` and `image_url` as keys, but the `items` schema has `effects` (JSONB) and `emoji` (varchar). Supabase silently inserts nulls for unknown columns.
**Why it happens:** STARTER_ITEMS was written against an older or assumed schema.
**How to avoid:** Align STARTER_ITEMS keys with actual migration schema columns before seeding.

### Pitfall 5: RLS Blocks Catalog Reads Without Auth
**What goes wrong:** `getAvailableShadows()` and `getSystemItems()` call Supabase from the client with the anon key. If RLS on `shadows` or `items` restricts reads to authenticated users only, these will return empty arrays for logged-out users.
**How to avoid:** Verify RLS policies in `20260312000000_rls_policies.sql` for `shadows` and `items` — catalog tables should allow `SELECT` for all (public read). If not, add a policy or route these reads through a server endpoint.

---

## Shadow Roster: 15+ Named Solo Leveling Shadows

These are the principal named shadow soldiers from the Solo Leveling manhwa and light novel. Stats are designed for gameplay balance — scaled relative to Igris (the strongest Commander).

**Confidence:** MEDIUM — shadow names and roles are from the published manhwa/novel. Stat values are original to this game system.

| # | ID (UUID constant) | Name | Rank | Shadow Type | base_power | Rarity | Emoji | Buff stat | Multiplier | Notes |
|---|-------------------|------|------|-------------|-----------|--------|-------|-----------|------------|-------|
| 1 | UUID-001 | Igris | S | COMMANDER | 2000 | LEGENDARY | ⚔️ | strength | 1.10 | First shadow, Sung Jin-Woo's general |
| 2 | UUID-002 | Beru | S | COMMANDER | 1900 | LEGENDARY | 🐜 | agility | 1.12 | Ant King, fastest shadow |
| 3 | UUID-003 | Tank | S | ELITE | 1600 | EPIC | 🛡️ | vitality | 1.08 | Iron body soldier |
| 4 | UUID-004 | Tusk | A | ELITE | 1200 | EPIC | 🦷 | strength | 1.06 | Orc warrior spirit |
| 5 | UUID-005 | Iron | B | KNIGHT | 900 | RARE | ⚙️ | vitality | 1.05 | High Defense |
| 6 | UUID-006 | Greed | B | KNIGHT | 850 | RARE | 💀 | intelligence | 1.07 | Magic type shadow |
| 7 | UUID-007 | Kaisel | A | ELITE | 1400 | EPIC | 🐉 | agility | 1.09 | Dragon shadow mount |
| 8 | UUID-008 | Bellion | S | COMMANDER | 1800 | LEGENDARY | 👁️ | intelligence | 1.11 | Grand Marshal of shadows |
| 9 | UUID-009 | High Orc | C | SOLDIER | 600 | UNCOMMON | 🪓 | strength | 1.03 | Orcish warrior |
| 10 | UUID-010 | Fangs | D | SOLDIER | 300 | COMMON | 🐺 | agility | 1.02 | Wolf-type shadow |
| 11 | UUID-011 | Hobgoblin | D | SOLDIER | 280 | COMMON | 👺 | strength | 1.02 | Starter soldier type |
| 12 | UUID-012 | Knight Captain | B | KNIGHT | 800 | RARE | 🗡️ | agility | 1.06 | Dungeon knight extract |
| 13 | UUID-013 | Shadow Mage | B | KNIGHT | 750 | RARE | 🔮 | intelligence | 1.08 | Arcane shadow class |
| 14 | UUID-014 | Cerberus | A | ELITE | 1100 | EPIC | 🐾 | vitality | 1.07 | Three-headed guardian |
| 15 | UUID-015 | Architect | S | MONARCH | 2500 | MYTHIC | 🏛️ | intelligence | 1.15 | The System's construct — ultra rare |
| 16 | UUID-016 | Shadow Soldier | E | SOLDIER | 100 | COMMON | 👤 | strength | 1.01 | Generic fodder soldier |
| 17 | UUID-017 | Shadow Knight | C | KNIGHT | 500 | UNCOMMON | 🛡️ | vitality | 1.04 | Standard knight class |

**Note on lore accuracy:** Igris, Beru, Tank, Tusk, Kaisel, Bellion are directly named in the manhwa. Iron, Greed and other named knights appear in the series. Generic types (Shadow Soldier, Hobgoblin, Fangs, High Orc) reflect the monster types Sung Jin-Woo commonly raises. The Architect is the System entity from the lore, appropriately given MYTHIC rarity as an ultra-rare extraction.

**Extraction probability by rank (existing `attemptExtraction` returns flat 10% — this should be tiered):**
- MONARCH/MYTHIC: 1% drop rate
- COMMANDER/LEGENDARY: 3%
- ELITE/EPIC: 7%
- KNIGHT/RARE: 12%
- SOLDIER/COMMON-UNCOMMON: 25%

The existing `attemptExtraction(rank)` in shadowSystem.ts takes a rank arg but ignores it (always `Math.random() < 0.1`). ShadowArmy.tsx doesn't even call it — it uses `Math.random() > 0.3` inline. Both need fixing but that is Phase 3 scope (gameplay hardening). Phase 2 only needs the roster data.

---

## ID Alignment: Definitive Strategy

### The Problem
```
SHADOWS_DB[0].id = "s1"                    // local short ID
user_shadows.shadow_id = UUID (FK)          // Supabase UUID
ShadowArmy line 127: SHADOWS_DB.find(s => s.id === ps.shadow_id)  // always undefined
```

### The Fix (Option A — Recommended)

**Step 1:** Create a new Supabase migration `20260316000000_seed_shadows.sql` with explicit hardcoded UUIDs:
```sql
INSERT INTO shadows (id, name, rank, shadow_type, base_power, rarity, emoji, ability, is_active)
VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 'Igris', 'S', 'COMMANDER', 2000, 'LEGENDARY', '⚔️',
   '{"name":"Commander Presence","buff":"strength","multiplier":1.1}', true),
  ('a1b2c3d4-0002-0000-0000-000000000002', 'Beru',  'S', 'COMMANDER', 1900, 'LEGENDARY', '🐜',
   '{"name":"Ant Swarm","buff":"agility","multiplier":1.12}', true),
  -- ... all 17 entries
ON CONFLICT (id) DO NOTHING;
```

**Step 2:** Mirror those exact UUID strings in `SHADOWS_DB` in `shadowSystem.ts`:
```typescript
export const SHADOWS_DB: Shadow[] = [
  {
    id: "a1b2c3d4-0001-0000-0000-000000000001",
    name: "Igris",
    rank: "S",
    ability: "Commander Presence",
    buff: { stat: "strength", multiplier: 1.1 },
    image: "⚔️"
  },
  // ...
];
```

**Result:** `SHADOWS_DB.find(s => s.id === ps.shadow_id)` now works correctly because both sides use the same UUID strings. No code change needed in ShadowArmy.tsx.

**Idempotency:** `ON CONFLICT (id) DO NOTHING` ensures re-running the migration is safe.

**Alternative for dev without migrations:** Add a `POST /api/seed/shadows` route that uses the service role key to insert if not present. Call it once manually. This is useful if Supabase migrations are not being applied programmatically.

---

## Leaderboard Integration: Exact Implementation

### Current State
- `Leaderboard.tsx` exists, fully built, renders a modal overlay
- `leaderboardService.ts` exists, `getLeaderboard()` queries `users` joined with `user_stats`
- `/api/leaderboard` route exists (separate from `leaderboardService` — they duplicate some logic)
- Dashboard.tsx has zero import or reference to Leaderboard

### Bug in Leaderboard.tsx (must fix before wiring)
Line 51: `return () => { supabase.removeChannel(sub); };`
The `supabase` variable is imported at line 187 (bottom of file, after component). While ES module hoisting handles this at runtime, the correct API for Supabase channel cleanup is `sub.unsubscribe()` not `supabase.removeChannel(sub)`. Confirm by checking Supabase JS v2 docs — `removeChannel` was deprecated in favor of `channel.unsubscribe()`.

Also: `subscribeToLeaderboardChanges` returns a `RealtimeChannel`. The cleanup should be:
```typescript
return () => { sub.unsubscribe(); };
```

### Integration Approach
Add to `Dashboard.tsx`:

1. Import: `import Leaderboard from "./Leaderboard";`
2. Import icon: `Trophy` from `lucide-react` (not yet imported)
3. Add state: `const [showLeaderboard, setShowLeaderboard] = useState(false);`
4. In STATUS tab, add a trigger panel next to the SHADOW_ARMY_COMMAND panel (line 242):
```tsx
<div className="system-panel p-10 bg-gradient-to-br from-[#D97706]/20 to-transparent border-[#D97706]/40 shadow-2xl group cursor-pointer" onClick={() => setShowLeaderboard(true)}>
  <h3 className="system-readout text-[11px] text-[#94A3B8] mb-4 font-black tracking-widest uppercase">WORLD_RANKINGS</h3>
  <div className="flex items-end justify-between">
    <Trophy size={36} className="text-[#D97706] drop-shadow-[0_0_20px_#D97706] group-hover:scale-110 transition-transform" />
    <div className="system-readout text-[10px] text-[#D97706] font-black tracking-widest animate-pulse uppercase">VIEW →</div>
  </div>
</div>
```
5. In AnimatePresence block at bottom (after line 294):
```tsx
{showLeaderboard && <Leaderboard state={state} onClose={() => setShowLeaderboard(false)} />}
```

### leaderboardService vs /api/leaderboard
The `Leaderboard.tsx` component calls `getLeaderboard()` from `leaderboardService.ts` directly via anon key client. The `/api/leaderboard` route uses the service role key. For Phase 2, the client-side approach is fine (leaderboard data is not sensitive). No change needed here.

### Leaderboard Data Shape Mismatch
`Leaderboard.tsx` consumes `LeaderboardEntry` which has `total_xp_earned`. But it calls `calculatePower(l)` as `l.level * 1000 + (l.total_xp_earned / 10)`. The `LeaderboardEntry` interface in `leaderboardService.ts` correctly includes `total_xp_earned`. This should work.

However: the component uses CSS classes `glass`, `primary`, `muted-foreground`, `foreground` that are Tailwind theme tokens. Verify these are defined in `globals.css` or `tailwind.config.ts`. If they use a different design system (e.g., shadcn/ui CSS vars), the component may render with missing styles in the Dashboard context which uses a different CSS variable set.

---

## Items Catalog: Column Mapping Fix

### Schema (from migration)
```sql
CREATE TABLE "items" (
  "id"        UUID PRIMARY KEY,
  "name"      VARCHAR(200) NOT NULL,
  "description" TEXT,
  "item_type" "ItemType" NOT NULL,   -- enum: EQUIPMENT, CONSUMABLE, COSMETIC, CHAPTER, SHADOW_FRAGMENT
  "rarity"    "ItemRarity" DEFAULT 'COMMON',  -- enum: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC
  "effects"   JSONB DEFAULT '{}',
  "image_url" TEXT,
  "emoji"     VARCHAR(10) DEFAULT '🎁',
  ...
)
```

### Current STARTER_ITEMS (has mismatches)
```typescript
{ name: "Shadow Essence", type: "SPECIAL", ... }  // "SPECIAL" not in ItemType enum — WILL FAIL
{ name: "Hunter's Badge", type: "EQUIPMENT", ... } // column should be "item_type"
```

### Fixed STARTER_ITEMS shape
```typescript
const STARTER_ITEMS = [
  { name: "Hunter's Badge",     item_type: "EQUIPMENT",      rarity: "COMMON",   description: "Proof of awakening. +5 STR",         effects: { strength: 5 },               emoji: "🏅" },
  { name: "Mana Stone (Small)", item_type: "CONSUMABLE",     rarity: "COMMON",   description: "Restores 20 MP on use",               effects: { mp: 20 },                    emoji: "💎" },
  { name: "Health Potion",      item_type: "CONSUMABLE",     rarity: "COMMON",   description: "Restores 50 HP on use",               effects: { hp: 50 },                    emoji: "🧪" },
  { name: "Iron Dagger",        item_type: "EQUIPMENT",      rarity: "UNCOMMON", description: "Starting weapon. +10 STR",            effects: { strength: 10, agility: 5 },  emoji: "🗡️" },
  { name: "Shadow Essence",     item_type: "SHADOW_FRAGMENT",rarity: "RARE",     description: "Crystallized shadow energy.",         effects: { shadow_extract: 1 },         emoji: "🌑" },
];
```

Key changes:
- `type` → `item_type`
- `stat_bonus` → `effects`
- `effect` → `effects`
- `image_url` → `emoji` (the schema has both `image_url TEXT` and `emoji VARCHAR`, use emoji for now)
- `"SPECIAL"` → `"SHADOW_FRAGMENT"` (valid enum value)

### grantStarterItemsToUser compatibility
`grantStarterItemsToUser()` looks up by `name` and maps to `user_inventory` rows. The `user_inventory` schema has `item_id` (UUID FK to `items.id`). This pattern works correctly as-is once the items are seeded with correct column names.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test framework detected in project |
| Config file | None — Wave 0 gap |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| 2-SC1 | Starter items appear in user inventory after awakening | integration | manual: sign up new user, check STORAGE tab | No framework yet |
| 2-SC2 | 15+ shadows available for extraction | smoke | Check `SHADOWS_DB.length >= 15` and `SELECT COUNT(*) FROM shadows >= 15` | No framework yet |
| 2-SC3 | Leaderboard panel visible on Dashboard | smoke | manual: open Dashboard, click WORLD_RANKINGS panel | No framework yet |

### Sampling Rate
- **Per task:** Manual browser verification of the specific success criterion
- **Per wave:** Full new-user signup flow: signup → awakening → check STORAGE (5 items) → check SHADOWS tab (ARISE button available with 15+ pool) → check STATUS tab (WORLD_RANKINGS panel visible)
- **Phase gate:** All 3 success criteria manually verified with a freshly created test account before marking Phase 2 complete

### Wave 0 Gaps
- [ ] No test framework installed — Jest or Vitest + Testing Library would cover SC1/SC2 with unit tests
- [ ] No E2E framework — Playwright or Cypress would automate full signup flow for SC1/SC3
- [ ] `__tests__/shadowSystem.test.ts` — covers SC2 (SHADOWS_DB length assertion)
- [ ] `__tests__/inventoryService.test.ts` — covers SC1 (seedStarterItems column validation)

Since Phase 5 is dedicated to QA & Hardening and no framework is installed, Phase 2 validation should be manual browser testing. Document a manual test checklist in the VERIFICATION file.

---

## Open Questions

1. **Are Supabase migrations applied programmatically or manually?**
   - What we know: Migration files exist in `supabase/migrations/`. Supabase CLI (`supabase db push`) would apply them.
   - What's unclear: Whether the dev workflow uses `supabase db push` or applies SQL manually via Supabase dashboard.
   - Recommendation: If CLI is available, add `20260316000000_seed_shadows.sql`. If not, add a `POST /api/seed` server route that runs the shadow inserts with the service role key.

2. **Do the Leaderboard CSS class tokens (`glass`, `primary`, `muted-foreground`) exist in the project's Tailwind config?**
   - What we know: Dashboard.tsx uses explicit hex colors throughout. Leaderboard.tsx uses semantic token names from a shadcn/ui-style system.
   - What's unclear: Whether `globals.css` defines these CSS variables.
   - Recommendation: Check `src/app/globals.css` before wiring. If tokens are missing, replace with explicit Dashboard-style hex values in Leaderboard.tsx.

3. **Is `seedStarterItems()` actually being called from `/api/user` POST route after Phase 1?**
   - What we know: Phase 1 plan (01-03) added this call. STATE.md says 01-03 is complete.
   - What's unclear: Whether the actual code change was applied to the file on disk.
   - Recommendation: Read `/api/user/route.ts` at plan execution time to confirm before writing Plan 02-01.

---

## Sources

### Primary (HIGH confidence — direct file reads)
- `src/lib/game/shadowSystem.ts` — SHADOWS_DB structure, ID format, Shadow interface
- `src/lib/services/inventoryService.ts` — STARTER_ITEMS, seedStarterItems, grantStarterItemsToUser
- `src/lib/services/shadowService.ts` — saveExtractedShadow, getUserShadows signatures
- `src/lib/services/leaderboardService.ts` — LeaderboardEntry interface, getLeaderboard implementation
- `src/components/arise/Dashboard.tsx` — tab structure, existing overlay patterns, import list
- `src/components/arise/Leaderboard.tsx` — component interface, data fetch, bug at line 51/187
- `src/components/arise/ShadowArmy.tsx` — ID lookup pattern at line 127 (the alignment bug)
- `src/app/api/leaderboard/route.ts` — server route structure and response shape
- `supabase/migrations/20260311000000_init_schema.sql` — full schema, enum definitions, FK constraints
- `.planning/STATE.md` — Phase 1 completion status and decisions
- `.planning/ROADMAP.md` — Phase 2 success criteria

### Secondary (MEDIUM confidence — lore knowledge)
- Solo Leveling manhwa/light novel shadow roster — shadow names, types, abilities. Igris, Beru, Tank, Tusk, Kaisel, Bellion confirmed named characters. Generic soldier types consistent with lore.

---

## Metadata

**Confidence breakdown:**
- Shadow roster names/types: MEDIUM — named characters verified from lore; stats are original game design
- ID alignment strategy: HIGH — confirmed by reading ShadowArmy.tsx line 127 and shadowSystem.ts
- Leaderboard integration: HIGH — all files read, bug confirmed, integration pattern clear
- Items catalog fix: HIGH — schema column names read directly from migration SQL
- CSS token risk: LOW — globals.css not yet read; flagged as open question

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable codebase, no fast-moving dependencies)
