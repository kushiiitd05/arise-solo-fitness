# Phase 15: Exercise Guidance System - Research

**Researched:** 2026-03-19
**Domain:** Ollama AI integration, Pollinations.ai image generation, Supabase caching, Framer Motion modal UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Guide entry point**
- Triggered from WorkoutEngine only — a "?" or "Guide" button on each exercise card
- Not available from QuestBoard in this phase
- Always accessible — guide button visible at any time (mid-rep, between sets, any point)
- Activity state behind the modal (reps/timer) continues running while guide is open

**Guide UI**
- Modal overlay — fits the existing Solo Leveling "SYSTEM window" aesthetic (see SystemWindow.tsx pattern)
- Opens in text-only mode by default
- Modal smoothly expands to reveal image with fade-in + scale animation when visual mode is unlocked
- Dismissible, full-screen or centered

**Visual mode — mana-gated via Pollinations.ai**
- Guide opens in text-only mode by default
- A prominent "View Visual Guide (1 Mana)" button appears at the bottom of the modal
- On click: button transitions to loading state with subtle glow animation ("THE SYSTEM is generating visuals..."), 1 mana deducted via API, image fetched from `https://image.pollinations.ai/prompt/{exercise description}`, image cached to DB (per-user), modal expands to reveal image with fade-in + scale
- After unlock: button replaced with "Visual Guide Unlocked" badge/indicator, image persists permanently, short system message: "Visual guidance acquired"
- If mana insufficient: button shows disabled state with tooltip "Insufficient Mana", subtle shake animation on click attempt
- Neon/cyan glow pulse on hover on unlock button

**Guide content structure (JSON shape)**
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
- Generic per exercise — NOT personalised by job class or rank
- Prompt context: exercise name + exercise description only (no user stats)

**Caching scope**
- Text guide: shared globally — one `exercise_guides` table row per exercise_id, no user_id
  - First-request lazy generation: first user triggers Ollama → DB save → all subsequent users get instant DB response
  - Permanent — no expiry, no TTL
- Image: per-user — separate `user_exercise_images` table with (user_id, exercise_id, image_url)
  - Created when user unlocks visual mode (pays 1 mana)
  - Permanent — once unlocked, always available to that user
  - Mana deduction: via existing /api/stats/update or equivalent

### Claude's Discretion
- Exact Pollinations.ai prompt wording for each exercise (use exercise.name + exercise.description)
- Modal animation implementation details (Framer Motion variants)
- Exact RLS policies for the two new tables
- Loading skeleton / pulse animation while text guide generates on first visit
- Whether to show a subtle "generating..." indicator in the text guide body before AI returns

### Deferred Ideas (OUT OF SCOPE)
- Other image generation providers (Dall-E, Stable Diffusion)
- Pre-seeded guides at deploy time
- Guide personalisation by job class/rank
- Real streaming for guide generation
</user_constraints>

---

## Summary

Phase 15 builds an exercise guidance modal on top of the already-established Ollama + Framer Motion + Supabase stack. The architecture is a three-layer read path: in-session Map cache (aiCache) → DB (`exercise_guides` table) → Ollama generation. Text guides are globally shared across users for maximum cache efficiency. Image guides are user-scoped, permanently locked to a user record on mana spend.

The two heaviest implementation concerns are (1) the mana deduction server route — `USE_MANA` exists in the reducer but there is no server-side mana column in `user_stats` today; mana is computed client-side from `intelligence * level`, so the route must deduct from the computed value and persist the delta (or track a separate `mana_spent` column), and (2) the `exercise_id` keys used for caching — the EXERCISE_POOL in `exerciseService.ts` uses short string IDs (`"pushup"`, `"squat"`) not UUIDs, which is fine for the cache table PK as TEXT, but must be consistent throughout.

**Primary recommendation:** Three plans — Wave 1: DB migration + API routes (`exercise_guides` table, `user_exercise_images` table, `GET /api/exercise-guide`, `POST /api/exercise-guide/visual-unlock`). Wave 2: ExerciseGuideModal component (text mode, skeleton, Framer Motion). Wave 3: WorkoutEngine integration (guide button per card, mana state wiring).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Framer Motion | existing (WorkoutEngine uses it) | Modal animations, shake, image reveal | Already in project; all overlay animations use it |
| supabase-server | existing | DB reads/writes from API routes | Service-role client — all server routes use this |
| ollamaClient | project-local (`src/lib/ai/ollamaClient.ts`) | Text guide generation | Phase 13 established; `ollamaGenerate(prompt, { format: 'json' })` |
| aiCache | project-local (`src/lib/ai/sessionCache.ts`) | In-session cache layer above DB | Phase 13 established; key `'exercise:{exerciseId}'` |
| next/image | existing Next.js | Render Pollinations.ai image URL | Standard Next.js image component; use `unoptimized` for external URL |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | existing | HelpCircle icon for guide button, X close | Already imported in WorkoutEngine |
| zod | existing (exerciseService uses it) | Optional — validate Ollama JSON response | Use if adding response validation beyond try/catch |

