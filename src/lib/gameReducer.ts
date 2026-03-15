import { COLORS, RANKS, RANK_COLORS } from "./constants";
import { calculateModifiedStats } from "./game/shadowSystem";

// ────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────

export type JobClass = "FIGHTER" | "ASSASSIN" | "TANK" | "MAGE" | "HEALER" | "NONE";

export interface UserStats {
  strength: number;
  vitality: number;
  agility: number;
  intelligence: number;
  perception: number;
  sense: number;
  availablePoints: number;
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  totalCalories: number;
  totalXpEarned: number;
  pvpRating: number;
  pvpWins: number;
  pvpLosses: number;
  intensityRanks?: Record<string, string>;
}

export interface DailyQuest {
  id: string;
  name: string;
  icon: string;
  target: number;
  current: number;
  xp: number;
  completed: boolean;
  type: "PUSHUP" | "SQUAT" | "SITUP" | "CARDIO" | "CUSTOM";
}

export interface Chapter {
  id: string;
  title: string;
  unlocked: boolean;
  rarity?: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  externalUrl?: string;
}

export interface Notification {
  id: string;
  type: "SYSTEM" | "QUEST" | "GUILD" | "PVP" | "ACHIEVEMENT" | "CHAPTER" | "LEVELUP" | "SHADOW";
  title: string;
  body: string;
  icon: string;
  read: boolean;
  createdAt: string;
}

export type GameState = {
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
    title: string;
    level: number;
    currentXp: number;
    xpToNextLevel: number;
    rank: string;
    jobClass: string;
    createdAt: string;
    stats: UserStats;
  };
  stats: UserStats;
  dailyQuests: DailyQuest[];
  inventory: any[];
  shadows: string[];
  chapters: Chapter[];
  activeChapterId: string | null;
  achievements: any[];
  notifications: Notification[];
  workoutHistory: Array<{ id: string; xp: number; exerciseName: string; reps: number; completedAt: string }>;
  guild: any | null;
  isPenaltyZone: boolean;
};

// ────────────────────────────────────────────
// XP & RANK ENGINE
// ────────────────────────────────────────────

export const xpForLevel = (lvl: number) => Math.floor(1000 * Math.pow(lvl, 1.35));

export const rankAtLevel = (level: number): string => {
  if (level >= 80) return "S";
  if (level >= 60) return "A";
  if (level >= 40) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
};

export const titleForRank = (rank: string): string => {
  const titles: Record<string, string> = {
    E: "E-Rank Hunter", D: "D-Rank Hunter", C: "C-Rank Hunter",
    B: "B-Rank Hunter", A: "A-Rank Hunter", S: "Shadow Monarch",
  };
  return titles[rank] || "Hunter";
};

export const calculateWorkoutXp = (params: {
  reps: number; sets: number; difficultyMultiplier: number;
  streakDays: number; arVerified: boolean;
}): number => {
  const base = params.reps * params.sets * params.difficultyMultiplier;
  const streakBonus = Math.min(1 + params.streakDays * 0.02, 2.0);
  const arBonus = params.arVerified ? 1.5 : 1.0;
  return Math.floor(base * streakBonus * arBonus);
};

// ────────────────────────────────────────────
// DAILY QUEST GENERATOR
// ────────────────────────────────────────────

export const generateDailyQuests = (level = 1): DailyQuest[] => {
  const base = Math.max(1, Math.floor(level / 5));
  return [
    { id: "dq1", name: "Push-ups",     icon: "💪", target: 50 + base * 10, current: 0, xp: 200 + level * 10, completed: false, type: "PUSHUP"  },
    { id: "dq2", name: "Squats",        icon: "🦵", target: 50 + base * 10, current: 0, xp: 200 + level * 10, completed: false, type: "SQUAT"   },
    { id: "dq3", name: "Sit-ups",       icon: "🔥", target: 50 + base * 10, current: 0, xp: 200 + level * 10, completed: false, type: "SITUP"   },
    { id: "dq4", name: "Running (km)",  icon: "🏃", target: 3 + base,       current: 0, xp: 300 + level * 15, completed: false, type: "CARDIO"  },
  ];
};

// ────────────────────────────────────────────
// INITIAL STATE
// ────────────────────────────────────────────

const defaultStats: UserStats = {
  strength: 10, vitality: 10, agility: 10,
  intelligence: 10, perception: 10, sense: 10,
  availablePoints: 0,
  totalWorkouts: 0, currentStreak: 0, longestStreak: 0,
  totalCalories: 0, totalXpEarned: 0,
  pvpRating: 1000, pvpWins: 0, pvpLosses: 0,
};

