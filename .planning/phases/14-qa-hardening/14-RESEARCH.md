# Phase 14: QA & Hardening — Research

**Researched:** 2026-03-19
**Domain:** React error boundaries, Supabase RLS audit, vitest E2E integration tests, loading state patterns
**Confidence:** HIGH

---

## Summary

Phase 14 is a hardening pass over all 13 previously built phases. It has two distinct work streams: (1) adding React error boundaries and auditing loading states across every panel, and (2) auditing Supabase RLS policies and verifying the full auth flow end-to-end.

The codebase has no React error boundaries anywhere — every component is wrapped in nothing, meaning an unhandled exception in any panel will white-screen the entire app. Loading states exist in 7 components but vary in implementation quality (some use `Loader2` spinners, others use raw boolean flags, the ExerciseGuideModal uses a proper skeleton). The RLS situation has clear gaps: `arena_battles` (Phase 11) was created with no RLS policies. The `xp/award` and `quests/daily` routes accept `userId` from the request body/query string rather than Bearer header — which is an auth bypass risk.

**Primary recommendation:** Build one shared `<ErrorBoundary>` class component, wrap all panels in Dashboard, then audit and close the three known RLS/auth gaps: arena_battles RLS, xp/award no-Bearer-auth, quests/daily GET no-Bearer-auth.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.3 | Error boundaries (class component) | Only class components can implement componentDidCatch |
| vitest | 4.1.0 | Unit + integration test runner | Already installed; project pattern |
| @supabase/supabase-js | 2.99.1 | RLS policy verification via local Supabase CLI | Already in devDependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | 12.35.2 | Error boundary fallback animations | Keep aesthetic consistent with rest of UI |
| lucide-react | 0.577.0 | Error state icons (ShieldAlert, RefreshCw) | Already used in all components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled ErrorBoundary | react-error-boundary package | react-error-boundary is cleaner but adds a dep; class component is 40 lines and sufficient for this codebase |

**Installation:**
```bash
# No new packages needed — all tools already installed
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── system/
│       └── ErrorBoundary.tsx     # New: reusable class component
├── app/
│   └── api/
│       └── xp/award/route.ts     # Patch: add Bearer auth check
│       └── quests/daily/route.ts # Patch: add Bearer auth to GET
└── supabase/
    └── migrations/
        └── 20260320000001_arena_battles_rls.sql  # New: RLS for arena_battles
```

### Pattern 1: React Error Boundary (class component)
**What:** Class component with `componentDidCatch` that renders a fallback UI instead of crashing the whole app.
**When to use:** Wrap every panel rendered inside Dashboard — WorkoutEngine, QuestBoard, Arena, BossEvent, ShadowArmy, Inventory, Profile, RankTrialEngine, etc.
**Example:**
```typescript
// Source: React 19 official docs — https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
          <ShieldAlert size={24} />
          <p className="text-sm">System error — panel unavailable</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Pattern 2: Consistent Loading State Shape
**What:** Every data-fetching component should render a skeleton/spinner during load and a clear error message on failure. The existing pattern uses `isLoading` + `Loader2` icon.
**When to use:** Any component that calls an API on mount (Inventory, ShadowArmy, QuestBoard, Leaderboard, GuildHall, WorkoutEngine, ExerciseGuideModal).
**Standard pattern already in use:**
```typescript
// Observed in ExerciseGuideModal (the cleanest implementation):
if (loading) return <div className="animate-pulse ..."><Loader2 className="animate-spin" /></div>;
if (error) return <div className="text-red-400">{error}</div>;
```

### Pattern 3: RLS Migration
**What:** Each new table needs `ENABLE ROW LEVEL SECURITY` and at minimum a SELECT policy in its migration.
**When to use:** Any table containing user data that was created in phases 11–15 without RLS.
**Example:**
```sql
-- Source: Supabase RLS docs + existing migration pattern (20260312000000_rls_policies.sql)
ALTER TABLE public.arena_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own battle history"
  ON public.arena_battles FOR SELECT
  USING (auth.uid() = user_id);
