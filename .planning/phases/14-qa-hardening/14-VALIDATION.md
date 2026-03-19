---
phase: 14
slug: qa-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | ErrorBoundary component | unit | `npx vitest run src/components/system/ErrorBoundary` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | Loading state audit | integration | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 14-02-01 | 02 | 1 | RLS migration | manual | supabase migration apply | ✅ | ⬜ pending |
| 14-02-02 | 02 | 1 | Auth gap fixes | unit | `npx vitest run src/app/api` | ✅ | ⬜ pending |
| 14-02-03 | 02 | 2 | E2E flow integration test | integration | `npx vitest run src/__tests__/e2e-flow` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/system/ErrorBoundary.test.tsx` — stubs for ErrorBoundary render crash handling
- [ ] `src/__tests__/e2e-flow.test.ts` — stubs for signup→quest→levelup→rank-trial flow

*Existing infrastructure (vitest) covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS policies active on arena_battles | DB security | Requires live Supabase instance | Run migration, check `psql` for `row_security = on` on `arena_battles` |
| Error boundary visual rendering | UI fallback | Requires browser | Manually throw in a component, verify fallback UI renders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
