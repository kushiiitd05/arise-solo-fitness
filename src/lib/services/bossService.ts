import { supabase } from "../supabase";
import { BOSS_ROSTER } from "../data/bossRoster";

/** XP awarded for killing a world boss, keyed by boss rank */
export const BOSS_RANK_XP: Record<string, number> = {
  E: 200,
  D: 500,
  C: 1_000,
  B: 2_000,
  A: 5_000,
  S: 10_000,
  MONARCH: 10_000,
};

export interface WorldBoss {
  id: string;
  name: string;
  max_hp: number;
  current_hp: number;
  participants: number;
  expires_at: string;
}

/** Fetch the currently active world boss (alive + not expired) */
export async function getActiveBoss(): Promise<WorldBoss | null> {
  try {
    const { data, error } = await supabase
      .from("world_bosses")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .gt("current_hp", 0)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[bossService] Failed to load boss:", error.message);
      return null;
    }
    return data && data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error("[bossService] getActiveBoss error:", e);
    return null;
  }
}

/** Subscribe to live boss HP/participant updates */
export function subscribeToBossUpdates(
  bossId: string,
  onUpdate: (boss: Partial<WorldBoss>) => void
) {
  if (!bossId) return { unsubscribe: () => {} };
  return supabase
    .channel(`boss-${bossId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "world_bosses",
        filter: `id=eq.${bossId}`,
      },
      (payload) => {
        onUpdate(payload.new as Partial<WorldBoss>);
      }
    )
    .subscribe();
}

/** Deal damage to the boss */
export async function dealDamage(
  bossId: string,
  userId: string,
  damage: number
): Promise<{ newHp: number; damageDealt: number; bossDefeated: boolean }> {
  if (!userId || userId === "local-user" || !bossId) return { newHp: 0, damageDealt: 0, bossDefeated: false };
  try {
    const { data: currentArr } = await supabase
      .from("world_bosses")
      .select("current_hp, participants")
      .eq("id", bossId)
      .limit(1);

    const current = currentArr && currentArr[0];
    if (!current) return { newHp: 0, damageDealt: 0, bossDefeated: false };

    const newHp = Math.max(0, current.current_hp - damage);
    const bossDefeated = newHp <= 0;

    const { error } = await supabase
      .from("world_bosses")
      .update({
        current_hp: newHp,
        participants: (current.participants || 0) + 1,
      })
      .eq("id", bossId);

    if (error) {
      console.error("[bossService] dealDamage update failed:", error.message);
      return { newHp: current.current_hp, damageDealt: 0, bossDefeated: false };
    }

    return { newHp, damageDealt: damage, bossDefeated };
  } catch (e) {
    console.error("[bossService] dealDamage error:", e);
    return { newHp: 0, damageDealt: 0, bossDefeated: false };
  }
}

/** Award XP to a raid participant via the server-side /api/xp/award route */
export async function awardRaidReward(userId: string, xp: number) {
  if (!userId || userId === "local-user") return;
  try {
    await fetch("/api/xp/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: xp, reason: "boss_kill" }),
    });
  } catch (e) {
    console.error("[bossService] awardRaidReward error:", e);
  }
}

/** Check if there is an active boss currently */
export async function hasActiveBoss(): Promise<boolean> {
  const boss = await getActiveBoss();
  return !!boss;
}

/** Spawn a new boss */
export async function spawnDailyBoss(userLevel: number): Promise<WorldBoss | null> {
  try {
    const active = await getActiveBoss();
    if (active) return active;

    const validBosses = BOSS_ROSTER.filter(b => b.minLevelRequired <= userLevel);
    const bossTemplate = validBosses.length > 0 
      ? validBosses[Math.floor(Math.random() * validBosses.length)]
      : BOSS_ROSTER[0];

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data, error } = await supabase
      .from("world_bosses")
      .insert({
        name: bossTemplate.name,
        max_hp: bossTemplate.maxHp,
        current_hp: bossTemplate.maxHp,
        participants: 0,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .limit(1);

    if (error) {
      console.error("[bossService] Failed to spawn boss:", error.message);
      return null;
    }
    return data && data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error("[bossService] spawnDailyBoss error:", e);
    return null;
  }
}
