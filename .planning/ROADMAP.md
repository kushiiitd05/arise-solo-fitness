# Roadmap: ARISE — Solo Leveling Fitness System

## Overview

Stabilize the ARISE application from a partially-broken prototype into a fully-functional
core game loop. Five phases harden the authentication, database sync, API routes, gameplay
loop, and UI — delivering a shippable v1.0 of the Solo Leveling fitness experience.

## Phases

- [ ] **Phase 1: Foundation Fixes** - Fix root-cause bugs that break level-up persistence, API security, and crash-causing DB calls
- [ ] **Phase 2: Data Completeness** - Seed starter inventory, expand shadow roster, wire leaderboard
- [ ] **Phase 3: Gameplay Loop Hardening** - Server-side writes for all state mutations, stat wiring in UI
- [ ] **Phase 4: Feature Completion** - Arena unlock, mobile nav, Achievements, Guild Hall wiring
- [ ] **Phase 5: QA & Hardening** - E2E test, RLS audit, error boundaries

## Phase Details

### Phase 1: Foundation Fixes
**Goal**: Fix all root-cause bugs that silently break core gameplay — level-up never persisting to DB, API routes crashing on missing rows, security hole allowing user impersonation, and starter items never granted
**Depends on**: Nothing
**Success Criteria** (what must be TRUE):
  1. Completing a daily quest updates `level`, `hunter_rank` AND `current_xp` in the `users` table
  2. `/api/xp/award` no longer returns 406 when `user_stats` row is missing
  3. `/api/user` rejects requests without a valid Bearer token (no userId query param auth)
  4. New user signup results in starter items appearing in `user_inventory`
  5. `calculateIntensityRank` returns C for a 40% flawless ratio
**Plans**: 3 plans

Plans:
- [ ] 01-01: Fix API route safety — .single() → .maybeSingle(), remove userId query param auth
- [ ] 01-02: Fix quest completion level-up persistence to database
- [ ] 01-03: Fix userService writes, grant starter items on createUser, fix intensity rank typo

### Phase 2: Data Completeness
**Goal**: Ensure new hunters spawn with starter inventory, full shadow roster (15+ entries), and leaderboard is accessible from Dashboard
**Depends on**: Phase 1
**Success Criteria** (what must be TRUE):
  1. New user after awakening sees 5 starter items in STORAGE tab
  2. Shadow extraction has 15+ unique shadows available
  3. Leaderboard panel visible on Dashboard
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Expand SHADOWS_DB to 17 entries with stable UUIDs, create supabase/seed-shadows.sql, fix STARTER_ITEMS column names and enum values
- [ ] 02-02-PLAN.md — Fix Leaderboard.tsx bugs (import order, channel cleanup, CSS tokens), wire Leaderboard modal into Dashboard STATUS tab

### Phase 3: Gameplay Loop Hardening
**Goal**: Move all client-side DB writes through server API routes, wire stamina/mana stats in Dashboard header
**Depends on**: Phase 2
**Success Criteria** (what must be TRUE):
  1. Quest progress updates go through POST /api/quests/update (server-side)
  2. Stamina and Mana values in Dashboard header reflect real user stats
  3. /api/inventory and /api/shadows routes exist and return data
**Plans**: TBD

Plans:
- [ ] 03-01: Create /api/inventory and /api/shadows server routes
- [ ] 03-02: Wire Dashboard header stats to real data

### Phase 4: Feature Completion
**Goal**: Wire remaining UI panels (Arena unlock gate, mobile nav, Achievement Hall, Guild Hall)
**Depends on**: Phase 3
**Plans**: TBD

Plans:
- [ ] 04-01: Arena unlock gate + mobile bottom navigation
- [ ] 04-02: Achievement Hall + Guild Hall wiring

### Phase 5: QA & Hardening
**Goal**: Full E2E test of signup→quest→levelup flow, RLS audit, error boundaries
**Depends on**: Phase 4
**Plans**: TBD

Plans:
- [ ] 05-01: Error boundaries + loading state audit
- [ ] 05-02: RLS policy verification + auth flow E2E test
