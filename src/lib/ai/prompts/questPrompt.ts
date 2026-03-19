// src/lib/ai/prompts/questPrompt.ts
import { ollamaGenerate } from '../ollamaClient';

/**
 * Generates a Solo Leveling-style lore paragraph for a daily quest.
 * Uses quest name, difficulty, and player job class as context.
 * Returns null on Ollama failure (caller shows nothing).
 */
export async function generateQuestLore(
  questName: string,
  difficulty: string,
  jobClass: string
): Promise<string | null> {
  const prompt = `You are THE SYSTEM from Solo Leveling. Write a 1-2 sentence lore description for a ${difficulty} daily mission titled "${questName}" issued to a ${jobClass} Hunter. THE SYSTEM whispers in a cold, omniscient voice. Output only the lore text — no JSON, no labels, no extra explanation.`;

  return ollamaGenerate(prompt);
}
