---
phase: 3
slug: gameplay-loop-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest / jest (Next.js default) |
| **Config file** | none — manual curl/fetch verification for API routes |
| **Quick run command** | `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer <token>" http://localhost:3000/api/inventory` |
| **Full suite command** | `npx tsc --noEmit && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit` (type-check)
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | 03-01 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | 03-01 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 1 | 03-02 | type-check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 1 | 03-02 | manual | `curl POST /api/quests/update` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | 03-02 | visual | Check Dashboard header in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (no new test files needed — verification via tsc + manual curl)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| POST /api/quests/update updates DB | 03-02 | Integration test needs auth token | curl -X POST with Bearer token, verify DB row updated |
| Dashboard STAMINA/MANA show real values | 03-02 | Visual verification | Load app, check header shows computed values not "94/100" hardcode |
| GET /api/inventory returns { equipped, unequipped } | 03-01 | Integration test needs auth token | curl -H "Authorization: Bearer <token>" /api/inventory |
| GET /api/shadows returns { shadows: [...] } | 03-01 | Integration test needs auth token | curl -H "Authorization: Bearer <token>" /api/shadows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
