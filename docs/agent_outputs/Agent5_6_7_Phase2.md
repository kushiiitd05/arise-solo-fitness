# UI/UX Component Output (Agent 5)
**Stage 4 (Part 2) | Animations & Core Components**

## 1. SystemWindow Wrapper Component
The core UI container. Replicates the floating blue status screen from Solo Leveling.

```tsx
import { motion } from 'framer-motion';

export function SystemWindow({ children, title, isPenalty = false }) {
  const baseClass = isPenalty ? 'penalty-window' : 'system-window';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-6 ${baseClass} relative overflow-hidden`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      {title && (
        <h2 className="text-xl font-orbitron text-primary text-glow mb-4 tracking-wider uppercase">
          {title}
        </h2>
      )}
      <div className="text-foreground/90 font-exo relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
```

## 2. XP Gain Animation Component
Floating XP numbers on dungeon/set clear.

```tsx
export function XPGainPopup({ amount, x, y }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: y, x: x, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: y - 100, scale: [1, 1.2, 1] }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="absolute pointer-events-none font-orbitron text-2xl text-accent text-glow font-bold z-50"
    >
      +{amount} XP
    </motion.div>
  );
}
```

---

# AR Camera ML Pipeline (Agent 6)
**Stage 5 Output**

## TensorFlow.js + MediaPipe Strategy
We will use `@mediapipe/pose` through `@tensorflow/tfjs` to run in-browser without server costs or privacy issues.

### Push-up Detection Algorithm
1. Extract Landmarks: Shoulder (11,12), Elbow (13,14), Wrist (15,16), Hip (23,24).
2. Calculate Elbow Angle using `calcAngle(shoulder, elbow, wrist)`.
3. Logic Thresholds:
   - `START_STAGE`: Elbow angle > 160° (arms straight).
   - `DOWN_STAGE`: Elbow angle < 90° (chest down).
4. `countRep()` trigger: Transition from DOWN_STAGE back to START_STAGE.

### Squat Detection Algorithm
1. Extract: Hip (23,24), Knee (25,26), Ankle (27,28).
2. Key Angle: `calcAngle(hip, knee, ankle)`.
3. Logic:
   - Standing: Knee > 160°.
   - Squatting: Knee < 100° (parallel or lower).

---

# Gamification Mathematics (Agent 7)
**Stage 6 Output**

## XP & Scaling Engine
Solo Leveling's scale is exponential. It is easy to reach D rank, but insanely difficult to reach S rank.

| Rank | Min Level | Min Total XP |
| :-- | :-- | :-- |
| E | 1 | 0 |
| D | 11 | 3,450 |
| C | 31 | 16,800 |
| B | 51 | 54,000 |
| A | 71 | 148,000 |
| S | 90 | 350,000 |
| NATIONAL | 100 | 500,000 |

### Daily Quest Math
- **Base Quest**: 100 Push-ups, 100 Sit-ups, 100 Squats, 10km Run. (Matches Manhwa).
- For safety and realism, AR-measured apps must scale this.
- `Daily Target = Base_Goal * (Level / 10)` capped at maximum safe human limits.
- E-Rank user daily: 20 Pushups, 20 Squats, 1km run.

### Streak Multipliers
XP Gain formula for a workout:
`TotalXP = BaseXP * (1 + (StreakDays * 0.05))`
- Cap streak multiplier at 2.0x (20 day streak).

### Penalty Zone
If `daily_quests.all_completed === false` by 11:59PM user local time:
1. `UserStat.available_stat_points` incurs a -1 penalty (if > 0).
2. Screen flashes Red. Next login locks user into `/workout/penalty-dungeon`.
3. Penalty Dungeon: Centipede Desert Run.
   - Survive 3 minutes plank without drop. (Detected via AR).

Phase 2 completed. Moving to Phase 3 (Webtoon Reader, Infra, AI Integration).
