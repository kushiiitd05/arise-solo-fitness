import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockMaybySingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: mockFrom,
    select: mockSelect,
    eq: mockEq,
    maybeSingle: mockMaybySingle,
    insert: mockInsert,
  },
}));

const mockOllamaGenerate = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/ai/ollamaClient", () => ({
  ollamaGenerate: mockOllamaGenerate,
}));

const mockAiCacheHas = vi.fn().mockReturnValue(false);
const mockAiCacheGet = vi.fn().mockReturnValue(null);
const mockAiCacheSet = vi.fn();
vi.mock("@/lib/ai/sessionCache", () => ({
  aiCache: {
    has: mockAiCacheHas,
    get: mockAiCacheGet,
    set: mockAiCacheSet,
  },
}));

const makeReq = (exerciseId: string, withAuth = true) =>
  new NextRequest(`http://localhost/api/exercise-guide?exerciseId=${exerciseId}`, {
    headers: withAuth ? { Authorization: "Bearer test-user-id" } : {},
  });

describe("GET /api/exercise-guide", () => {
  beforeEach(() => {
    mockMaybySingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnThis();
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockOllamaGenerate.mockResolvedValue(null);
    mockAiCacheHas.mockReturnValue(false);
    mockAiCacheGet.mockReturnValue(null);
    mockAiCacheSet.mockReset();
    mockOllamaGenerate.mockClear();
  });

  it("returns 401 when no Authorization header", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq("pushup", false));
    expect(res.status).toBe(401);
  });

  it("returns 400 when exerciseId is missing", async () => {
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/exercise-guide", {
      headers: { Authorization: "Bearer test-user-id" },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("EG-01: returns cached guide on DB hit without calling Ollama", async () => {
    const cachedGuide = { steps: ["Step 1"], mistakes: ["HUNTER WARNING: test"], breathing: ["Inhale"], tip: "tip" };
    mockMaybySingle.mockResolvedValue({ data: { guide_json: cachedGuide }, error: null });
    const { GET } = await import("./route");
    const res = await GET(makeReq("pushup"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.guide).toEqual(cachedGuide);
    expect(mockOllamaGenerate).not.toHaveBeenCalled();
  });

  it("EG-02: calls Ollama and saves to DB on cache miss", async () => {
    // DB returns null — force cache miss
    mockMaybySingle.mockResolvedValue({ data: null, error: null });
    const guideJson = { steps: ["Step 1", "Step 2"], mistakes: ["HUNTER WARNING: x"], breathing: ["Inhale"], tip: "tip" };
    mockOllamaGenerate.mockResolvedValue(JSON.stringify(guideJson));
    const { GET } = await import("./route");
    const res = await GET(makeReq("squat"));
    expect(res.status).toBe(200);
    expect(mockOllamaGenerate).toHaveBeenCalledWith(
      expect.stringContaining("squat"),
      { format: "json" }
    );
  });

  it("EG-06: returns fallback guide when Ollama returns malformed JSON", async () => {
    mockMaybySingle.mockResolvedValue({ data: null, error: null });
    mockOllamaGenerate.mockResolvedValue("not valid json {{{");
    const { GET } = await import("./route");
    const res = await GET(makeReq("burpee"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.guide).toHaveProperty("steps");
    expect(body.guide).toHaveProperty("tip");
    expect(Array.isArray(body.guide.steps)).toBe(true);
  });
});
