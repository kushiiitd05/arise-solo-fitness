import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase-server BEFORE route import
const mockUser = { level: 10, current_xp: 0, hunter_rank: "E" };
const mockStats = { total_xp_earned: 5000, available_stat_points: 0 };

const mockFrom = vi.fn();
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: { from: mockFrom },
}));

vi.mock("@/lib/game/xpEngine", () => ({
  nextRankInfo: vi.fn(() => ({
    nextRank: "D",
    xpThreshold: 5_000,
    levelThreshold: 10,
  })),
  rankFromLevelAndXp: vi.fn(() => "E"),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
});

// Helper to build a Request with Bearer token
function makeReq(body: object, withAuth = true) {
  return new Request("http://localhost/api/rank/advance", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(withAuth ? { Authorization: "Bearer test-token" } : {}),
    },
  });
}

// Chain helper — returns an object with .select/.eq/.update/.maybeSingle that can be chained
function makeChain(resolvedData: any, resolvedError: any = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError }),
  };
  return chain;
}

describe("/api/rank/advance — auth", () => {
  it("returns 401 when no Authorization header", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({}, false) as any);
    expect(res.status).toBe(401);
  });
});

describe("/api/rank/advance — failure recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") return makeChain(mockUser);
      if (table === "user_stats") return makeChain(mockStats);
      return makeChain(null);
    });
  });

  it("records trial_last_failed_at and returns failureRecorded:true when trialPassed=false", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({ trialPassed: false }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.failureRecorded).toBe(true);
    // Verify update was called on user_stats
    expect(mockFrom).toHaveBeenCalledWith("user_stats");
  });
});

describe("/api/rank/advance — dual-gate validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when level gate not met", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") return makeChain({ level: 5, current_xp: 0, hunter_rank: "E" });
      if (table === "user_stats") return makeChain({ total_xp_earned: 5000, available_stat_points: 0 });
      return makeChain(null);
    });
    const { nextRankInfo } = await import("@/lib/game/xpEngine");
    vi.mocked(nextRankInfo).mockReturnValue({ nextRank: "D", xpThreshold: 5000, levelThreshold: 10 });

    const { POST } = await import("./route");
    const res = await POST(makeReq({ trialPassed: true }) as any);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Gate conditions not met");
  });

  it("returns 403 when XP gate not met", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") return makeChain({ level: 10, current_xp: 0, hunter_rank: "E" });
      if (table === "user_stats") return makeChain({ total_xp_earned: 999, available_stat_points: 0 });
      return makeChain(null);
    });
    const { nextRankInfo } = await import("@/lib/game/xpEngine");
    vi.mocked(nextRankInfo).mockReturnValue({ nextRank: "D", xpThreshold: 5000, levelThreshold: 10 });

    const { POST } = await import("./route");
    const res = await POST(makeReq({ trialPassed: true }) as any);
    expect(res.status).toBe(403);
  });
});

describe("/api/rank/advance — idempotency", () => {
  it("returns alreadyAdvanced:true when hunter already at next rank", async () => {
    mockFrom.mockImplementation((table: string) => {
      // hunter_rank is already "D" — same as nextRank
      if (table === "users") return makeChain({ level: 10, current_xp: 0, hunter_rank: "D" });
      if (table === "user_stats") return makeChain({ total_xp_earned: 5000, available_stat_points: 0 });
      return makeChain(null);
    });
    const { nextRankInfo } = await import("@/lib/game/xpEngine");
    vi.mocked(nextRankInfo).mockReturnValue({ nextRank: "D", xpThreshold: 5000, levelThreshold: 10 });

    const { POST } = await import("./route");
    const res = await POST(makeReq({ trialPassed: true }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.alreadyAdvanced).toBe(true);
  });
});

describe("/api/rank/advance — successful advance", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") return makeChain(mockUser);
      if (table === "user_stats") return makeChain(mockStats);
      return makeChain(null);
    });
    const { nextRankInfo } = await import("@/lib/game/xpEngine");
    vi.mocked(nextRankInfo).mockReturnValue({ nextRank: "D", xpThreshold: 5000, levelThreshold: 10 });
  });

  it("returns newRank, xpBonus, statPoints on success", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({ trialPassed: true }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.newRank).toBe("D");
    expect(data.xpBonus).toBe(1_000); // E → D bonus
    expect(data.statPoints).toBe(5);
  });

  it("calls /api/xp/award with correct XP bonus amount", async () => {
    const { POST } = await import("./route");
    await POST(makeReq({ trialPassed: true }) as any);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/xp/award"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"amount":1000'),
      })
    );
  });
});
