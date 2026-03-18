# Phase 11: Battle System Backend - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace client-side Arena battle simulation with a real backend — battles use actual player stats, server-authoritative outcomes, persistent history, and live pvpRating. Multiplayer/real-time features are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Opponent model
- Opponents are synthetic AI — no real DB users needed, no multiplayer infra
- Opponent stats are rank-bracket scaled: server assigns opponent rank near player's rank (±1 rank), then generates opponent stats as a percentage of typical stats for that rank bracket
- Opponent names and ranks drawn from existing OPPONENT_NAMES / OPPONENT_RANKS arrays in Arena.tsx — server picks from them (Phase 13 Ollama can enhance later)
- Player-selected exercise type (PUSH-UPS / SQUATS / SIT-UPS / PLANKS) carries through to the server — player chooses before accepting, submitted with the battle request

### Battle outcome formula
- **Hybrid fitness-based battle:** win probability = f(stat ratio CPI + exercise-weighted stats + real-world performance modifier) + RNG uncertainty
- Exercise type determines stat weighting:
  - PUSH-UPS → STR dominant
  - SQUATS → AGI + STR
  - SIT-UPS → AGI + VIT
  - PLANKS → VIT + INT (endurance/focus)
  - Claude decides exact weight percentages for each mapping
- Player submits reps completed or time held via an input field in Arena.tsx after accepting opponent — submitted alongside POST /api/arena/battle. Performance modifier adjusts final win probability (better performance = higher win chance)
- RNG still applies — outcome is never guaranteed
- Draw condition: when player and opponent combat power are within ~10% of each other, a draw is possible. Draws give ~25% of win XP

### Battle persistence
- New `arena_battles` table in DB
- Core columns: `id`, `user_id`, `opponent_name`, `opponent_rank`, `exercise`, `outcome` (WIN/LOSS/DRAW), `xp_change`, `rating_change`, `reps_submitted`, `created_at`
- HISTORY tab in Arena.tsx gets wired to real DB data via GET /api/arena/history — MOCK_HISTORY replaced in Plan 11-02

### XP & rating changes
- Win = +XP (opponent-rank scaled), Loss = 0 XP (not punishing), Draw = ~25% of win XP
- XP by opponent rank: D=150, C=250, B=400, A=600, S=1000 — Claude sets exact values
- pvp_rating stored as new column on users table, updates per battle outcome
  - Win = +rating, Loss = -rating (symmetric), Draw = small change
  - Claude decides exact rating deltas (e.g. ELO-inspired or simpler fixed delta)
- XP grant goes through existing POST /api/xp/award route (established pattern)

### Claude's Discretion
- Exact CPI formula (how to combine stat values into one combat power number)
- Exact weight percentages per exercise-stat mapping
- Performance modifier scale (how reps/time maps to probability bonus — linear? capped?)
- Rating delta values per outcome
- How rank-bracket scaling works numerically (e.g. D-rank opponent stat percentage of D-rank typical)
- Whether pvp_wins / pvp_losses columns are added to users or computed from arena_battles at query time

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Arena component
- `src/components/arise/Arena.tsx` — Full Arena UI: MATCHMAKING / HISTORY / RANKINGS tabs, OPPONENT_NAMES, OPPONENT_RANKS, MOCK_HISTORY, MOCK_RANKINGS, pvpRating/pvpWins/pvpLosses from state.stats, handleAccept (to replace with real API call), selectedExercise state

### Server route patterns
- `src/app/api/boss/complete/route.ts` — Most recent battle-adjacent route; POST pattern, getUserId copy, supabaseServer writes
- `src/app/api/inventory/equip/route.ts` — Most recent write route — mirror Bearer auth + ownership check pattern
- `src/app/api/xp/award/route.ts` — XP award route (reuse for battle XP grants)
- `src/app/api/shadows/extract/route.ts` — Most recent extraction route (complex server-side computation pattern)

### State and stat merge patterns
- `src/lib/gameReducer.ts` — ADD_NOTIFICATION, SET_DATA, game state shape; pvpRating / pvpWins / pvpLosses fields
- `src/app/page.tsx` — Session init pattern, stat merge (base → +items → ×shadows)
- `src/lib/game/xpEngine.ts` — rankFromLevelAndXp, RANK_PROGRESSION (for rank bracket lookups)

### DB schema
- `supabase/migrations/20260311000000_init_schema.sql` — users table (add pvp_rating column), user_stats table
- New migration needed: arena_battles table + pvp_rating column on users

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Arena.tsx` — Full UI already built. Changes needed: replace handleAccept with real API call + reps/time input UI, replace MOCK_HISTORY with GET /api/arena/history data, replace MOCK_RANKINGS with real leaderboard or pvpRating data
- `ADD_NOTIFICATION` — Already wired; use for "BATTLE WON: +320 XP" / "BATTLE LOST" / "DRAW: +80 XP" notifications
- `POST /api/xp/award` — Reuse for XP grants on win/draw; don't duplicate XP logic
- `OPPONENT_NAMES` / `OPPONENT_RANKS` arrays in Arena.tsx — Server can import or duplicate these for opponent generation
- `rankFromLevelAndXp` from xpEngine — Use for rank bracket lookup when generating opponent stats

### Established Patterns
- Copy getUserId() locally into each new route (no shared helper — Phase 3 decision)
- supabaseServer (service-role) for all writes in API routes
- ADD_NOTIFICATION type QUEST (4s auto-dismiss) for outcome feedback
- IIFE pattern for derived stat computations in JSX
- XP always goes through /api/xp/award — never direct DB writes from components

### Integration Points
- Arena.tsx handleAccept → POST /api/arena/battle (new) — replace timeout + notification-only mock
- Arena.tsx HISTORY tab → GET /api/arena/history (new) — replace MOCK_HISTORY
- POST /api/arena/battle → POST /api/xp/award (chain call for XP grant on win/draw)
- users table → add pvp_rating column (new DB migration)
- New arena_battles table (new DB migration)

</code_context>

<specifics>
## Specific Ideas

- Battle outcome is directly influenced by real-world exercise performance — player inputs reps/time after accepting and before submitting. This is core to the design, not optional.
- "Hybrid fitness-based battle" — the formula must feel meaningful: doing more reps should visibly increase win probability feedback before submission

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-battle-system-backend*
*Context gathered: 2026-03-19*
