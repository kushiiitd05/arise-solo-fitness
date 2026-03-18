---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 11-02-PLAN.md
last_updated: "2026-03-18T20:45:49.290Z"
progress:
  total_phases: 14
  completed_phases: 9
  total_plans: 28
  completed_plans: 25
---

# GSD State

## Status
in-progress

## Current Phase
11

## Current Plan
11-02 complete

## Completed Plans
- 01-01: API route safety fixes — maybeSingle and Bearer-only auth (2026-03-15)
- 01-02: Quest completion level-up persistence (2026-03-15)
- 01-03: UserService security (server route writes), starter items on awakening, intensity rank fix (2026-03-15)
- 02-01: Shadow roster expanded to 17 UUID-keyed entries + STARTER_ITEMS column names fixed (2026-03-15)
- 02-02: Leaderboard.tsx bugs fixed (import, cleanup, CSS tokens) + Dashboard WORLD_RANKINGS panel wired (2026-03-15)
- 03-01: GET /api/inventory and GET /api/shadows server routes using supabaseServer with joined item/shadow data (2026-03-15)
- 04-01: Arena rank gate (E→D at level 10), unlock flash + ADD_NOTIFICATION, 4-tab mobile bottom nav (2026-03-16)
- 04-02: Achievement Hall overlay from STATUS panel, GUILD desktop tab, GuildHall sub.unsubscribe() fix (2026-03-16)
- 05-01: Notification dismiss fixed — filter in reducer, per-type timeouts, render cap, progress bar sync (2026-03-16)
- 05-02: Quest completion notifications wired in WorkoutEngine, duplicate rank-up dispatch removed from Dashboard (2026-03-16)
- 06-01: vitest installed, nextRankInfo added to xpEngine, reducer ADD_XP fixed to dual-gate formula, total_xp_earned unconditional (2026-03-17)
- 06-02: BOSS_RANK_XP lookup + awardRaidReward via fetch /api/xp/award; BossEvent victory shows dynamic rank-scaled XP (2026-03-17)
- 06-03: Compact rank HUD in Dashboard header + full RANK_PROGRESSION dual-gate block in Profile STATUS panel (2026-03-17)
- 07-01: trial_last_failed_at DB migration + UserStats type extension + mapDbUserToState mapping + Wave 0 test scaffolds (2026-03-17)
- 07-02: RankTrialEngine full-screen trial UI + Profile INITIATE TRIAL button (3 states) + Dashboard showTrial wiring (2026-03-17)
- 07-03: POST /api/rank/advance (dual-gate, idempotent) + RankUpCeremony animated ceremony + hunter_rank bypass removed from xp/award (2026-03-17)
- 08-01: questEngine.ts — 7-type QUEST_POOL, LCG date-seeded PRNG, selectQuestTypes, computeHistoryAdjustment, generateDynamicDailyQuests + DailyQuestItem difficulty field (2026-03-17)
- 08-02: POST /api/quests/daily — 3-day history + yesterday types queries, generateDynamicDailyQuests replaces generateDailyQuestTargets (2026-03-17)
- 08-03: QuestBoard difficulty badge (absolute top-right, hex colors, aria-label) + empty state block (2026-03-17)
- 09-01: GET /api/inventory server route with items(*) join + inventoryService fetch helper + Inventory.tsx wired (2026-03-17)
- 09-02: POST /api/inventory/equip — service-role route with ownership check and items(*) join (2026-03-17)
- 09-03: Inventory equip system wired — server route calls, stat notifications, live footer, init bonus merge, toggleEquipItem removed (2026-03-17)
- 10-01: DB migration extraction_tokens + 17 shadow seed, buildWeightedPool, POST /api/boss/complete, POST /api/shadows/extract, ShadowArmy wired to server route (2026-03-18)
- 10-02: Shadow stat multipliers wired into session init (base→+items→×shadows), army power header chip in SHADOWS panel, full stat re-derive in onExtractionChange (2026-03-18)
- 11-01: battleEngine pure combat module (computeCPI/computeWinProbability/rollOutcome/computePerfMod/XP_BY_RANK/generateOpponentStats) + arena_battles DB migration (2026-03-18)
- 11-02: POST /api/arena/battle (battle computation, ELO rating, persistence, XP chain) + GET /api/arena/history (last 20 battles) (2026-03-18)

