---
phase: 13-ollama-ai-integration
plan: 02
subsystem: ui
tags: [ai, ollama, react, typescript, components, animation]

# Dependency graph
requires:
  - phase: 13-01
    provides: ollamaClient, sessionCache, bossPrompt, questPrompt, workoutPrompt, arenaPrompt, TypingText

provides:
  - BossEvent.tsx wired with AI personality blurb below abilities chips via TypingText
  - QuestBoard.tsx wired with per-quest AI lore (lazy, staggered 300ms) via TypingText
  - WorkoutEngine.tsx wired with AI tagline in select phase after missions load via TypingText
  - Arena.tsx wired with AI opponent name + taunt via Promise.race settled-flag pattern

affects: [14-ollama-ai-integration, any phase touching BossEvent, QuestBoard, WorkoutEngine, Arena]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useEffect with aiCache.has check before ollamaGenerate call — cache-first, session-scoped"
    - "Promise.race with settled flag — AI generation races against fallback timer, winner sets state"
    - "Staggered forEach with setTimeout(fn, idx * 300) — sequential Ollama requests without blocking"
    - "Conditional rendering {aiText && <TypingText text={aiText} />} — additive UI, nothing extra when Ollama unavailable"
    - "loadingMissions dep in useEffect — sequences tagline generation after missions complete"

key-files:
  created: []
  modified:
    - src/components/arise/BossEvent.tsx
    - src/components/arise/QuestBoard.tsx
    - src/components/arise/WorkoutEngine.tsx
    - src/components/arise/Arena.tsx

key-decisions:
  - "Arena useEffect dep array uses [matchStatus] not [matchStatus, state.user.rank] — rank is stable within a session, omitting prevents extra re-fire"
  - "QuestBoard generateLoreForQuest useCallback dep includes questLores — ensures already-generated quests are not re-fired"
  - "stagger 300ms per quest in QuestBoard rather than parallel — addresses RESEARCH.md pitfall about Ollama queue overload"
  - "settled flag in Arena.tsx prevents double state-set when both AI promise and fallbackTimer could theoretically fire near-simultaneously"
  - "workoutTagline cache key is 'workout' (no ID) — WorkoutEngine is a fresh mount each session so single key is sufficient"

patterns-established:
  - "Cache-first AI fetch: aiCache.has check gates every ollamaGenerate call — no regeneration on remount"
  - "Additive rendering: all AI content wrapped in {aiText && ...} — zero impact when Ollama unavailable"
  - "Stable dep arrays: use IDs (boss.id) rather than objects (boss) to prevent re-fire on unrelated updates"

requirements-completed: []

# Metrics
duration: 20min
completed: 2026-03-19
---

# Phase 13 Plan 02: AI Surface Wiring Summary

**4 game surfaces wired to Ollama AI via useEffect + aiCache pattern — BossBlurb, QuestLore (staggered), WorkoutTagline (sequenced), Arena opponent (Promise.race with settled-flag fallback)**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-19T08:00:00Z
- **Completed:** 2026-03-19T08:20:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- BossEvent.tsx: AI 2-sentence personality blurb renders below abilities chips via TypingText; keyed on boss.id to prevent re-fire on HP updates
- QuestBoard.tsx: Per-quest AI lore text (lazy, staggered 300ms apart) renders below each uncompleted quest name via TypingText
- WorkoutEngine.tsx: AI challenge tagline renders in select phase after missions finish loading (sequences calls to avoid Ollama overload)
- Arena.tsx: Promise.race pattern with settled flag — AI opponent name+taunt generated within 2500ms search window; OPPONENT_NAMES array preserved as reliable fallback
- All 4 surfaces use aiCache for session-scoped caching; all existing static data (BOSS_ROSTER, OPPONENT_NAMES, quest names) untouched; build passes 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire BossEvent.tsx — AI personality blurb below abilities** - `141056f` (feat)
2. **Task 2: Wire QuestBoard.tsx + WorkoutEngine.tsx — quest lore and workout tagline** - `eb55a0b` (feat)
3. **Task 3: Wire Arena.tsx — AI opponent name + taunt via Promise.race** - `18a8977` (feat)

## Files Created/Modified

- `src/components/arise/BossEvent.tsx` - Added generateBossBlurb import, aiBlurb state, useEffect with aiCache check, TypingText blurb between abilities and action buttons
- `src/components/arise/QuestBoard.tsx` - Added generateQuestLore import, questLores state (Record), generateLoreForQuest useCallback, staggered useEffect, TypingText lore below quest name
- `src/components/arise/WorkoutEngine.tsx` - Added generateWorkoutTagline import, workoutTagline state, useEffect chained on loadingMissions, TypingText tagline in select phase
- `src/components/arise/Arena.tsx` - Added generateArenaOpponent import, opponentTaunt + battleStartedAt state, replaced searching useEffect with settled-flag Promise.race, TypingText taunt in found screen

## Decisions Made

- Arena useEffect dep array uses `[matchStatus]` not `[matchStatus, state.user.rank]` — rank is stable within a session, omitting prevents unnecessary re-fire during matchmaking
- QuestBoard stagger 300ms per quest addresses RESEARCH.md pitfall about overloading Ollama's single-request queue
- settled flag in Arena prevents double state-set in the rare edge case where AI resolves at the exact moment the 2500ms timer fires
- workoutTagline cache key is `'workout'` (session-scoped string) — WorkoutEngine is always a fresh mount per session, no ID needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in `src/__tests__/chapterMapping.test.ts` (TS2871: always-nullish expression) — out of scope, unrelated to this plan's changes. Not fixed per deviation scope boundary rules.

## User Setup Required

None - no external service configuration required. Ollama availability configured in 13-01 via NEXT_PUBLIC_OLLAMA_URL env var.

## Next Phase Readiness

- All 4 AI surfaces are fully wired and production-ready
- AI content is additive and gracefully degrades when Ollama is unavailable
- Phase 13-03 (if it exists) can build on these surfaces or this phase completes the AI integration
- No blockers

---
*Phase: 13-ollama-ai-integration*
*Completed: 2026-03-19*
