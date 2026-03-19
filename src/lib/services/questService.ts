import { supabase } from "@/lib/supabase";
import { generateDynamicDailyQuests } from "@/lib/game/questEngine";

export interface DailyQuestItem {
  id: string;
  name: string;
  icon: string;
  type: string;
  target: number;
  current: number;
  xp_reward: number;
  completed: boolean;
  difficulty?: "EASY" | "NORMAL" | "HARD";
}

/** Get today's daily quest record */
export async function getDailyQuests(userId: string) {
  if (!userId || userId === "local-user") return { quests: [], rowId: null };
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_quests")
    .select("*")
    .eq("user_id", userId)
    .eq("quest_date", today)
    .limit(1);

  if (error) {
    console.error("[getDailyQuests] Error:", error.message);
    return { quests: [], rowId: null };
  }

  const row = data && data.length > 0 ? data[0] : null;
  const rawQuests: DailyQuestItem[] = Array.isArray(row?.quests) ? row.quests : [];
  return { quests: rawQuests, rowId: row?.id };
}

/** Update quest progress */
export async function updateQuestProgress(userId: string, questId: string, newCurrent: number, target: number) {
  if (!userId || userId === "local-user") return;
  const today = new Date().toISOString().split("T")[0];

  const { data: rows, error } = await supabase
    .from("daily_quests")
    .select("id, quests")
    .eq("user_id", userId)
    .eq("quest_date", today)
    .limit(1);

  const data = rows && rows.length > 0 ? rows[0] : null;
  if (error || !data) {
    return;
  }

  const quests: DailyQuestItem[] = Array.isArray(data.quests) ? data.quests : [];
  const updated = quests.map((q) =>
    q.id === questId
      ? { ...q, current: newCurrent, completed: newCurrent >= target }
      : q
  );

  const allCompleted = updated.every((q) => q.completed);

  await supabase
    .from("daily_quests")
    .update({ quests: updated, all_completed: allCompleted })
    .eq("id", data.id);

  return { completed: newCurrent >= target };
}

/** Generate today's quests row */
export async function generateDailyQuestsForUser(userId: string) {
  if (!userId || userId === "local-user") return;
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("daily_quests")
    .select("id")
    .eq("user_id", userId)
    .eq("quest_date", today)
    .limit(1);

  if (existing && existing.length > 0) return;

  // Fetch user's level and job_class for dynamic quest scaling
  const { data: userRow } = await supabase
    .from("users")
    .select("level, job_class")
    .eq("id", userId)
    .limit(1);
  const level = userRow && userRow.length > 0 ? (userRow[0].level ?? 1) : 1;
  const jobClass = userRow && userRow.length > 0 ? (userRow[0].job_class ?? "NONE") : "NONE";

  // New user has no history and no previousTypes — pass empty arrays
  const quests = generateDynamicDailyQuests(level, jobClass, today, [], []);

  await supabase.from("daily_quests").insert({
    user_id: userId,
    quest_date: today,
    quests,
    all_completed: false,
    penalty_triggered: false,
    bonus_xp_claimed: false,
  });
}

/** Check if the user missed yesterday's quests */
export async function checkPenaltyZone(userId: string): Promise<boolean> {
  if (!userId || userId === "local-user") return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yyyymmdd = yesterday.toISOString().split("T")[0];

  const { data: records, error } = await supabase
    .from("daily_quests")
    .select("id, all_completed, penalty_triggered")
    .eq("user_id", userId)
    .eq("quest_date", yyyymmdd)
    .limit(1);

  const data = records && records.length > 0 ? records[0] : null;
  if (error || !data) return false;

  if (!data.all_completed && !data.penalty_triggered) {
    await supabase.from("daily_quests").update({ penalty_triggered: true }).eq("id", data.id);
    return true;
  }
  return false;
}
