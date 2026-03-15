---
phase: 02-data-completeness
plan: 01
subsystem: database
tags: [supabase, shadows, inventory, seed, typescript, uuid]

# Dependency graph
requires:
  - phase: 01-foundation-fixes
    provides: API routes and service infrastructure the game systems rely on
provides:
  - SHADOWS_DB with 17 UUID-keyed entries matching supabase/seed-shadows.sql
  - Fixed STARTER_ITEMS using correct column names (item_type, effects, emoji) and valid ItemType enum values
  - Idempotent shadow catalog seed SQL for Supabase
affects:
  - ShadowArmy.tsx rendering (now resolves shadow_id to real records)
  - seedStarterItems() and grantStarterItemsToUser() (now inserts valid rows)
  - 02-02 and beyond (any plan that queries shadows or user inventory)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Stable UUID constants for SHADOWS_DB entries — TypeScript array keyed by UUID, not numeric/string shorthand
    - Idempotent seed SQL using ON CONFLICT (id) DO NOTHING for safe re-runs
    - STARTER_ITEMS column names match Supabase migration schema exactly (item_type, effects, emoji)

key-files:
  created:
    - supabase/seed-shadows.sql
  modified:
    - src/lib/game/shadowSystem.ts
    - src/lib/services/inventoryService.ts

key-decisions:
  - "Use stable a1b2c3d4-00XX-0000-0000-00000000000X UUID format so TypeScript constants and SQL seed always match"
  - "Map Iron Dagger to EQUIPMENT (not WEAPON) — WEAPON is not a valid ItemType enum value"
  - "Map Shadow Essence to SHADOW_FRAGMENT (not SPECIAL) — SPECIAL is not a valid ItemType enum value"
  - "ability column in shadows table is JSONB — encode as JSON object with name, buff, multiplier keys"

patterns-established:
  - "Game data constants (SHADOWS_DB) use UUIDs matching DB seed — no numeric or shorthand IDs"
  - "STARTER_ITEMS fields mirror the items table migration schema column names exactly"

requirements-completed:
  - 2-SC1
  - 2-SC2

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 02 Plan 01: Shadow Roster Expansion + Inventory Seed Fix Summary

**17-entry SHADOWS_DB with stable UUIDs matching idempotent seed SQL, plus STARTER_ITEMS corrected to use item_type/effects/emoji with valid ItemType enum values**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T14:35:41Z
- **Completed:** 2026-03-15T14:37:14Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced single placeholder shadow entry with 17 UUID-keyed entries covering ranks E through S; fixes the silent empty-render bug in ShadowArmy.tsx where `SHADOWS_DB.find(s => s.id === ps.shadow_id)` always returned undefined
- Created `supabase/seed-shadows.sql` with 17 matching INSERT rows using ON CONFLICT (id) DO NOTHING — safe to re-run
- Fixed STARTER_ITEMS column names from wrong keys (type, stat_bonus, effect, image_url) to schema-correct keys (item_type, effects, emoji), and corrected WEAPON/SPECIAL to valid ItemType enum values EQUIPMENT/SHADOW_FRAGMENT

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand SHADOWS_DB + create seed-shadows.sql** - `64c1218` (feat)
2. **Task 2: Fix STARTER_ITEMS column names and enum values** - `63ca9ee` (fix)

## Files Created/Modified
- `src/lib/game/shadowSystem.ts` - SHADOWS_DB expanded from 1 to 17 entries, all with stable UUID IDs
- `supabase/seed-shadows.sql` - Idempotent shadow catalog seed for Supabase, 17 rows with matching UUIDs
- `src/lib/services/inventoryService.ts` - STARTER_ITEMS fixed: item_type, effects, emoji; EQUIPMENT and SHADOW_FRAGMENT enum values

## Decisions Made
- Used a1b2c3d4-00XX-0000-0000-00000000000X UUID format for readability and stable alignment between TypeScript and SQL
- Iron Dagger mapped to EQUIPMENT (not WEAPON): WEAPON is absent from the ItemType enum in the migration schema
- Shadow Essence mapped to SHADOW_FRAGMENT (not SPECIAL): SPECIAL is absent from the ItemType enum
- ability column in shadows table encoded as JSONB object `{"name":"...","buff":"...","multiplier":N}` per schema

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
Pre-existing TypeScript errors exist in unrelated files (Dashboard.tsx, GuildHall.tsx, guildBattleService.ts). These were present before this plan and are out of scope. Neither modified file (`shadowSystem.ts`, `inventoryService.ts`) introduced any TypeScript errors.

## User Setup Required
To seed the shadow catalog into Supabase, run the new SQL file:
- Paste `supabase/seed-shadows.sql` into the Supabase SQL editor, OR
- Run `supabase db push` if using local Supabase CLI

No environment variable changes required.

## Next Phase Readiness
- Shadow extraction rendering is unblocked: ShadowArmy.tsx can now resolve any extracted shadow_id to a real SHADOWS_DB entry
- Starter item grants will succeed for new users: all 5 items now insert with correct column names and valid enum values
- supabase/seed-shadows.sql must be run once against the live database before shadow extraction results are visible
- Ready for 02-02 (next data completeness plan)

---
*Phase: 02-data-completeness*
*Completed: 2026-03-15*
