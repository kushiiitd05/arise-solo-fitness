# Deferred Items

Pre-existing TypeScript errors found during 01-01 execution. Out of scope for this plan.

## Pre-existing TS Errors (found during npx tsc --noEmit)

1. `src/components/arise/Dashboard.tsx:268` — TS2322: Type `{ state: GameState; dispatch: Dispatch<any>; }` not assignable to `IntrinsicAttributes & { isOpen: boolean; onEnter: () => void; }`. Property 'state' does not exist.

2. `src/components/arise/GuildHall.tsx:80` — TS2345: `RealtimeChannel | { unsubscribe: () => void; }` not assignable to `RealtimeChannel`. Missing 19+ properties.

3. `src/lib/services/guildBattleService.ts:7` — TS2305: Module `@/lib/ollama` has no exported member 'ollama'.

4. `src/lib/services/guildBattleService.ts:126` — TS2551: Property 'catch' does not exist on PostgrestFilterBuilder. Did you mean 'match'?
