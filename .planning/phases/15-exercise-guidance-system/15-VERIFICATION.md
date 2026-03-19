---
phase: 15-exercise-guidance-system
verified: 2026-03-19T17:00:00Z
status: human_needed
score: 13/13 must-haves verified (automated); 4 items require human confirmation
re_verification: false
human_verification:
  - test: "Open WorkoutEngine exercise select phase, verify HelpCircle (?) button visible top-right of each exercise card at 60% cyan opacity"
    expected: "Cyan ? icon visible on every exercise card"
    why_human: "Absolute positioning and opacity rendering requires browser visual inspection"
  - test: "Tap guide button, verify ExerciseGuideModal opens with skeleton pulse copy 'THE SYSTEM IS ACCESSING COMBAT DATA...'"
    expected: "Skeleton pulse visible with exact copy string while guide loads"
    why_human: "Loading state timing and animation require live browser inspection"
  - test: "With mana = 0, click 'VIEW VISUAL GUIDE · 1 MANA' button; verify shake animation (x: [0,-4,4,-4,4,0]) and 'INSUFFICIENT MANA' tooltip appear"
    expected: "Button shakes left-right over ~300ms and red tooltip animates in"
    why_human: "Framer Motion shake animation can only be confirmed in browser"
  - test: "With mana > 0, click visual unlock button; verify it enters 'THE SYSTEM IS GENERATING VISUALS...' state; after response, verify image fades in (opacity 0→1, scale 0.95→1) and button is replaced by 'VISUAL GUIDANCE ACQUIRED' badge"
    expected: "Full unlock flow: loading state → image reveal animation → badge replacement"
    why_human: "Animation timing, image reveal, and Pollinations image load require browser inspection"
---

# Phase 15: Exercise Guidance System Verification Report

**Phase Goal:** Build the Exercise Guidance System — AI-generated per-exercise coaching (steps, mistakes, breathing cues) with optional visual unlock via mana spend.
**Verified:** 2026-03-19T17:00:00Z
**Status:** human_needed — all automated checks pass, 4 visual/animation items require human confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths derived from must_haves in plan frontmatter across all three plans (15-01, 15-02, 15-03).

#### Plan 15-01 Truths (API Layer)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/exercise-guide?exerciseId=pushup returns cached guide JSON on DB hit without calling Ollama | VERIFIED | `route.ts` line 82-91: maybySingle check returns dbRow, skips ollamaGenerate. Test EG-01 passes. |
| 2 | GET /api/exercise-guide calls Ollama, saves to DB, returns guide on DB miss | VERIFIED | `route.ts` line 94-103: ollamaGenerate called, insert to exercise_guides. Test EG-02 passes. |
| 3 | GET /api/exercise-guide returns fallback guide when Ollama returns malformed JSON | VERIFIED | `parseGuideJson` at line 56-65 catches JSON parse errors, returns FALLBACK_GUIDE. Test EG-06 passes. |
| 4 | POST /api/exercise-guide/visual-unlock deducts 1 from mana_spent and returns image URL when mana >= 1 | VERIFIED | `visual-unlock/route.ts` line 56-73: UPDATE mana_spent + 1, constructs Pollinations URL. Test EG-03 passes. |
| 5 | POST /api/exercise-guide/visual-unlock returns 402 when (intelligence * level) - mana_spent < 1 | VERIFIED | `visual-unlock/route.ts` line 50-53: returns 402. Test EG-05 passes. |
| 6 | POST /api/exercise-guide/visual-unlock is idempotent — returns existing imageUrl without charging mana if row already exists | VERIFIED | `visual-unlock/route.ts` line 28-37: early return with alreadyUnlocked:true. Test EG-04 passes. |