export const initialState: GameState = {
  user: {
    id: "",
    username: "Shadow Hunter",
    email: "",
    avatar: null,
    title: "E-Rank Hunter",
    level: 1,
    currentXp: 0,
    xpToNextLevel: xpForLevel(1),
    rank: "E",
    jobClass: "NONE",
    createdAt: new Date().toISOString(),
    stats: { ...defaultStats },
  },
  stats: { ...defaultStats },
  dailyQuests: generateDailyQuests(1),
  inventory: [],
  shadows: [],
  chapters: [
    { id: "1", title: "The Awakening",      unlocked: true,  rarity: "COMMON",    externalUrl: "https://www.webtoons.com/en/action/solo-leveling/list?title_no=3162" },
    { id: "2", title: "The Double Dungeon", unlocked: false, rarity: "RARE",      externalUrl: "https://www.webtoons.com/en/action/solo-leveling/list?title_no=3162" },
    { id: "3", title: "Rebirth",            unlocked: false, rarity: "EPIC",      externalUrl: "https://www.webtoons.com/en/action/solo-leveling/list?title_no=3162" },
    { id: "4", title: "Shadow Extraction",  unlocked: false, rarity: "LEGENDARY", externalUrl: "https://www.webtoons.com/en/action/solo-leveling/list?title_no=3162" },
  ],
  activeChapterId: null,
  achievements: [],
  notifications: [],
  workoutHistory: [],
  guild: null,
  isPenaltyZone: false,
};

// ────────────────────────────────────────────
// ACTIONS
// ────────────────────────────────────────────

type Action =
  | { type: "AWAKEN"; payload: { username: string; jobClass: string } }
  | { type: "SET_USER"; payload: Partial<GameState["user"]> }
  | { type: "SET_DATA"; payload: Partial<GameState> }
  | { type: "ADD_XP"; payload: number }
  | { type: "COMPLETE_WORKOUT"; payload: { xpEarned: number; exerciseName?: string; reps?: number } }
  | { type: "UPDATE_QUEST"; payload: { questId: string; increment: number } }
  | { type: "ALLOCATE_STAT"; payload: keyof Pick<UserStats, "strength"|"vitality"|"agility"|"intelligence"|"perception"|"sense"> }
  | { type: "EXTRACT_SHADOW"; payload: string }
  | { type: "SELECT_CHAPTER"; payload: string }
  | { type: "UNLOCK_CHAPTER"; payload: string }
  | { type: "CLOSE_READER" }
  | { type: "TRIGGER_PENALTY" }
  | { type: "CLEAR_PENALTY" }
  | { type: "ADD_NOTIFICATION"; payload: Omit<Notification, "id" | "createdAt" | "read"> }
  | { type: "DISMISS_NOTIFICATION"; payload: string }
  | { type: "SET_DAILY_QUESTS"; payload: any[] }
  | { type: "ENTER_PENALTY_ZONE" }
  | { type: "USE_MANA"; payload: number };

