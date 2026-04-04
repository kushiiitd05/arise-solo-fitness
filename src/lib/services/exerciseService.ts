import { JobClass } from "@/lib/gameReducer";
import { z } from "zod";

/** Zod Schema for AI Validation */
export const AIAngleConfigSchema = z.object({
  indices: z.tuple([z.number(), z.number(), z.number()]),
  thresholdDown: z.number(),
  thresholdUp: z.number()
});

export const AIPostureConstraintSchema = z.object({
  name: z.string(),
  angleIndices: z.tuple([z.number(), z.number(), z.number()]),
  minAngle: z.number(),
  maxAngle: z.number(),
  requiredVisibility: z.number().min(0).max(1),
  severity: z.enum(["critical", "moderate", "optional"])
});

export const AIGeneratedExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  xpPerRep: z.number().min(1),
  muscle: z.string(),
  type: z.enum(["PUSHUP", "SQUAT", "SITUP", "BURPEE", "LUNGE", "PLANK", "CLING"]),
  description: z.string(),
  repTriggerAngles: AIAngleConfigSchema.optional(),
  constraints: z.array(AIPostureConstraintSchema).optional()
});

export const MissionSchema = z.array(AIGeneratedExerciseSchema);

export type Exercise = z.infer<typeof AIGeneratedExerciseSchema>;

const EXERCISE_POOL: Exercise[] = [
  { id: "pushup", name: "Push-Ups", icon: "💪", xpPerRep: 10, muscle: "Chest / Triceps", type: "PUSHUP", description: "Standard high-form pushups." },
  { id: "diamond_pushup", name: "Diamond Push-Ups", icon: "💎", xpPerRep: 15, muscle: "Triceps / Chest", type: "PUSHUP", description: "Close-grip pushups for max triceps activation." },
  { id: "wide_pushup", name: "Wide Push-Ups", icon: "👐", xpPerRep: 12, muscle: "Chest / Shoulders", type: "PUSHUP", description: "Wide-grip pushups for chest width." },
  { id: "squat", name: "Squats", icon: "🦵", xpPerRep: 12, muscle: "Legs / Glutes", type: "SQUAT", description: "Deep bodyweight squats." },
  { id: "jump_squat", name: "Jump Squats", icon: "🚀", xpPerRep: 18, muscle: "Legs / Explosiveness", type: "SQUAT", description: "Explosive squats for agility hunters." },
  { id: "situp", name: "Sit-Ups", icon: "🔥", xpPerRep: 15, muscle: "Core", type: "SITUP", description: "Standard sit-ups for core stability." },
  { id: "burpee", name: "Burpees", icon: "🔥", xpPerRep: 20, muscle: "Full Body", type: "BURPEE", description: "The ultimate conditioning movement." },
  { id: "lunge", name: "Lunges", icon: "🚶", xpPerRep: 18, muscle: "Legs", type: "LUNGE", description: "Deep lunges." }
];

export async function generateAIOmission(jobClass: JobClass, rank: string): Promise<Exercise[]> {
  console.log(`[AI Engine] Generating mission for Rank ${rank} ${jobClass}...`);

  let possible = [...EXERCISE_POOL];
  
  if (rank === "E" || rank === "D") {
    possible = possible.filter(ex => ["pushup", "squat", "situp", "lunge"].includes(ex.id));
  } else if (rank === "C" || rank === "B") {
    possible = possible.filter(ex => ["diamond_pushup", "wide_pushup", "jump_squat", "burpee", "lunge"].includes(ex.id));
  } else {
    possible = possible.filter(ex => ["diamond_pushup", "jump_squat", "burpee", "situp"].includes(ex.id));
  }

  const shuffled = possible.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);

  // SECURED VALIDATION
  try {
    return MissionSchema.parse(selected);
  } catch (err) {
    console.error("[System-AI] Mission validation failed. Reverting to safe-pool.", err);
    return EXERCISE_POOL.slice(0, 2); // Absolute safety fallback
  }
}

/** Difficulty multiplier for XP scaling */
export function getDifficultyMultiplier(rank: string): number {
  const multipliers: Record<string, number> = {
    "S": 2.5, "A": 1.8, "B": 1.5, "C": 1.2, "D": 1.1, "E": 1.0
  };
  return multipliers[rank] || 1.0;
}