```

### Pattern 4: Bearer-only Auth for Write Routes
**What:** All API routes that write state must use `getUserId()` extracting from `Authorization: Bearer <userId>` header only.
**The gap:** `/api/xp/award` accepts `userId` from request body. `/api/quests/daily` GET accepts `userId` from query string. These bypass the established security pattern.
**Fix pattern (already correct in other routes):**
```typescript
// Source: 13 existing routes that already do this correctly
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
```

### Anti-Patterns to Avoid
- **Global error handler only:** `window.onerror` or `useEffect` error catches won't catch render-phase errors. Must use class component `componentDidCatch`.
- **One boundary for the whole app:** If a single boundary wraps Dashboard, one bad panel takes down the whole game UI. Wrap each panel individually.
- **RLS on writes only:** The existing RLS policies only cover SELECT for inventory/shadows/user_inventory. Server routes use service-role key (bypasses RLS), so write-side RLS policies are optional. But missing SELECT RLS means the anon client can read other users' data.
- **Skipping the `arena_battles` table:** This table was created in Phase 11 with no RLS migration. The service-role key bypasses it for server routes, but direct anon-client access would expose all battle records.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error boundary | Custom useEffect error detection | React class `componentDidCatch` | Hooks cannot catch render-phase errors |
| Loading skeletons | Custom CSS pulse animations | Tailwind `animate-pulse` (already in ExerciseGuideModal) | Consistent with existing codebase pattern |
| RLS policy testing | Manual Supabase dashboard checks | `supabase db diff` + documented verification checklist in PLAN | Repeatable, auditable |

**Key insight:** React error boundaries are one of the few remaining class component patterns in React 19 — hooks cannot replace them.

---

## Common Pitfalls

### Pitfall 1: Error Boundary Does Not Catch Async Errors
**What goes wrong:** `componentDidCatch` only catches errors during render and lifecycle methods. An uncaught promise rejection in a `useEffect` (e.g. a failed fetch) will NOT be caught by the boundary.
**Why it happens:** Async errors are not part of the React render tree.
**How to avoid:** Use try/catch in all async useEffect bodies and set an `error` state variable. ErrorBoundary covers sync render crashes only.
**Warning signs:** Error boundary appears to do nothing when an API call fails.

### Pitfall 2: Bearer Token Is the User ID (Not a JWT)
**What goes wrong:** The project's auth pattern passes the Supabase user UUID directly as the Bearer token (`Authorization: Bearer <uuid>`). This is not a signed JWT. A malicious client can forge any user ID.
**Why it happens:** This is the existing project decision (from Phase 1 audit). The RLS policies on the server side would normally mitigate this, but since server routes use service-role key (which bypasses RLS), the server trusts the UUID from the header unconditionally.
**How to avoid:** For Phase 14, document this as a known limitation. Do not change the auth pattern — it is a locked project decision across 13 phases. Do verify that no route uses the userId from body/query for writes without the header check.
**Warning signs:** `/api/xp/award` currently accepts `userId` from body — this is the exact gap to fix.

### Pitfall 3: Missing RLS on arena_battles Allows Cross-User Read
**What goes wrong:** `arena_battles` table has no RLS. Any authenticated user can query `SELECT * FROM arena_battles` via the anon client and see all users' battle history.
**Why it happens:** Phase 11 migration only created the table and indexes — RLS was not included.
**How to avoid:** Add a new migration with `ENABLE ROW LEVEL SECURITY` and a SELECT policy using `auth.uid() = user_id`.
**Warning signs:** The migration file `20260319000000_arena_battles.sql` has no policy creation statements.

### Pitfall 4: Service-Role Key Bypasses RLS (Intentional)
**What goes wrong:** Developers may believe RLS protects server routes. It does not — `supabaseServer` uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses all RLS.
**Why it happens:** This is intentional (documented in `supabase-server.ts` comments).
**How to avoid:** RLS protects the anon client path. The server route auth check (`getUserId()` Bearer header) is the actual security layer for server routes. Both layers matter — the Phase 14 audit must verify both.

### Pitfall 5: Leaderboard Has Dead Import
**What goes wrong:** `Leaderboard.tsx` imports `supabase` from `@/lib/supabase` but never calls it directly (the component delegates to `leaderboardService`).
**Why it happens:** Likely a remnant from before the service layer was extracted.
**How to avoid:** Remove the dead import in Plan 14-01 as part of the loading state audit.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Error Boundary Wrapping in Dashboard
```typescript
// Pattern: wrap each panel in its own boundary so one crash doesn't kill everything
{showWorkout && (
  <ErrorBoundary>
    <WorkoutEngine state={state} dispatch={dispatch} onClose={() => setShowWorkout(false)} />
  </ErrorBoundary>
)}
```

### vitest E2E Flow Test (unit level — no browser)
```typescript
// Source: existing pattern in src/app/api/rank/advance/route.test.ts
// The project's E2E tests are server-route integration tests, not Playwright E2E
describe("signup -> quest -> levelup -> rank trial flow", () => {
  it("quest completion increments level when XP threshold is met", async () => {
    // mock supabase-server, drive POST /api/quests/update, check response
  });
});
```

### RLS Verification Query (for documentation in PLAN)
```sql
-- Run against local Supabase to audit RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Auth Gap Fix in xp/award
```typescript
// Source: pattern from all 13 other routes that do this correctly
// Replace body-based userId with header-based userId
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);  // was: const { userId } = body
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No error boundaries | class ErrorBoundary with componentDidCatch | React 16+ (still required in React 19) | Prevents white-screen on panel crash |
| Playwright for E2E | vitest server-route integration tests | Project decision (phases 6+) | No browser automation needed; test the API layer |

**Deprecated/outdated:**
- `react-error-boundary` v3 used `FallbackComponent` prop — v4 uses `fallbackRender`. Neither is needed here; class component is sufficient and adds no dependency.

---

## RLS Audit Summary

| Table | RLS Enabled | SELECT Policy | INSERT Policy | Notes |
|-------|-------------|---------------|---------------|-------|
| users | YES | users own row | NO (writes via service-role) | OK |
| user_stats | YES | users own row | NO | OK |
| daily_quests | YES | users own row (ALL) | via ALL policy | OK |
| user_inventory | YES | users own row | NO | OK |
| user_shadows | YES | users own row | NO | OK |
| guilds | YES | public read | NO | OK |
| guild_members | YES | public read | NO | OK |
| guild_chat_messages | YES | members only | members only | OK |
| manhwa_chapters | YES | public read | NO | OK |
| user_chapters | YES | users own row | NO | OK |
| pvp_battles | YES | participants | NO | OK (legacy table) |
| **arena_battles** | **NO** | **MISSING** | **MISSING** | **GAP — Phase 11** |
| exercise_guides | YES | authenticated | NO | OK |
| user_exercise_images | YES | users own row | NO | OK |
| extraction_tokens (column) | N/A — column on users | via users RLS | N/A | OK |

**Route auth audit:**

| Route | Auth Method | Gap? |
|-------|-------------|------|
| POST /api/user | Bearer header | OK |
| GET /api/inventory | Bearer header | OK |
| POST /api/inventory/equip | Bearer header | OK |
| GET /api/shadows | Bearer header | OK |
| POST /api/shadows/extract | Bearer header | OK |
| POST /api/quests/update | Bearer header | OK |
| GET /api/quests/daily | **userId query param** | **GAP — no auth** |
| POST /api/quests/daily | body userId (no Bearer) | **GAP — no Bearer check** |
| POST /api/xp/award | **body userId (no Bearer)** | **GAP — auth bypass risk** |
| GET /api/leaderboard | No auth (public) | OK — public data |
| POST /api/boss/complete | Bearer header | OK |
| POST /api/arena/battle | Bearer header | OK |
| GET /api/arena/history | Bearer header | OK |
| POST /api/rank/advance | Bearer header | OK |
| GET /api/exercise-guide | No auth (public cache) | OK — shared data |
| POST /api/exercise-guide/visual-unlock | Bearer header | OK |

---

## Open Questions

1. **Is the Bearer=UUID pattern intentionally not a real JWT?**
   - What we know: All routes use `Authorization: Bearer <user_uuid>` where the value is the Supabase user UUID, not a signed token. This is verifiable from the existing route tests.
   - What's unclear: Whether this was an intentional simplification or a gap that grew into a pattern.
   - Recommendation: Treat as a locked project decision (documented across 13 phases). Phase 14 hardening should patch the three routes that don't follow even this pattern, not redesign the auth layer.

2. **Should the flow test cover the full signup → quest → levelup → rank trial sequence as one vitest file?**
   - What we know: Individual route tests exist for rank/advance, arena/battle, and exercise-guide. No multi-step flow test exists.
   - What's unclear: Whether the planner wants a single orchestrated flow test file or separate route tests for each leg.
   - Recommendation: One flow test file (`src/__tests__/gameFlow.test.ts`) that chains mocked route calls in sequence to prove the happy path. This is the "E2E" referenced in the phase goal, not a Playwright test.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` (root, already exists) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

