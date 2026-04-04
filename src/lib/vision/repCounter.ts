/**
 * ARISE: BIOMECHANICAL MOVEMENT VALIDATION
 * Implements Repetition State Machine + Multi-Point Posture Guard
 * Research Insight: MediaPipe visibility < 0.5 degrades constraint strictness.
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type RepState = "READY" | "DOWN" | "UP";
export type PostureState = "PERFECT" | "POSTURE_WARNING" | "CRITICAL_FAILURE";

export interface PostureConstraint {
  name: string;
  angleIndices: [number, number, number]; 
  minAngle: number;
  maxAngle: number;
  requiredVisibility: number;
  severity: 'critical' | 'moderate' | 'optional';
}

export interface ExerciseMechanics {
  repTriggerAngles: {
    indices: [number, number, number];
    thresholdDown: number;
    thresholdUp: number;
  };
  constraints: PostureConstraint[];
}

/** Calculates 3D angle between three points */
export const calculateAngle = (p1: Landmark, p2: Landmark, p3: Landmark): number => {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };

  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  const angle = Math.acos(dotProduct / (mag1 * mag2));
  return (angle * 180) / Math.PI;
};

/**
 * Exercise System Database (Hardcoded Fallback / Core Mechanics)
 */
export const EXERCISE_DB: Record<string, ExerciseMechanics> = {
  PUSHUP: {
    repTriggerAngles: { indices: [11, 13, 15], thresholdDown: 90, thresholdUp: 160 },
    constraints: [
      { name: "spine_alignment", angleIndices: [11, 23, 27], minAngle: 155, maxAngle: 180, requiredVisibility: 0.5, severity: 'critical' }
    ]
  },
  SQUAT: {
    repTriggerAngles: { indices: [23, 25, 27], thresholdDown: 110, thresholdUp: 160 },
    constraints: [
      { name: "back_straightness", angleIndices: [11, 23, 25], minAngle: 70, maxAngle: 180, requiredVisibility: 0.6, severity: 'moderate' }
    ]
  },
  SITUP: {
    repTriggerAngles: { indices: [11, 23, 25], thresholdDown: 60, thresholdUp: 130 },
    constraints: [] 
  },
  LUNGE: {
    repTriggerAngles: { indices: [23, 25, 27], thresholdDown: 100, thresholdUp: 160 },
    constraints: [
      { name: "spine_alignment", angleIndices: [11, 23, 25], minAngle: 160, maxAngle: 180, requiredVisibility: 0.5, severity: 'critical' }
    ]
  }
};

/**
 * PostureGuard Class
 * Tracks reps and analyzes multi-point kinematic constraints with occlusion handling.
 */
export class PostureGuard {
  private lastState: RepState = "READY";
  public totalReps: number = 0;
  public flawlessReps: number = 0;
  private minVisibility: number = 0.5;
  public currentWarnings: string[] = [];
  public ghostData: { angles: number[], visibility: number[] } = { angles: [], visibility: [] };

  constructor(private mechanics: ExerciseMechanics) {}

  update(landmarks: Landmark[]): { reps: number, flawless: number, warnings: string[], ghostData: any } {
    this.currentWarnings = [];
    this.ghostData = { angles: [], visibility: [] };
    const trigger = this.mechanics.repTriggerAngles;
    
    // 1. Check Primary Trigger
    const tP1 = landmarks[trigger.indices[0]];
    const tP2 = landmarks[trigger.indices[1]];
    const tP3 = landmarks[trigger.indices[2]];

    if (!tP1 || !tP2 || !tP3) return { reps: this.totalReps, flawless: this.flawlessReps, warnings: ["No Landmarks"], ghostData: this.ghostData };

    const trVis = Math.min(tP1.visibility ?? 1, tP2.visibility ?? 1, tP3.visibility ?? 1);
    const triggerAngle = calculateAngle(tP1, tP2, tP3);
    this.ghostData.angles.push(triggerAngle);
    this.ghostData.visibility.push(trVis);

    if (trVis < this.minVisibility) {
        return { reps: this.totalReps, flawless: this.flawlessReps, warnings: ["Not Fully Visible"], ghostData: this.ghostData };
    }

    // 2. Evaluate Posture Constraints with Graceful Degradation
    let framePerfect = true;
    for (const constraint of this.mechanics.constraints) {
      const c1 = landmarks[constraint.angleIndices[0]];
      const c2 = landmarks[constraint.angleIndices[1]];
      const c3 = landmarks[constraint.angleIndices[2]];

      if (!c1 || !c2 || !c3) continue;

      const vis = Math.min(c1.visibility ?? 1, c2.visibility ?? 1, c3.visibility ?? 1);
      const angle = calculateAngle(c1, c2, c3);
      
      this.ghostData.angles.push(angle);
      this.ghostData.visibility.push(vis);

      // Occlusion Handling: If visibility < required visibility, we degrade strictness (extend tolerance)
      let effectiveMin = constraint.minAngle;
      let effectiveMax = constraint.maxAngle;
      
      if (vis < constraint.requiredVisibility) {
         // Decrease strictness by 15 degrees if partially occluded
         effectiveMin -= 15;
         effectiveMax += 15;
      }

      // If it's completely obscured (< 0.2), skip the warning altogether so we don't penalize unfairly.
      if (vis < 0.2) continue;

      if (angle < effectiveMin || angle > effectiveMax) {
        if (constraint.severity === 'critical') framePerfect = false; // Only critical ruins the perfect rep
        this.currentWarnings.push(constraint.name);
      }
    }

    // 3. Process Repetition State Machine
    if (this.lastState === "READY" && triggerAngle < trigger.thresholdDown) {
      this.lastState = "DOWN";
    } else if (this.lastState === "DOWN" && triggerAngle > trigger.thresholdUp) {
      this.lastState = "READY";
      this.totalReps++;
      if (framePerfect) {
        this.flawlessReps++;
      }
    }

    return { reps: this.totalReps, flawless: this.flawlessReps, warnings: this.currentWarnings, ghostData: this.ghostData };
  }

  reset() {
    this.totalReps = 0;
    this.flawlessReps = 0;
    this.lastState = "READY";
    this.currentWarnings = [];
  }
}
