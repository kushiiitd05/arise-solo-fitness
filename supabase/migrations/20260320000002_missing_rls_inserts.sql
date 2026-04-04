-- Fix missing INSERT/UPDATE RLS policies that blocked gameplay

-- user_inventory: allow users to insert their own items (starter grants, loot)
CREATE POLICY "Users can insert their own items" ON public.user_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON public.user_inventory
  FOR UPDATE USING (auth.uid() = user_id);

-- workout_logs: RLS was never enabled
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own workout logs" ON public.workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own workout logs" ON public.workout_logs
  FOR SELECT USING (auth.uid() = user_id);
