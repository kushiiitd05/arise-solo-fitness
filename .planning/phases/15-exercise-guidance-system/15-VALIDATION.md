---
phase: 15
slug: exercise-guidance-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | `vitest.config.ts` (root — exists, `@` alias configured) |
| **Quick run command** | `npx vitest run src/app/api/exercise-guide` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/api/exercise-guide`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | EG-01, EG-02 | unit | `npx vitest run src/app/api/exercise-guide/route.test.ts -t "returns cached guide"` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | EG-03, EG-04, EG-05 | unit | `npx vitest run src/app/api/exercise-guide/visual-unlock/route.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | EG-06 | unit | `npx vitest run src/app/api/exercise-guide/route.test.ts -t "fallback guide"` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 2 | EG-UI-01 | manual | Visual: guide modal renders text guide steps | n/a | ⬜ pending |
| 15-02-02 | 02 | 2 | EG-UI-02 | manual | Visual: mana gating button states and animations | n/a | ⬜ pending |
| 15-03-01 | 03 | 3 | EG-INT-01 | manual | Visual: guide button appears on each exercise card in WorkoutEngine | n/a | ⬜ pending |
| 15-03-02 | 03 | 3 | EG-INT-02 | manual | Visual: workout timer continues while guide modal is open | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/api/exercise-guide/route.test.ts` — stubs for EG-01, EG-02, EG-06 (vi.mock supabase-server + ollamaClient)
- [ ] `src/app/api/exercise-guide/visual-unlock/route.test.ts` — stubs for EG-03, EG-04, EG-05 (vi.mock supabase-server)

Both test files need:
- `vi.mock('@/lib/supabase-server')` — per Phase 6/9 patterns
- `vi.mock('@/lib/ai/ollamaClient')` — mock ollamaGenerate

*Existing vitest infrastructure covers the rest — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Guide modal opens with Solo Leveling aesthetic | EG-UI-01 | Visual rendering only | Open guide modal, verify SystemWindow frame, cyan accents, font-exo |
| Mana button glow + shake animations | EG-UI-02 | Animation timing requires browser | Hover unlock button (glow), click with 0 mana (shake), verify "Insufficient Mana" tooltip |
| Workout timer not blocked during guide open | EG-INT-02 | Runtime concurrency | Open guide mid-workout, verify rep counter / timer still increments |
| Image reveal fade-in + scale animation | EG-VIS-01 | Visual animation | Unlock visual mode, verify smooth fade-in + scale of image below text |
| "Visual guidance acquired" system message | EG-VIS-02 | UI state text | After unlock, verify message appears and button replaced with badge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