// ────────────────────────────────────────────
// REDUCER
// ────────────────────────────────────────────

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {

    case "AWAKEN": {
      const rank = rankAtLevel(1);
      return {
        ...state,
        user: {
          ...state.user,
          username: action.payload.username,
          jobClass: action.payload.jobClass,
          rank, title: titleForRank(rank),
          xpToNextLevel: xpForLevel(1),
        },
        dailyQuests: generateDailyQuests(1),
      };
    }

    case "SET_DATA":
      return { ...state, ...action.payload, user: action.payload.user ? { ...state.user, ...action.payload.user } : state.user, stats: action.payload.stats ? { ...state.stats, ...action.payload.stats } : state.stats };
    case "SET_USER":
      return { ...state, user: { ...state.user, ...action.payload } };

    case "SET_DAILY_QUESTS": {
      const mapped = (action.payload || []).map((q: any) => ({
        id: q.id,
        name: q.name,
        icon: q.icon || "💪",
        target: q.target,
        current: q.current || 0,
        xp: q.xp_reward ?? q.xp ?? 100,
        completed: q.completed || false,
        type: q.type || "CUSTOM",
      }));
      return { ...state, dailyQuests: mapped };
    }

    case "ADD_XP":
    case "COMPLETE_WORKOUT": {
      const xpAmount = action.type === "COMPLETE_WORKOUT" ? action.payload.xpEarned : action.payload;
      let xp = state.user.currentXp + xpAmount;
      let level = state.user.level;
      let statPointsToAward = 0;
      while (xp >= xpForLevel(level)) { xp -= xpForLevel(level); level++; statPointsToAward += 3; }
      const rank = rankAtLevel(level);
      const rankChanged = rank !== state.user.rank;
      const newStats: UserStats = {
        ...state.user.stats,
        availablePoints: state.user.stats.availablePoints + statPointsToAward,
        totalWorkouts: action.type === "COMPLETE_WORKOUT" ? state.user.stats.totalWorkouts + 1 : state.user.stats.totalWorkouts,
        totalXpEarned: state.user.stats.totalXpEarned + xpAmount,
        intensityRanks: (typeof action.payload === 'object' && 'intensityRank' in action.payload && action.payload.intensityRank) ? {
          ...(state.user.stats.intensityRanks || {}),
          [(action.payload as any).exerciseName || "Workout"]: (action.payload as any).intensityRank
        } : state.user.stats.intensityRanks,
      };
      const notification: Notification | null = level > state.user.level ? {
        id: `levelup-${Date.now()}`, type: "LEVELUP",
        title: rankChanged ? `RANK UP! ${state.user.rank} -> ${rank}` : `LEVEL UP! -> ${level}`,
        body: `${statPointsToAward} stat points awarded.${rankChanged ? ` You are now a ${rank}-Rank Hunter.` : ""}`,
        icon: rankChanged ? "⬆️" : "✨", read: false, createdAt: new Date().toISOString(),
      } : null;
      const newHistory = action.type === "COMPLETE_WORKOUT" ? [
        { id: `wh-${Date.now()}`, xp: xpAmount, exerciseName: action.payload.exerciseName || "Workout", reps: action.payload.reps || 0, completedAt: new Date().toISOString() },
        ...state.workoutHistory.slice(0, 49),
      ] : state.workoutHistory;
      return {
        ...state,
        user: { ...state.user, currentXp: xp, xpToNextLevel: xpForLevel(level), level, rank, title: titleForRank(rank), stats: newStats },
        stats: newStats,
        workoutHistory: newHistory,
        notifications: notification ? [notification, ...state.notifications] : state.notifications,
      };
    }

    case "UPDATE_QUEST": {
      const updatedQuests = state.dailyQuests.map(q => {
        if (q.id !== action.payload.questId) return q;
        const newCurrent = Math.min(q.current + action.payload.increment, q.target);
        return { ...q, current: newCurrent, completed: newCurrent >= q.target };
      });
      const allDone = updatedQuests.every(q => q.completed);
      const wasAllDone = state.dailyQuests.every(q => q.completed);
      const bonus = (allDone && !wasAllDone) ? 500 : 0;
      return { ...state, dailyQuests: updatedQuests, ...(bonus > 0 ? { user: { ...state.user, currentXp: state.user.currentXp + bonus } } : {}) };
    }

    case "ALLOCATE_STAT": {
      if (state.user.stats.availablePoints <= 0) return state;
      const newStats: UserStats = { ...state.user.stats, [action.payload]: (state.user.stats[action.payload] as number) + 1, availablePoints: state.user.stats.availablePoints - 1 };
      return { ...state, user: { ...state.user, stats: newStats }, stats: newStats };
    }

    case "EXTRACT_SHADOW":
      if (state.shadows.includes(action.payload)) return state;
      return { ...state, shadows: [...state.shadows, action.payload] };

    case "SELECT_CHAPTER":   return { ...state, activeChapterId: action.payload };
    case "UNLOCK_CHAPTER":   return { ...state, chapters: state.chapters.map(c => c.id === action.payload ? { ...c, unlocked: true } : c) };
    case "CLOSE_READER":     return { ...state, activeChapterId: null };
    case "TRIGGER_PENALTY":  return { ...state, isPenaltyZone: true };
    case "CLEAR_PENALTY":    return { ...state, isPenaltyZone: false };

    case "ADD_NOTIFICATION":
      return { ...state, notifications: [{ ...action.payload, id: `notif-${Date.now()}`, createdAt: new Date().toISOString(), read: false }, ...state.notifications.slice(0, 19)] };

    case "DISMISS_NOTIFICATION":
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };

    default:
      return state;
  }
}

export const getActiveStats = (state: GameState) => calculateModifiedStats(state);


export function calculateIntensityRank(reps: number, flawlessReps: number): "S" | "A" | "B" | "C" | "D" {
  if (reps === 0) return "D";
  const ratio = flawlessReps / reps;
  if (ratio >= 0.95) return "S";
  if (ratio >= 0.8) return "A";
  if (ratio >= 0.6) return "B";
  if (ratio >= 0.40) return "C";
  return "D";
}
