// src/lib/game/battleEngine.test.ts
// Unit tests for battleEngine pure combat computation module

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeCPI,
  computePerfMod,
  computeWinProbability,
  rollOutcome,
  XP_BY_RANK,
  generateOpponentStats,
  EXERCISE_WEIGHTS,
  TARGET_REPS,
  OPPONENT_NAMES,
  type BattleExercise,
  type BattleOutcome,
} from "./battleEngine";

// ────────────────────────────────────────────────────────────
// computeCPI
// ────────────────────────────────────────────────────────────
describe("computeCPI", () => {
  it("returns a single deterministic number", () => {
    const result = computeCPI(
      { strength: 10, agility: 10, vitality: 10, intelligence: 10 },
      "PUSH-UPS"
    );
    expect(typeof result).toBe("number");
  });

  it("PUSH-UPS: all stats = 10 → CPI = 10 (weights sum to 1.0)", () => {
    expect(
      computeCPI({ strength: 10, agility: 10, vitality: 10, intelligence: 10 }, "PUSH-UPS")
    ).toBeCloseTo(10);
  });

  it("SQUATS: all stats = 10 → CPI = 10", () => {
    expect(
      computeCPI({ strength: 10, agility: 10, vitality: 10, intelligence: 10 }, "SQUATS")
    ).toBeCloseTo(10);
  });

  it("SIT-UPS: all stats = 10 → CPI = 10", () => {
    expect(
      computeCPI({ strength: 10, agility: 10, vitality: 10, intelligence: 10 }, "SIT-UPS")
    ).toBeCloseTo(10);
  });

  it("PLANKS: all stats = 10 → CPI = 10", () => {
    expect(
      computeCPI({ strength: 10, agility: 10, vitality: 10, intelligence: 10 }, "PLANKS")
    ).toBeCloseTo(10);
  });

  it("PUSH-UPS weights: STR×0.6 + AGI×0.2 + VIT×0.1 + INT×0.1", () => {
    // strength=20, all others=10 → 20×0.6 + 10×0.2 + 10×0.1 + 10×0.1 = 12+2+1+1 = 16
    expect(
      computeCPI({ strength: 20, agility: 10, vitality: 10, intelligence: 10 }, "PUSH-UPS")
    ).toBeCloseTo(16);
  });

  it("PLANKS weights: STR×0.1 + AGI×0.1 + VIT×0.5 + INT×0.3", () => {
    // vitality=20, all others=10 → 10×0.1 + 10×0.1 + 20×0.5 + 10×0.3 = 1+1+10+3 = 15
    expect(
      computeCPI({ strength: 10, agility: 10, vitality: 20, intelligence: 10 }, "PLANKS")
    ).toBeCloseTo(15);
  });
});

// ────────────────────────────────────────────────────────────
// computePerfMod
// ────────────────────────────────────────────────────────────
describe("computePerfMod", () => {
  it("at target reps (50 PUSH-UPS) → modifier is 0", () => {
    expect(computePerfMod(50, "PUSH-UPS")).toBeCloseTo(0);
  });

  it("at target reps (40 SQUATS) → modifier is 0", () => {
    expect(computePerfMod(40, "SQUATS")).toBeCloseTo(0);
  });

  it("double target (100 PUSH-UPS) → capped at +0.15", () => {
    expect(computePerfMod(100, "PUSH-UPS")).toBeCloseTo(0.15);
  });

  it("zero reps → capped at -0.15", () => {
    expect(computePerfMod(0, "PUSH-UPS")).toBeCloseTo(-0.15);
  });

  it("result is always within [-0.15, +0.15]", () => {
    const extremes: [number, BattleExercise][] = [
      [9999, "PUSH-UPS"],
      [0, "SQUATS"],
      [9999, "SIT-UPS"],
      [0, "PLANKS"],
    ];
    for (const [reps, ex] of extremes) {
      const mod = computePerfMod(reps, ex);
      expect(mod).toBeGreaterThanOrEqual(-0.15);
      expect(mod).toBeLessThanOrEqual(0.15);
    }
  });
});

// ────────────────────────────────────────────────────────────
// computeWinProbability
// ────────────────────────────────────────────────────────────
describe("computeWinProbability", () => {
  it("equal CPI, no modifier → 0.5", () => {
    expect(computeWinProbability(10, 10, 0)).toBeCloseTo(0.5);
  });

  it("dominant player → capped at 0.95", () => {
    expect(computeWinProbability(100, 0.01, 0)).toBeCloseTo(0.95);
  });

  it("dominated player → capped at 0.05", () => {
    expect(computeWinProbability(0.01, 100, 0)).toBeCloseTo(0.05);
  });

  it("positive perfMod increases probability (not beyond cap)", () => {
    const base = computeWinProbability(10, 10, 0);
    const boosted = computeWinProbability(10, 10, 0.1);
    expect(boosted).toBeGreaterThan(base);
    expect(boosted).toBeLessThanOrEqual(0.95);
  });

  it("result is always within [0.05, 0.95]", () => {
    const result = computeWinProbability(0, 1000, -0.15);
    expect(result).toBeGreaterThanOrEqual(0.05);
    expect(result).toBeLessThanOrEqual(0.95);
  });
});

