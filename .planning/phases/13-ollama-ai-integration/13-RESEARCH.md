# Phase 13: Ollama AI Integration - Research

**Researched:** 2026-03-19
**Domain:** Local LLM integration (Ollama), TypeScript async patterns, React state management, client-side animation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **4 generation surfaces:** Boss personality flavor blurb (BossEvent), quest lore text (QuestBoard), workout challenge tagline (WorkoutEngine), arena opponent name + taunt (Arena)
- **Batch with typing animation:** Get full response from Ollama with `stream: false`, animate typing client-side — no real streaming
- **Model config:** Configurable via `NEXT_PUBLIC_OLLAMA_MODEL` env var, default `'llama3'`. No hardcoded model strings in individual prompt functions.
- **Silent fallback:** On any Ollama failure (connection, timeout, parse error), show existing static content — no error UI
- **5-second timeout:** AbortController + setTimeout (or Promise.race) — matches pattern from workoutGenerator.ts
- **On-demand with session cache:** Generate on first open of each surface; cache keyed by surface (`boss:${bossId}`, `quest:${questId}`, `workout`, `arena:${sessionBattleId}`); no re-generation within same session
- **Additive only:** AI content never replaces existing static data — it appends flavor text alongside existing names, abilities, quest names, etc.
- **THE SYSTEM voice:** Maintain "THE SYSTEM from Solo Leveling" voice established in workoutGenerator.ts across all surfaces
- **Boss context:** uses boss.name, boss.rank, player's current rank
- **Quest context:** uses quest name, difficulty, player jobClass
- **Workout context:** uses player stats and jobClass
- **Arena context:** uses player's current rank

### Claude's Discretion
- Exact typing animation speed and cursor style (suggested ~20-30ms per character)
- Whether session cache lives in Zustand slice or module-level Map
- Exact prompt wording for each surface
- AbortController vs Promise.race for timeout implementation
- Whether to show a subtle loading indicator (pulse/spinner) while Ollama generates, or render static content immediately and swap when AI returns

### Deferred Ideas (OUT OF SCOPE)
- Exercise Guidance System (AI-powered) — separate future phase
- Real streaming (server-sent events) — explicitly deferred
- DB-persisted AI content — session-level only
</user_constraints>

---

## Summary

Phase 13 wires the existing local Ollama instance (already running at `localhost:11434`) into four UI surfaces to generate dynamic flavor text. The core infrastructure already exists: `src/lib/ollama.ts` has a basic fetch wrapper and `src/lib/ai/workoutGenerator.ts` demonstrates the full pattern — prompt construction, `stream: false`, JSON response parsing, try/catch fallback. Phase 13 extends this pattern into a **shared, configurable utility**, adds **session-level caching**, and **typing animation** for the four surfaces.

The two-plan structure is well-suited: Plan 13-01 builds the shared Ollama utility with prompt templates, timeout handling, and the session cache mechanism. Plan 13-02 wires the four components (BossEvent, QuestBoard, WorkoutEngine, Arena) to call those prompt functions and render the AI text with the typing animation.