#### Plan 15-02 Truths (ExerciseGuideModal UI)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | ExerciseGuideModal renders skeleton pulse with 'THE SYSTEM IS ACCESSING COMBAT DATA...' on first-visit load | VERIFIED | `ExerciseGuideModal.tsx` line 187-196: exact string present with animate-pulse class. |
| 8 | ExerciseGuideModal renders 4 sections (STEPS, MISTAKES, BREATHING, THE SYSTEM) when guide JSON is loaded | VERIFIED | Lines 201-261: all 4 section headers present with exact uppercase labels. |
| 9 | Visual unlock button shows 'VIEW VISUAL GUIDE · 1 MANA' with neon cyan glow pulse on hover | VERIFIED (code) / ? (visual) | Line 335: exact string. Hover glow via `hover:shadow-[0_0_15px_rgba(56,189,248,0.5),...]` at line 317. Visual confirmation needed. |
| 10 | Visual unlock button shakes and shows 'INSUFFICIENT MANA' tooltip when mana is zero | VERIFIED (code) / ? (visual) | Lines 111-117: shake variant x:[0,-4,4,-4,4,0] 300ms. Lines 289-298: INSUFFICIENT MANA tooltip. Visual confirmation needed. |
| 11 | Visual unlock button enters loading state ('THE SYSTEM IS GENERATING VISUALS...') on click while mana > 0 | VERIFIED (code) / ? (visual) | Line 332: exact string in loading branch. Visual confirmation needed. |
| 12 | Exercise image fades in (opacity 0→1, scale 0.95→1, 400ms) after successful visual unlock | VERIFIED (code) / ? (visual) | Lines 163-179: initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition duration:0.4 ease:easeOut. Visual confirmation needed. |
| 13 | Button is replaced with 'VISUAL GUIDANCE ACQUIRED' badge after successful unlock | VERIFIED | Lines 277-284: CheckCircle2 badge with exact text rendered when visualState === "unlocked". |
| 14 | Modal closes via AnimatePresence exit animation when X is clicked | VERIFIED | Lines 121-126: outer motion.div has exit={{ opacity:0 }}. Inner panel has exit={{ opacity:0, scale:0.95 }}. X button calls onClose(). |

#### Plan 15-03 Truths (WorkoutEngine Integration)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 15 | A '?' guide button appears top-right of each exercise card in WorkoutEngine select phase | VERIFIED (code) / ? (visual) | WorkoutEngine.tsx line 356: aria-label="View Exercise Guide", line 364: HelpCircle size={14}. Visual confirmation needed. |
| 16 | Tapping guide button opens ExerciseGuideModal without deselecting the card | VERIFIED | Line 358: e.stopPropagation(). Line 360: setGuideExercise(ex). Card selection onClick is blocked. |
| 17 | Workout timer and rep counter continue running while ExerciseGuideModal is open | VERIFIED | ExerciseGuideModal is a pure overlay — no state modification to workout timers/reps. Modal controlled by guideExercise state only. |
| 18 | Closing guide modal returns user to same workout state | VERIFIED | Line 485: onClose={() => setGuideExercise(null)} — only nulls guideExercise, no workout state touched. |
| 19 | Mana deduction dispatches USE_MANA: 1 to reducer after successful visual unlock | VERIFIED | Line 486: onManaSpent={() => dispatch({ type: "USE_MANA", payload: 1 })}. |
| 20 | Guide button has aria-label='View Exercise Guide' and uses HelpCircle icon at size 14 | VERIFIED | Lines 356 and 364 confirmed. |