### No New Libraries Required
All dependencies for Phase 15 are already installed.

**Installation:**
```bash
# Nothing to install
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/exercise-guide/
│   └── route.ts                  # GET (fetch/generate text guide) + POST for visual unlock
├── components/arise/
│   └── ExerciseGuideModal.tsx    # New modal component
└── supabase/migrations/
    └── 20260320000000_exercise_guides.sql   # Two new tables + RLS
```

### Pattern 1: DB-first with Ollama fallback (read path)
**What:** Check DB first; if miss, call Ollama, save to DB, return. Same pattern as Phase 13's sessionCache but promoted to DB persistence for cross-user sharing.
**When to use:** `GET /api/exercise-guide?exerciseId={id}`
**Example:**
```typescript
// Source: established from Phase 13 + supabase-server pattern
const { data: cached } = await supabase
  .from('exercise_guides')
  .select('guide_json')
  .eq('exercise_id', exerciseId)
  .maybeSingle();

if (cached) return NextResponse.json({ guide: cached.guide_json });

// DB miss — generate
const raw = await ollamaGenerate(buildGuidePrompt(exercise), { format: 'json' });
const guide = parseGuideJson(raw); // try/catch + fallback

await supabase.from('exercise_guides').insert({
  exercise_id: exerciseId,
  guide_json: guide,
});

return NextResponse.json({ guide });
```

### Pattern 2: Mana deduction (visual unlock write path)
**What:** POST route deducts 1 mana, fetches Pollinations.ai image URL, saves to `user_exercise_images`.
**When to use:** User clicks "View Visual Guide · 1 Mana"
**Mana architecture note:** `user_stats` has no `mana` column — mana is computed client-side as `intelligence * level`. The route must check the user's current intelligence and level from DB, compute available mana, compare against `mana_spent` (or track debits separately). Simplest approach: add a `mana_spent` INTEGER column to `user_stats` (DEFAULT 0); route checks `(intelligence * level) - mana_spent >= cost`, then increments `mana_spent`.

```typescript
// POST /api/exercise-guide/visual-unlock
// 1. Verify user has sufficient mana
// 2. Check if image already exists (idempotency guard)
// 3. Increment mana_spent in user_stats
// 4. Construct Pollinations.ai URL
// 5. INSERT into user_exercise_images
// 6. Return image URL
const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}`;
// Note: Pollinations.ai returns a JPEG — the URL IS the image, no fetch needed.
// Store the URL, render via <img> or next/image unoptimized.
```

### Pattern 3: Client-side layer caching (aiCache supplement)
**What:** After fetching from DB/Ollama, store in aiCache with key `'exercise:{exerciseId}'` for instant subsequent opens within the same session.
**When to use:** In ExerciseGuideModal on guide load.

### Pattern 4: SystemWindow + WorkoutEngine modal overlay
**What:** ExerciseGuideModal wraps content in SystemWindow component. Overlay uses exact WorkoutEngine pattern: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl font-exo`.
**When to use:** Rendering the guide modal.

```tsx
// Source: WorkoutEngine.tsx line 304
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl font-exo"
>
  <SystemWindow title="EXERCISE GUIDE">
    {/* guide content */}
  </SystemWindow>
</motion.div>
```

### Anti-Patterns to Avoid
- **Direct Pollinations.ai fetch from client:** Avoid fetching from browser — route the unlock through the API server route so mana deduction and DB write are atomic.
- **Missing idempotency guard on visual unlock:** If user clicks the button twice, check `user_exercise_images` for existing row before deducting mana a second time.
- **Blocking workout activity while guide generates:** Guide fetch must not block the workout timer/rep counter. Guide modal state is fully isolated — parent WorkoutEngine continues running.
- **Using UUID as exercise_id when EXERCISE_POOL uses string IDs:** `exercise_guides.exercise_id` should be TEXT not UUID to match EXERCISE_POOL string keys (`"pushup"`, `"squat"`, etc.).
- **format: 'json' on all Ollama prompts:** Per Phase 13 decision, `format: 'json'` is opt-in. Guide prompt MUST pass it (structured output required). Only use where JSON response is needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ollama request with timeout | Custom fetch + setTimeout | `ollamaGenerate(prompt, { format: 'json' })` from `ollamaClient.ts` | AbortController already wired; silent fallback on any error |
| In-session cache | useState or useRef map | `aiCache` from `sessionCache.ts` with key `'exercise:{exerciseId}'` | Module-level persistence across remounts; Phase 13 established pattern |
| Modal overlay + animation | Custom CSS transition | Framer Motion `AnimatePresence` + `motion.div` | All existing overlays use this; exit animations require AnimatePresence wrapper |
| Image generation | Stable Diffusion self-host | `https://image.pollinations.ai/prompt/{text}` | Free, no API key, GET returns JPEG; locked decision |
| Auth token extraction | Custom header parsing | Copy `getUserId()` locally per route (Phase 3 decision) | Self-contained routes, no shared helper coupling |