The key architectural decision for the planner to make (delegated to Claude's discretion) is **module-level Map vs Zustand** for session cache storage. Based on codebase patterns — all four components already pull state from GameState via props — a module-level Map is simpler and avoids Zustand slice surgery. However, if the planner wants cache to survive component unmount/remount within a session, a module-level Map works perfectly since it lives at module scope across renders.

**Primary recommendation:** Build a single `src/lib/ai/ollamaClient.ts` utility that exports `ollamaGenerate(prompt, options)` with timeout and model config, then four named generator functions (`generateBossBlurb`, `generateQuestLore`, `generateWorkoutTagline`, `generateArenaOpponent`). Cache with a module-level Map. Wire components in Plan 13-02 with a `useEffect` fetch-on-mount + local state pattern.

---

## Standard Stack

### Core (already in codebase)
| Library / API | Version | Purpose | Why Standard |
|---|---|---|---|
| Ollama REST API | `localhost:11434` | Local LLM inference | Already integrated; `src/lib/ollama.ts` uses it |
| `fetch` (native) | Browser/Node native | HTTP calls to Ollama | Used throughout project — no extra dep needed |
| `AbortController` | Browser native | Request timeout | Standard pattern for fetch timeout in this codebase |
| React `useState` + `useEffect` | Already installed | Trigger generation, hold AI text | Consistent with all existing components |
| Framer Motion | Already installed | Typing animation (if using motion.div) | Already used everywhere for animations |

### No New Dependencies Required
All tooling for this phase already exists in the project. No `npm install` step needed.

---

## Architecture Patterns

### Recommended Project Structure (new files only)
```
src/lib/ai/
├── ollamaClient.ts       # NEW: shared utility — ollamaGenerate(), OLLAMA_MODEL config, timeout
├── prompts/
│   ├── bossPrompt.ts     # NEW: generateBossBlurb(bossName, bossRank, playerRank) → string
│   ├── questPrompt.ts    # NEW: generateQuestLore(questName, difficulty, jobClass) → string
│   ├── workoutPrompt.ts  # NEW: generateWorkoutTagline(stats, jobClass) → string
│   └── arenaPrompt.ts    # NEW: generateArenaOpponent(playerRank) → {name, taunt}
├── sessionCache.ts       # NEW: module-level Map cache (get/set/has by key)
└── workoutGenerator.ts   # EXISTING — keep unchanged, ollamaClient refactors the shared fetch
```

Alternatively (simpler, no prompts/ subdirectory): all generator functions in a single `ollamaGenerators.ts` alongside the client. Either is valid — planner's call.

### Pattern 1: Shared ollamaClient with timeout

The existing `ollama.ts` and `workoutGenerator.ts` have duplicated fetch calls both hardcoding `'llama3'` and lacking timeout. The refactor consolidates into one place.

```typescript
// src/lib/ai/ollamaClient.ts
const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'llama3';
const OLLAMA_TIMEOUT_MS = 5000;
const OLLAMA_BASE_URL = 'http://localhost:11434/api/generate';

export async function ollamaGenerate(prompt: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(OLLAMA_BASE_URL, {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        // NOTE: do NOT use format: 'json' for plain text surfaces
        // Only use format: 'json' when response must be parsed as JSON object
      }),
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();
    return data.response as string;
  } catch {
    clearTimeout(timeoutId);
    return null; // AbortError or network error — silent fallback
  }
}
```

**Critical detail:** The existing `workoutGenerator.ts` uses `format: 'json'` because it expects a JSON object back. For the four new surfaces generating plain text blurbs, omit `format: 'json'`. Ollama's `data.response` is always a string — for plain text prompts, use it directly. For JSON output (not needed for Phase 13), JSON.parse it.

### Pattern 2: Module-level session cache

```typescript
// src/lib/ai/sessionCache.ts
const cache = new Map<string, string>();

export const aiCache = {
  get: (key: string) => cache.get(key) ?? null,
  set: (key: string, value: string) => cache.set(key, value),
  has: (key: string) => cache.has(key),
};
```

Cache keys by surface:
- Boss: `boss:${boss.id}` (using boss.id from WorldBoss, not boss.name)
- Quest: `quest:${quest.id}`
- Workout: `workout` (single key — one tagline per session; regenerated each time WorkoutEngine mounts fresh)
- Arena: `arena:${sessionBattleKey}` where key is generated at match-found time (e.g. timestamp or opponent name + timestamp)

### Pattern 3: Component integration (useEffect fetch-on-mount)

```typescript
// Pattern for any AI-enhanced component
const [aiBlurb, setAiBlurb] = useState<string | null>(null);

useEffect(() => {
  const cacheKey = `boss:${boss.id}`;
  if (aiCache.has(cacheKey)) {
    setAiBlurb(aiCache.get(cacheKey));
    return;
  }
  generateBossBlurb(boss.name, boss.rank, state.user.rank).then((blurb) => {
    if (blurb) {
      aiCache.set(cacheKey, blurb);
      setAiBlurb(blurb);
    }
    // if null: silent — aiBlurb stays null, nothing renders
  });
}, [boss.id]); // dep is stable boss ID, not whole boss object
```

Render: `{aiBlurb && <TypingText text={aiBlurb} />}`

### Pattern 4: Typing animation component

```typescript
// src/components/system/TypingText.tsx (NEW — shared across all 4 surfaces)
import { useState, useEffect } from 'react';

interface TypingTextProps {
  text: string;
  speedMs?: number; // default 25ms per char
  className?: string;
}

export function TypingText({ text, speedMs = 25, className }: TypingTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speedMs);
    return () => clearInterval(interval);
  }, [text, speedMs]);

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="animate-pulse">▌</span>}
    </span>
  );
}
```

**Why a shared component:** All 4 surfaces need identical typing behavior. A single `TypingText` component is DRY and consistent. It handles the cursor blink via Tailwind `animate-pulse` (already available in project). speedMs is configurable per surface.

### Pattern 5: THE SYSTEM voice — prompt structure

From `workoutGenerator.ts`, the established pattern:
```
You are THE SYSTEM from Solo Leveling. [task].
[Context about player rank, job class, stats]
[Specific output format instruction — keep brief, 1-2 sentences for taglines]
Do NOT include any JSON wrapper. Output only the flavor text.
```

For plain text surfaces, end the prompt with explicit instruction to output only the text (no JSON, no explanation), otherwise llama3 may wrap output.

### Anti-Patterns to Avoid
- **Hardcoding `'llama3'`** in individual prompt functions — centralise in `OLLAMA_MODEL` constant
- **Using `format: 'json'` for plain text prompts** — causes Ollama to force JSON wrapping on plain text, requiring JSON.parse on what should be a string
- **Replacing static data** — AI is additive only; quest names, boss names, abilities stay unchanged
- **Re-generating on every render** — always check cache before calling Ollama
- **Blocking UI on generation** — fire-and-forget; render static content immediately and swap in AI text when it arrives

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Typing animation | Custom character-by-character state machine per component | Shared `TypingText` component | DRY — 4 surfaces need identical behavior |
| Timeout | Manual sleep/poll | `AbortController` + `setTimeout` | Browser-native, clean, cancellable |
| Model config | Per-function env var reads | Single `OLLAMA_MODEL` constant in `ollamaClient.ts` | Single source of truth |
| Session cache | Redux/DB/localStorage | Module-level `Map` | Zero deps, zero persistence, resets naturally each page load |

---

## Common Pitfalls

### Pitfall 1: `format: 'json'` on plain text prompts
**What goes wrong:** Ollama forces JSON output, `data.response` is `'{"text": "..."}'` instead of the plain string.
**Why it happens:** The existing `workoutGenerator.ts` uses `format: 'json'` because it needs a structured object. Copying that pattern blindly for plain text surfaces breaks string output.
**How to avoid:** Only use `format: 'json'` in `ollamaGenerate` when the caller needs JSON. For Phase 13's 4 surfaces (all plain text blurbs), omit it entirely.
**Warning signs:** AI output starts with `{` or returns parseable JSON structure instead of readable text.

### Pitfall 2: AbortController timeout not cleared on success
**What goes wrong:** `clearTimeout` is omitted from the success path; after a slow-but-successful response, the timeout fires and may cause a React state update on an unmounted component.
**How to avoid:** Always `clearTimeout(timeoutId)` in both success and catch branches (see Pattern 1 above).

### Pitfall 3: Arena opponent name sent to battle API before AI resolves
**What goes wrong:** Arena currently generates opponent name synchronously from `OPPONENT_NAMES` array during the 2500ms search simulation. If AI generation takes > 2500ms (possible under load), the opponent card shows a stale/null name when the user sees "match found."
**How to avoid:** Generate AI name during the 2500ms search timeout (fire AI request at search start, race it against the timer). If AI resolves before 2500ms, use it. If not, fall back to `OPPONENT_NAMES` array. The final `opponent.name` set into state is always a string before `setMatchStatus("found")` is called.
**Implementation:** Start Ollama call when `matchStatus` becomes `"searching"`. Use `Promise.race` between the Ollama call and a 2500ms delay to get the best of both.

### Pitfall 4: Zustand slice adds unnecessary complexity
**What goes wrong:** Adding `aiCache` to GameState via a new reducer action pollutes global state with transient data that has no cross-component relevance.
**How to avoid:** Use a module-level Map (`sessionCache.ts`). It behaves identically within a session and requires no reducer changes. Module scope persists across component remounts but resets on page reload — exactly the session semantics required.

### Pitfall 5: Quest lore generation for every quest at once
**What goes wrong:** QuestBoard fetches all daily quests on mount (typically 3-4). Generating lore for all simultaneously fires 3-4 concurrent Ollama requests, which can cause llama3 to queue and exceed the 5s timeout.
**How to avoid:** Generate lazily per quest as they render, not upfront for all quests. Use individual `useEffect` in quest item sub-component or stagger generation. Check cache first — only generate for cache misses.

### Pitfall 6: WorkoutEngine tagline timing
**What goes wrong:** WorkoutEngine mounts and immediately starts generating exercise missions (`generateAIOmission` on line 56). If the new Ollama tagline call fires simultaneously, two Ollama requests are in-flight at once — one may block the other.
**How to avoid:** The tagline is displayed at the "select" phase (before the player starts working out). Fire the tagline generation after `generateAIOmission` completes (chain the effect or add a small sequential dependency). Alternatively, fire both simultaneously since they use different prompts — llama3 with `stream: false` typically queues requests safely.

---

## Code Examples

### Existing pattern to replicate (workoutGenerator.ts fallback)
```typescript
// Source: src/lib/ai/workoutGenerator.ts lines 38-62
try {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    body: JSON.stringify({
      model: "llama3",
      prompt: prompt,
      stream: false,
      format: "json"  // <-- OMIT this for plain text surfaces
    }),
  });
  const data = await response.json();
  return JSON.parse(data.response); // <-- for plain text: return data.response directly
} catch (err) {
  console.error("AI Generation failed, falling back to System defaults.");
  return null; // silent fallback
}
```

### Boss prompt template
```typescript
// generateBossBlurb(bossName, bossRank, playerRank) → string | null
const prompt = `You are THE SYSTEM from Solo Leveling. Write a 2-sentence personality introduction for the boss "${bossName}" (${bossRank}-Rank) encountering Hunter of rank ${playerRank}. THE SYSTEM voice is cold, omniscient, dramatic. Output only the flavor text — no JSON, no labels.`;
```

### Quest lore prompt template
```typescript
// generateQuestLore(questName, difficulty, jobClass) → string | null
const prompt = `You are THE SYSTEM from Solo Leveling. Write a 1-2 sentence lore description for a ${difficulty} daily mission titled "${questName}" issued to a ${jobClass} Hunter. THE SYSTEM whispers in a cold, omniscient voice. Output only the lore text — no JSON, no labels.`;
```

### Workout tagline prompt template
```typescript
// generateWorkoutTagline(stats, jobClass) → string | null
const prompt = `You are THE SYSTEM from Solo Leveling. Write a 1-sentence opening challenge declaration for a ${jobClass} Hunter beginning their daily training. Reference their dedication, not specific stats. Cold, commanding THE SYSTEM voice. Output only the sentence — no JSON, no labels.`;
```

### Arena opponent prompt template
```typescript
// generateArenaOpponent(playerRank) → { name: string; taunt: string } | null
// NOTE: This one does use JSON format since it returns a structured object
const prompt = `You are THE SYSTEM from Solo Leveling. Generate an arena opponent for a Rank-${playerRank} Hunter. Output ONLY valid JSON: {"name": "ALL CAPS DRAMATIC NAME", "taunt": "short threatening 1-sentence taunt in second person"}`;
// Use format: 'json' for this call only
```

### TypingText usage example
```tsx
// In BossEvent.tsx — additive, below abilities section
{aiBlurb && (
  <div className="mt-3 text-[10px] font-mono text-red-300/80 italic border-t border-red-900/20 pt-3">
    <TypingText text={aiBlurb} speedMs={22} />
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Hardcoded `'llama3'` per file | `NEXT_PUBLIC_OLLAMA_MODEL` env-based constant | Phase 13 | Model swap requires only env var change |
| No timeout on Ollama fetch | AbortController + 5000ms | Phase 13 | Prevents indefinite hang on Ollama unavailability |
| No session cache | Module-level Map | Phase 13 | Prevents re-generation spam on panel close/reopen |
| Raw text appears instantly | Typing animation via TypingText | Phase 13 | Matches Solo Leveling "THE SYSTEM" UX aesthetic |

---

## Open Questions

1. **Should `src/lib/ollama.ts` be refactored or left unchanged?**
   - What we know: It exports `generateWorkoutOllama(prompt)` used by... (need to verify callsites)
   - What's unclear: Whether anything imports from `src/lib/ollama.ts` directly besides `workoutGenerator.ts`
   - Recommendation: New `ollamaClient.ts` is additive — do not delete `ollama.ts` in Phase 13 to avoid breaking existing callers. `workoutGenerator.ts` can stay as-is.

2. **Arena: where does `sessionBattleId` come from for cache key?**
   - What we know: A match is assigned when `matchStatus` transitions to `"found"`. The opponent object has `{ name, rank, rating }` but no stable UUID.
   - Recommendation: Use `Date.now()` at match-found time as the session battle ID. Store it in Arena local state alongside opponent. Cache key: `` `arena:${battleStartedAt}` ``.

3. **QuestBoard: should AI lore generate for completed quests?**
   - What we know: Completed quests render at 60% opacity. Lore text may be less useful there.
   - Recommendation: Only generate lore for `!quest.completed` quests. Skip generation entirely for completed items (saves Ollama calls).

---

## Validation Architecture

`workflow.nyquist_validation` is not present in config.json — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 (installed Phase 06) |
| Config file | `vitest.config.ts` (check root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

No formal requirement IDs were provided for Phase 13. The testable behaviors are:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `ollamaGenerate` returns null on AbortError (timeout) | unit | `npx vitest run src/lib/ai/ollamaClient.test.ts` | No — Wave 0 |
| `ollamaGenerate` returns null on network failure | unit | same | No — Wave 0 |
| `aiCache.get` returns null for unknown key | unit | `npx vitest run src/lib/ai/sessionCache.test.ts` | No — Wave 0 |
| `aiCache` round-trip set/get returns stored value | unit | same | No — Wave 0 |
| `generateBossBlurb` falls back to null without throwing | unit (mock Ollama) | `npx vitest run src/lib/ai/prompts/bossPrompt.test.ts` | No — Wave 0 |
| `TypingText` renders characters incrementally | unit (React Testing Library) | manual inspection acceptable | No — optional |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/ai/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ai/ollamaClient.test.ts` — covers timeout fallback and network failure
- [ ] `src/lib/ai/sessionCache.test.ts` — covers cache get/set/has behavior
- [ ] `src/lib/ai/prompts/bossPrompt.test.ts` — covers null fallback with mocked fetch

---

## Sources

### Primary (HIGH confidence)
- `src/lib/ollama.ts` — existing fetch wrapper, confirmed pattern
- `src/lib/ai/workoutGenerator.ts` — confirmed: prompt structure, `stream: false`, `format: 'json'`, try/catch fallback
- `src/components/arise/BossEvent.tsx` — confirmed: integration point, existing state/effect pattern, BOSS_ROSTER lookup
- `src/components/arise/QuestBoard.tsx` — confirmed: quest rendering structure, where lore text slots in
- `src/components/arise/Arena.tsx` — confirmed: OPPONENT_NAMES array (lines 19), matchStatus flow, opponent state shape
- `src/components/arise/WorkoutEngine.tsx` — confirmed: existing `generateAIOmission` call at mount, phase state machine
- `src/lib/data/bossRoster.ts` — confirmed: BossTemplate interface fields available as prompt context
- `src/lib/gameReducer.ts` — confirmed: GameState shape, `user.username`, `user.title`, `user.jobClass`, `user.rank`, `stats`
- Ollama REST API (`/api/generate`) — confirmed: `model`, `prompt`, `stream: false`, `format`, returns `{ response: string }`

### Secondary (MEDIUM confidence)
- `AbortController` + `setTimeout` timeout pattern — standard browser API, confirmed viable in Next.js client components
- Module-level Map for session cache — standard JS pattern; confirmed it survives component remount within same page session

### Tertiary (LOW confidence)
- Typing animation at 20-30ms/char feeling natural — subjective UX estimate, validate during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries/APIs already in codebase, fully inspected
- Architecture patterns: HIGH — directly derived from existing code patterns in workoutGenerator.ts and component files
- Pitfalls: HIGH for API pitfalls (format:json, timeout cleanup), MEDIUM for UX timing pitfalls
- Prompt templates: MEDIUM — voice established from workoutGenerator.ts, exact wording is Claude's discretion

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain — Ollama API and project patterns are locked)
