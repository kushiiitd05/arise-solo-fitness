// src/lib/game/battleEngine.ts
// Pure battle computation — no side effects, no DB calls, no imports from Next.js

export type BattleExercise = "PUSH-UPS" | "SQUATS" | "SIT-UPS" | "PLANKS";
export type BattleOutcome = "WIN" | "LOSS" | "DRAW";

export const OPPONENT_NAMES = [
  "IRON SHADOW", "VOID WALKER", "CRIMSON TIDE",
  "STEEL PHANTOM", "DARK SOVEREIGN", "ABYSS KNIGHT", "VOID HERALD",
];

export const EXERCISE_WEIGHTS: Record<BattleExercise, { str: number; agi: number; vit: number; int: number }> = {
  "PUSH-UPS": { str: 0.6, agi: 0.2, vit: 0.1, int: 0.1 },
  "SQUATS":   { str: 0.4, agi: 0.4, vit: 0.1, int: 0.1 },
  "SIT-UPS":  { str: 0.2, agi: 0.4, vit: 0.3, int: 0.1 },
  "PLANKS":   { str: 0.1, agi: 0.1, vit: 0.5, int: 0.3 },
};

export const TARGET_REPS: Record<BattleExercise, number> = {
  "PUSH-UPS": 50,
  "SQUATS":   40,
  "SIT-UPS":  40,
  "PLANKS":   60,
};

export const XP_BY_RANK: Record<string, { win: number; draw: number; loss: number }> = {
  D: { win: 150,  draw: 38,  loss: 0 },
  C: { win: 250,  draw: 63,  loss: 0 },
  B: { win: 400,  draw: 100, loss: 0 },
  A: { win: 600,  draw: 150, loss: 0 },
  S: { win: 1000, draw: 250, loss: 0 },
};

const RANK_TYPICAL_STATS: Record<string, number> = {
  D: 12, C: 18, B: 30, A: 50, S: 80,
};

const RANK_BASE_RATING: Record<string, number> = {
  D: 1000, C: 1200, B: 1500, A: 1800, S: 2200,
};

const RANK_ORDER = ["D", "C", "B", "A", "S"];

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * computeCPI — Combat Performance Index.
 * Weighted stat score for a given exercise type.
 * Deterministic — no randomness.
 */
export function computeCPI(
  stats: { strength: number; agility: number; vitality: number; intelligence: number },
  exercise: BattleExercise
): number {
  const w = EXERCISE_WEIGHTS[exercise];
  return (
    stats.strength     * w.str +
    stats.agility      * w.agi +
    stats.vitality     * w.vit +
    stats.intelligence * w.int
  );
}

/**
 * computePerfMod — Performance modifier based on reps submitted vs target.
 * Clamped to [-0.15, +0.15].
 * formula: clamp((repsSubmitted / TARGET_REPS[exercise] - 1.0) * 0.3, -0.15, 0.15)
 */
export function computePerfMod(repsSubmitted: number, exercise: BattleExercise): number {
  const target = TARGET_REPS[exercise];
  return clamp((repsSubmitted / target - 1.0) * 0.3, -0.15, 0.15);
}

/**
 * computeWinProbability — Probability of winning based on CPI ratio + performance modifier.
 * Clamped to [0.05, 0.95].
 */
export function computeWinProbability(
  playerCPI: number,
  opponentCPI: number,
  perfMod: number
): number {
  const total = playerCPI + opponentCPI;
  const statRatio = total > 0 ? playerCPI / total : 0.5;
  return clamp(statRatio + perfMod, 0.05, 0.95);
}

/**
 * rollOutcome — Determine battle result using win probability and optional draw zone.
 * Draw zone: Math.abs(statRatio - 0.5) < 0.05 AND Math.random() < 0.25
 * Otherwise: Math.random() < winProbability → WIN, else LOSS
 */
export function rollOutcome(
  winProbability: number,
  playerCPI: number,
  opponentCPI: number
): BattleOutcome {
  const total = playerCPI + opponentCPI;
  const statRatio = total > 0 ? playerCPI / total : 0.5;
  const inDrawZone = Math.abs(statRatio - 0.5) < 0.05;
  const roll = Math.random();
  if (inDrawZone && roll < 0.25) return "DRAW";
  return roll < winProbability ? "WIN" : "LOSS";
}

/**
 * generateOpponentStats — Generate randomised NPC opponent for a given player rank.
 * Picks an opponent rank from [playerRank ± 1] bracket, clamped to D–S.
 */
export function generateOpponentStats(playerRank: string): {
  name: string;
  rank: string;
  stats: { strength: number; agility: number; vitality: number; intelligence: number };
  baseRating: number;
} {
  const rankIdx = RANK_ORDER.indexOf(playerRank);
  const safeIdx = rankIdx === -1 ? 0 : rankIdx;

  // Build offset pool: [safeIdx-1, safeIdx, safeIdx+1], each clamped to valid range
  const offsets = [-1, 0, 1].map((o) => clamp(safeIdx + o, 0, RANK_ORDER.length - 1));
  const oppRank = RANK_ORDER[offsets[Math.floor(Math.random() * offsets.length)]];

  const typical = RANK_TYPICAL_STATS[oppRank] ?? 12;
  const variance = () => Math.round(typical * (0.85 + Math.random() * 0.25));
  const name = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];

  return {
    name,
    rank: oppRank,
    stats: {
      strength:     variance(),
      agility:      variance(),
      vitality:     variance(),
      intelligence: variance(),
    },
    baseRating: RANK_BASE_RATING[oppRank] ?? 1000,
  };
}
