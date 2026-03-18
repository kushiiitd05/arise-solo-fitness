import { describe, it, expect } from "vitest";
import { buildWeightedPool, SHADOWS_DB } from "@/lib/game/shadowSystem";
import { calculateModifiedStats } from "@/lib/game/shadowSystem";
import { initialState } from "@/lib/gameReducer";

describe("buildWeightedPool", () => {
  it("returns empty array when all shadows owned", () => {
    const all = new Set(SHADOWS_DB.map(s => s.id));
    expect(buildWeightedPool("E", all)).toHaveLength(0);
  });

  it("excludes already-owned shadows", () => {
    const ownedIds = new Set(["a1b2c3d4-0016-0000-0000-000000000016"]); // Shadow Soldier
    const pool = buildWeightedPool("E", ownedIds);
    expect(pool.every(s => s.id !== "a1b2c3d4-0016-0000-0000-000000000016")).toBe(true);
  });

  it("falls back to E-rank weights for unknown rank", () => {
    const pool = buildWeightedPool("UNKNOWN_RANK", new Set());
    expect(pool.length).toBeGreaterThan(0);
  });

  it("E-rank hunter pool has majority E/D shadows by weight count", () => {
    const pool = buildWeightedPool("E", new Set());
    const edCount = pool.filter(s => s.rank === "E" || s.rank === "D").length;
    const total = pool.length;
    expect(edCount / total).toBeGreaterThan(0.5);
  });
});

describe("calculateModifiedStats", () => {
  it("applies shadow buff multiplier to matching stat", () => {
    const state = {
      ...initialState,
      stats: { ...initialState.stats, strength: 100 },
      shadows: ["a1b2c3d4-0001-0000-0000-000000000001"], // Igris: +10% STR
    };
    const result = calculateModifiedStats(state);
    expect(result.strength).toBe(110);
  });

  it("compounds multiplicatively for two same-stat shadows", () => {
    // Igris (1.10 STR) + Tusk (1.06 STR)
    const state = {
      ...initialState,
      stats: { ...initialState.stats, strength: 100 },
      shadows: [
        "a1b2c3d4-0001-0000-0000-000000000001", // Igris 1.10
        "a1b2c3d4-0004-0000-0000-000000000004", // Tusk 1.06
      ],
    };
    const result = calculateModifiedStats(state);
    // 100 * 1.10 = 110, Math.round(110 * 1.06) = 117
    expect(result.strength).toBe(117);
  });
});
