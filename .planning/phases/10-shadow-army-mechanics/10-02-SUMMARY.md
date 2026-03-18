---
phase: 10-shadow-army-mechanics
plan: "02"
subsystem: shadow-army
tags: [shadow-bonuses, stat-system, ui-chip, session-init]
dependency_graph:
  requires: [10-01]
  provides: [shadow-stat-multipliers-applied, army-power-header-display, extraction-stat-re-derive]
  affects: [page.tsx, ShadowArmy.tsx, Dashboard.tsx]
tech_stack:
  added: []
  patterns:
    - dynamic-import for calculateModifiedStats and getUserShadows inside async functions
    - IIFE in JSX for derived armyPower computation
    - stat re-derive from raw base (state.user.stats) to prevent double-application
key_files:
  created: []
  modified:
    - src/app/page.tsx
    - src/components/arise/ShadowArmy.tsx
    - src/components/arise/Dashboard.tsx
decisions:
  - Shadow merge uses dynamic imports inside syncSession to avoid top-level import bloat
  - onExtractionChange starts from state.user.stats (raw base) to prevent multiplier double-application
  - armyPower computed via IIFE in JSX — same pattern as rank HUD and footer stat derivation
  - Dashboard.tsx dispatches SET_DATA with both stats and shadows atomically after extraction
metrics:
  duration: "5 minutes"
  completed: "2026-03-18T06:49:48Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 10 Plan 02: Shadow Stat Multipliers + Army Power Header Summary

**One-liner:** Shadow multipliers wired into session init (base → +items → ×shadows) with army power header chip in SHADOWS panel.

## What Was Built

### Task 1: Shadow bonus merge in page.tsx session init

Extended `syncSession` and `onAuthStateChange` SIGNED_IN handler in `src/app/page.tsx` to apply shadow multipliers after the item bonus merge. The correct stacking order is enforced:

1. Raw base stats from DB
2. + Item bonuses (flat additions per equipped item)
3. × Shadow multipliers (multiplicative via `calculateModifiedStats`)

Both `syncSession` (initial load) and the `SIGNED_IN` auth handler now:
- Fetch user's shadow IDs via `getUserShadows`
- Build a partial GameState with item-boosted stats and shadow IDs
- Call `calculateModifiedStats` to get the final stat values
- Dispatch `SET_USER` with final stats
- Dispatch `SET_DATA` with `shadows` array so `ShadowArmy` renders correctly

If the user has no shadows, `SET_DATA` is dispatched with an empty array to clear any stale state.

### Task 2: Army power header chip + onExtractionChange stat re-derive

**ShadowArmy.tsx:** The right side of the header was restructured from a standalone ARISE button to a flex column with the stat chip above the button. The chip shows:
- `TOKENS: {n}` — `text-[#7C3AED]` when > 0, `text-[#7C3AED]/40` when = 0
- `|` separator in `text-white/20`
- `ARMY POWER: {n,nnn}` — `text-[#E2E8F0]` with `.toLocaleString()` formatting
- `armyPower` is computed inside an IIFE as `persistentShadows.reduce((sum, ps) => sum + (ps.shadows?.base_power ?? 0), 0)`

**Dashboard.tsx:** The `onExtractionChange` callback (previously only refreshed token count) was replaced with the full stat re-derive:
1. Fetch inventory and shadow rows in parallel (`Promise.all`)
2. Start from `state.user.stats` (raw base, pre-item, pre-shadow)
3. Apply item bonuses (flat) → `itemBoosted`
4. Apply shadow multipliers via `calculateModifiedStats` → `finalStats`
5. Dispatch `SET_DATA` with both `stats: finalStats` and `shadows: newShadowIds` atomically
6. Re-fetch `extraction_tokens` from DB and update local state

## Key Implementation Decisions

**Double-application prevention:** The most important decision was ensuring `onExtractionChange` always starts from `state.user.stats` (raw base) rather than `state.stats` (active stats that already have multipliers applied). Starting from `state.stats` would compound multipliers on every extraction attempt.

**Partial GameState for calculateModifiedStats:** The function expects a `GameState` shape. Both page.tsx and Dashboard.tsx spread `initialState` then override `stats` (item-boosted values) and `shadows` (UUID array). This is the safest approach since `calculateModifiedStats` only reads `state.stats` and `state.shadows`.

**Atomic shadow + stats dispatch:** `SET_DATA` is dispatched with both `stats` and `shadows` in a single payload in `onExtractionChange`. This avoids a render cycle where stats are updated but `state.shadows` still reflects the old extraction count.

## Verification Results

```
# TypeScript
npx tsc --noEmit → exit 0 (no output)

# Tests — 9/9 passed
✓ buildWeightedPool > returns empty array when all shadows owned
✓ buildWeightedPool > excludes already-owned shadows
✓ buildWeightedPool > falls back to E-rank weights for unknown rank
✓ buildWeightedPool > E-rank hunter pool has majority E/D shadows by weight count
✓ calculateModifiedStats > applies shadow buff multiplier to matching stat
✓ calculateModifiedStats > compounds multiplicatively for two same-stat shadows
✓ POST /api/shadows/extract > returns 401 when no bearer token
✓ POST /api/shadows/extract > returns 400 when extraction_tokens = 0
✓ POST /api/shadows/extract > returns complete:true when all shadows owned
Tests: 9 passed (9)
```

## Commits

- `88db0fd` — feat(10-02): wire shadow bonus merge into page.tsx session init
- `29647ea` — feat(10-02): army power header chip + full stat re-derive in onExtractionChange

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/app/page.tsx modified with shadow merge in syncSession and onAuthStateChange
- src/components/arise/ShadowArmy.tsx contains ARMY POWER header chip
- src/components/arise/Dashboard.tsx onExtractionChange re-derives from state.user.stats
- Both commits verified in git log
