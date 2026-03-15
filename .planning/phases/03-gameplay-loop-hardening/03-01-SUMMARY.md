---
phase: 03-gameplay-loop-hardening
plan: 01
subsystem: api
tags: [nextjs, supabase, service-role, route-handler, inventory, shadows]

# Dependency graph
requires:
  - phase: 01-foundation-fixes
    provides: "Established getUserId() pattern, supabaseServer module, Bearer-only auth convention"
provides:
  - "GET /api/inventory — user_inventory joined with items(*), split into equipped/unequipped"
  - "GET /api/shadows — user_shadows joined with shadows(*), flat array"
affects:
  - 03-02
  - 03-03
  - phase-04-dashboard-wiring

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-route-only DB access via supabaseServer (service-role key)"
    - "getUserId() helper reads Authorization Bearer header only — no URL params"
    - "Route files are self-contained: no service layer imports, no anon client"

key-files:
  created:
    - src/app/api/inventory/route.ts
    - src/app/api/shadows/route.ts
  modified: []

key-decisions:
  - "Route files copy getUserId() locally rather than importing from a shared helper — keeps each route self-contained and avoids shared-module coupling"
  - "Use supabaseServer (service-role), not inventoryService/shadowService which use the anon client"
  - "Split equipped/unequipped in the route handler, not in the DB query, for simplicity"

patterns-established:
  - "Self-contained route pattern: getUserId() + supabaseServer import + single export — no service layer"
  - "Error shape: { error: string } with 401 for no token, 500 for DB errors"

requirements-completed: [03-01]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 3 Plan 01: Inventory and Shadows API Routes Summary

**Two read-only server routes using supabaseServer (service-role) with joined item/shadow data and Bearer-only auth gate**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-15T15:19:18Z
- **Completed:** 2026-03-15T15:20:33Z
- **Tasks:** 2
- **Files modified:** 2 (both new)

## Accomplishments

- Created GET /api/inventory using supabaseServer, queries user_inventory with items(*) join, returns { equipped, unequipped }
- Created GET /api/shadows using supabaseServer, queries user_shadows with shadows(*) join, returns { shadows: [...] }
- Both routes enforce 401 Unauthorized when Authorization Bearer token is absent

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GET /api/inventory route** - `7c37743` (feat)
2. **Task 2: Create GET /api/shadows route** - `3fa71af` (feat)

## Files Created/Modified

- `src/app/api/inventory/route.ts` - GET handler: queries user_inventory joined to items, splits equipped/unequipped, returns 401 without token
- `src/app/api/shadows/route.ts` - GET handler: queries user_shadows joined to shadows, returns flat array, returns 401 without token

## Decisions Made

- Copied getUserId() locally into each route (not imported from shared module) — follows established pattern from user/route.ts, keeps each file self-contained
- Used supabaseServer directly rather than the service-layer functions (inventoryService, shadowService) — those use the anon client which bypasses the server-side security model
- Equipped/unequipped split done in JS filter after query — avoids two DB round-trips for a simple boolean partition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors found in Dashboard.tsx, GuildHall.tsx, and guildBattleService.ts — all unrelated to this plan's files. Neither new route introduced any TypeScript errors (confirmed via `npx tsc --noEmit | grep api/inventory` and `| grep api/shadows` returning clean).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both routes are ready for Phase 4 dashboard wiring
- Inventory.tsx and ShadowArmy.tsx can fetch from these routes using `Authorization: Bearer <userId>` header
- Expected shape matches component expectations: item.items.name/rarity/stats_bonus, shadow.shadows.name/grade/type

---
*Phase: 03-gameplay-loop-hardening*
*Completed: 2026-03-15*
