// src/lib/ai/sessionCache.ts
// Module-level Map — survives component remount within a page session,
// resets naturally on page reload (no persistence needed).
// Keys: 'boss:{bossId}', 'quest:{questId}', 'workout', 'arena:{battleStartedAt}'

const cache = new Map<string, string>();

export const aiCache = {
  get: (key: string): string | null => cache.get(key) ?? null,
  set: (key: string, value: string): void => { cache.set(key, value); },
  has: (key: string): boolean => cache.has(key),
};
