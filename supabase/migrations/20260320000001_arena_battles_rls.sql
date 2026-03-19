-- Phase 14: QA & Hardening — arena_battles RLS
-- Closes gap identified in Phase 11: arena_battles was created without row-level security.
-- Server routes use service-role key (bypasses RLS). This policy protects the anon client path.

ALTER TABLE public.arena_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own battle history"
  ON public.arena_battles
  FOR SELECT
  USING (auth.uid() = user_id);
