import { supabase } from "@/lib/supabase";

export interface GuildMessage {
  id: string;
  guild_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string | null;
  }
}

/** Fetch last N messages for a guild */
export async function getGuildMessages(guildId: string, limit = 50): Promise<GuildMessage[]> {
  if (!guildId) return [];
  const { data, error } = await supabase
    .from("guild_chat_messages")
    .select(`
      id,
      guild_id,
      user_id,
      content,
      created_at,
      users (
        username,
        avatar_url
      )
    `)
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[guildService] Error fetching messages:", error);
    return [];
  }
  return data.map((m: any) => ({
    ...m,
    user: m.users
  })).reverse();
}

/** Send a message to the guild chat */
export async function sendGuildMessage(guildId: string, userId: string, content: string) {
  if (!userId || userId === "local-user" || !guildId || !content) return null;
  const { data, error } = await supabase
    .from("guild_chat_messages")
    .insert({
      guild_id: guildId,
      user_id: userId,
      content
    })
    .select()
    .limit(1);

  if (error) {
    console.error("[guildService] Error sending message:", error);
    return null;
  }
  return data && data.length > 0 ? data[0] : null;
}

/** Subscribe to live chat updates */
export function subscribeToGuildChat(guildId: string, callback: (payload: any) => void) {
  if (!guildId) return { unsubscribe: () => {} };
  return supabase
    .channel(`guild-chat-${guildId}`)
    .on(
      "postgres_changes" as any,
      {
        event: "INSERT",
        table: "guild_chat_messages",
        filter: `guild_id=eq.${guildId}`,
      },
      callback
    )
    .subscribe();
}

/** Get the first joinable guild */
export async function getFirstGuild() {
  const { data, error } = await supabase
    .from("guilds")
    .select("*")
    .limit(1);
  
  return data && data.length > 0 ? data[0] : null;
}