---

## Common Pitfalls

### Pitfall 1: Ollama JSON parse failure
**What goes wrong:** Ollama returns malformed JSON or wraps the JSON in extra prose. `JSON.parse` throws; guide is missing entirely.
**Why it happens:** Ollama with `format: 'json'` is reliable but not infallible — model may prepend "Here is the JSON:" text in some cases.
**How to avoid:** Wrap in try/catch; on parse failure use a hardcoded fallback guide object (same pattern as Phase 13 arena prompt fallback). Log the error silently.
**Warning signs:** Guide modal shows empty sections for specific exercises on first load.

### Pitfall 2: Mana column not in DB — client/server mismatch
**What goes wrong:** The reducer uses `USE_MANA` but `user_stats` has no `mana` column. The route has nothing to deduct from.
**Why it happens:** Mana is computed client-side as `intelligence * level` — it was never a DB column.
**How to avoid:** Add `mana_spent INTEGER NOT NULL DEFAULT 0` to `user_stats` in the migration. Route reads `(intelligence * level) - mana_spent` to compute current mana. After deduction: `mana_spent += 1`. Also dispatch `USE_MANA: 1` on client after successful API response to keep client state in sync.
**Warning signs:** Visual unlock always succeeds regardless of mana; or always fails with 400.

### Pitfall 3: Pollinations.ai URL encoding
**What goes wrong:** Exercise descriptions with spaces, slashes, or special chars break the URL.
**Why it happens:** URL path injection without encoding.
**How to avoid:** Always `encodeURIComponent(promptText)` before injecting into the Pollinations URL. Keep prompts short — long descriptions may get truncated by some CDN proxies.
**Warning signs:** Broken image on visual unlock; network 400 from Pollinations.

### Pitfall 4: next/image domain not configured for Pollinations.ai
**What goes wrong:** `next/image` throws an error rendering an external image URL not in `remotePatterns`.
**Why it happens:** Next.js requires explicit domain allowlist for optimized remote images.
**How to avoid:** Either (a) use `<img>` tag directly, or (b) add `image.pollinations.ai` to `next.config.js` `remotePatterns`. Using `unoptimized` prop on `next/image` is also valid for external CDN images.
**Warning signs:** "Invalid src prop" error in console; image fails to render.

### Pitfall 5: exercise_id TEXT vs UUID type mismatch
**What goes wrong:** DB insert fails or cache lookup never hits because EXERCISE_POOL uses `"pushup"` (string) but table was created with UUID type.
**Why it happens:** Init schema uses `uuid_generate_v4()` for exercise IDs by default.
**How to avoid:** Create `exercise_guides.exercise_id` as `TEXT PRIMARY KEY` — this is a custom string ID from the in-memory pool, not a DB-linked UUID.
**Warning signs:** All first-visit requests hit Ollama even after the first cache fill.

### Pitfall 6: WorkoutEngine exercise card click event bubble
**What goes wrong:** Clicking the "?" guide button ALSO selects the exercise card underneath.
**Why it happens:** Button is inside a button — nested interactive elements propagate events.
**How to avoid:** Call `e.stopPropagation()` on the guide button's onClick. Per UI-SPEC: "Does NOT stop event propagation" was listed but this means card selection is OK. Verify desired behavior — CONTEXT says guide button opens modal only, but card should still be selectable. Use `e.stopPropagation()` on the guide button to prevent exercise card selection while opening guide.

---

## Code Examples

Verified patterns from existing codebase:

### Ollama JSON generation with format option
```typescript
// Source: src/lib/ai/ollamaClient.ts
const raw = await ollamaGenerate(buildGuidePrompt(name, description), { format: 'json' });
// raw is string | null
if (!raw) return FALLBACK_GUIDE;
try {
  return JSON.parse(raw) as ExerciseGuide;
} catch {
  return FALLBACK_GUIDE;
}
```