No formal requirement IDs assigned to Phase 14. Mapping against the two plan goals:

| Goal | Behavior | Test Type | Automated Command | File Exists? |
|------|----------|-----------|-------------------|-------------|
| 14-01: Error boundaries | ErrorBoundary renders fallback on throw | unit | `npx vitest run src/components/system/ErrorBoundary.test.tsx` | No — Wave 0 |
| 14-01: Loading states | Loading prop renders spinner, not content | unit (snapshot) | N/A — visual audit | Manual only |
| 14-02: RLS audit | arena_battles has RLS enabled | manual/SQL | `supabase db diff` | Manual only |
| 14-02: Auth flow | /api/xp/award returns 401 without Bearer | unit | `npx vitest run src/app/api/xp/award/route.test.ts` | No — Wave 0 |
| 14-02: Auth flow | /api/quests/daily GET requires auth | unit | `npx vitest run src/app/api/quests/daily/route.test.ts` | No — Wave 0 |
| 14-02: E2E flow | Quest completion increments XP + level in sequence | integration | `npx vitest run src/__tests__/gameFlow.test.ts` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/system/ErrorBoundary.test.tsx` — covers error boundary fallback rendering
- [ ] `src/app/api/xp/award/route.test.ts` — covers Bearer auth 401 + successful XP award
- [ ] `src/app/api/quests/daily/route.test.ts` — covers GET auth + POST generation
- [ ] `src/__tests__/gameFlow.test.ts` — covers signup→quest→levelup→rank trial happy path (mocked supabase)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase audit — 13 API route files, 20 component files, 9 migration files examined
- `supabase/migrations/20260312000000_rls_policies.sql` — baseline RLS policies
- `supabase/migrations/20260319000000_arena_battles.sql` — confirmed no RLS
- `src/app/api/xp/award/route.ts` — confirmed body-userId pattern
- `src/app/api/quests/daily/route.ts` — confirmed query-param userId pattern
- `vitest.config.ts` — confirmed test framework and config
- React 19 official docs (https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) — error boundary class component API

### Secondary (MEDIUM confidence)
- Existing test patterns in `src/app/api/rank/advance/route.test.ts` — mocking strategy for server routes

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already in codebase, no new dependencies
- Architecture: HIGH — based on direct code audit of all 20 component files and 16 API routes
- Pitfalls: HIGH — all pitfalls identified from specific file evidence, not speculation
- RLS audit: HIGH — every migration file read and tabulated

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain — React error boundaries and Supabase RLS patterns don't change rapidly)
