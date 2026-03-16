/**
 * ARISE XP & Gamification Engine
 * Complete mathematical implementation of all game formulas
 */

export type HunterRank = "E" | "D" | "C" | "B" | "A" | "S" | "NATIONAL";
export type WorkoutType = "STRENGTH" | "CARDIO" | "FLEXIBILITY" | "MIXED";
export type StatKey = "strength" | "vitality" | "agility" | "intelligence" | "perception" | "sense";

// ─── XP CURVES ──────────────────────────────────────────────

/** XP required to level up FROM this level (cost to go level → level+1) */
export function xpForLevel(level: number): number {
  return Math.floor(1000 * Math.pow(level, 1.35));
}

/** Total cumulative XP from level 1 to reach a given level */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/** Current level derived from total XP earned */
export function levelFromXp(totalXp: number): number {
  let level = 1;
  let accumulated = 0;
  while (accumulated + xpForLevel(level) <= totalXp) {
    accumulated += xpForLevel(level);
    level++;
    if (level > 200) break;
  }
  return level;
}

/** XP progress within the current level */
export function xpProgressInLevel(totalXp: number): {
  level: number;
  current: number;
  required: number;
} {
  const level = levelFromXp(totalXp);
  const xpAtLevelStart = totalXpForLevel(level);
  return {
    level,
    current: totalXp - xpAtLevelStart,
    required: xpForLevel(level),
  };
}

// ─── RANK THRESHOLDS ─────────────────────────────────────────

export const RANK_THRESHOLDS: Record<HunterRank, { minLevel: number; minXp: number }> = {
  E:        { minLevel: 1,  minXp: 0 },
  D:        { minLevel: 10, minXp: 5_000 },
  C:        { minLevel: 20, minXp: 20_000 },
  B:        { minLevel: 35, minXp: 60_000 },
  A:        { minLevel: 50, minXp: 150_000 },
  S:        { minLevel: 70, minXp: 400_000 },
  NATIONAL: { minLevel: 90, minXp: 1_000_000 },
};

/** Derive hunter rank from level and total XP */
export function rankFromLevelAndXp(level: number, totalXp: number): HunterRank {
  const ranks: HunterRank[] = ["NATIONAL", "S", "A", "B", "C", "D", "E"];
  for (const rank of ranks) {
    const t = RANK_THRESHOLDS[rank];
    if (level >= t.minLevel && totalXp >= t.minXp) return rank;
  }
  return "E";
}

/** Returns thresholds for the next rank above currentRank.
 *  If currentRank is NATIONAL (max), returns { nextRank: null, ... } with NATIONAL thresholds. */
export function nextRankInfo(currentRank: HunterRank): {
  nextRank: HunterRank | null;
  xpThreshold: number;
  levelThreshold: number;
} {
  const order: HunterRank[] = ["E", "D", "C", "B", "A", "S", "NATIONAL"];
  const idx = order.indexOf(currentRank);
  if (idx === -1 || idx === order.length - 1) {
    return {
      nextRank: null,
      xpThreshold: RANK_THRESHOLDS["NATIONAL"].minXp,
      levelThreshold: RANK_THRESHOLDS["NATIONAL"].minLevel,
    };
  }
  const next = order[idx + 1];
  return {
    nextRank: next,
    xpThreshold: RANK_THRESHOLDS[next].minXp,
    levelThreshold: RANK_THRESHOLDS[next].minLevel,
  };
}

// ─── STAT GAINS ──────────────────────────────────────────────

/** Stat points awarded per workout type (distributed on completion) */
export const STAT_GAINS: Record<WorkoutType, Partial<Record<StatKey, number>>> = {
  STRENGTH:    { strength: 2, vitality: 1 },
  CARDIO:      { vitality: 2, agility: 2, perception: 1 },
  FLEXIBILITY: { agility: 1, sense: 2, intelligence: 1 },
  MIXED:       { strength: 1, vitality: 1, agility: 1, intelligence: 1 },
};

// ─── STREAK MULTIPLIER ───────────────────────────────────────

/** XP multiplier based on consecutive workout days */
export function streakMultiplier(streak: number): number {
  if (streak <= 0)  return 1.0;
  if (streak <= 3)  return 1.1;
  if (streak <= 7)  return 1.25;
  if (streak <= 14) return 1.5;
  if (streak <= 30) return 1.75;
  return 2.0;
}

// ─── WORKOUT XP ──────────────────────────────────────────────

