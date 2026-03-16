import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase-server BEFORE any imports that might trigger it
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock("@/lib/game/xpEngine", () => ({
  rankFromLevelAndXp: vi.fn(() => "E"),
  nextRankInfo: vi.fn(() => ({
    nextRank: "D",
    xpThreshold: 5000,
    levelThreshold: 10,
  })),
}));

// Stub fetch for internal /api/xp/award call
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
});

describe("/api/rank/advance — dual-gate validation", () => {
  it("returns 401 when no Authorization header", async () => {
    // Import inside test to get fresh module after mocks
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/rank/advance", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("STUB: returns 403 when dual-gate conditions not met (implement in Plan 03)", async () => {
    // This test will be implemented fully when route.ts is created
    expect(true).toBe(true); // placeholder — remove when route is live
  });

  it("STUB: is idempotent — returns success without double-award if already advanced (implement in Plan 03)", async () => {
    expect(true).toBe(true); // placeholder — remove when route is live
  });

  it("STUB: awards +5 stat points and XP bonus on successful advance (implement in Plan 03)", async () => {
    expect(true).toBe(true); // placeholder — remove when route is live
  });
});

describe("/api/rank/advance — cooldown recording", () => {
  it("STUB: records trial_last_failed_at on failure route call (implement in Plan 03)", async () => {
    expect(true).toBe(true); // placeholder
  });
});
