# Roadmap: ARISE — Solo Leveling Fitness System

## Overview

Stabilize the ARISE application from a partially-broken prototype into a fully-functional
core game loop, then build out all starred systems — delivering a complete Solo Leveling
fitness experience with AI, combat, ranked progression, and manhwa rewards.

## Phases

- [x] **Phase 1: Foundation Fixes** - Fix root-cause bugs that break level-up persistence, API security, and crash-causing DB calls
- [ ] **Phase 2: Data Completeness** - Seed starter inventory, expand shadow roster, wire leaderboard
- [x] **Phase 3: Gameplay Loop Hardening** - Server-side writes for all state mutations, stat wiring in UI (completed 2026-03-15)
- [x] **Phase 4: Feature Completion** - Arena unlock, mobile nav, Achievements, Guild Hall wiring (completed 2026-03-15)
- [x] **Phase 5: Notification System** - Fix broken auto-dismiss notifications, unify notification layer across all game events (completed 2026-03-16)
- [x] **Phase 6: Rank XP Calculation System** - Design multi-event rank XP model (workouts, quests, boss kills all contribute to rank progression) (completed 2026-03-16)
- [x] **Phase 7: Full Rank Trial System** - Formal workout challenge to advance rank (workout → trial → pass → rank up), depends on Phase 6 (completed 2026-03-16)
- [ ] **Phase 8: Dynamic Daily Quest Generation** - Level-adaptive quest generation engine replacing fixed templates
- [x] **Phase 9: Inventory Item Effects** - Permanent and temporary stat bonuses from equipped items (completes Phase 2 seed work) (completed 2026-03-17)
- [x] **Phase 10: Shadow Army Mechanics** - Formalized shadow extraction/reward flow, shadow stats, army composition rules (completed 2026-03-18)
- [x] **Phase 11: Battle System Backend** - Arena battles via backend API using real player stats, replacing client-side simulation (completed 2026-03-18)
- [x] **Phase 12: Manhwa Chapter Reward System** - Chapter unlock UI on quest/boss completion, reader integration, reward trigger events (completed 2026-03-19)
- [x] **Phase 13: Ollama AI Integration** - Dynamic monster names, boss personalities, quest descriptions, workout challenge variations via local LLM (completed 2026-03-19)
- [ ] **Phase 14: QA & Hardening** - E2E test, RLS audit, error boundaries across full system

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
- [x] 01-01: Fix API route safety — .single() → .maybeSingle(), remove userId query param auth
- [x] 01-02: Fix quest completion level-up persistence to database
- [x] 01-03: Fix userService writes, grant starter items on createUser, fix intensity rank typo

### Phase 2: Data Completeness
**Goal**: Ensure new hunters spawn with starter inventory, full shadow roster (15+ entries), and leaderboard is accessible from Dashboard
**Depends on**: Phase 1
**Success Criteria** (what must be TRUE):
  1. New user after awakening sees 5 starter items in STORAGE tab
  2. Shadow extraction has 15+ unique shadows available
  3. Leaderboard panel visible on Dashboard
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Expand SHADOWS_DB to 17 entries with stable UUIDs, create supabase/seed-shadows.sql, fix STARTER_ITEMS column names and enum values
- [x] 02-02-PLAN.md — Fix Leaderboard.tsx bugs (import order, channel cleanup, CSS tokens), wire Leaderboard modal into Dashboard STATUS tab

### Phase 3: Gameplay Loop Hardening
**Goal**: Move all client-side DB writes through server API routes, wire stamina/mana stats in Dashboard header
**Depends on**: Phase 2
**Success Criteria** (what must be TRUE):
  1. Quest progress updates go through POST /api/quests/update (server-side)
  2. Stamina and Mana values in Dashboard header reflect real user stats
  3. /api/inventory and /api/shadows routes exist and return data
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — Create GET /api/inventory and GET /api/shadows server routes (service-role, Bearer auth)
- [ ] 03-02-PLAN.md — Create POST /api/quests/update, replace WorkoutEngine direct write, wire Dashboard STAMINA/MANA

