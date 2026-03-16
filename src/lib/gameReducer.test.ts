import { describe, it, expect } from "vitest";
import { gameReducer, initialState } from "@/lib/gameReducer";

describe("gameReducer ADD_XP", () => {
  it("derives rank using dual-gate formula when total XP crosses D threshold", () => {
    const stateWithHighXpAndLevel = {
      ...initialState,
      user: {
        ...initialState.user,
        level: 10,
        currentXp: 0,
        rank: "E" as const,
        stats: {
          ...initialState.user.stats,
          totalXpEarned: 4_800,
        },
      },
    };
    // Adding 200 XP pushes totalXpEarned to 5000 at level 10 → should be D
    const result = gameReducer(stateWithHighXpAndLevel, { type: "ADD_XP", payload: 200 });
    expect(result.user.rank).toBe("D");
  });

  it("does NOT advance rank when XP threshold met but level too low", () => {
    const stateWithLowLevel = {
      ...initialState,
      user: {
        ...initialState.user,
        level: 9,
        currentXp: 0,
        rank: "E" as const,
        stats: {
          ...initialState.user.stats,
          totalXpEarned: 4_800,
        },
      },
    };
    const result = gameReducer(stateWithLowLevel, { type: "ADD_XP", payload: 200 });
    expect(result.user.rank).toBe("E");
  });
});
