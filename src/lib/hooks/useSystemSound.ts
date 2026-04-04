"use client";

import { useCallback } from "react";

type SoundType = "NOTIFICATION" | "LEVEL_UP" | "QUEST_COMPLETE" | "ERROR" | "CLICK";

const SOUND_URLS: Record<SoundType, string> = {
  NOTIFICATION: "/sounds/system-notif.mp3",
  LEVEL_UP: "/sounds/level-up.mp3",
  QUEST_COMPLETE: "/sounds/quest-done.mp3",
  ERROR: "/sounds/system-error.mp3",
  CLICK: "/sounds/ui-click.mp3",
};

export function useSystemSound() {
  const play = useCallback((type: SoundType) => {
    // In a real browser environment, we'd use the Audio API
    // This is a placeholder for the Stage 4 SFX requirement
    console.log(`[SYSTEM] Playing sound: ${type}`);
    try {
      const audio = new Audio(SOUND_URLS[type]);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Handle autoplay restrictions
      });
    } catch (e) {}
  }, []);

  return { play };
}
