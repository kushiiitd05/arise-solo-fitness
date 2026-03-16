/**
 * ARISE Guild Battle Service
 * Uses local Ollama for dynamic NPC guild generation and battle narratives
 */

import { supabase } from "@/lib/supabase";

async function ollamaGenerate(model: string, prompt: string): Promise<string> {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    body: JSON.stringify({ model, prompt, stream: false }),
  });
  if (!response.ok) throw new Error("Ollama connection failed");
  const data = await response.json();
  return data.response || "";
}

export interface GuildNpc {
  name: string;
  rank: string;
  level: number;
  power: number;
  specialty: string;
  weakness: string;
  narrative: string;
}

export interface BattleResult {
  won: boolean;
  xpReward: number;
  narrative: string;
  enemyGuild: GuildNpc;
}

const RANKS = ["E", "D", "C", "B", "A", "S"];

/** Generate an enemy guild NPC scaled to the hunter's level using Ollama */
export async function generateEnemyGuild(hunterLevel: number, hunterRank: string): Promise<GuildNpc> {
  const rankIndex = RANKS.indexOf(hunterRank);
  const enemyRankIndex = Math.max(0, Math.min(rankIndex + Math.floor(Math.random() * 3) - 1, RANKS.length - 1));
  const enemyRank = RANKS[enemyRankIndex];
  const enemyLevel = Math.max(1, hunterLevel + Math.floor(Math.random() * 10) - 5);

  const prompt = `You are the Solo Leveling System AI generating an enemy guild for a hunter battle.

Hunter Level: ${hunterLevel}, Hunter Rank: ${hunterRank}

Generate a short enemy guild profile in this exact JSON format (respond ONLY with JSON, no markdown):
{
  "name": "<dramatic guild name, Solo Leveling style>",
  "rank": "${enemyRank}",
  "level": ${enemyLevel},
  "power": <number between 100-9999 scaled to rank>,
  "specialty": "<their combat specialty, e.g. Berserker Rush, Shadow Tactics>",
  "weakness": "<their weakness, e.g. Long battles, Magic attacks>",
  "narrative": "<2 sentences dramatic battle intro narrative>"
}`;

  try {
    const text = await ollamaGenerate("phi3", prompt);
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");

    if (json.name && json.power) return json as GuildNpc;
  } catch {
    // Fallback if Ollama unavailable
  }

  return generateFallbackGuild(enemyRank, enemyLevel);
}

function generateFallbackGuild(rank: string, level: number): GuildNpc {
  const names = [
    "Iron Fang Order", "Void Hunters Guild", "Crimson Shadow Faction",
    "Steel Monarch Corps", "Abyss Walker Syndicate", "Dawn Breaker Alliance",
  ];
  const specialties = ["Berserker Rush", "Shadow Tactics", "Iron Defense", "Speed Assault", "Mage Barrage"];
  const weaknesses  = ["Long battles", "Magic attacks", "Group coordination", "Sustained pressure"];

  const powerBase = { E: 150, D: 400, C: 900, B: 2000, A: 4500, S: 9000 };

  return {
    name:      names[Math.floor(Math.random() * names.length)],
    rank,
    level,
    power:     (powerBase[rank as keyof typeof powerBase] || 500) + Math.floor(Math.random() * 300),
    specialty: specialties[Math.floor(Math.random() * specialties.length)],
    weakness:  weaknesses[Math.floor(Math.random() * weaknesses.length)],
    narrative: `The ${names[0]} emerges from the shadows, their combined battle aura darkening the sky. Hunter, you have been chosen as their next target.`,
  };
}

/** Simulate a guild battle and generate narrative result */
export async function resolveGuildBattle(
  userId: string,
  hunterLevel: number,
  hunterRank: string,
  enemyGuild: GuildNpc
): Promise<BattleResult> {
  const hunterPower = hunterLevel * 100 + (RANKS.indexOf(hunterRank) * 500);
  const winChance   = hunterPower / (hunterPower + enemyGuild.power);
  const won         = Math.random() < winChance;
  const xpReward    = won ? Math.floor(enemyGuild.power * 0.5) : Math.floor(enemyGuild.power * 0.1);

  const prompt = `You are the Solo Leveling System AI narrating a guild battle result.

Result: ${won ? "VICTORY" : "DEFEAT"}
Hunter Rank: ${hunterRank}, Level: ${hunterLevel}
Enemy Guild: ${enemyGuild.name} (Rank ${enemyGuild.rank})
XP Earned: ${xpReward}

Write a 3-sentence dramatic battle result narrative in Solo Leveling style. Respond with only the narrative text, no JSON.`;

  let narrative = won
    ? `The ${enemyGuild.name} has fallen. Their shadows scatter before your might. The System records your victory — ${xpReward} XP has been awarded.`
    : `The ${enemyGuild.name} overwhelms your defenses. You retreat, battle-worn but unbroken. The System records your defeat — return stronger, Hunter.`;

  try {
    const text = await ollamaGenerate("phi3", prompt);
    if (text.length > 20) narrative = text.trim();
  } catch {
    // Use fallback narrative
  }

  // Record the battle result in Supabase
  if (userId && userId !== "local-user") {
    await supabase.from("workout_logs").insert({
      user_id:             userId,
      started_at:          new Date().toISOString(),
      completed_at:        new Date().toISOString(),
      duration_seconds:    300,
      total_xp_earned:     xpReward,
      exercises_completed: [{ type: "GUILD_BATTLE", enemy: enemyGuild.name, won }],
    });

    if (xpReward > 0) {
      const { data: user } = await supabase.from("users").select("current_xp").eq("id", userId).maybeSingle();
      if (user) {
        await supabase.from("users").update({ current_xp: user.current_xp + xpReward }).eq("id", userId);
      }
    }
  }

  return { won, xpReward, narrative, enemyGuild };
}
