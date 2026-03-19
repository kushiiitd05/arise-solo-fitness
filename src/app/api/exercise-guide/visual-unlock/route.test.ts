import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// DB mock — configurable per test
const mockMaybySingle = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn().mockReturnThis();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: mockFrom,
    select: mockSelect,
    eq: mockEq,
    maybeSingle: mockMaybySingle,
    insert: mockInsert,
    update: mockUpdate,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

const makeReq = (body: object, withAuth = true) =>
  new NextRequest("http://localhost/api/exercise-guide/visual-unlock", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(withAuth ? { Authorization: "Bearer test-user-id" } : {}),
    },
  });

describe("POST /api/exercise-guide/visual-unlock", () => {
  beforeEach(() => {
    mockMaybySingle.mockReset();
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnThis();
    mockEq.mockReturnThis();
    mockSelect.mockReturnThis();
    mockFrom.mockReturnThis();
  });

  it("returns 401 when no Authorization header", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({ exerciseId: "pushup" }, false));
    expect(res.status).toBe(401);
  });

  it("returns 400 when exerciseId is missing", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("EG-05: returns 402 when mana is insufficient", async () => {
    // user has intelligence=5, level=1, mana_spent=4 → available = (5*1)-4 = 1 → but let's set spent=6 → available=-1 < 1
    mockMaybySingle
      .mockResolvedValueOnce({ data: null, error: null }) // image lookup: not found
      .mockResolvedValueOnce({ data: { intelligence: 5, level: 1, mana_spent: 6 }, error: null }); // user stats
    const { POST } = await import("./route");
    const res = await POST(makeReq({ exerciseId: "pushup" }));
    expect(res.status).toBe(402);
  });

  it("EG-04: is idempotent — returns existing imageUrl without mana charge", async () => {
    // Image already exists for this user/exercise
    mockMaybySingle.mockResolvedValueOnce({
      data: { image_url: "https://image.pollinations.ai/prompt/pushups" },
      error: null,
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq({ exerciseId: "pushup" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageUrl).toBe("https://image.pollinations.ai/prompt/pushups");
    // mana_spent update should NOT have been called
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("EG-03: deducts mana and returns new imageUrl on successful unlock", async () => {
    mockMaybySingle
      .mockResolvedValueOnce({ data: null, error: null }) // no existing image
      .mockResolvedValueOnce({ data: { intelligence: 10, level: 5, mana_spent: 0 }, error: null }); // user stats: mana = 50, available = 50
    // mockUpdate chains: update().eq() => resolved promise for the UPDATE statement
    mockUpdate.mockReturnThis();
    // mockEq must remain mockReturnThis() for chaining — the update eq is the last call before await
    // The route does: .update(...).eq("user_id", userId) — eq is the terminal call awaited via Promise chain
    // Since mockEq returns `this` (the supabaseServer mock), and that object is awaited as a Promise,
    // we need to make the mock thenable. Keep mockEq as mockReturnThis and let the await resolve undefined.
    const { POST } = await import("./route");
    const res = await POST(makeReq({ exerciseId: "squat" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageUrl).toContain("pollinations.ai");
    expect(body.imageUrl).toContain("squat");
    expect(mockInsert).toHaveBeenCalled();
  });
});
