import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/shadows/extract/route";
import { NextRequest } from "next/server";

// Mock supabaseServer
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  },
}));

const makeReq = (userId = "test-user-id") =>
  new NextRequest("http://localhost/api/shadows/extract", {
    method: "POST",
    headers: { authorization: `Bearer ${userId}` },
  });

describe("POST /api/shadows/extract", () => {
  it("returns 401 when no bearer token", async () => {
    const req = new NextRequest("http://localhost/api/shadows/extract", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when extraction_tokens = 0", async () => {
    const { supabaseServer } = await import("@/lib/supabase-server");
    const sb = supabaseServer as any;
    sb.from.mockReturnThis();
    sb.select.mockReturnThis();
    sb.eq.mockReturnThis();
    sb.maybeSingle.mockResolvedValueOnce({
      data: { extraction_tokens: 0, hunter_rank: "E" },
      error: null,
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("token");
  });

  it("returns complete:true when all shadows owned", async () => {
    const { supabaseServer } = await import("@/lib/supabase-server");
    const { SHADOWS_DB } = await import("@/lib/game/shadowSystem");
    const sb = supabaseServer as any;
    sb.from.mockReturnThis();
    sb.select.mockReturnThis();
    sb.eq.mockReturnThis();
    sb.update.mockReturnThis();
    // First call: user row
    sb.maybeSingle
      .mockResolvedValueOnce({ data: { extraction_tokens: 1, hunter_rank: "E" }, error: null })
      // Second call: owned shadows (all 17)
      .mockResolvedValueOnce({ data: SHADOWS_DB.map(s => ({ shadow_id: s.id })), error: null });
    const res = await POST(makeReq());
    const body = await res.json();
    expect(body.complete).toBe(true);
  });
});
