// src/lib/ai/prompts/bossPrompt.ts
import { ollamaGenerate } from '../ollamaClient';

/**
 * Generates a dynamic 2-sentence personality flavor blurb for a boss encounter.
 * Additive — does not replace boss name or abilities.
 * Returns null on Ollama failure (caller shows nothing).
 */
export async function generateBossBlurb(
  bossName: string,
  bossRank: string,
  playerRank: string
): Promise<string | null> {
  const prompt = `You are THE SYSTEM from Solo Leveling. Write a 2-sentence personality introduction for the boss "${bossName}" (${bossRank}-Rank) encountering a Hunter of Rank ${playerRank}. THE SYSTEM voice is cold, omniscient, and dramatic. Output only the flavor text — no JSON, no labels, no extra explanation.`;

  return ollamaGenerate(prompt);
}
