"use client";

import { useEffect, useReducer, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import AwakeningScreen from "@/components/arise/AwakeningScreen";
import Dashboard from "@/components/arise/Dashboard";
import Reader from "@/components/arise/Reader";
import PenaltyZone from "@/components/arise/PenaltyZone";
import SystemNotification from "@/components/system/SystemNotification";
import { gameReducer, initialState, xpForLevel } from "@/lib/gameReducer";
import { loadUser, createUser } from "@/lib/services/userService";
import { getDailyQuests, checkPenaltyZone } from "@/lib/services/questService";

/** Map raw Supabase row fields (snake_case) to GameState user shape (camelCase) */
function mapDbUserToState(dbUser: any, dbStats: any) {
  return {
    id:           dbUser.id,
    username:     dbUser.username,
    email:        dbUser.email,
    avatar:       dbUser.avatar_url ?? null,
    title:        dbUser.title ?? "E-Rank Hunter",
    level:        dbUser.level ?? 1,
    currentXp:    dbUser.current_xp ?? 0,
    xpToNextLevel: xpForLevel(dbUser.level ?? 1),
    rank:         dbUser.hunter_rank ?? "E",
    jobClass:     dbUser.job_class ?? "NONE",
    createdAt:    dbUser.created_at ?? new Date().toISOString(),
    stats: dbStats ? {
      strength:       dbStats.strength ?? 10,
      vitality:       dbStats.vitality ?? 10,
      agility:        dbStats.agility ?? 10,
      intelligence:   dbStats.intelligence ?? 10,
      perception:     dbStats.perception ?? 10,
      sense:          dbStats.sense ?? 10,
      availablePoints: dbStats.available_stat_points ?? 0,
      totalWorkouts:  dbStats.total_workouts_completed ?? 0,
      currentStreak:  dbStats.current_streak ?? 0,
      longestStreak:  dbStats.longest_streak ?? 0,
      totalCalories:  dbStats.total_calories_burned ?? 0,
      totalXpEarned:  dbStats.total_xp_earned ?? 0,
      pvpRating:      dbStats.pvp_rating ?? 1000,
      pvpWins:        dbStats.pvp_wins ?? 0,
      pvpLosses:      dbStats.pvp_losses ?? 0,
      trialLastFailedAt: dbStats.trial_last_failed_at ?? null,
    } : undefined,
  };
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    setIsMounted(true);

    const syncSession = async () => {
      // 1. CLEANSE LOCALSTORAGE (Critical: remove legacy local-user state)
      const savedRaw = localStorage.getItem("arise_game_state");
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          if (parsed?.user?.id === "local-user") {
             console.warn("SYSTEM: Sanitizing legacy local-user session...");
             localStorage.removeItem("arise_game_state");
          }
        } catch (e) {}
      }

      // 2. Auth Session Sync
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const dbData = await loadUser(session.user.id);
          if (dbData.user) {
            dispatch({
              type: "SET_USER",
              payload: mapDbUserToState(dbData.user, dbData.stats),
            });
            const questsResult = await getDailyQuests(session.user.id);
            if (questsResult?.quests?.length) {
              dispatch({ type: "SET_DAILY_QUESTS", payload: questsResult.quests });
            }
            if (await checkPenaltyZone(session.user.id)) {
              dispatch({ type: "TRIGGER_PENALTY" });
            }
          } else {
            dispatch({
              type: "SET_USER",
              payload: {
                id: session.user.id,
                email: session.user.email || "",
                avatar: session.user.user_metadata?.avatar_url || null,
              }
            });
          }
        } catch (err) {
          console.error("Failed to load hunter profile:", err);
        }
      } else {
        const saved = localStorage.getItem("arise_game_state");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed?.user?.jobClass && parsed.user.jobClass !== "NONE" && parsed.user.id && parsed.user.id !== "local-user") {
              dispatch({ type: "SET_USER", payload: parsed.user });
            }
          } catch (e) {}
        }
      }
      setIsLoading(false);
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        const dbData = await loadUser(session.user.id).catch(() => null);
        if (dbData?.user) {
          dispatch({
            type: "SET_USER",
            payload: mapDbUserToState(dbData.user, dbData.stats),
          });
          const signInQuests = await getDailyQuests(session.user.id);
          if (signInQuests?.quests?.length) {
            dispatch({ type: "SET_DAILY_QUESTS", payload: signInQuests.quests });
          }
        }
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("arise_game_state");
        window.location.reload();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isMounted && state.user.id && state.user.id !== "local-user") {
      localStorage.setItem("arise_game_state", JSON.stringify(state));
    }
  }, [state, isMounted]);

  const handleAwaken = async (username: string, jobClass: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Dispatch immediate local state to unblock UI
    dispatch({ type: "AWAKEN", payload: { username, jobClass } });

    if (session?.user) {
      try {
        setIsLoading(true);
        await createUser({
          id: session.user.id,
          username,
          email: session.user.email || "",
          avatar: session.user.user_metadata?.avatar_url,
          jobClass,
        });
        const newQuests = await getDailyQuests(session.user.id);
        if (newQuests?.quests?.length) {
          dispatch({ type: "SET_DAILY_QUESTS", payload: newQuests.quests });
        }
      } catch (err) {
        console.error("System failed to record awakening in cloud:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center font-orbitron text-[#06B6D4] animate-pulse uppercase tracking-[0.5em] text-sm">
        SYSTEM_SYNC_IN_PROGRESS...
      </div>
    );
  }

  const currentChapter = state.chapters?.find((c: any) => c.id === state.activeChapterId);
  const isAwakened = state.user.id && state.user.id !== "" && state.user.id !== "local-user" && state.user.jobClass !== "NONE";

  return (
    <main className="min-h-screen relative bg-[#030308] selection:bg-[#7C3AED]/30">
      <SystemNotification
        notifications={state.notifications || []}
        onDismiss={(id) => dispatch({ type: "DISMISS_NOTIFICATION", payload: id })}
      />
      <AnimatePresence>
        {state.isPenaltyZone && (
          <PenaltyZone key="penalty" onStart={() => dispatch({ type: "CLEAR_PENALTY" })} />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {state.activeChapterId && currentChapter && (
          <Reader key="reader" chapterId={state.activeChapterId} isUnlocked={currentChapter.unlocked} onClose={() => dispatch({ type: "CLOSE_READER" })} />
        )}
      </AnimatePresence>
      {!isAwakened ? (
        <AwakeningScreen onStart={handleAwaken} />
      ) : (
        <Dashboard state={state} dispatch={dispatch} />
      )}
    </main>
  );
}
