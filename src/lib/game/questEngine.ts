/**
 * ARISE Dynamic Quest Engine
 * Generates daily quests using date-seeded rotation, 7-type pool,
 * and 3-day history adaptation (±20% difficulty scaling).
 */

import { JOB_CLASS_MODIFIERS } from "./xpEngine";
import { DailyQuestItem } from "@/lib/services/questService";

// ─── TYPES ────────────────────────────────────────────────────

type QuestDifficulty = "EASY" | "NORMAL" | "HARD";

interface QuestPoolEntry {
  type: string;
  name: string;
  icon: string;
  /** Which JOB_CLASS_MODIFIERS key scales this exercise's target */
  statKey: "strength" | "vitality" | "agility";
  /** Base target multiplier relative to level*2 base */
  baseMult: number;
  /** XP multiplier relative to level*2 base */
  xpMult: number;
}

export interface HistoryRow {
  all_completed: boolean;
}

// ─── QUEST POOL (7 types) ─────────────────────────────────────

const QUEST_POOL: QuestPoolEntry[] = [
  { type: "PUSHUP",  name: "Push-ups",       icon: "💪", statKey: "strength", baseMult: 1.0, xpMult: 10 },
  { type: "SQUAT",   name: "Squats",          icon: "🦵", statKey: "vitality", baseMult: 1.0, xpMult: 10 },
  { type: "SITUP",   name: "Sit-ups",         icon: "🔥", statKey: "agility",  baseMult: 1.0, xpMult: 8  },
  { type: "CARDIO",  name: "Running (km)",    icon: "🏃", statKey: "agility",  baseMult: 0.3, xpMult: 15 },
  { type: "BURPEE",  name: "Burpees",         icon: "⚡", statKey: "strength", baseMult: 0.6, xpMult: 12 },
  { type: "PLANK",   name: "Plank (seconds)", icon: "🛡️", statKey: "vitality", baseMult: 2.0, xpMult: 9  },
  { type: "LUNGE",   name: "Lunges",          icon: "🦿", statKey: "agility",  baseMult: 0.8, xpMult: 9  },
];

// ─── SEEDING HELPERS (internal) ───────────────────────────────

/** Hash a date string "YYYY-MM-DD" → deterministic 32-bit integer */
function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = Math.imul(hash, 31) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1; // never 0
}

/** LCG pseudo-random generator from seed — returns next() function */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Fisher-Yates shuffle using provided rng — returns new array */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── EXPORTED FUNCTIONS ───────────────────────────────────────

/**
 * Select 4 quest types from the pool for a given date.
 * - Date-seeded: same types for all users on the same calendar date.
 * - Anti-repeat: excludes previousTypes (yesterday's 4 types) from first-pass pool.
 *   If < 4 unique types remain, re-admits excluded types to fill.
 */
export function selectQuestTypes(
  dateStr: string,
  previousTypes: string[] = []
): QuestPoolEntry[] {
  const seed = dateToSeed(dateStr);
  const rng = makeRng(seed);

  const filtered = QUEST_POOL.filter((q) => !previousTypes.includes(q.type));

  // If ≥4 types survive exclusion, shuffle and take first 4
  if (filtered.length >= 4) {
    return shuffle(filtered, rng).slice(0, 4);
  }

  // Fewer than 4: start with filtered, then fill from excluded (shuffled separately)
  const excluded = QUEST_POOL.filter((q) => previousTypes.includes(q.type));
  const combined = [
    ...shuffle(filtered, makeRng(seed)),
    ...shuffle(excluded, makeRng(seed + 1)),
  ];
  return combined.slice(0, 4);
}

/**
 * Compute difficulty adjustment factor from last 3 days of quest history.
 *
 * - all_completed = true  → 1.0 (fully completed)
 * - all_completed = false → 0.0 (not completed)
 * - No rows (new user)    → multiplier 1.0, difficulty NORMAL
 *
 * Adjustment range: −20% to +20% (linear).
 * Returns adjustment multiplier (e.g. 0.9 = −10%, 1.1 = +10%) and difficulty label.
 */
export function computeHistoryAdjustment(historyRows: HistoryRow[]): {
  multiplier: number;
  difficulty: QuestDifficulty;
} {
  if (!historyRows || historyRows.length === 0) {
    return { multiplier: 1.0, difficulty: "NORMAL" };
  }

  const rate = historyRows.filter((r) => r.all_completed).length / historyRows.length;
  // rate 0→1 maps to multiplier 0.8→1.2
  const multiplier = 0.8 + rate * 0.4;

  // adjustment = multiplier - 1.0 (e.g. -0.2 to +0.2)
  const adjustment = multiplier - 1.0;

  const difficulty: QuestDifficulty =
    adjustment < -0.1 ? "EASY" :
    adjustment > 0.1  ? "HARD" :
    "NORMAL";

  return { multiplier, difficulty };
}

/**
 * Generate 4 dynamic daily quests for a user.
 *
 * @param level         Hunter level
 * @param jobClass      Job class string (FIGHTER, MAGE, etc.)
 * @param dateStr       Today's date "YYYY-MM-DD" — used for deterministic seeding
 * @param historyRows   Last 3 days' daily_quests rows (all_completed field only needed)
 * @param previousTypes Yesterday's quest types (for anti-repeat)
 */
export function generateDynamicDailyQuests(
  level: number,
  jobClass: string,
  dateStr: string,
  historyRows: HistoryRow[] = [],
  previousTypes: string[] = []
): DailyQuestItem[] {
  const base = Math.max(10, Math.floor(level * 2));
  const mod = JOB_CLASS_MODIFIERS[jobClass] ?? JOB_CLASS_MODIFIERS.NONE;

  const { multiplier, difficulty } = computeHistoryAdjustment(historyRows);
  const selectedTypes = selectQuestTypes(dateStr, previousTypes);

  return selectedTypes.map((entry, i) => {
    const statMod = mod[entry.statKey] ?? 1.0;
    const rawTarget = Math.round(base * entry.baseMult * statMod * multiplier);
    const target = Math.max(1, rawTarget);
    const xp_reward = Math.round(base * entry.xpMult * statMod * multiplier);

    return {
      id: `dq${i + 1}`,
      name: entry.name,
      icon: entry.icon,
      type: entry.type,
      target,
      current: 0,
      xp_reward,
      completed: false,
      difficulty,
    };
  });
}