## Decisions
- Fix root causes in sequence (phases 1-5), no new features until Phase 1 is complete
- Use server-side API routes for all write operations (security principle)
- Keep existing UI aesthetic — it's already strong, only data wiring needed
- Shadow email pattern (username@shadow-system.com) is intentional — keep it
- Declare level-up state variables before if(user) block for response scope
- Reuse rankFromLevelAndXp from xpEngine rather than duplicating formula
- Use .maybeSingle() not .single() for Supabase queries where row may be absent
- getUserId() helpers must only read Authorization Bearer header, never URL query params
- createUser must use fetch(/api/user) for writes — never direct anon-key inserts from client services
- Starter item grant failure is non-fatal — wrapped in try/catch, does not block user creation success
- Use stable a1b2c3d4-00XX UUID format for SHADOWS_DB — TypeScript and SQL seed must share identical UUID constants
- STARTER_ITEMS column names must match Supabase migration schema exactly (item_type, effects, emoji — not type, stat_bonus, image_url)
- Use sub.unsubscribe() not supabase.removeChannel() — the channel object owns cleanup in Supabase v2
- Replace shadcn CSS tokens with ARISE hex palette — project uses explicit hex values, not CSS variables
- [Phase 03-gameplay-loop-hardening]: Copy getUserId() locally into each route — self-contained files, no shared helper coupling
- [Phase 03-gameplay-loop-hardening]: Use supabaseServer directly in routes, not service-layer functions (which use anon client)
- [Phase 03-gameplay-loop-hardening]: Use xp_reward field name (DailyQuestItem interface) not xp in quest update route
- [Phase 03-gameplay-loop-hardening]: wasAllCompleted guard prevents double XP grant on repeated POST /api/quests/update calls
- [Phase 04-feature-completion]: Arena unlocks at Rank D (level >= 10) via rankAtLevel() — DungeonGate prop mismatch fixed, gold reward is notification text only
- [Phase 04-feature-completion]: Remove PVP/DUNGEON achievement entries from ACHIEVEMENTS array when narrowing Category type — TypeScript requires data and type to be consistent
- [Phase 04-feature-completion]: completedAchievementIds computed in Dashboard from game state, not passed from page level — keeps derivation close to its source data
- [Phase 05-notification-system]: DISMISS_NOTIFICATION must filter (remove) not map — AnimatePresence only fires exit when item is removed from array
- [Phase 05-notification-system]: isUrgent keyed on title keywords only (URGENT/PENALTY) — type=QUEST should auto-dismiss at 4s
- [Phase 05-notification-system]: Per-type DISMISS_DURATIONS lookup: QUEST=4s, LEVELUP=7s, others=5s; duration=null means no auto-dismiss
- [Phase 05-notification-system]: wasAllComplete snapshot before quest loop guards all-complete notification from re-firing on already-complete quests
- [Phase 05-notification-system]: Dashboard dispatch removed not banner JSX — COMBAT AUTHORIZATION GRANTED still renders as arena flash banner, only ADD_NOTIFICATION dispatch removed to prevent duplicate rank-up notification
- [Phase 06]: vitest 4.1.0 chosen — compatible with Next.js 16.1.6, no jest-next transform needed
- [Phase 06]: rankAtLevel kept exported for Dashboard.tsx backward compat — only ADD_XP case migrated to rankFromLevelAndXp
- [Phase 06]: total_xp_earned made unconditional in /api/xp/award; available_stat_points remains leveledUp-gated
- [Phase 06]: BOSS_RANK_XP includes MONARCH key (=10000) to prevent silent 400 from /api/xp/award
- [Phase 06]: awardRaidReward switched from awardXp (anon client) to fetch POST /api/xp/award (server route, correct formula)
- [Phase 06]: vi.mock supabase required in bossService.test.ts to prevent import-time crash without env vars
- [Phase 06]: IIFE pattern in JSX for rank UI derivation keeps computations inline without polluting component scope
- [Phase 06]: Gold color (#D97706/#F59E0B) reserved for rank bars to visually differentiate from cyan level XP bar in Dashboard
- [Phase 07-full-rank-trial-system]: trial_last_failed_at stored as TIMESTAMPTZ nullable — null=no failure, timestamp=cooldown active; UserStats.trialLastFailedAt optional to avoid breaking existing code
- [Phase 07-full-rank-trial-system]: Wave 0 route stubs use expect(true).toBe(true) placeholders — contract-first approach; plan 03 replaces them with real assertions
- [Phase 07-full-rank-trial-system]: RankTrialEngine uses useMemo for trialTargets — level/jobClass rarely change, avoids recompute on every render
- [Phase 07-full-rank-trial-system]: Dashboard showRankUp + rankUpResult state vars added in Plan 02 so Plan 03 only needs to add RankUpCeremony import and render, no re-wiring
- [Phase 07-full-rank-trial-system]: XP bonus fetch in /api/rank/advance is non-fatal — rank persists even if /api/xp/award is unreachable
- [Phase 07-full-rank-trial-system]: hunter_rank exclusively written by /api/rank/advance — xp/award, quests/update must not touch this column
- [Phase 07-full-rank-trial-system]: RankUpCeremony onDismiss does not dispatch SET_USER — rank already set in RankTrialEngine.handleTrialPass before ceremony
- [Phase 08-dynamic-daily-quest-generation]: LCG PRNG (dateToSeed + makeRng) chosen for determinism without external deps
- [Phase 08-dynamic-daily-quest-generation]: Anti-repeat uses filtered pool first, then fills from excluded if needed (graceful fallback when <4 unique types survive)
- [Phase 08-dynamic-daily-quest-generation]: history rate 0→1 maps linearly to multiplier 0.8→1.2; EASY below -0.1 adjustment, HARD above +0.1
- [Phase 08-dynamic-daily-quest-generation]: difficulty field stored in JSONB transparently — no DB schema change needed
- [Phase 08-dynamic-daily-quest-generation]: Badge renders only when quest.difficulty is defined — backward compatible with existing rows lacking field
- [Phase 09]: getUserId() defined locally per Phase 3 copy-don't-import pattern — no shared helper coupling
- [Phase 09]: POST /api/inventory/equip uses supabaseServer (service-role) with .eq(user_id) ownership check and items(*) join for immediate effects access
- [Phase 09-01]: UserItem.items.effects typed as Record<string, number> | null — matches DB column exactly, no aliasing needed
- [Phase 09-03]: onEquipChange callback pattern — Inventory notifies Dashboard to re-fetch inventory and re-merge bonuses; Inventory doesn't hold state.stats
- [Phase 09-03]: computeItemBonuses defined locally in page.tsx — copy-don't-import principle; no shared utility coupling
- [Phase 09-03]: IIFE for footer stat derivation keeps derived data co-located with JSX (same pattern as Dashboard rank HUD)
- [Phase 09-03]: toggleEquipItem removed — all equip writes go through POST /api/inventory/equip (service-role); zero direct DB writes from client
- [Phase 10]: extractionTokens stored as Dashboard local useState — avoids touching GameState for UI-only concern
- [Phase 10]: buildWeightedPool flat-array-repeat pattern — each shadow repeated N times, random index produces correct weighted distribution
- [Phase 10]: Token always consumed on extraction attempt regardless of success — locked decision from CONTEXT.md
- [Phase 10-02]: onExtractionChange starts from state.user.stats (raw base) to prevent shadow multiplier double-application
- [Phase 10-02]: armyPower computed via IIFE in JSX — consistent with rank HUD and footer stat derivation patterns
- [Phase 10-02]: SET_DATA dispatched with both stats and shadows atomically after extraction to prevent partial-state renders
- [Phase 11-01]: rollOutcome uses single Math.random() call — draw-zone checked first (|statRatio - 0.5| < 0.05 AND roll < 0.25), then WIN/LOSS
- [Phase 11-01]: arena_battles uses TEXT + CHECK constraint for outcome (not a new DB enum) to avoid altering init_schema
- [Phase 11-01]: generateOpponentStats offset pool [−1,0,1] all clamped — D player gets biased pool [D,D,C], S gets [A,S,S]
- [Phase 11]: opponentName from client body flows into arena_battles.opponent_name — client showed this name during matchmaking so history must match
- [Phase 11]: DRAW rating formula inlined — ELO draw uses actual=0.5, calculateRatingChange only handles win/loss booleans
- [Phase 11]: History route returns raw snake_case DB column names — camelCase mapping done in Arena.tsx (Plan 11-03)

## Blockers
- None

## Notes
Audit completed 2026-03-15. Full bug list in SYSTEM_HEALTH_REPORT section of session.
5 phases defined. Start with Phase 1 (Foundation Fixes).

## Last Session
Stopped at: Completed 11-02-PLAN.md
Date: 2026-03-18T20:45:00Z
