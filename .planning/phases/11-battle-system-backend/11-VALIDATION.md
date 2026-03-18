---
phase: 11
slug: battle-system-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (or package.json scripts) |
| **Quick run command** | `npx vitest run src/lib/game/battleEngine` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/game/battleEngine`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | BATTLE-ENGINE | unit | `npx vitest run src/lib/game/battleEngine` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | MIGRATION | manual | `npx supabase db push --dry-run` | ✅ | ⬜ pending |
| 11-01-03 | 01 | 1 | BATTLE-API | integration | `curl -s POST /api/arena/battle` | ❌ W0 | ⬜ pending |
| 11-01-04 | 01 | 1 | HISTORY-API | integration | `curl -s GET /api/arena/history` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | ARENA-STATE | manual | UI smoke test — battle flow completes | ✅ | ⬜ pending |
| 11-02-02 | 02 | 2 | MOCK-REMOVAL | unit | `grep -r "MOCK_HISTORY" src/` exits non-zero | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/game/__tests__/battleEngine.test.ts` — unit test stubs for combat formula, CPI calculation, draw condition
- [ ] `src/app/api/arena/battle/route.test.ts` — integration test stubs for POST /api/arena/battle (mock Supabase)
- [ ] `src/app/api/arena/history/route.test.ts` — stub for GET /api/arena/history

*Wave 0 must create test files before plan execution begins so sampling has targets.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full battle flow in Arena UI | ARENA-STATE | Requires browser + auth session | Start dev server, navigate to Arena, accept opponent, submit reps, verify result card shows win/loss/draw with XP |
| pvp_rating persists across battles | RATING-PERSIST | DB state inspection | After 2 battles, query `user_stats` — `pvp_rating` must differ from initial value |
| History tab shows real battles | HISTORY-UI | Requires prior battle data | Complete a battle, open History tab, verify entry shows correct opponent/outcome/xp |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
