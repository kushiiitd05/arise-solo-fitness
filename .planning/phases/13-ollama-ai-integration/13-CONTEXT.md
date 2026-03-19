# Phase 13: Ollama AI Integration - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire local Ollama LLM (localhost:11434) to generate dynamic text across 4 surfaces: boss personality flavor blurbs, quest lore text, workout challenge taglines, and monster names. All generation is client-callable (Next.js API route or direct fetch), on-demand with session-level caching, with silent fallback to static content when Ollama is unavailable.

</domain>

<decisions>
## Implementation Decisions

### Generation scope — 4 surfaces

**1. Boss personalities (BossEvent.tsx)**
- BOSS_ROSTER static data (name, description, abilities) stays unchanged
- AI adds a **dynamic personality flavor blurb** per encounter — a short paragraph in "THE SYSTEM" voice that varies each time the player faces the boss
- Blurb is contextual: uses boss name, rank, and player's current rank as prompt context
- Does NOT replace abilities list or name — additive only

**2. Quest flavor lore text (QuestBoard.tsx)**
- questEngine.ts quest names stay static (LCG-seeded, already working)
- AI generates a **Solo Leveling-style lore paragraph** per quest — "THE SYSTEM whispers..." flavor text shown below the quest name
- Uses quest name, difficulty, and player job class as prompt context
- Generated once per session per quest (session cache — not per-open)

**3. Workout challenge tagline (WorkoutEngine.tsx)**
- WorkoutEngine gets a **dynamic challenge opening message** from THE SYSTEM at workout start
- Short (1-2 sentences) in THE SYSTEM voice — references player stats and job class
- Uses existing `workoutGenerator.ts` prompt pattern as inspiration, but generates tagline only (not full workout plan)

**4. Monster/opponent names (Arena.tsx)**
- Arena opponent names were flagged in Phase 11 as "Phase 13 Ollama can enhance later"
- AI generates contextual opponent names + a brief taunt line per battle
- Uses player's current rank as context (opponent is near player's rank)

### Streaming vs batch
- **Batch with typing animation** — Get full response from Ollama at once (`stream: false`), then animate it typing client-side
- No real streaming implementation needed — simpler, matches existing ollama.ts pattern
- Typing animation speed: Claude's discretion (suggest ~20-30ms per character)

### Ollama model
- **Configurable via ENV var or constant** — e.g. `OLLAMA_MODEL` or a `const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'llama3'`
- Default to `'llama3'` (existing codebase default)
- No hardcoded model string in individual prompt functions — all reference the config constant

### Fallback behavior
- **Silent fallback to static content** — if Ollama fails (connection error, timeout, parse error), show the existing static data without error UI
- **5-second timeout** — if Ollama doesn't respond within 5000ms, fall back to static
- Use `AbortController` + `setTimeout` for the timeout (or `Promise.race`)
- Matches the try/catch pattern already in `workoutGenerator.ts`

### Generation timing & caching
- **On-demand with session cache** — generate when user first opens the relevant UI surface
- Session cache stored in Zustand state (or a module-level Map — Claude's discretion on exact storage)
- Cache key: surface-specific (e.g. `boss:${bossId}`, `quest:${questId}`, `workout`, `arena:${sessionBattleId}`)
- On re-open within same session: show cached content (no re-generation)
- Next session = fresh generation
- Quest descriptions: once per session only (not per daily reset — daily reset handled at session boundary naturally)

### Claude's Discretion
- Exact typing animation speed and cursor style
- Whether session cache lives in Zustand slice or module-level Map
- Exact prompt wording for each surface (maintain "THE SYSTEM from Solo Leveling" voice from workoutGenerator.ts)
- AbortController vs Promise.race for timeout implementation
- Whether to show a subtle loading indicator (pulse/spinner) while Ollama generates, or just render static content immediately and swap when AI returns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Ollama integration
- `src/lib/ollama.ts` — Current basic Ollama fetch wrapper (model, stream: false, format: json)
- `src/lib/ai/workoutGenerator.ts` — Full example: prompt structure, THE SYSTEM voice, fallback pattern, user stat context

### Surfaces to wire
- `src/components/arise/BossEvent.tsx` — Boss encounter UI, renders boss.name + BOSS_ROSTER data; add AI flavor blurb here
- `src/components/arise/QuestBoard.tsx` — Quest list UI; add AI lore text below quest names
- `src/components/arise/WorkoutEngine.tsx` — Workout UI; add AI challenge tagline at workout start
- `src/components/arise/Arena.tsx` — Arena battle UI; AI opponent names and taunts

### Data sources for prompts
- `src/lib/data/bossRoster.ts` — BossTemplate interface and BOSS_ROSTER array (boss.name, boss.rank, boss.description used as prompt context)
- `src/lib/gameReducer.ts` — GameState shape (user.username, user.title, user.jobClass, stats) — prompt context for all surfaces

### Phase 11 note
- Phase 11 CONTEXT.md `.planning/phases/11-battle-system-backend/11-CONTEXT.md` — "Opponent names drawn from OPPONENT_NAMES array — Phase 13 Ollama can enhance later"

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/ollama.ts` — `generateWorkoutOllama(prompt)` basic wrapper — refactor into a shared `ollamaGenerate(prompt, options)` utility
- `src/lib/ai/workoutGenerator.ts` — `generateWorkoutOllama(state)` — shows the full prompt pattern with stat context and THE SYSTEM voice; reuse as template for other surfaces
- `BOSS_ROSTER` via `src/lib/data/bossRoster.ts` — `BossTemplate.description`, `BossTemplate.rank` are available for prompt context

### Established Patterns
- Try/catch with fallback (workoutGenerator.ts) — match this pattern in all new generation functions
- `stream: false` + JSON parse — existing Ollama response pattern; keep for batch responses
- Zustand + GameState (gameReducer.ts) — session state home; AI cache can live here or alongside
- All prompt functions use `user.username`, `user.title`, `user.jobClass`, `stats` as context — consistent pattern across all 4 surfaces

### Integration Points
- BossEvent: render AI flavor blurb after existing boss description section (additive)
- QuestBoard: render AI lore text below each quest name in the quest list items
- WorkoutEngine: render AI tagline in the workout opening/intro screen
- Arena: replace static OPPONENT_NAMES array lookup with AI-generated name + taunt (with array as fallback)

</code_context>

<specifics>
## Specific Ideas

- THE SYSTEM voice already established in `workoutGenerator.ts` — maintain this across all surfaces ("THE SYSTEM speaks", "THE SYSTEM whispers...")
- Typing animation: get full response, animate typing client-side — not real streaming
- Model configurable via `OLLAMA_MODEL` env var, defaulting to `'llama3'`
- Arena opponent names: Phase 11 explicitly flagged this as "Phase 13 Ollama can enhance later" — confirmed in scope

</specifics>

<deferred>
## Deferred Ideas

- **Exercise Guidance System (AI-powered)** — Step-by-step exercise instructions via Ollama, with optional external image generation API support. Two modes: text-only (fast, offline-friendly) and visual mode (step images). Guides cached per exercise and reused across users. New phase — add to roadmap backlog.
- Real streaming (server-sent events) — batch + client-side typing animation is sufficient for this phase; real streaming adds complexity without meaningful UX difference at this scale.
- DB-persisted AI content — caching at session level is sufficient; DB persistence would allow cross-session reuse but is its own complexity spike.

</deferred>

---

*Phase: 13-ollama-ai-integration*
*Context gathered: 2026-03-19*