export function calculateWorkoutXp(params: {
  reps: number;
  sets: number;
  difficultyMultiplier: number;
  streakDays: number;
  arVerified: boolean;
}): number {
  const base      = params.reps * params.sets * params.difficultyMultiplier;
  const streakMod = streakMultiplier(params.streakDays);
  const arBonus   = params.arVerified ? 1.5 : 1.0;
  return Math.floor(base * streakMod * arBonus);
}

// ─── CHAPTER UNLOCK ENGINE ───────────────────────────────────

const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  E: 1.0, D: 1.5, C: 2.0, B: 3.0, A: 5.0, S: 10.0,
};

/** Score that determines chapter rarity unlock */
export function intensityScore(reps: number, difficulty: string, streakMult: number): number {
  const diff = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1.0;
  return Math.floor(reps * diff * streakMult);
}

export function chapterRarityFromScore(score: number): "COMMON" | "RARE" | "EPIC" | "LEGENDARY" {
  if (score >= 500) return "LEGENDARY";
  if (score >= 200) return "EPIC";
  if (score >= 80)  return "RARE";
  return "COMMON";
}

// ─── PENALTY ZONE ────────────────────────────────────────────

export function shouldTriggerPenalty(dailyQuests: Array<{ completed: boolean }>): boolean {
  if (!dailyQuests || dailyQuests.length === 0) return false;
  return dailyQuests.some((q) => !q.completed);
}

// ─── JOB CLASS MODIFIERS ─────────────────────────────────────

export const JOB_CLASS_MODIFIERS: Record<string, Record<StatKey, number>> = {
  FIGHTER:  { strength: 1.5, vitality: 1.2, agility: 1.0, intelligence: 0.8, perception: 1.0, sense: 1.0 },
  ASSASSIN: { strength: 1.0, vitality: 0.8, agility: 1.8, intelligence: 1.0, perception: 1.3, sense: 1.2 },
  TANK:     { strength: 1.2, vitality: 2.0, agility: 0.7, intelligence: 0.8, perception: 1.0, sense: 0.8 },
  MAGE:     { strength: 0.7, vitality: 0.9, agility: 1.0, intelligence: 2.0, perception: 1.2, sense: 1.5 },
  HEALER:   { strength: 0.8, vitality: 1.5, agility: 1.0, intelligence: 1.5, perception: 1.0, sense: 1.3 },
  NONE:     { strength: 1.0, vitality: 1.0, agility: 1.0, intelligence: 1.0, perception: 1.0, sense: 1.0 },
};

// ─── PVP ELO RATING ──────────────────────────────────────────

const ELO_K = 32;

/** Returns the change to apply to the winner/loser's rating */
export function calculateRatingChange(
  myRating: number,
  opponentRating: number,
  won: boolean
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400));
  const actual   = won ? 1 : 0;
  return Math.round(ELO_K * (actual - expected));
}

// ─── DAILY QUEST GENERATION ──────────────────────────────────

export function generateDailyQuestTargets(
  level: number,
  jobClass: string
): Array<{ type: string; name: string; icon: string; target: number; xp: number }> {
  const base = Math.max(10, Math.floor(level * 2));
  const mod  = JOB_CLASS_MODIFIERS[jobClass] ?? JOB_CLASS_MODIFIERS.NONE;

  return [
    {
      type: "PUSHUP",
      name: "Push-ups",
      icon: "💪",
      target: Math.round(base * mod.strength),
      xp:     Math.round(base * 10 * mod.strength),
    },
    {
      type: "SQUAT",
      name: "Squats",
      icon: "🦵",
      target: Math.round(base * mod.vitality),
      xp:     Math.round(base * 10 * mod.vitality),
    },
    {
      type: "SITUP",
      name: "Sit-ups",
      icon: "🔥",
      target: Math.round(base * mod.agility),
      xp:     Math.round(base * 8 * mod.agility),
    },
    {
      type: "CARDIO",
      name: "Running (km)",
      icon: "🏃",
      target: Math.round(base * 0.3),
      xp:     Math.round(base * 15),
    },
  ];
}

// ─── INTENSITY RANK ──────────────────────────────────────────

export function calculateIntensityRank(reps: number, flawlessReps: number): "S" | "A" | "B" | "C" | "D" {
  if (reps === 0) return "D";
  const ratio = flawlessReps / reps;
  if (ratio >= 0.95) return "S";
  if (ratio >= 0.80) return "A";
  if (ratio >= 0.60) return "B";
  if (ratio >= 0.40) return "C";
  return "D";
}
