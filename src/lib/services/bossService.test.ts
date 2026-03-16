import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase module to prevent env-var crash at import time
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(), update: vi.fn(), insert: vi.fn(), eq: vi.fn() })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  },
}));

// Mock xpService (currently imported by bossService — will be removed in GREEN phase)
vi.mock("@/lib/services/xpService", () => ({
  awardXp: vi.fn(),
}));

// Mock fetch globally
const fetchMock = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", fetchMock);

// Import after mocks are set up
const { BOSS_RANK_XP, awardRaidReward } = await import("@/lib/services/bossService");

describe("BOSS_RANK_XP", () => {
  it("E rank awards 200 XP", () => expect(BOSS_RANK_XP["E"]).toBe(200));
  it("D rank awards 500 XP", () => expect(BOSS_RANK_XP["D"]).toBe(500));
  it("C rank awards 1000 XP", () => expect(BOSS_RANK_XP["C"]).toBe(1_000));
  it("B rank awards 2000 XP", () => expect(BOSS_RANK_XP["B"]).toBe(2_000));
  it("A rank awards 5000 XP", () => expect(BOSS_RANK_XP["A"]).toBe(5_000));
  it("S rank awards 10000 XP", () => expect(BOSS_RANK_XP["S"]).toBe(10_000));
  it("MONARCH rank is defined (not undefined)", () => expect(BOSS_RANK_XP["MONARCH"]).toBeDefined());
  it("MONARCH rank awards 10000 XP", () => expect(BOSS_RANK_XP["MONARCH"]).toBe(10_000));
});

describe("awardRaidReward", () => {
  beforeEach(() => fetchMock.mockClear());

  it("POSTs to /api/xp/award with correct body", async () => {
    await awardRaidReward("user-123", 1_000);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/xp/award");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.userId).toBe("user-123");
    expect(body.amount).toBe(1_000);
    expect(body.reason).toBe("boss_kill");
  });

  it("does nothing for local-user", async () => {
    await awardRaidReward("local-user", 1_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing for empty userId", async () => {
    await awardRaidReward("", 1_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