// ────────────────────────────────────────────────────────────
// rollOutcome
// ────────────────────────────────────────────────────────────
describe("rollOutcome", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("DRAW when statRatio = 0.5 and random < 0.25", () => {
    // equal CPI → statRatio = 0.5 → inDrawZone
    vi.spyOn(Math, "random").mockReturnValue(0.1); // < 0.25 → DRAW
    const result = rollOutcome(0.5, 10, 10);
    expect(result).toBe("DRAW");
  });

  it("WIN when statRatio = 0.5, random = 0.3 (outside draw zone threshold)", () => {
    // roll 0.3: NOT < 0.25 so no draw check. But winProbability = 0.5
    // 0.3 < 0.5 → WIN
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    const result = rollOutcome(0.5, 10, 10);
    expect(result).toBe("WIN");
  });

  it("LOSS when roll >= winProbability (and not in draw zone)", () => {
    // unequal CPI → statRatio far from 0.5 → not in draw zone
    vi.spyOn(Math, "random").mockReturnValue(0.9); // > any winProbability here
    const result = rollOutcome(0.05, 1, 100);
    expect(result).toBe("LOSS");
  });

  it("returns a valid BattleOutcome type", () => {
    const validOutcomes: BattleOutcome[] = ["WIN", "LOSS", "DRAW"];
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = rollOutcome(0.5, 10, 10);
    expect(validOutcomes).toContain(result);
  });

  it("is deterministic given controlled Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);
    const r1 = rollOutcome(0.5, 10, 10);
    vi.restoreAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.01);
    const r2 = rollOutcome(0.5, 10, 10);
    expect(r1).toBe(r2);
  });
});

// ────────────────────────────────────────────────────────────
// XP_BY_RANK
// ────────────────────────────────────────────────────────────
describe("XP_BY_RANK", () => {
  it("D rank win = 150", () => {
    expect(XP_BY_RANK["D"].win).toBe(150);
  });

  it("S rank draw = 250", () => {
    expect(XP_BY_RANK["S"].draw).toBe(250);
  });

  it("all rank loss XP = 0", () => {
    for (const rank of ["D", "C", "B", "A", "S"]) {
      expect(XP_BY_RANK[rank].loss).toBe(0);
    }
  });

  it("C rank win = 250", () => {
    expect(XP_BY_RANK["C"].win).toBe(250);
  });

  it("B rank win = 400, draw = 100", () => {
    expect(XP_BY_RANK["B"].win).toBe(400);
    expect(XP_BY_RANK["B"].draw).toBe(100);
  });

  it("A rank win = 600, draw = 150", () => {
    expect(XP_BY_RANK["A"].win).toBe(600);
    expect(XP_BY_RANK["A"].draw).toBe(150);
  });

  it("S rank win = 1000", () => {
    expect(XP_BY_RANK["S"].win).toBe(1000);
  });
});

// ────────────────────────────────────────────────────────────
// generateOpponentStats
// ────────────────────────────────────────────────────────────
describe("generateOpponentStats", () => {
  it("returns object with name (string), rank, and numeric stats for D player", () => {
    const opp = generateOpponentStats("D");
    expect(typeof opp.name).toBe("string");
    expect(["D", "C"]).toContain(opp.rank); // D ± 1, clamped: D or C
    expect(typeof opp.stats.strength).toBe("number");
    expect(typeof opp.stats.agility).toBe("number");
    expect(typeof opp.stats.vitality).toBe("number");
    expect(typeof opp.stats.intelligence).toBe("number");
    expect(typeof opp.baseRating).toBe("number");
  });

  it("returns a name from OPPONENT_NAMES", () => {
    const opp = generateOpponentStats("B");
    expect(OPPONENT_NAMES).toContain(opp.name);
  });

  it("rank is within ±1 bracket of player rank", () => {
    const validRanksForB = ["A", "B", "C"];
    for (let i = 0; i < 10; i++) {
      const opp = generateOpponentStats("B");
      expect(validRanksForB).toContain(opp.rank);
    }
  });

  it("stats are positive numbers", () => {
    const opp = generateOpponentStats("A");
    expect(opp.stats.strength).toBeGreaterThan(0);
    expect(opp.stats.agility).toBeGreaterThan(0);
    expect(opp.stats.vitality).toBeGreaterThan(0);
    expect(opp.stats.intelligence).toBeGreaterThan(0);
  });

  it("baseRating for rank D opponent is 1000", () => {
    // Force D rank opponent by mocking random to always pick index 0
    vi.spyOn(Math, "random").mockReturnValue(0);
    const opp = generateOpponentStats("D");
    // With rank D player and random=0, should get rank D (first of [D,D,C])
    expect(opp.baseRating).toBe(1000);
    vi.restoreAllMocks();
  });

  it("S rank player gets valid opponent (clamped at S)", () => {
    const validRanksForS = ["A", "S"];
    for (let i = 0; i < 5; i++) {
      const opp = generateOpponentStats("S");
      expect(validRanksForS).toContain(opp.rank);
    }
  });
});

// ────────────────────────────────────────────────────────────
// EXERCISE_WEIGHTS constant
// ────────────────────────────────────────────────────────────
describe("EXERCISE_WEIGHTS", () => {
  it("each exercise weights sum to 1.0", () => {
    const exercises: BattleExercise[] = ["PUSH-UPS", "SQUATS", "SIT-UPS", "PLANKS"];
    for (const ex of exercises) {
      const w = EXERCISE_WEIGHTS[ex];
      const sum = w.str + w.agi + w.vit + w.int;
      expect(sum).toBeCloseTo(1.0);
    }
  });
});

// ────────────────────────────────────────────────────────────
// TARGET_REPS constant
// ────────────────────────────────────────────────────────────
describe("TARGET_REPS", () => {
  it("PUSH-UPS target = 50", () => expect(TARGET_REPS["PUSH-UPS"]).toBe(50));
  it("SQUATS target = 40", () => expect(TARGET_REPS["SQUATS"]).toBe(40));
  it("SIT-UPS target = 40", () => expect(TARGET_REPS["SIT-UPS"]).toBe(40));
  it("PLANKS target = 60", () => expect(TARGET_REPS["PLANKS"]).toBe(60));
});
