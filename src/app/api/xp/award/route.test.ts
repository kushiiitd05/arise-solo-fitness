import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUser = { level: 1, current_xp: 0 };
const mockStats = { total_xp_earned: 0, available_stat_points: 0 };
const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: { from: mockFrom },
}));

vi.mock("@/lib/game/xpEngine", () => ({
  xpForLevel: vi.fn(() => 1000),
}));

function makeReq(body: object, withAuth = true) {
  return new Request("http://localhost/api/xp/award", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(withAuth ? { Authorization: "Bearer test-user-uuid" } : {}),
    },
  });
}

function makeChain(resolvedData: any, resolvedError: any = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError }),
  };
}

describe("/api/xp/award — auth", () => {
  it("returns 401 when no Authorization header", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({ amount: 100 }, false) as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });
});

describe("/api/xp/award — validation", () => {
  it("returns 400 when amount is 0", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({ amount: 0 }) as any);
    expect(res.status).toBe(400);
  });
});

describe("/api/xp/award — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") return makeChain(mockUser);
      if (table === "user_stats") return makeChain(mockStats);
      return makeChain(null);
    });
  });

  it("returns 200 with success:true when Bearer provided and amount valid", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({ amount: 100, reason: "quest" }) as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.newXp).toBe("number");
    expect(typeof data.newLevel).toBe("number");
  });
});
