-- Trigger function to create a profile and initial stats after signup
-- This automates the process so users don't need to be manually added to the public schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create a public user profile
  -- We use the email/username parts from auth.users or metadata
  -- If username is not provided, we derive it from the email
  INSERT INTO public.users (id, username, email, avatar_url, hunter_rank, level)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username', 
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    'E',
    1
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Initialize user stats
  INSERT INTO public.user_stats (
    user_id,
    strength, vitality, agility, intelligence, perception, sense,
    available_stat_points, total_workouts, current_streak, pvp_rating
  )
  VALUES (NEW.id, 10, 10, 10, 10, 10, 10, 0, 0, 0, 1000)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
