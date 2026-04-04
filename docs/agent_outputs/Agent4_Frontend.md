# Frontend Architecture & Tech Lead Output
**Agent 4 | Stage 4 Output**

## Tech Stack & Setup
- **Framework**: `Next.js 14` (App Router)
- **Styling**: `Tailwind CSS v3.4`, `shadcn/ui`
- **State Management**: `Zustand`
- **Animation**: `Framer Motion`

## Global Design Tokens (Dark Fantasy / Solo Leveling Aesthetic)

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Pure deep dark background */
    --background: 240 10% 4%; 
    --foreground: 0 0% 98%;

    /* System Blue borders and highlights */
    --primary: 217 91% 60%;
    --primary-foreground: 210 40% 98%;

    /* Neon Cyan / electric blue accents (Manhwa Style) */
    --accent: 180 100% 50%;
    --accent-foreground: 180 100% 10%;

    /* Error / Penalty red */
    --destructive: 348 100% 50%;
    --destructive-foreground: 0 0% 100%;

    /* Glassmorphism panel base */
    --card: 240 10% 6%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 6%;
    --popover-foreground: 0 0% 98%;
    
    /* Hollow glowing borders */
    --border: 217 91% 30%;
    --input: 240 10% 12%;
    --ring: 180 100% 50%;
    --radius: 0.5rem;
  }
}

.system-window {
  @apply bg-card/80 backdrop-blur-md border border-primary/50 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)];
}

.text-glow {
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.7);
}

.penalty-window {
  @apply bg-red-950/80 backdrop-blur-md border border-destructive rounded-lg shadow-[0_0_20px_rgba(255,0,0,0.5)];
}
```

## Typography Strategy
As specified in target requirements, we will use modern, angular typography to simulate "The System":
- **Orbitron** (`next/font/google`): Used exclusively for Numbers, Levels (Lv. 15), Stats (STR, VIT), and large floating XP values.
- **Exo 2** (`next/font/google`): Clean, geometric font for body text, quest logs, and item descriptions.

## Next.js Project Structure

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx             # Awakening screen 
│   ├── (dashboard)/
│   │   ├── status/page.tsx            # Main Stat Window
│   │   ├── quests/page.tsx            # Daily/Weekly quests
│   │   └── inventory/page.tsx         # Items & Shadows
│   ├── (workouts)/
│   │   ├── gate/[id]/page.tsx         # Pre-dungeon prep screen
│   │   └── active/page.tsx            # Live AR tracker with timer
│   └── api/                           # Nextjs API route handlers
├── components/
│   ├── ui/                            # shadcn primitives
│   ├── system/                        # Custom 'Solo Leveling' components
│   │   ├── SystemWindow.tsx
│   │   ├── StatBar.tsx
│   │   └── QuestCard.tsx
│   └── animations/
│       ├── XPGain.tsx
│       └── LevelUpOverlay.tsx
├── lib/
│   ├── store.ts                       # Zustand global state
│   └── supabase.ts                    # Supabase client instantiation
└── types/
    └── index.ts                       # Zod schemas matching Prisma
```

This completes the structural output for Agent 4. Moving to Agent 5 for complex UI component construction.
