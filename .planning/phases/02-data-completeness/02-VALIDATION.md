---
phase: 02
slug: data-completeness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (tsc --noEmit) |
| **Config file** | tsconfig.json |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`

---

## Validation Architecture

### Phase 2 Critical Paths

#### CP-01: Shadow ID Alignment
- **What to verify:** SHADOWS_DB entries in `shadowSystem.ts` use UUIDs that match the `shadows` Supabase table seed
- **How:** After seed, run `SELECT id, name FROM shadows` — IDs must match SHADOWS_DB entries exactly
- **Failure mode:** `ShadowArmy.tsx` line 127 does `SHADOWS_DB.find(s => s.id === ps.shadow_id)` — mismatched IDs cause shadows to render blank

#### CP-02: Items Catalog Column Names
- **What to verify:** `inventoryService.ts` STARTER_ITEMS uses correct column names (`item_type` not `type`, valid enum values only)
- **How:** TypeScript compile + read the insert call vs Prisma schema enum values
- **Failure mode:** Silent insert failures → empty inventory for new users

#### CP-03: Leaderboard CSS Tokens
- **What to verify:** `Leaderboard.tsx` CSS variable tokens (`glass`, `primary`, `muted-foreground`) resolve in the app's CSS context
- **How:** Visual check after wiring — no unstyled boxes
- **Failure mode:** Leaderboard renders with broken layout if Dashboard uses raw hex but Leaderboard uses CSS vars

#### CP-04: Shadow Extraction Flow End-to-End
- **What to verify:** After expanding SHADOWS_DB, the ARISE button in ShadowArmy extracts a shadow and it appears in the panel
- **How:** Manual test — click ARISE, verify shadow appears with name/rank/ability

---

## Must-Haves (aligned to success criteria)

1. [ ] `SHADOWS_DB` has ≥ 15 entries with stable UUID IDs
2. [ ] Supabase `shadows` seed data matches SHADOWS_DB UUIDs
3. [ ] `inventoryService.ts` STARTER_ITEMS uses `item_type` column (not `type`) with valid enum values
4. [ ] Dashboard renders a Leaderboard panel or overlay accessible from STATUS tab
5. [ ] Leaderboard fetches from `/api/leaderboard` and displays correctly
6. [ ] TypeScript compiles with no new errors after all changes