### aiCache usage with DB-first pattern
```typescript
// Source: src/lib/ai/sessionCache.ts key pattern
const cacheKey = `exercise:${exerciseId}`;
if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);
// ... fetch from DB / generate ...
aiCache.set(cacheKey, JSON.stringify(guide));
```

### supabaseServer maybeSingle (Phase 1 decision)
```typescript
// Source: established project pattern
const { data, error } = await supabase
  .from('exercise_guides')
  .select('guide_json')
  .eq('exercise_id', exerciseId)
  .maybeSingle(); // NOT .single() — row may be absent
```

### Framer Motion shake animation (for insufficient mana)
```typescript
// Source: UI-SPEC animation contract
const shakeVariants = {
  idle: { x: 0 },
  shake: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.3, ease: 'linear' },
  },
};
// <motion.button animate={shouldShake ? 'shake' : 'idle'} variants={shakeVariants} />
```

### WorkoutEngine mana access (established pattern)
```typescript
// Source: WorkoutEngine.tsx line 28
const mp = (state.user.stats as any)?.mana || 0;
// mana is NOT in UserStats type — accessed via 'any' cast
// Phase 15 should keep this pattern for reading, but add mana_spent to DB for server writes
```

### Pollinations.ai URL construction
```typescript
// Source: CONTEXT.md decision (free, no API key, GET returns JPEG)
const prompt = `${exercise.name} - ${exercise.description} - fitness exercise demonstration`;
const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
// URL is the image — no additional fetch needed. Store URL, render with <img>.
```

### getUserId() copy pattern (Phase 3 decision)
```typescript
// Source: Phase 3 decision — copy-don't-import per route
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7) || null;
}
```

---

## DB Migration Plan

Two new tables required:

### exercise_guides (globally shared text cache)
```sql
CREATE TABLE "exercise_guides" (
    "exercise_id" TEXT NOT NULL,      -- matches EXERCISE_POOL string ids
    "guide_json"  JSONB NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exercise_guides_pkey" PRIMARY KEY ("exercise_id")
);

ALTER TABLE public.exercise_guides ENABLE ROW LEVEL SECURITY;
-- Read: any authenticated user (guides are globally shared)
CREATE POLICY "Authenticated users can read exercise guides"
  ON public.exercise_guides FOR SELECT
  USING (auth.role() = 'authenticated');
-- Write: service-role only (API route uses supabaseServer)
-- No INSERT policy needed — service-role bypasses RLS
```

### user_exercise_images (per-user visual unlock)
```sql
CREATE TABLE "user_exercise_images" (
    "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id"     UUID NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "image_url"   TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_exercise_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_exercise_images_unique" UNIQUE ("user_id", "exercise_id")
);

ALTER TABLE public.user_exercise_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own exercise images"
  ON public.user_exercise_images FOR SELECT
  USING (auth.uid() = user_id);
-- No INSERT/UPDATE policy — service-role only via server route
```

### user_stats mana_spent column
```sql
ALTER TABLE "user_stats" ADD COLUMN "mana_spent" INTEGER NOT NULL DEFAULT 0;
```

---

## API Routes

### GET /api/exercise-guide?exerciseId={id}
- Auth: Bearer token (getUserId)
- Reads: aiCache → exercise_guides → Ollama
- Returns: `{ guide: ExerciseGuide }` or `{ guide: FALLBACK_GUIDE }`
- On miss: generates via Ollama, saves to DB, returns result

### POST /api/exercise-guide/visual-unlock
- Auth: Bearer token
- Body: `{ exerciseId: string }`
- Checks: (1) idempotency — if `user_exercise_images` row exists, return existing `image_url` (no mana charge). (2) Compute available mana: `(intelligence * level) - mana_spent`. (3) If < 1: return 402. (4) Increment `mana_spent` by 1. (5) Construct Pollinations URL. (6) INSERT `user_exercise_images`. (7) Return `{ imageUrl, manaRemaining }`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct `fetch('http://localhost:11434')` in components | `ollamaGenerate()` shared utility | Phase 13 | Consistent timeout, error handling, model config |
| No AI caching | `aiCache` module-level Map + DB persistence | Phase 13 (in-session) / Phase 15 (DB) | Zero repeat Ollama calls within session |
| Mana as computed client value only | Add `mana_spent` to DB for server-side deduction | Phase 15 | First DB-persisted mana state |

---

## Open Questions

