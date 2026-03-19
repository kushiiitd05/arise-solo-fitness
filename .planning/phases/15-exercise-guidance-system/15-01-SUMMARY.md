---
phase: 15-exercise-guidance-system
plan: 01
subsystem: exercise-guidance
tags: [api, supabase, ollama, tdd, mana, cache]
dependency_graph:
  requires: [13-ollama-ai-integration]
  provides: [exercise-guide-api, visual-unlock-api]
  affects: [user_stats.mana_spent, exercise_guides, user_exercise_images]
tech_stack:
  added: []
  patterns: [copy-dont-import getUserId, aiCache layer1, DB layer2, Ollama layer3, Pollinations image URL]
key_files:
  created:
    - supabase/migrations/20260320000000_exercise_guides.sql
    - src/app/api/exercise-guide/route.ts
    - src/app/api/exercise-guide/route.test.ts
    - src/app/api/exercise-guide/visual-unlock/route.ts
    - src/app/api/exercise-guide/visual-unlock/route.test.ts
  modified: []
decisions:
  - Test module-level mock variables (mockMaybySingle, mockOllamaGenerate) with per-test .mockResolvedValue resets in beforeEach — avoids vitest module cache issues with dynamic imports
  - mockEq must remain mockReturnThis() for Supabase chain integrity — the update().eq() terminal call is awaited as an implicit resolved promise
metrics:
  duration_seconds: 293
  tasks_completed: 3
  files_created: 5
  files_modified: 0
  completed_date: "2026-03-19"
  commits:
    - 3b7cd00
    - a65fc04
    - 0c83067
---

# Phase 15 Plan 01: Exercise Guidance System — DB + API Routes Summary

**One-liner:** Supabase migration (exercise_guides + user_exercise_images + mana_spent), 3-layer cached GET guide endpoint, and mana-gated idempotent POST visual-unlock endpoint with 10 vitest tests covering EG-01 through EG-06.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB migration — exercise_guides, user_exercise_images, mana_spent | 3b7cd00 | supabase/migrations/20260320000000_exercise_guides.sql |
| 2 | Wave 0 test scaffolds + GET /api/exercise-guide route | a65fc04 | src/app/api/exercise-guide/route.ts, route.test.ts |
| 3 | POST /api/exercise-guide/visual-unlock route + tests | 0c83067 | src/app/api/exercise-guide/visual-unlock/route.ts, route.test.ts |

## What Was Built

### DB Migration (Task 1)
- `exercise_guides` table: TEXT PRIMARY KEY (exercise string IDs like "pushup"), JSONB guide_json, RLS SELECT for authenticated users
- `user_exercise_images` table: UUID PK, UNIQUE(user_id, exercise_id) constraint for idempotency, RLS scoped to auth.uid()
- `user_stats` ALTER: `mana_spent INTEGER NOT NULL DEFAULT 0` added for server-side mana deduction tracking

### GET /api/exercise-guide (Task 2)
- 3-layer cache hierarchy: aiCache (in-session Map) → DB (permanent shared cache) → Ollama generation
- `FALLBACK_GUIDE` returned when Ollama returns null or malformed JSON
- `buildGuidePrompt()` constructs THE SYSTEM voice prompt requesting structured JSON
- `parseGuideJson()` validates `steps` array exists before accepting parsed output

### POST /api/exercise-guide/visual-unlock (Task 3)
- Idempotency: checks `user_exercise_images` first — returns existing `image_url` without mana charge
- Mana gate: `(intelligence * level) - mana_spent >= 1` required; returns 402 on failure
- Mana deduction: `UPDATE user_stats SET mana_spent = mana_spent + 1`
- Pollinations URL: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` — no fetch needed
- Persists to `user_exercise_images` for future idempotent reads

## Test Results

```
Test Files  2 passed (2)
      Tests  10 passed (10)
```

- EG-01: DB hit returns cached guide without calling Ollama
- EG-02: DB miss calls Ollama with exerciseId in prompt + `{format:'json'}`
- EG-03: Successful unlock deducts mana, returns Pollinations URL with exerciseId, inserts to DB
- EG-04: Idempotent — returns existing imageUrl, mockUpdate not called
- EG-05: 402 when intelligence*level-mana_spent < 1
- EG-06: Malformed Ollama response returns FALLBACK_GUIDE with valid steps/tip arrays

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test mock mutation between test cases (EG-02 failure)**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Plan's test template used `(supabaseServer as any).maybySingle = vi.fn()...` inside EG-01, permanently mutating the mock for subsequent tests. `vi.clearAllMocks()` only clears call history, not mock implementations.
- **Fix:** Rewrote test file to declare top-level `const mockMaybySingle = vi.fn()` and reset with explicit `.mockResolvedValue()` in `beforeEach`. Removed direct mock property mutation from individual tests.
- **Files modified:** src/app/api/exercise-guide/route.test.ts
- **Commit:** a65fc04

**2. [Rule 1 - Bug] `mockEq.mockResolvedValue()` broke Supabase chain for EG-03**
- **Found during:** Task 3 (GREEN phase)
- **Issue:** Plan's test EG-03 called `mockEq.mockResolvedValue(...)` making `eq()` return a Promise instead of `this`, breaking `.eq("user_id").eq("exercise_id")` chain at second call.
- **Fix:** Removed `mockEq.mockResolvedValue()` from EG-03 — kept `mockReturnThis()`. The `update().eq()` terminal call is awaited implicitly as `undefined` (mock object not a Promise), which is correct since the route doesn't use the update result.
- **Files modified:** src/app/api/exercise-guide/visual-unlock/route.test.ts
- **Commit:** 0c83067

## Self-Check: PASSED

All 5 files exist. All 3 commits (3b7cd00, a65fc04, 0c83067) found in git log. 10 tests passing.