### Phase 4: Feature Completion
**Goal**: Wire remaining UI panels (Arena unlock gate, mobile nav, Achievement Hall, Guild Hall)
**Depends on**: Phase 3
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Arena rank gate (Rank D unlock, XP progress bar, unlock flash) + mobile bottom navigation (4 tabs, fixed bottom-0)
- [ ] 04-02-PLAN.md — Achievement Hall overlay (STATUS panel card + full-screen slide-in) + GUILD desktop tab + GuildHall cleanup fix

### Phase 5: Notification System
**Goal**: Fix broken auto-dismiss notification layer — notifications currently stick on screen. Unify all game events (quest completion, stat allocation, reward unlock, rank up, system alerts) through a single dismissable notification system
**Depends on**: Phase 4
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Fix DISMISS_NOTIFICATION reducer (filter not map), per-type auto-dismiss timeouts, isUrgent fix, 3-notification render cap, progress bar sync
- [ ] 05-02-PLAN.md — Wire quest completion notifications in WorkoutEngine, remove duplicate rank-up notification from Dashboard

### Phase 6: Rank XP Calculation System
**Goal**: Design and implement a multi-event rank XP model where workouts, quest completions, and boss kills all contribute to rank progression (replacing the current level-only formula)
**Depends on**: Phase 5
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Install vitest, add nextRankInfo helper, fix reducer ADD_XP formula (rankFromLevelAndXp), fix /api/xp/award total_xp_earned unconditional update
- [ ] 06-02-PLAN.md — Boss kill XP scaled by boss rank (BOSS_RANK_XP lookup), awardRaidReward rerouted through /api/xp/award, BossEvent victory screen shows real XP
- [ ] 06-03-PLAN.md — Rank progress bars: compact HUD in Dashboard header + full dual-gate block in Profile STATUS panel

### Phase 7: Full Rank Trial System
**Goal**: Formal progression gate — hunters must complete a rank trial (specific workout challenge) to advance rank. Implements the trial flow: initiate trial → complete workout → pass/fail → rank advance
**Depends on**: Phase 6
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — DB migration (trial_last_failed_at), UserStats type extension, mapDbUserToState update, Wave 0 test scaffolds
- [ ] 07-02-PLAN.md — RankTrialEngine component (4-exercise trial loop, pass/fail), Profile INITIATE TRIAL button, Dashboard showTrial wiring
- [ ] 07-03-PLAN.md — POST /api/rank/advance route (dual-gate validation, idempotency, stat points, XP bonus), RankUpCeremony component, Dashboard ceremony render

### Phase 8: Dynamic Daily Quest Generation
**Goal**: Replace fixed quest templates with a level-adaptive generation engine. Quests scale in difficulty and variety based on hunter level and recent completion history
**Depends on**: Phase 7
**Plans**: TBD

Plans:
- [x] 08-01: questEngine.ts — 7-type pool, date-seeded LCG rotation, history adaptation, generateDynamicDailyQuests
- [ ] 08-02: POST /api/quests/daily — wire generateDynamicDailyQuests, 3-day history query, yesterday types anti-repeat
- [ ] 08-03: QuestBoard difficulty badge + empty state block

### Phase 9: Inventory Item Effects
**Goal**: Equippable items grant real permanent or temporary stat bonuses (STR, AGI, VIT, INT, PER). Completes the inventory system seeded in Phase 2 — items are currently cosmetic only
**Depends on**: Phase 4
**Plans**: TBD

Plans:
- [ ] 09-01: Item effect engine (effect schema, apply/remove stat deltas, persist equipped state)
- [ ] 09-02: Wire equipped items into Dashboard stat display and quest calculations

