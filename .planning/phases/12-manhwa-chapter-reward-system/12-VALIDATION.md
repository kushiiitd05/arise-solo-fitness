---
phase: 12
slug: manhwa-chapter-reward-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest / jest (existing Next.js setup) |
| **Config file** | none — use existing project test config |
| **Quick run command** | `npm run build` (type-check + compile) |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | DB migration | manual | `grep "chapters_unlocked" supabase/migrations/*.sql` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | Boss route increment | grep | `grep "chapters_unlocked" src/app/api/boss/complete/route.ts` | ✅ | ⬜ pending |
| 12-01-03 | 01 | 1 | Quest route increment | grep | `grep "chapters_unlocked" src/app/api/quests/update/route.ts` | ✅ | ⬜ pending |
| 12-01-04 | 01 | 1 | Session init mapping | grep | `grep "chapters_unlocked" src/app/page.tsx` | ✅ | ⬜ pending |
| 12-01-05 | 01 | 1 | GameState type | grep | `grep "chapters_unlocked" src/lib/gameReducer.ts` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | ChapterUnlockCeremony component | file | `test -f src/components/arise/ChapterUnlockCeremony.tsx` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | Dashboard chapter click handler | grep | `grep "window.open" src/app/page.tsx` | ✅ | ⬜ pending |
| 12-02-03 | 02 | 2 | CHAPTER notification dismiss duration | grep | `grep "CHAPTER" src/components/system/SystemWindow.tsx` | ✅ | ⬜ pending |
| 12-02-04 | 02 | 2 | Ceremony triggers on unlock | grep | `grep "ChapterUnlockCeremony" src/app/page.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/arise/ChapterUnlockCeremony.tsx` — stub file for ceremony component (Wave 1 fills it in)

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Boss kill triggers chapter unlock end-to-end | Phase 12 goal | Requires live Supabase + full game session | Complete a boss fight in dev, check chapters_unlocked incremented in DB, ceremony appears |
| All quests done triggers chapter unlock | Phase 12 goal | Requires live Supabase + full game session | Complete all daily quests in dev, check chapters_unlocked incremented, ceremony appears |
| Chapter 1 external link opens correctly | CONTEXT.md | window.open can't be unit tested | Click unlocked chapter in Dashboard, verify correct URL opens in new tab |
| Chapters 2-4 show "Source not yet available" | CONTEXT.md | UI-only message | Click locked or URL-less chapter, verify correct message appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
