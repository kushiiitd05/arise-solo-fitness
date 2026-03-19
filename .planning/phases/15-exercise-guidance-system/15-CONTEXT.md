# Phase 15: Exercise Guidance System - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build an AI-powered exercise guide system: a per-exercise modal in WorkoutEngine, Ollama-generated step-by-step instructions (text-only by default), and a mana-gated visual mode using Pollinations.ai for exercise images. Guides are DB-cached (text shared across users, image per-user). Visual mode is built in Phase 15 — not deferred.

</domain>

<decisions>
## Implementation Decisions

### Guide entry point
- Triggered from WorkoutEngine only — a "?" or "Guide" button on each exercise card
- Not available from QuestBoard in this phase
- Always accessible — guide button visible at any time (mid-rep, between sets, any point)
- Activity state behind the modal (reps/timer) continues running while guide is open

### Guide UI
- Modal overlay — fits the existing Solo Leveling "SYSTEM window" aesthetic (see SystemWindow.tsx pattern)
- Opens in text-only mode by default
- Modal smoothly expands to reveal image with fade-in + scale animation when visual mode is unlocked
- Dismissible, full-screen or centered

### Visual mode — mana-gated via Pollinations.ai
- Guide opens in text-only mode by default
- A prominent "View Visual Guide (1 Mana)" button appears at the bottom of the modal
- **On click:**
  - Button transitions to loading state with subtle glow animation ("THE SYSTEM is generating visuals...")
  - 1 mana deducted via API
  - Image fetched from Pollinations.ai (`https://image.pollinations.ai/prompt/{exercise description}`)
  - Image cached to DB (per-user — see caching section)
  - Modal expands to reveal image with fade-in + scale animation
- **After unlock:**
  - Button replaced with "Visual Guide Unlocked" badge/indicator
  - Image persists permanently — no further mana cost for this exercise
  - Short system message displayed: "Visual guidance acquired"
- **If mana insufficient:**
  - Button shows disabled state with tooltip: "Insufficient Mana"
  - Subtle shake animation on click attempt
- **UX polish:** Neon/cyan glow pulse on hover on the unlock button. Optional sound/feedback on unlock.
- Note: Use 21.st.dev MCP (or UI component libraries) for visual reference when building the modal and unlock button

### Guide content structure
- AI outputs structured JSON (format: 'json' opt-in, consistent with Phase 13 pattern)
- JSON shape:
  ```json
  {
    "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "mistakes": ["HUNTER WARNING: ...", "HUNTER WARNING: ..."],
    "breathing": ["Inhale on ...", "Exhale on ..."],
    "tip": "A true hunter masters form before chasing reps."
  }
  ```
- 3-5 steps per exercise
- 2-3 common mistakes in "HUNTER WARNING:" voice
- Inline breathing cues per major step
- One closing THE SYSTEM motivational tip
- Generic per exercise — NOT personalised by job class or rank (maximises cache reuse)
- Prompt context: exercise name + exercise description only (no user stats)

### Caching scope
- **Text guide: shared globally** — one `exercise_guides` table row per exercise_id, no user_id
  - First user to open the guide triggers generation → Ollama → save to DB → all subsequent users get instant DB response
  - Permanent — no expiry, no TTL
  - Generation: first-request lazy (not pre-seeded at deploy)
- **Image: per-user** — separate `user_exercise_images` table with (user_id, exercise_id, image_url)
  - Created when user unlocks visual mode for an exercise (pays 1 mana)
  - Permanent — once unlocked, always available to that user
  - Mana deduction: via existing /api/stats/update or equivalent

### Claude's Discretion
- Exact Pollinations.ai prompt wording for each exercise (use exercise.name + exercise.description)
- Modal animation implementation details (Framer Motion variants)
- Exact RLS policies for the two new tables
- Loading skeleton / pulse animation while text guide generates on first visit
- Whether to show a subtle "generating..." indicator in the text guide body before AI returns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing AI infrastructure
- `src/lib/ai/ollamaClient.ts` — `ollamaGenerate(prompt, options)` shared utility; `format: 'json'` opt-in; 5s timeout via AbortController
- `src/lib/ai/sessionCache.ts` — `aiCache` module-level Map; key pattern: `'exercise:{exerciseId}'`
- `src/lib/ai/workoutGenerator.ts` — Full example: THE SYSTEM prompt voice, fallback pattern, JSON output

### Exercise data
- `src/lib/services/exerciseService.ts` — `EXERCISE_POOL` array with `{ id, name, description, type, muscle }` — these are the exercise_ids and prompt context for guides

### UI patterns to follow
- `src/components/system/SystemWindow.tsx` — Existing SYSTEM modal/window component — reuse for guide modal
- `src/components/arise/WorkoutEngine.tsx` — Integration point: add guide button per exercise card

### Phase 13 context (caching + Ollama patterns)
- `.planning/phases/13-ollama-ai-integration/13-CONTEXT.md` — Established decisions: aiCache pattern, silent fallback, THE SYSTEM voice, format: json opt-in

### Mana system
- `src/lib/gameReducer.ts` — GameState shape including mana field; check how mana is currently tracked and updated

### External services
- Pollinations.ai: `https://image.pollinations.ai/prompt/{description}` — Free, no API key, GET request returns JPEG image URL

No external specs — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ollamaGenerate()` in `src/lib/ai/ollamaClient.ts` — drop-in for guide generation with `format: 'json'`
- `aiCache` in `src/lib/ai/sessionCache.ts` — can supplement DB cache for in-session performance (check DB first, fall back to Ollama, cache in both)
- `SystemWindow.tsx` — existing SYSTEM-styled modal; reuse as guide modal container
- `EXERCISE_POOL` in `exerciseService.ts` — exercise ids and descriptions as prompt input

### Established Patterns
- Phase 13 prompt pattern: THE SYSTEM voice, JSON output, try/catch fallback, AbortController timeout
- `format: 'json'` is opt-in — arenaPrompt.ts uses it; guide prompt should too (structured output needed)
- Mana deduction via API route (pattern established in prior phases for stat updates)

### Integration Points
- WorkoutEngine: add guide button per exercise card → triggers modal
- New API route: `GET /api/exercise-guide?exerciseId={id}` — checks `exercise_guides` table, generates if missing
- New API route or existing stat route: deduct 1 mana on visual mode unlock
- New DB tables: `exercise_guides` (exercise_id, guide_json, created_at) + `user_exercise_images` (user_id, exercise_id, image_url, created_at)
- Supabase migration required for both tables + RLS

</code_context>

<specifics>
## Specific Ideas

- "View Visual Guide (1 Mana)" button with neon/cyan glow pulse on hover
- Loading state copy: "THE SYSTEM is generating visuals..."
- Post-unlock copy: "Visual guidance acquired" as a system message
- Shake animation on mana-insufficient click attempt
- THE SYSTEM closing tip should feel like boss flavor text voice (e.g., "A true hunter masters form before chasing reps.")
- Use 21.st.dev MCP or UI component web references for modal + unlock button visual design inspiration

</specifics>

<deferred>
## Deferred Ideas

- Other image generation providers (Dall-E, Stable Diffusion) — Pollinations.ai is sufficient for v1; swap later if quality is insufficient
- Pre-seeded guides at deploy time — lazy generation on first user request is simpler
- Guide personalisation by job class/rank — would fragment the shared cache; defer unless user feedback demands it
- Real streaming for guide generation — batch + client animation is sufficient (established in Phase 13)

</deferred>

---

*Phase: 15-exercise-guidance-system*
*Context gathered: 2026-03-19*
