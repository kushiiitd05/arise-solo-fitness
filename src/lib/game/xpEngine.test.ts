import { describe, it, expect } from "vitest";
import { rankFromLevelAndXp, nextRankInfo, RANK_THRESHOLDS } from "@/lib/game/xpEngine";

describe("rankFromLevelAndXp", () => {
  it("returns E for fresh hunter", () => {
    expect(rankFromLevelAndXp(1, 0)).toBe("E");
  });
  it("returns E when level met but XP not met", () => {
    expect(rankFromLevelAndXp(10, 4999)).toBe("E");
  });
  it("returns E when XP met but level not met", () => {
    expect(rankFromLevelAndXp(9, 5000)).toBe("E");
  });
  it("returns D when both gates met exactly", () => {
    expect(rankFromLevelAndXp(10, 5000)).toBe("D");
  });
  it("returns NATIONAL when both NATIONAL gates met", () => {
    expect(rankFromLevelAndXp(90, 1_000_000)).toBe("NATIONAL");
  });
});

describe("nextRankInfo", () => {
  it("E → D with correct thresholds", () => {
    const info = nextRankInfo("E");
    expect(info.nextRank).toBe("D");
    expect(info.xpThreshold).toBe(5_000);
    expect(info.levelThreshold).toBe(10);
  });
  it("S → NATIONAL", () => {
    const info = nextRankInfo("S");
    expect(info.nextRank).toBe("NATIONAL");
    expect(info.xpThreshold).toBe(1_000_000);
    expect(info.levelThreshold).toBe(90);
  });
  it("NATIONAL returns null nextRank (max rank)", () => {
    const info = nextRankInfo("NATIONAL");
    expect(info.nextRank).toBeNull();
  });
});
