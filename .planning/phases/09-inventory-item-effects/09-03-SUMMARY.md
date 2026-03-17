---
phase: 09-inventory-item-effects
plan: "03"
subsystem: ui
tags: [react, inventory, stats, game-state, equip, notifications]

# Dependency graph
requires:
  - phase: 09-inventory-item-effects
    provides: POST /api/inventory/equip server route, UserItem.effects typed as Record<string, number>|null
  - phase: 05-notification-system
    provides: ADD_NOTIFICATION reducer action
provides:
  - Equipping items dispatches per-stat ADD_NOTIFICATION (e.g. STRENGTH +10)
  - onEquipChange callback re-merges item bonuses into state.stats via SET_DATA
  - Inventory footer shows live Active_Buffs, Defense_Rating, Global_Rarity from equipped items
  - CONSUMABLE and SHADOW_FRAGMENT items show disabled USE [FUTURE] button
  - Page init and SIGNED_IN event merge equipped item bonuses into base stats before SET_USER
  - toggleEquipItem anon-client write path eliminated from inventoryService
affects: [Dashboard, page.tsx, game-state stats display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - onEquipChange callback pattern — Inventory tells Dashboard to re-fetch and recompute, not compute itself
    - IIFE pattern for in-JSX derived data (footer stats, already used in Dashboard rank HUD)
    - computeItemBonuses() pure helper — loops equipped items, sums stat effects; defined in page.tsx

key-files:
  created: []
  modified:
    - src/components/arise/Inventory.tsx
    - src/components/arise/Dashboard.tsx
    - src/app/page.tsx
    - src/lib/services/inventoryService.ts

key-decisions:
  - "onEquipChange callback not inline stat-patch: Inventory has no access to state.stats, so Dashboard owns the re-merge"
  - "computeItemBonuses defined in page.tsx (not a shared utility) — no new shared helper coupling"
  - "IIFE for footer stat derivation keeps computation co-located with JSX without polluting component scope"
  - "Item type check uses strict EQUIPMENT string — CONSUMABLE and SHADOW_FRAGMENT get USE [FUTURE] placeholder"
  - "toggleEquipItem removed from inventoryService — all equip writes go through POST /api/inventory/equip (service-role)"

patterns-established:
  - "Stat patch on equip: fetch inventory → computeItemBonuses → dispatch SET_DATA with merged stats from base user.stats"
  - "Notification per stat: single ADD_NOTIFICATION per stat key in effects, not one combined notification"

requirements-completed: []

# Metrics
duration: 18min
completed: 2026-03-17
---

# Phase 9 Plan 03: Wire Item Bonuses into Game State Summary

**Inventory equip system fully wired — server route, stat notifications, live footer, and init-time bonus merge via onEquipChange callback pattern**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-17T10:50:00Z
- **Completed:** 2026-03-17T11:08:00Z
- **Tasks:** 6 (T1+T2 committed together, T2 Dashboard split into own commit)
- **Files modified:** 4

## Accomplishments
- Equipping any EQUIPMENT item now fires ADD_NOTIFICATION for each stat in its effects (e.g. STRENGTH +10, AGILITY +5)
- Unequipping fires matching negative notifications (STRENGTH -10)
- Dashboard's `onEquipChange` re-fetches inventory and patches `state.stats` with correct merged totals
- CONSUMABLE and SHADOW_FRAGMENT items show disabled "USE [FUTURE]" button instead of EQUIP
- Inventory footer shows real dominant buff, real VIT total, and highest equipped item rarity
- On page load and SIGNED_IN auth event, item bonuses are already merged into stats before first render
- `toggleEquipItem` (anon-client write) removed — zero direct DB writes from client

## Task Commits

1. **T1 + T2 (Inventory side): dispatch prop + server equip call + notifications** - `b9d8ef1` (feat)
2. **T3: Conditional equip button by item type** - `6202b1e` (feat)
3. **T4: Live footer computed from equipped items** - `71c500e` (feat)
4. **T2 (Dashboard side): onEquipChange wired to re-merge bonuses** - `653bb7b` (feat)
5. **T5: Page init bonus merge** - `e27b5b2` (feat)
6. **T6: Remove toggleEquipItem** - `ed17cd5` (chore)

## Files Created/Modified
- `src/components/arise/Inventory.tsx` - dispatch + onEquipChange props, server equip call, notifications, type-conditional button, live footer
- `src/components/arise/Dashboard.tsx` - onEquipChange callback with inventory re-fetch and SET_DATA dispatch
- `src/app/page.tsx` - computeItemBonuses helper, bonus merge at init and SIGNED_IN
- `src/lib/services/inventoryService.ts` - toggleEquipItem removed

## Decisions Made
- `onEquipChange` callback pattern chosen over passing stats down: Inventory.tsx doesn't hold `state.stats`, so the cleanest path is notifying Dashboard which has full state access to re-merge.
- `computeItemBonuses` defined locally in `page.tsx` rather than a shared utility — consistent with the project's copy-don't-import principle for self-contained files.
- IIFE for footer computation keeps the derived data co-located with the JSX that uses it — same pattern as Dashboard rank HUD.

## Deviations from Plan

None - plan executed exactly as written. T2 was split into two commits (Inventory side with T1, Dashboard side separately) for clearer atomic boundaries.

## Issues Encountered
None. TypeScript compiled clean after each task.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 9 complete: inventory items now have real stat effects visible in the UI
- Stats panel in Dashboard shows numbers that include equipped item bonuses
- Ready to move to next phase
- Note: `state.user.stats` (base stats) and `state.stats` (display stats including bonuses) are now structurally separate — future phases should maintain this distinction when computing derived stats

---
*Phase: 09-inventory-item-effects*
*Completed: 2026-03-17*
