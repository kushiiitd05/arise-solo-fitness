import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock supabase-server before importing the route
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

describe("GET /api/arena/history", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/arena/history", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns battles array when authenticated (empty in stub)", async () => {
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/arena/history", {
      method: "GET",
      headers: { Authorization: "Bearer test-user-id" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("battles");
    expect(Array.isArray(body.battles)).toBe(true);
  });
});