1. **Mana column strategy**
   - What we know: `user_stats` has no mana column; mana = `intelligence * level` client-side; `USE_MANA` dispatch exists in reducer but no server-side enforcement
   - What's unclear: Whether to add `mana_spent` (delta approach) or a full `current_mana` column (absolute approach)
   - Recommendation: Add `mana_spent INTEGER DEFAULT 0` — simpler, non-breaking, consistent with how mana is already computed

2. **`exercise_id` key format for `exercise_guides` table**
   - What we know: EXERCISE_POOL uses short string IDs (`"pushup"`, `"diamond_pushup"`, etc.)
   - What's unclear: Whether future exercises will also use string IDs or UUID
   - Recommendation: TEXT PRIMARY KEY is correct for now — matches existing data without any mapping layer

3. **next/image vs. `<img>` for Pollinations images**
   - What we know: `next/image` requires remotePatterns config for external domains; `<img>` works without config
   - Recommendation: Use `<img>` with `className` for the guide image — simpler, no config change needed. If `next/image` optimization is desired, add `{ hostname: 'image.pollinations.ai' }` to `next.config.js` remotePatterns.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` (root — exists, `@` alias configured) |
| Quick run command | `npx vitest run src/app/api/exercise-guide` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EG-01 | GET /api/exercise-guide returns cached guide on DB hit | unit | `npx vitest run src/app/api/exercise-guide/route.test.ts -t "returns cached guide"` | Wave 0 |
| EG-02 | GET /api/exercise-guide calls Ollama and saves to DB on miss | unit | `npx vitest run src/app/api/exercise-guide/route.test.ts -t "generates on miss"` | Wave 0 |
| EG-03 | POST /api/exercise-guide/visual-unlock deducts mana correctly | unit | `npx vitest run src/app/api/exercise-guide/visual-unlock/route.test.ts -t "deducts mana"` | Wave 0 |
| EG-04 | POST visual-unlock is idempotent (no double mana charge) | unit | `npx vitest run src/app/api/exercise-guide/visual-unlock/route.test.ts -t "idempotent"` | Wave 0 |
| EG-05 | POST visual-unlock returns 402 if mana insufficient | unit | `npx vitest run src/app/api/exercise-guide/visual-unlock/route.test.ts -t "insufficient mana"` | Wave 0 |
| EG-06 | Ollama JSON parse fallback on malformed response | unit | `npx vitest run src/app/api/exercise-guide/route.test.ts -t "fallback guide"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/app/api/exercise-guide`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/api/exercise-guide/route.test.ts` — covers EG-01, EG-02, EG-06
- [ ] `src/app/api/exercise-guide/visual-unlock/route.test.ts` — covers EG-03, EG-04, EG-05
- [ ] Both test files need `vi.mock('@/lib/supabase-server')` and `vi.mock('@/lib/ai/ollamaClient')` per Phase 6/9 patterns

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `src/lib/ai/ollamaClient.ts` — ollamaGenerate signature, timeout, format option
- Direct code read: `src/lib/ai/sessionCache.ts` — aiCache API, key patterns
- Direct code read: `src/components/arise/WorkoutEngine.tsx` — mana access pattern, overlay structure, existing mana dispatch
- Direct code read: `src/lib/gameReducer.ts` — USE_MANA action, UserStats shape, mana computation
- Direct code read: `src/components/system/SystemWindow.tsx` — container component API
- Direct code read: `src/lib/services/exerciseService.ts` — EXERCISE_POOL string IDs and Exercise type
- Direct code read: `supabase/migrations/20260311000000_init_schema.sql` — user_stats schema (no mana column confirmed)
- Direct code read: `supabase/migrations/20260312000000_rls_policies.sql` — RLS pattern examples
- Direct code read: `.planning/phases/15-exercise-guidance-system/15-CONTEXT.md` — locked decisions
- Direct code read: `.planning/phases/15-exercise-guidance-system/15-UI-SPEC.md` — component inventory, animation contracts, copywriting

### Secondary (MEDIUM confidence)
- Pollinations.ai URL pattern: `https://image.pollinations.ai/prompt/{text}` — confirmed from CONTEXT.md + public knowledge that it returns JPEG directly from URL
- next/image remotePatterns requirement: Next.js 13+ documented requirement for external image domains

### Tertiary (LOW confidence)
- None — all claims verified from project source files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries exist and are imported in project
- Architecture: HIGH — DB schema, API route patterns, and UI patterns all read directly from source
- Pitfalls: HIGH — mana column gap verified by reading user_stats migration; exercise_id type verified from EXERCISE_POOL; next/image confirmed from Next.js standard behavior
- Validation architecture: HIGH — vitest.config.ts confirmed, existing test files confirmed

**Research date:** 2026-03-19
**Valid until:** 2026-04-18 (stable stack — 30 days)
