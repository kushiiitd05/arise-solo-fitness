import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Camera, CameraOff, Zap, CheckCircle2, X, Loader2, RefreshCw, Target, Eye, HelpCircle } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { GameState, calculateIntensityRank } from "@/lib/gameReducer";
import { awardXp, logWorkout } from "@/lib/services/xpService";
import { PostureGuard, EXERCISE_DB, Landmark } from "@/lib/vision/repCounter";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { systemAudio } from "@/lib/audio";
import { generateAIOmission, getDifficultyMultiplier, Exercise } from "@/lib/services/exerciseService";
import { getDailyQuests } from "@/lib/services/questService";
import { supabase } from "@/lib/supabase";
import { generateWorkoutTagline } from '@/lib/ai/prompts/workoutPrompt';
import { aiCache } from '@/lib/ai/sessionCache';
import { TypingText } from '@/components/system/TypingText';
import { ExerciseGuideModal } from "@/components/arise/ExerciseGuideModal";

interface WorkoutEngineProps {
  state: GameState;
  dispatch: React.Dispatch<any>;
  onClose: () => void;
  onChapterUnlocked?: (newCount: number) => void;
}

export default function WorkoutEngine({ state, dispatch, onClose, onChapterUnlocked }: WorkoutEngineProps) {
  const userLevel = state.user.level;
  const userRank = state.user.rank;
  const jobClass = state.user.jobClass as any;
  const mp = (state.user.stats as any)?.mana || 0;
  const userId = state.user.id ?? "";

  // AI DIFFICULTY SCALING
  const baseDifficulty = 10 + Math.floor(userLevel * 0.75);
  const rankMultiplier = getDifficultyMultiplier(userRank);

  const [phase, setPhase] = useState<"select" | "active" | "complete">("select");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [reps, setReps] = useState(0);
  const [flawlessReps, setFlawlessReps] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [targetReps, setTargetReps] = useState(baseDifficulty);
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [arEnabled, setArEnabled] = useState(false);
  const [ghostVision, setGhostVision] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [intensityRankStr, setIntensityRankStr] = useState("D");
  const [syncing, setSyncing] = useState(false);
  const [arLoading, setArLoading] = useState(false);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [workoutTagline, setWorkoutTagline] = useState<string | null>(null);
  const [guideExercise, setGuideExercise] = useState<Exercise | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const counterRef = useRef<PostureGuard | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchMissions = async () => {
      setLoadingMissions(true);
      const missionSet = await generateAIOmission(jobClass, userRank);
      setExercises(missionSet);
      setLoadingMissions(false);
    };
    fetchMissions();
  }, [userRank, jobClass]);

  // AI workout tagline — fires after missions finish loading to avoid simultaneous Ollama requests
  useEffect(() => {
    if (loadingMissions) return;
    const cacheKey = 'workout';
    if (aiCache.has(cacheKey)) {
      setWorkoutTagline(aiCache.get(cacheKey));
      return;
    }
    generateWorkoutTagline(jobClass ?? 'Fighter').then((tagline) => {
      if (tagline) {
        aiCache.set(cacheKey, tagline);
        setWorkoutTagline(tagline);
      }
    });
  }, [loadingMissions]); // fires once when loadingMissions flips to false

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  useEffect(() => {
    if (reps >= targetReps && isRunning) {
       handleComplete();
    }
  }, [reps, targetReps, isRunning]);

  const predictWebcam = useCallback(() => {
    if (!videoRef.current || !landmarkerRef.current || !isRunning || !arEnabled) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }
    const startTimeMs = performance.now();
    const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
    if (results.landmarks && results.landmarks.length > 0 && counterRef.current) {
      const landmarks = results.landmarks[0] as unknown as Landmark[];
      const res = counterRef.current.update(landmarks);
      if (res.reps > reps) {
        setReps(res.reps);
        setFlawlessReps(res.flawless);
      }
      setWarnings(res.warnings);
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [isRunning, arEnabled, reps]);

  useEffect(() => {
    if (arEnabled && isRunning) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [arEnabled, isRunning, predictWebcam]);

  // ── SPACEBAR = +1 REP ──────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && phase === "active" && isRunning) {
        e.preventDefault();
        systemAudio?.playClick();
        setReps(r => r + 1);
        setFlawlessReps(r => r + 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, isRunning]);

  const handleComplete = async () => {
    if (!selectedExercise) return;
    setIsRunning(false);
    systemAudio?.playSuccess();
    
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    const rankStr = calculateIntensityRank(reps, flawlessReps);
    setIntensityRankStr(rankStr);
    
    const intensityBonuses: Record<string, number> = { "S": 2.0, "A": 1.5, "B": 1.0, "C": 0.5, "D": 0.1 };
    const xpMultiplier = (1 + (userLevel * 0.05)) * rankMultiplier * (intensityBonuses[rankStr] || 1.0);
    const earned = Math.floor(reps * selectedExercise.xpPerRep * xpMultiplier);
    
    setXpEarned(earned);
    setSyncing(true);

    try {
      const result = await awardXp(state.user.id, earned);

      // ── QUEST PROGRESS WRITE-BACK ──────────────────────
      // Map exercise type to quest type, update progress, and fire notifications
      const questsData = await getDailyQuests(state.user.id);
      if (questsData?.quests?.length) {
        const exType = (selectedExercise.type || "").toUpperCase();
        const questTypeMap: Record<string, string[]> = {
          PUSHUP:  ["PUSHUPS"],
          SQUAT:   ["SQUATS"],
          SITUP:   ["SITUPS"],
          RUNNING: ["RUNNING", "CARDIO"],
        };
        const matchKeys = questTypeMap[exType] || [];
        // Snapshot before loop — used to guard the all-complete notification
        const wasAllComplete = questsData.quests.every((q: any) => q.completed);
        let allCompleteNotified = false;

        for (const q of questsData.quests) {
          if (!q.completed && matchKeys.some((k: string) => (q.type || q.name || "").toUpperCase().includes(k))) {
            const newVal = Math.min(q.target, (q.current || 0) + reps);
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/quests/update", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session?.access_token ?? ""}`,
              },
              body: JSON.stringify({ questId: q.id, newCurrent: newVal }),
            });
            const result = await res.json().catch(() => null);
            if (result?.success) {
              // Per-quest completion: was incomplete before call, now complete
              const updatedQuest = (result.quests as any[])?.find((rq: any) => rq.id === q.id);
              if (updatedQuest?.completed) {
                dispatch({
                  type: "ADD_NOTIFICATION",
                  payload: {
                    type: "QUEST",
                    title: `${q.name} COMPLETE`,
                    body: `+${q.xp_reward ?? 0} XP Earned`,
                    icon: "✅",
                  },
                });
              }
              // All-daily-complete: fires at most once per workout session
              if (result.allCompleted && !wasAllComplete && !allCompleteNotified) {
                allCompleteNotified = true;
                dispatch({
                  type: "ADD_NOTIFICATION",
                  payload: {
                    type: "QUEST",
                    title: "DAILY QUESTS COMPLETE",
                    body: "All missions accomplished. Full XP awarded.",
                    icon: "🏆",
                  },
                });
                // Fire chapter unlock ceremony if server unlocked a new chapter
                if (result.chapter_newly_unlocked && onChapterUnlocked) {
                  onChapterUnlocked(result.chapters_unlocked);
                }
              }
            }
          }
        }
      }
      // ──────────────────────────────────────────────────────

      await logWorkout({
        userId: state.user.id,
        exerciseName: selectedExercise.name,
        sets: 1,
        reps: reps,
        durationSeconds: seconds,
        xpEarned: earned,
        arVerified: arEnabled
      });

      dispatch({ type: "COMPLETE_WORKOUT", payload: { xpEarned: earned, exerciseName: selectedExercise.name, reps, flawlessReps, intensityRank: rankStr } });
    } catch (err) {
      console.error("[WorkoutEngine] Sync failed:", err);
    } finally {
      setSyncing(false);
      setPhase("complete");
    }
  };

  const startWorkout = async () => {
    if (!selectedExercise) return;
    systemAudio?.playDungeon();
    setPhase("active");
    setReps(0);
    setFlawlessReps(0);
    setSeconds(0);
    setIsRunning(true);
    const mechanics = EXERCISE_DB[selectedExercise.type] || EXERCISE_DB["PUSHUP"];
    counterRef.current = new PostureGuard(mechanics);
  };

  const toggleAR = async () => {
    systemAudio?.playClick();
    if (!arEnabled) {
      setArLoading(true);
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", delegate: "GPU" },
        runningMode: "VIDEO", numPoses: 1
      });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setArEnabled(true);
      } catch (err) {
        console.error("Camera access denied:", err);
      } finally {
        setArLoading(false);
      }
    } else {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setArEnabled(false);
      setGhostVision(false);
    }
  };

  const activateMonarchVision = () => {
    if (mp >= 10) {
      dispatch({ type: "USE_MANA", payload: 10 });
      setGhostVision(true);
      systemAudio?.playSuccess();
    } else {
      alert("Insufficient Mana.");
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const progress = targetReps > 0 ? Math.min(1, reps / targetReps) : 0;
  const circumference = 2 * Math.PI * 54;

  const rankColorMap: Record<string, string> = {
    S: "#F59E0B", A: "#EF4444", B: "#8B5CF6", C: "#06B6D4", D: "#10B981", E: "#94A3B8"
  };
  const rankColor = rankColorMap[intensityRankStr] || "#06B6D4";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl font-exo">
      <motion.div
        initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
        className="w-full relative overflow-hidden"
        style={{
          maxWidth: "28rem",
          background: "rgba(8,5,20,0.95)",
          border: "1px solid rgba(6,182,212,0.2)",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 0 60px rgba(6,182,212,0.15), 0 30px 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(6,182,212,0.03)",
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-8 right-8 h-[1px]" style={{ background: "linear-gradient(to right, transparent, rgba(6,182,212,0.5), transparent)" }} />
        {/* Corner accents */}
        <div className="absolute top-0 right-0 w-6 h-6" style={{ borderTop: "2px solid rgba(6,182,212,0.5)", borderRight: "2px solid rgba(6,182,212,0.5)", borderTopRightRadius: "24px" }} />
        <div className="absolute bottom-0 left-0 w-6 h-6" style={{ borderBottom: "2px solid rgba(124,58,237,0.4)", borderLeft: "2px solid rgba(124,58,237,0.4)", borderBottomLeftRadius: "24px" }} />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-1" style={{ color: "rgba(6,182,212,0.6)" }}>
              SYSTEM RANK: {userRank} CLASS
            </div>
            <h2 className="text-xl font-orbitron font-black text-white tracking-tight uppercase" style={{ textShadow: "0 0 20px rgba(6,182,212,0.4)" }}>
              {phase === "select" ? "SELECT MISSION" : phase === "active" ? "MISSION IN PROGRESS" : "MISSION SUCCESS"}
            </h2>
          </div>
          <button
            onClick={() => { systemAudio?.playClick(); onClose(); }}
            className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"
          >
            <X size={24} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {phase === "select" && (
            <motion.div key="select" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

              <div className="flex justify-between items-center mb-4">
                <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <RefreshCw size={12} className={loadingMissions ? "animate-spin" : ""} style={{ color: loadingMissions ? "#06B6D4" : undefined }} />
                  {loadingMissions ? "Generating AI Recommendations..." : "Available Dungeon Missions"}
                </div>
                <div
                  className="font-mono text-[10px] font-black px-2 py-0.5 rounded"
                  style={{ color: "#A855F7", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}
                >
                  MP: {mp}
                </div>
              </div>

              {workoutTagline && !loadingMissions && (
                <div className="mb-4 font-mono text-[10px] italic text-center px-4" style={{ color: "rgba(6,182,212,0.7)" }}>
                  <TypingText text={workoutTagline} speedMs={28} />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 mb-6">
                {!loadingMissions && exercises.map(ex => {
                  const isSelected = selectedExercise?.id === ex.id;
                  return (
                    <div
                      key={ex.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { systemAudio?.playClick(); setSelectedExercise(ex); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { systemAudio?.playClick(); setSelectedExercise(ex); } }}
                      className="flex items-center gap-4 p-4 text-left transition-all relative overflow-hidden group cursor-pointer"
                      style={{
                        background: isSelected ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isSelected ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.05)"}`,
                        borderRadius: "16px",
                        boxShadow: isSelected ? "0 0 20px rgba(6,182,212,0.15), inset 0 0 15px rgba(6,182,212,0.03)" : "none",
                        borderLeft: isSelected ? "3px solid #06B6D4" : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span className="text-3xl relative z-10 transition-transform group-hover:scale-110 duration-300">{ex.icon}</span>
                      <div className="flex-1 relative z-10">
                        <div
                          className="font-orbitron font-black text-sm tracking-widest uppercase"
                          style={{ color: isSelected ? "#06B6D4" : "#E2E8F0", textShadow: isSelected ? "0 0 15px rgba(6,182,212,0.5)" : "none" }}
                        >
                          {ex.name}
                        </div>
                        <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{ex.muscle} · +{ex.xpPerRep} XP BASE</div>
                      </div>
                      {isSelected && <Zap size={16} className="animate-pulse relative z-10" style={{ color: "#06B6D4" }} />}
                      {/* Hover shimmer */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {/* Guide button */}
                      <button
                        type="button"
                        aria-label="View Exercise Guide"
                        onClick={(e) => {
                          e.stopPropagation();
                          systemAudio?.playClick();
                          setGuideExercise(ex);
                        }}
                        className="absolute top-2 right-2 p-2 opacity-40 hover:opacity-100 transition-opacity z-20 rounded-lg hover:bg-white/5"
                        style={{ color: "#06B6D4" }}
                      >
                        <HelpCircle size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Target intensity panel */}
              <div
                className="mb-8 p-5 relative overflow-hidden"
                style={{
                  background: "rgba(124,58,237,0.05)",
                  border: "1px solid rgba(124,58,237,0.15)",
                  borderRadius: "16px",
                }}
              >
                <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Target size={56} style={{ color: "#7C3AED" }} /></div>
                <div className="flex justify-between items-end mb-4 relative z-10">
                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-[0.2em] block mb-1" style={{ color: "#7C3AED" }}>Target Intensity</label>
                    <div className="font-mono text-[10px] text-slate-600 uppercase">Scaling Factor: x{rankMultiplier.toFixed(1)}</div>
                  </div>
                  <span className="text-3xl font-orbitron font-black tracking-tighter" style={{ color: "#A855F7", textShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
                    {targetReps} <span className="text-sm text-slate-500">REPS</span>
                  </span>
                </div>
                <input
                  type="range" min={5} max={200} step={5} value={targetReps}
                  onChange={e => { systemAudio?.playClick(); setTargetReps(+e.target.value); }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "#7C3AED", background: "rgba(255,255,255,0.08)" }}
                />
              </div>

              {!selectedExercise && (
                <p className="text-center font-mono text-[9px] tracking-[0.2em] uppercase mb-3 animate-pulse" style={{ color: "rgba(6,182,212,0.6)" }}>
                  ↑ SELECT A MISSION ABOVE
                </p>
              )}

              <button
                onClick={startWorkout}
                disabled={!selectedExercise}
                className="w-full py-5 font-orbitron font-black tracking-[0.4em] text-xs transition-all disabled:opacity-30 relative overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, #06B6D4, #38BDF8)",
                  color: "#030308",
                  borderRadius: "16px",
                  boxShadow: selectedExercise ? "0 8px 30px rgba(6,182,212,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset" : "none",
                }}
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="relative z-10 uppercase">[ Initialize Protocol ]</span>
              </button>
            </motion.div>
          )}

          {phase === "active" && selectedExercise && (
            <motion.div key="active" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="text-center relative z-10">
              {arEnabled && (
                <div className="absolute inset-0 -m-8 mb-40 overflow-hidden rounded-t-3xl bg-black/80 pointer-events-none">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale brightness-75 contrast-125 scale-x-[-1] opacity-60" />
                  {ghostVision && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 mix-blend-screen opacity-50 filter drop-shadow-[0_0_10px_rgba(156,39,176,1)]">
                      <line x1="20%" y1="30%" x2="50%" y2="50%" stroke={COLORS.purple} strokeWidth="4" />
                      <line x1="50%" y1="50%" x2="80%" y2="80%" stroke={COLORS.purple} strokeWidth="4" />
                    </svg>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
                </div>
              )}

              {/* Exercise name + posture status */}
              <div className="relative mt-2 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="font-orbitron font-black text-xl tracking-tight uppercase"
                    style={{ color: "#06B6D4", textShadow: "0 0 20px rgba(6,182,212,0.6)" }}
                  >
                    {selectedExercise.name}
                  </h3>
                  {arEnabled && !ghostVision && (
                    <button
                      onClick={activateMonarchVision}
                      className="font-mono text-[10px] px-3 py-1 rounded-lg border flex items-center gap-1 transition-all"
                      style={{ color: "#A855F7", background: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.4)" }}
                    >
                      <Eye size={12} /> MONARCH (10 MP)
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-center gap-6">
                  <div className="font-mono text-[11px] font-bold tracking-[0.2em] text-white">{formatTime(seconds)}</div>
                  <div
                    className="font-mono text-[10px] font-black tracking-[0.2em] px-3 py-1 rounded"
                    style={{
                      color: warnings.length > 0 ? "#EF4444" : "#10B981",
                      background: warnings.length > 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                      border: `1px solid ${warnings.length > 0 ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                    }}
                  >
                    {warnings.length > 0 ? "⚠ POSTURE WARN" : "✓ PERFECT FORM"}
                  </div>
                </div>
              </div>

              {/* DRAMATIC REP COUNTER with progress ring */}
              <div className="relative w-52 h-52 mx-auto mb-6">
                {/* Outer glow ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: `0 0 40px rgba(6,182,212,${0.1 + progress * 0.4}), 0 0 80px rgba(6,182,212,${0.05 + progress * 0.2})`,
                    borderRadius: "50%",
                  }}
                />
                {/* SVG progress arc */}
                <svg className="w-full h-full -rotate-90" style={{ filter: "drop-shadow(0 0 20px rgba(6,182,212,0.5))" }} viewBox="0 0 120 120">
                  {/* Background track */}
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
                  {/* Secondary dim track */}
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(6,182,212,0.1)" strokeWidth="8" />
                  {/* Progress fill */}
                  <motion.circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke="url(#repGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="repGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#7C3AED" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Rep number — dramatic and glowing */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    key={reps}
                    initial={{ scale: 1.35, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="font-orbitron font-black leading-none"
                    style={{
                      fontSize: "4rem",
                      color: "#E2E8F0",
                      textShadow: "0 0 30px rgba(6,182,212,0.8), 0 0 60px rgba(6,182,212,0.4)",
                    }}
                  >
                    {reps}
                  </motion.div>
                  <div className="font-mono text-[9px] text-slate-600 uppercase tracking-[0.3em] font-black mt-1">
                    / {targetReps}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => { systemAudio?.playClick(); setIsRunning(r => !r); }}
                  className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-orbitron font-black text-[10px] tracking-widest transition-all"
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.35)",
                    color: "#A855F7",
                    boxShadow: "0 0 15px rgba(124,58,237,0.1)",
                  }}
                >
                  {isRunning ? <Pause size={15} /> : <Play size={15} />}
                  {isRunning ? "PAUSE" : "RESUME"}
                </button>
                <button
                  onClick={() => { systemAudio?.playClick(); setReps(r => r + 1); setFlawlessReps(r => r + 1); }}
                  disabled={!isRunning}
                  className="flex-1 py-4 rounded-xl font-orbitron font-black text-xs tracking-[0.3em] disabled:opacity-40 transition-all active:scale-95 relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, #06B6D4, #38BDF8)",
                    color: "#030308",
                    boxShadow: "0 4px 25px rgba(6,182,212,0.5)",
                    fontSize: "1.1rem",
                  }}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="relative z-10">＋ REP</span>
                </button>
              </div>

              {/* AR Camera toggle */}
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  onClick={toggleAR}
                  disabled={arLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-[9px] font-black tracking-[0.3em] uppercase transition-all"
                  style={{
                    color: arEnabled ? "#10B981" : "#94A3B8",
                    background: arEnabled ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${arEnabled ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {arLoading
                    ? <><Loader2 size={12} className="animate-spin" /> LOADING AR</>
                    : arEnabled
                    ? <><Camera size={12} /> AR ACTIVE</>
                    : <><CameraOff size={12} /> ENABLE AR</>
                  }
                </button>
              </div>
              <div className="font-mono text-[8px] text-slate-700 text-center tracking-widest uppercase mt-2">
                SPACE BAR = +1 REP · TAP BUTTON ABOVE
              </div>
            </motion.div>
          )}

          {phase === "complete" && (
            <motion.div key="complete" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
              {/* Flash effect on mount */}
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: "rgba(6,182,212,0.15)" }}
              />
              <div
                className="text-7xl mb-6 animate-pulse"
                style={{ filter: "drop-shadow(0 0 30px rgba(6,182,212,0.8))" }}
              >
                🏆
              </div>
              <h2
                className="font-orbitron font-black text-2xl mb-1 tracking-tight uppercase"
                style={{ color: "#06B6D4", textShadow: "0 0 30px rgba(6,182,212,0.6)" }}
              >
                MISSION CLEARED
              </h2>
              <div
                className="font-mono text-[10px] font-bold tracking-[0.2em] mb-6 px-4 py-1.5 inline-block rounded"
                style={{
                  color: rankColor,
                  background: `${rankColor}15`,
                  border: `1px solid ${rankColor}40`,
                  boxShadow: `0 0 12px ${rankColor}30`,
                }}
              >
                INTENSITY RANK: [ {intensityRankStr} ]
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { label: "REPS", value: reps, color: "#06B6D4" },
                  { label: "FLAWLESS", value: flawlessReps, color: "#A855F7" },
                  { label: "XP REWARD", value: `+${xpEarned}`, color: "#F59E0B" },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="p-4 flex flex-col items-center"
                    style={{
                      background: `${stat.color}08`,
                      border: `1px solid ${stat.color}20`,
                      borderRadius: "16px",
                      boxShadow: `inset 0 0 15px ${stat.color}05`,
                    }}
                  >
                    <div
                      className="font-orbitron font-black text-xl mb-1 tracking-tight"
                      style={{ color: stat.color, textShadow: `0 0 15px ${stat.color}50` }}
                    >
                      {stat.value}
                    </div>
                    <div className="font-mono text-[7px] text-slate-600 uppercase tracking-widest font-black">{stat.label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { systemAudio?.playClick(); onClose(); }}
                className="w-full py-4 font-orbitron font-black tracking-[0.5em] text-xs relative overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, #06B6D4, #38BDF8)",
                  color: "#030308",
                  borderRadius: "16px",
                  boxShadow: "0 4px 30px rgba(6,182,212,0.4)",
                }}
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="relative z-10 uppercase">[ Extract Rewards ]</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Exercise Guide Modal */}
      <AnimatePresence>
        {guideExercise && (
          <ExerciseGuideModal
            exercise={{
              id: guideExercise.id,
              name: guideExercise.name,
              description: guideExercise.description,
            }}
            userId={userId}
            currentMana={mp}
            onClose={() => setGuideExercise(null)}
            onManaSpent={() => dispatch({ type: "USE_MANA", payload: 1 })}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
