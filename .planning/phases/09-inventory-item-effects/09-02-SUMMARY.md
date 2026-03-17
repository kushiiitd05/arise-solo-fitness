---
phase: 09-inventory-item-effects
plan: "02"
subsystem: api
tags: [nextjs, supabase, server-route, inventory, equip]

# Dependency graph
requires:
  - phase: 03-gameplay-loop-hardening
    provides: supabaseServer pattern, getUserId copy-don't-import pattern, server route security model
  - phase: 09-01
    provides: GET /api/inventory route and user_inventory table shape
provides:
  - POST /api/inventory/equip — secure server-side equip toggle with ownership check
affects: [09-03-inventory-client-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getUserId() defined locally in each route file (Phase 3 copy-don't-import)"
    - "supabaseServer (service-role) used for all server route writes"
    - "Ownership guard: .eq('user_id', userId) on update to prevent cross-user writes"
    - ".maybeSingle() returns null instead of throwing when row absent — returns 404"

key-files:
  created:
    - src/app/api/inventory/equip/route.ts
  modified: []

key-decisions:
  - "getUserId() defined locally per Phase 3 principle — no shared helper coupling"
  - "supabaseServer (service-role) used — bypasses RLS intentionally for server route"
  - "Ownership check .eq('user_id', userId) on update prevents equipping other users' items"
  - "Returns items(*) join so client receives effects field immediately without second fetch"
  - ".maybeSingle() not .single() — safe null return when item not found or not owned"
  - "toggleEquipItem in inventoryService.ts intentionally not deleted — removed in 09-03"

patterns-established:
  - "Equip route: auth → validate body → update with ownership check → return full joined row"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 09 Plan 02: POST /api/inventory/equip Server Route Summary

**Secure server-side equip toggle using supabaseServer with ownership guard (.eq user_id) and items(*) join, following Phase 3 copy-don't-import pattern**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T10:40:00Z
- **Completed:** 2026-03-17T10:45:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `POST /api/inventory/equip` route using service-role client (no anon RLS)
- Ownership check prevents equipping items belonging to other users
- Returns full `user_inventory` row with `items(*)` join so client has `effects` immediately without a second round-trip
- TypeScript compilation passes clean with no errors

## Task Commits

Each task was committed atomically:

1. **T1: Create POST /api/inventory/equip route** - `32b34ec` (feat)

## Files Created/Modified
- `src/app/api/inventory/equip/route.ts` - Server route for equip toggle with auth, ownership check, and DB update

## Decisions Made
- getUserId() defined locally per Phase 3 principle — no shared helper coupling
- supabaseServer (service-role) used — bypasses RLS intentionally for server routes
- Ownership check via .eq("user_id", userId) on the UPDATE prevents cross-user equip
- Returns items(*) join so client receives effects field immediately
- .maybeSingle() not .single() — returns 404 when item not found or not owned
- toggleEquipItem in inventoryService.ts intentionally kept — will be removed in 09-03

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `POST /api/inventory/equip` is live and ready for client wiring in 09-03
- `toggleEquipItem` in inventoryService.ts still exists — 09-03 replaces the client-side call with a fetch to this route and removes the anon-client function

---
*Phase: 09-inventory-item-effects*
*Completed: 2026-03-17*
