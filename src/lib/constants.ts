export const COLORS = {
  bg: "#030712",
  bgCard: "rgba(6,15,35,0.85)",
  bgGlass: "rgba(10,20,50,0.6)",
  border: "rgba(56,189,248,0.2)",
  borderGlow: "rgba(56,189,248,0.6)",
  cyan: "#38bdf8",
  cyanDim: "#0ea5e9",
  purple: "#a855f7",
  purpleDim: "#7c3aed",
  red: "#ef4444",
  gold: "#f59e0b",
  green: "#22c55e",
  textPrimary: "#e0f2fe",
  textSecondary: "#7dd3fc",
  textMuted: "#4a7fa0",
};

export const RANKS = ["E", "D", "C", "B", "A", "S", "NATIONAL"] as const;

export const RANK_COLORS = {
  E: "#9ca3af",
  D: "#22c55e",
  C: "#3b82f6",
  B: "#a855f7",
  A: "#f59e0b",
  S: "#ef4444",
  NATIONAL: "#f97316",
} as const;

export const RANK_LABELS = {
  E: "E-Rank",
  D: "D-Rank",
  C: "C-Rank",
  B: "B-Rank",
  A: "A-Rank",
  S: "S-Rank",
  NATIONAL: "National Level",
} as const;

export const JOB_CLASSES = ["NONE", "FIGHTER", "MAGE", "ASSASSIN", "TANK", "HEALER"] as const;

export const JOB_CLASS_ICONS = {
  NONE: "⚡",
  FIGHTER: "⚔️",
  MAGE: "🔮",
  ASSASSIN: "🗡️",
  TANK: "🛡️",
  HEALER: "💚",
} as const;

export const JOB_CLASS_COLORS = {
  NONE: "#38bdf8",
  FIGHTER: "#ef4444",
  MAGE: "#a855f7",
  ASSASSIN: "#6366f1",
  TANK: "#f59e0b",
  HEALER: "#22c55e",
} as const;