### Phase 10: Shadow Army Mechanics
**Goal**: Formalize shadow extraction and army management — extraction trigger events, shadow stats, army composition rules, and army power calculations
**Depends on**: Phase 4
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — DB migration, buildWeightedPool, POST /api/boss/complete, POST /api/shadows/extract, ShadowArmy.tsx wired to server route with token-gated ARISE button
- [ ] 10-02-PLAN.md — Shadow bonus merge in page.tsx session init, army power header chip in ShadowArmy.tsx, onExtractionChange stat re-derive in Dashboard.tsx

### Phase 11: Battle System Backend
**Goal**: Replace client-side Arena battle simulation with a real backend — battles use actual player stats, matchmaking, and server-authoritative outcomes
**Depends on**: Phase 10
**Plans**: 3 plans

Plans:
- [x] 11-01-PLAN.md — battleEngine.ts pure combat module (CPI, winProbability, outcome roll, perfMod, XP lookup) + TDD + arena_battles migration
- [x] 11-02-PLAN.md — POST /api/arena/battle (outcome computation, persistence, XP chain) + GET /api/arena/history
- [x] 11-03-PLAN.md — Arena.tsx wired to real battle API — reps input, result card, MOCK_HISTORY removal, live history fetch

### Phase 12: Manhwa Chapter Reward System
**Goal**: Unlock manhwa chapters as rewards for quest completion and boss kills. External-link chapter list, full-screen unlock ceremony, server-side chapters_unlocked counter on users table
**Depends on**: Phase 8
**Plans**: 3 plans

Plans:
- [ ] 12-01-PLAN.md — DB migration (chapters_unlocked column), Wave 0 vitest scaffolds, CHAPTER notification duration fix (6500ms)
- [ ] 12-02-PLAN.md — Server-side chapters_unlocked increment in POST /api/boss/complete + POST /api/quests/update, remove old rank-based chapter unlock from WorkoutEngine
- [ ] 12-03-PLAN.md — ChapterUnlockCeremony component, session init mapping in page.tsx, Dashboard chapter onClick handlers + ceremony state, BossEvent/WorkoutEngine callback wiring

### Phase 13: Ollama AI Integration
**Goal**: Wire local Ollama LLM to generate dynamic monster names, boss personalities, quest descriptions, and workout challenge variations — making each run feel unique
**Depends on**: Phase 12
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md — ollamaClient.ts shared utility (AbortController timeout, NEXT_PUBLIC_OLLAMA_MODEL config), sessionCache.ts module-level Map, 4 typed prompt functions (boss/quest/workout/arena), TypingText component
- [ ] 13-02-PLAN.md — Wire BossEvent (AI flavor blurb), QuestBoard (AI lore per quest), WorkoutEngine (AI tagline on select phase), Arena (AI opponent name + taunt via Promise.race)

### Phase 14: QA & Hardening
**Goal**: Full E2E test of signup→quest→levelup→rank trial flow, RLS audit, error boundaries across all systems built in phases 1–13
**Depends on**: Phase 13
**Plans**: TBD

Plans:
- [ ] 14-01: Error boundaries + loading state audit across all panels
- [ ] 14-02: RLS policy verification + full auth flow E2E test

### Phase 15: Exercise Guidance System
**Goal**: AI-powered per-exercise modal with step-by-step Ollama instructions (text-only default), mana-gated visual mode via Pollinations.ai, DB-cached guides shared across users
**Requirements**: EG-01, EG-02, EG-03, EG-04, EG-05, EG-06
**Depends on**: Phase 14
**Plans**: 3 plans

Plans:
- [ ] 15-01-PLAN.md — DB migration (exercise_guides, user_exercise_images, mana_spent), Wave 0 vitest scaffolds, GET /api/exercise-guide (aiCache→DB→Ollama), POST /api/exercise-guide/visual-unlock (mana gate, idempotency, Pollinations URL)
- [ ] 15-02-PLAN.md — ExerciseGuideModal component (5 states: loading skeleton, text-only, visual pending, visual unlocked, mana-insufficient shake), all Framer Motion animations
- [ ] 15-03-PLAN.md — WorkoutEngine integration: HelpCircle guide button per exercise card, ExerciseGuideModal render, USE_MANA dispatch on unlock