**Score:** 20/20 truths verified in code. 4 truths require human visual confirmation (animations, rendering).

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260320000000_exercise_guides.sql` | exercise_guides + user_exercise_images tables + mana_spent column | VERIFIED | File exists, 35 lines. 2 CREATE TABLE statements, ALTER TABLE mana_spent, RLS on both tables. |
| `src/app/api/exercise-guide/route.ts` | GET endpoint: aiCache → DB → Ollama | VERIFIED | 106 lines. Exports GET. 3-layer cache hierarchy implemented. FALLBACK_GUIDE present. |
| `src/app/api/exercise-guide/visual-unlock/route.ts` | POST endpoint: mana check, idempotency, Pollinations URL, DB write | VERIFIED | 75 lines. Exports POST. All business rules present. |
| `src/app/api/exercise-guide/route.test.ts` | Unit tests EG-01, EG-02, EG-06 | VERIFIED | 107 lines. 5 tests. All pass (verified via npx vitest run). |
| `src/app/api/exercise-guide/visual-unlock/route.test.ts` | Unit tests EG-03, EG-04, EG-05 | VERIFIED | 100 lines. 5 tests. All pass. |
| `src/components/arise/ExerciseGuideModal.tsx` | Standalone guide modal — all 5 states, animations, API calls | VERIFIED | 345 lines (plan required min_lines: 180). Exports ExerciseGuideModal. |
| `src/components/arise/WorkoutEngine.tsx` | Guide button + ExerciseGuideModal render | VERIFIED | HelpCircle import, ExerciseGuideModal import, guideExercise state, guide button in card, AnimatePresence modal render — all confirmed. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `route.ts` | exercise_guides table | `supabaseServer.from('exercise_guides').select('guide_json').eq('exercise_id', exerciseId).maybySingle()` | WIRED | Lines 82-86 match exact pattern from plan. |
| `route.ts` | `ollamaClient.ts` | `ollamaGenerate(buildGuidePrompt(exerciseId), { format: 'json' })` | WIRED | Line 94: exact call signature with format:'json'. |
| `visual-unlock/route.ts` | user_stats mana_spent column | `supabaseServer.from('user_stats').select('intelligence, level, mana_spent')` | WIRED | Lines 40-44: exact select pattern. mana_spent at line 50, update at line 56-59. |
| `ExerciseGuideModal.tsx` | GET /api/exercise-guide | `fetch` in useEffect on modal open | WIRED | Lines 43-57: fetch with encodeURIComponent(exercise.id), Authorization header. |
| `ExerciseGuideModal.tsx` | POST /api/exercise-guide/visual-unlock | `handleVisualUnlock` async function | WIRED | Lines 83-105: fetch POST with exerciseId in body. |
| `WorkoutEngine.tsx` | `ExerciseGuideModal.tsx` | import + render in AnimatePresence | WIRED | Line 16 import. Lines 476-487: AnimatePresence wrapper with full props. |
| `ExerciseGuideModal onManaSpent` | `dispatch({ type: 'USE_MANA', payload: 1 })` | Arrow function passed as onManaSpent | WIRED | Line 486: exact pattern confirmed. |

All 7 key links: WIRED.

---

## Requirements Coverage

REQUIREMENTS.md does not exist as a separate file — requirements are defined inline in ROADMAP.md (line 175). The 6 automated requirements (EG-01 through EG-06) are the only ones mapped to Phase 15. No REQUIREMENTS.md orphaned IDs to flag.

| Requirement | Source Plan | Description (from tests/plan context) | Status | Evidence |
|-------------|------------|----------------------------------------|--------|----------|
| EG-01 | 15-01 | GET returns DB-cached guide without calling Ollama on cache hit | SATISFIED | Test passes; route.ts returns dbRow.guide_json before reaching ollamaGenerate |
| EG-02 | 15-01 | GET calls Ollama with exerciseId in prompt + format:'json' on DB miss | SATISFIED | Test passes; ollamaGenerate call confirmed at line 94 |
| EG-03 | 15-01 | POST deducts mana, returns Pollinations URL with exerciseId, inserts to DB | SATISFIED | Test passes; update + insert + Pollinations URL at lines 56-70 |
| EG-04 | 15-01 | POST is idempotent — returns existing imageUrl without mana charge | SATISFIED | Test passes; early return at lines 35-37 when existing row found |
| EG-05 | 15-01 | POST returns 402 when available mana (intelligence * level - mana_spent) < 1 | SATISFIED | Test passes; 402 at lines 51-53 |
| EG-06 | 15-01 | GET returns FALLBACK_GUIDE when Ollama returns null or malformed JSON | SATISFIED | Test passes; parseGuideJson catches and returns FALLBACK_GUIDE |

All 6 automated requirements: SATISFIED with passing tests.

---

## Anti-Patterns Found

Scanned: route.ts, visual-unlock/route.ts, ExerciseGuideModal.tsx

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `route.ts` | 9 | `return null` | Info | Part of getUserId helper — intentional, not a stub |
| `visual-unlock/route.ts` | 7 | `return null` | Info | Same getUserId helper pattern — intentional |
| `ExerciseGuideModal.tsx` | 52-54 | `catch () { // Silent fallback }` | Info | Guide remains null, empty state shown — documented design decision, not a stub |

No blocker or warning anti-patterns found. All patterns are intentional design choices documented in summaries.

---

## Test Results

```
Test Files  2 passed (2)
      Tests  10 passed (10)
```

All 10 tests across 2 test files passed (verified live run at 2026-03-19T16:59:01Z).

- Route test file: 5 tests (401 guard, 400 guard, EG-01, EG-02, EG-06)
- Visual-unlock test file: 5 tests (401 guard, 400 guard, EG-05, EG-04, EG-03)

---

## TypeScript Compilation

`npx tsc --noEmit` output for phase 15 files: **0 errors**

One pre-existing error in `src/__tests__/chapterMapping.test.ts` (TS2871) is unrelated to Phase 15 and was present before this phase began (documented in 15-02 and 15-03 summaries).

---

## Human Verification Required

### 1. Guide Button Visibility

**Test:** Run `npm run dev`, navigate to a workout session, open WorkoutEngine to the exercise SELECT phase.
**Expected:** A cyan HelpCircle (?) icon button appears in the absolute top-right corner of each exercise card at ~60% opacity, brightening to 100% on hover.
**Why human:** Absolute positioning and Tailwind opacity rendering must be confirmed in browser.

### 2. Loading Skeleton State

**Test:** Tap the (?) guide button and immediately observe the modal content area.
**Expected:** Skeleton pulse elements appear with the exact copy "THE SYSTEM IS ACCESSING COMBAT DATA..." in cyan monospace, followed by animated grey bars of decreasing width. Guide content then loads and replaces skeleton.
**Why human:** Loading state timing and the pulse animation require live browser inspection.

### 3. Insufficient Mana Shake + Tooltip

**Test:** Ensure mana is 0 (or reduce it to 0 in game state), then click the "VIEW VISUAL GUIDE · 1 MANA" button.
**Expected:** Button shakes left-right (translateX oscillation over ~300ms), and a red "INSUFFICIENT MANA" tooltip animates in above the button, then both disappear after ~1.5 seconds.
**Why human:** Framer Motion shake animation (x: [0,-4,4,-4,4,0]) must be visually confirmed; cannot be tested in unit tests.

### 4. Full Visual Unlock Flow

**Test:** With mana > 0, click "VIEW VISUAL GUIDE · 1 MANA". Observe the sequence.
**Expected:**
- Button immediately shows "THE SYSTEM IS GENERATING VISUALS..." with a spinning Loader2 icon
- After Pollinations URL resolves, an image fades in above the guide content (opacity 0→1, scale 0.95→1, 400ms)
- The visual unlock button is replaced by a cyan "VISUAL GUIDANCE ACQUIRED" badge with CheckCircle2 icon
- Mana pool decreases by 1 in the game state
**Why human:** Animation timing, image load from external Pollinations.ai URL, and visual state transitions require browser inspection.

---

## Gaps Summary

No gaps found. All automated must-haves are verified. The only open items are human visual confirmations of animations and UI rendering — these were explicitly flagged as requiring human verification in the plan (15-03 Task 2 is a `checkpoint:human-verify` gate marked approved in the summary).

The 15-03 summary documents that human visual verification was completed and "all 10 steps approved" by the user on 2026-03-19. If that approval is trusted, the phase is fully complete.

---

_Verified: 2026-03-19T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
