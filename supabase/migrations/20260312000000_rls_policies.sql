-- ARISE: Supabase RLS Security Policies (Stage 8)

-- 1. Users Table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. User Stats
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own stats" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own stats" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

-- 3. Daily Quests
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own daily quests" ON public.daily_quests FOR ALL USING (auth.uid() = user_id);

-- 4. Guilds
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can see guilds" ON public.guilds FOR SELECT USING (true);
CREATE POLICY "Leaders can edit their guild" ON public.guilds FOR UPDATE USING (auth.uid() = leader_id);

-- 5. Guild Members
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can see guild members" ON public.guild_members FOR SELECT USING (true);
CREATE POLICY "Members can leave guilds" ON public.guild_members FOR DELETE USING (auth.uid() = user_id);

-- 6. Chat Messages
ALTER TABLE public.guild_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can see guild chat" ON public.guild_chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_chat_messages.guild_id AND user_id = auth.uid())
);
CREATE POLICY "Members can post to guild chat" ON public.guild_chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_chat_messages.guild_id AND user_id = auth.uid())
);

-- 7. Inventory
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their items" ON public.user_inventory FOR SELECT USING (auth.uid() = user_id);

-- 8. Shadows
ALTER TABLE public.user_shadows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their extracted shadows" ON public.user_shadows FOR SELECT USING (auth.uid() = user_id);

-- 9. Manhwa Chapters
ALTER TABLE public.manhwa_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see chapter metadata" ON public.manhwa_chapters FOR SELECT USING (true);

ALTER TABLE public.user_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their unlocked chapters" ON public.user_chapters FOR SELECT USING (auth.uid() = user_id);

-- 10. PvP Battles
ALTER TABLE public.pvp_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can see battles" ON public.pvp_battles FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
