import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Shared mock state ---
const mockFrom = vi.fn();
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: { from: mockFrom },
}));

// Mock xpEngine for deterministic XP thresholds
vi.mock("@/lib/game/xpEngine", () => ({
  xpForLevel: vi.fn(() => 1000),
  nextRankInfo: vi.fn(() => ({ nextRank: "D", xpThreshold: 5000, levelThreshold: 10 })),
  rankFromLevelAndXp: vi.fn(() => "E"),
}));

// Mock questEngine for quest generation
vi.mock("@/lib/game/questEngine", () => ({
  generateDynamicDailyQuests: vi.fn(() => [
    { id: "q1", type: "PUSH_UPS", target: 20, completed: false, xp_reward: 100, difficulty: "NORMAL" },
  ]),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
});

function makeBearer(userId = "test-uuid") {
  return { Authorization: `Bearer ${userId}` };
}

function makeChain(data: any, error: any = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
}

// ─── Leg 1: Quest retrieval ───────────────────────────────────────────────────
describe("Game flow — Leg 1: GET /api/quests/daily returns quests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeChain({
      quests: [{ id: "q1", type: "PUSH_UPS", target: 20, completed: false, xp_reward: 100 }],
      all_completed: false,
    }));
  });

  it("returns quests array for authenticated user", async () => {
    const { GET } = await import("@/app/api/quests/daily/route");
    const req = new Request("http://localhost/api/quests/daily", {
      headers: makeBearer(),
    });
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.quests)).toBe(true);
  });

  it("returns 401 without Authorization header", async () => {
    const { GET } = await import("@/app/api/quests/daily/route");
    const req = new Request("http://localhost/api/quests/daily");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });
});

// ─── Leg 2: XP award ─────────────────────────────────────────────────────────
describe("Game flow — Leg 2: POST /api/xp/award increments XP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") return makeChain({ level: 1, current_xp: 0 });
      if (table === "user_stats") return makeChain({ total_xp_earned: 0, available_stat_points: 0 });
      return makeChain(null);
    });
  });

  it("awards XP to authenticated user and returns new values", async () => {
    const { POST } = await import("@/app/api/xp/award/route");
    const req = new Request("http://localhost/api/xp/award", {
      method: "POST",
      body: JSON.stringify({ amount: 100, reason: "quest_complete" }),
      headers: { "Content-Type": "application/json", ...makeBearer() },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.amountAwarded).toBe(100);
  });

  it("returns 401 without Authorization header", async () => {
    const { POST } = await import("@/app/api/xp/award/route");
    const req = new Request("http://localhost/api/xp/award", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});

// ─── Leg 3: Rank advance ─────────────────────────────────────────────────────
describe("Game flow — Leg 3: POST /api/rank/advance promotes hunter rank", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") return makeChain({ level: 10, current_xp: 0, hunter_rank: "E" });
      if (table === "user_stats") return makeChain({ total_xp_earned: 5000, available_stat_points: 0 });
      return makeChain(null);
    });
  });

  it("advances rank from E to D when both gates met and trial passed", async () => {
    const { POST } = await import("@/app/api/rank/advance/route");
    const req = new Request("http://localhost/api/rank/advance", {
      method: "POST",
      body: JSON.stringify({ trialPassed: true }),
      headers: { "Content-Type": "application/json", ...makeBearer() },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.newRank).toBe("D");
  });
});
