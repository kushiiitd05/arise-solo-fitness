// src/lib/ai/prompts/workoutPrompt.ts
import { ollamaGenerate } from '../ollamaClient';

/**
 * Generates a 1-sentence challenge opening message shown at workout start.
 * Short, commanding, in THE SYSTEM voice.
 * Returns null on Ollama failure (caller shows nothing).
 */
export async function generateWorkoutTagline(
  jobClass: string
): Promise<string | null> {
  const prompt = `You are THE SYSTEM from Solo Leveling. Write a 1-sentence opening challenge declaration for a ${jobClass} Hunter beginning their daily training. Cold, commanding THE SYSTEM voice. Reference their dedication, not specific numbers. Output only the sentence — no JSON, no labels, no extra explanation.`;

  return ollamaGenerate(prompt);
}
