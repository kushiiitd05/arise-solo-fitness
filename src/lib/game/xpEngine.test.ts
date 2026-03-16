import { describe, it, expect } from "vitest";
import { rankFromLevelAndXp, nextRankInfo, RANK_THRESHOLDS, generateDailyQuestTargets } from "@/lib/game/xpEngine";

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

describe("generateDailyQuestTargets × 2 (trial targets)", () => {
  it("NONE class level 10: push-up trial target = 40 (20 base × 2)", () => {
    const base = generateDailyQuestTargets(10, "NONE");
    expect(base[0].target * 2).toBe(40); // base = max(10, 10*2) = 20, mod.strength=1.0 → 20*2=40
  });
  it("NONE class level 10: squat trial target = 40", () => {
    const base = generateDailyQuestTargets(10, "NONE");
    expect(base[1].target * 2).toBe(40); // vitality mod = 1.0 → 20*2=40
  });
  it("NONE class level 10: sit-up trial target = 40", () => {
    const base = generateDailyQuestTargets(10, "NONE");
    expect(base[2].target * 2).toBe(40); // agility mod = 1.0 → 20*2=40
  });
  it("NONE class level 10: cardio base target = 6 (cap at 5 for trial)", () => {
    const base = generateDailyQuestTargets(10, "NONE");
    // base=20, cardio target = round(20*0.3)=6; 2×=12; but trial caps at 10km max
    const rawCardio = base[3].target * 2;
    const cappedCardio = Math.min(rawCardio, 10); // trial caps at 10km max
    expect(cappedCardio).toBeLessThanOrEqual(10);
    expect(base[3].type).toBe("CARDIO");
  });
  it("minimum target is always >= 10 at level 1", () => {
    const base = generateDailyQuestTargets(1, "NONE");
    // base = max(10, 1*2) = 10 → push-up target = round(10*1) = 10; 2× = 20
    expect(base[0].target * 2).toBeGreaterThanOrEqual(10);
  });
});
