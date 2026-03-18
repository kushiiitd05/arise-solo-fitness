import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock supabase-server before importing the route
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
  },
}));

// Mock battleEngine — pure functions tested separately in battleEngine.test.ts
vi.mock("@/lib/game/battleEngine", () => ({
  computeCPI: vi.fn().mockReturnValue(10),
  computePerfMod: vi.fn().mockReturnValue(0),
  computeWinProbability: vi.fn().mockReturnValue(0.5),
  rollOutcome: vi.fn().mockReturnValue("WIN"),
  generateOpponentStats: vi.fn().mockReturnValue({
    name: "IRON SHADOW",
    rank: "D",
    stats: { strength: 12, agility: 12, vitality: 12, intelligence: 12 },
    baseRating: 1000,
  }),
  XP_BY_RANK: { D: { win: 150, draw: 38, loss: 0 } },
  TARGET_REPS: { "PUSH-UPS": 50, "SQUATS": 40, "SIT-UPS": 40, "PLANKS": 60 },
}));

vi.mock("@/lib/game/xpEngine", () => ({
  calculateRatingChange: vi.fn().mockReturnValue(16),
}));

describe("POST /api/arena/battle", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/arena/battle", {
      method: "POST",
      body: JSON.stringify({ exercise: "PUSH-UPS", repsSubmitted: 30, opponentName: "IRON SHADOW", opponentRank: "D" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when exercise is missing from request body", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/arena/battle", {
      method: "POST",
      body: JSON.stringify({ repsSubmitted: 30 }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-user-id",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
