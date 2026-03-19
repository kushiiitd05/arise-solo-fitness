// src/lib/ai/prompts/arenaPrompt.ts
import { ollamaGenerate } from '../ollamaClient';

interface ArenaOpponent {
  name: string;
  taunt: string;
}

/**
 * Generates an AI-named arena opponent with a taunt line.
 * Uses format: 'json' because it returns a structured object (unique case in Phase 13).
 * Returns null on Ollama failure (caller falls back to OPPONENT_NAMES array).
 */
export async function generateArenaOpponent(
  playerRank: string
): Promise<ArenaOpponent | null> {
  const prompt = `You are THE SYSTEM from Solo Leveling. Generate an arena opponent for a Rank-${playerRank} Hunter. Output ONLY valid JSON with no extra text: {"name": "ALL CAPS DRAMATIC HUNTER NAME", "taunt": "short threatening 1-sentence taunt in second person"}`;

  const raw = await ollamaGenerate(prompt, { format: 'json' });
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ArenaOpponent;
    if (typeof parsed.name === 'string' && typeof parsed.taunt === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
