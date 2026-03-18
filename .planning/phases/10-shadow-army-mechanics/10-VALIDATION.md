---
phase: 10
slug: shadow-army-mechanics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | Shadow seed migration | static | `grep -c "INSERT INTO" supabase/migrations/20260318000000_extraction_tokens.sql` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | buildWeightedPool + calculateModifiedStats | unit | `npx vitest run tests/shadowSystem.test.ts --reporter=verbose` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | POST /api/shadows/extract route | unit | `npx vitest run tests/api/shadows-extract.test.ts --reporter=verbose` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | extractionTokens gate in ShadowArmy | static | `grep -n "extractionTokens === 0" src/components/arise/ShadowArmy.tsx` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | Shadow merge in page.tsx syncSession | static | `grep -n "calculateModifiedStats" src/app/page.tsx` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | Army power header chip + onExtractionChange | static | `grep -n "ARMY POWER" src/components/arise/ShadowArmy.tsx` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 2 | SHADOWS panel army power display | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/shadowSystem.test.ts` — buildWeightedPool + calculateModifiedStats unit tests
- [ ] `tests/api/shadows-extract.test.ts` — extraction endpoint: 401, 400 no tokens, complete army

*Existing vitest infrastructure covers the framework; test files must be created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SHADOWS panel army power display | 10-02-03 | Visual rendering of composite stat bars | Open app, navigate to SHADOWS panel, verify total army power shown with contribution per shadow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
