import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Camera, CameraOff, Zap, CheckCircle2, X, Loader2, RefreshCw, Target, Eye } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { GameState, calculateIntensityRank } from "@/lib/gameReducer";
import { awardXp, logWorkout } from "@/lib/services/xpService";
import { PostureGuard, EXERCISE_DB, Landmark } from "@/lib/vision/repCounter";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { systemAudio } from "@/lib/audio";
import { generateAIOmission, getDifficultyMultiplier, Exercise } from "@/lib/services/exerciseService";
import { getDailyQuests } from "@/lib/services/questService";
import { supabase } from "@/lib/supabase";

interface WorkoutEngineProps {
  state: GameState;
  dispatch: React.Dispatch<any>;
  onClose: () => void;
}

export default function WorkoutEngine({ state, dispatch, onClose }: WorkoutEngineProps) {
  const userLevel = state.user.level;
  const userRank = state.user.rank;
  const jobClass = state.user.jobClass as any;
  const mp = (state.user.stats as any)?.mana || 0;

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl font-exo">
      <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md glass border border-primary/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(56,189,248,0.2)] relative overflow-hidden">
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <div className="text-[10px] font-mono tracking-[0.4em] text-primary/60 uppercase mb-1">SYSTEM RANK: {userRank} CLASS</div>
            <h2 className="text-xl font-orbitron font-black text-foreground tracking-tighter uppercase">
              {phase === "select" ? "SELECT MISSION" : phase === "active" ? "MISSION IN PROGRESS" : "MISSION SUCCESS"}
            </h2>
          </div>
          <button onClick={() => { systemAudio?.playClick(); onClose(); }} className="text-muted-foreground hover:text-white transition-colors p-2"><X size={24} /></button>
        </div>

        <AnimatePresence mode="wait">
          {phase === "select" && (
            <motion.div key="select" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              
              <div className="flex justify-between items-center mb-4">
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <RefreshCw size={12} className={loadingMissions ? "animate-spin" : ""} />
                  {loadingMissions ? "Generating AI Recommendations..." : "Available Dungeon Missions"}
                </div>
                <div className="text-[10px] font-orbitron text-cyan-400">MP: {mp}</div>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-6">
                {!loadingMissions && exercises.map(ex => (
                  <button 
                    key={ex.id} 
                    onClick={() => { systemAudio?.playClick(); setSelectedExercise(ex); }}
                    className="flex items-center gap-4 p-5 rounded-2xl text-left transition-all relative overflow-hidden group border"
                    style={{ background: selectedExercise?.id === ex.id ? COLORS.cyan + "15" : "rgba(255,255,255,0.02)", borderColor: selectedExercise?.id === ex.id ? COLORS.cyan + "50" : "rgba(255,255,255,0.05)" }}
                  >
                    <span className="text-4xl relative z-10">{ex.icon}</span>
                    <div className="flex-1 relative z-10">
                      <div className="font-orbitron font-black text-sm text-foreground tracking-widest uppercase">{ex.name}</div>
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">{ex.muscle} · +{ex.xpPerRep} XP BASE</div>
                    </div>
                    {selectedExercise?.id === ex.id && <Zap size={18} className="text-secondary animate-pulse relative z-10" />}
                  </button>
                ))}
              </div>

              <div className="mb-8 p-6 glass bg-primary/5 border border-primary/10 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Target size={64} className="text-primary" /></div>
                <div className="flex justify-between items-end mb-4 relative z-10">
                   <div>
                     <label className="text-[9px] font-mono text-primary uppercase tracking-[0.2em] block mb-1">Target Intensity</label>
                     <div className="text-[10px] font-mono text-muted-foreground uppercase">Scaling Factor: x{rankMultiplier.toFixed(1)}</div>
                   </div>
                   <span className="text-3xl font-orbitron font-black text-primary tracking-tighter">{targetReps} <span className="text-sm">REPS</span></span>
                </div>
                <input type="range" min={5} max={200} step={5} value={targetReps} onChange={e => { systemAudio?.playClick(); setTargetReps(+e.target.value); }} className="w-full accent-primary h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer" />
              </div>

              <button onClick={startWorkout} disabled={!selectedExercise} className="w-full py-5 font-orbitron font-black tracking-[0.4em] text-xs rounded-2xl transition-all disabled:opacity-30 shadow-[0_8px_30px_rgba(56,189,248,0.3)] group relative overflow-hidden" style={{ background: COLORS.cyan, color: "#000" }}>
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
                
                <div className="relative mt-2 mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-orbitron font-black text-xl text-primary tracking-tighter uppercase">{selectedExercise.name}</h3>
                    {arEnabled && !ghostVision && (
                      <button onClick={activateMonarchVision} className="text-[10px] font-mono text-purple-400 bg-purple-900/30 px-3 py-1 rounded border border-purple-500/50 hover:bg-purple-800/50 flex items-center gap-1">
                        <Eye size={12} /> MONARCH VISION (10 MP)
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-4">
                      <div className="text-[11px] font-mono text-foreground font-bold tracking-[0.2em]">{formatTime(seconds)}</div>
                      <div className="text-[11px] font-mono text-secondary font-bold tracking-[0.2em]">{warnings.length > 0 ? "POSTURE WARN" : "PERFECT FORM"}</div>
                  </div>
                </div>

                <div className="relative w-48 h-48 mx-auto mb-8">
                  <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_15px_rgba(56,189,248,0.2)]" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <motion.circle cx="60" cy="60" r="54" fill="none" stroke={COLORS.cyan} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div key={reps} initial={{ scale: 1.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-orbitron font-black text-5xl text-foreground tracking-tighter">
                      {reps}
                    </motion.div>
                    <div className="text-[9px] font-mono text-muted-foreground uppercase opacity-60 tracking-[0.3em] font-bold">TARGET: {targetReps}</div>
                  </div>
                </div>

                <div className="flex gap-4 mb-4">
                  <button onClick={() => { systemAudio?.playClick(); setIsRunning(r => !r); }} className="flex-1 py-4 rounded-xl flex items-center justify-center gap-3 font-orbitron font-black text-xs tracking-widest transition-all border shadow-lg bg-purple-500/10 border-purple-500/30 text-purple-400">
                    {isRunning ? <Pause size={16} /> : <Play size={16} />}
                    {isRunning ? "PAUSE" : "RESUME"}
                  </button>
                  <button 
                    onClick={() => { systemAudio?.playClick(); setReps(r => r + 1); setFlawlessReps(r => r + 1); }} 
                    disabled={!isRunning} 
                    className="flex-1 py-4 rounded-xl font-orbitron font-black text-xs tracking-[0.3em] disabled:opacity-50 shadow-[0_4px_25px_rgba(56,189,248,0.6)] transition-transform active:scale-95 bg-cyan-400 text-black text-lg"
                  >
                    ＋ REP
                  </button>
                </div>

                <div className="text-[9px] font-mono text-muted-foreground/50 text-center tracking-widest uppercase">
                  SPACE BAR = +1 REP &nbsp;·&nbsp; TAP BUTTON ABOVE
                </div>
             </motion.div>
          )}

          {phase === "complete" && (
            <motion.div key="complete" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
              <div className="text-7xl mb-6 filter drop-shadow-[0_0_30px_rgba(56,189,248,0.8)] animate-pulse">🏆</div>
              <h2 className="font-orbitron font-black text-2xl text-primary mb-1 tracking-tighter uppercase">MISSION CLEARED</h2>
              <div className="text-[10px] font-mono text-purple-400 mb-6 font-bold tracking-[0.2em]">INTENSITY RANK: [{intensityRankStr}]</div>
              
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[ { label: "Reps", value: reps }, { label: "Flawless", value: flawlessReps }, { label: "Reward", value: `+${xpEarned} XP` } ].map(stat => (
                  <div key={stat.label} className="p-4 glass rounded-2xl border border-white/5 bg-white/[0.02]">
                    <div className="font-orbitron font-black text-md text-foreground mb-1 tracking-tighter">{stat.value}</div>
                    <div className="text-[7px] font-mono text-muted-foreground uppercase tracking-widest font-bold">{stat.label}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => { systemAudio?.playClick(); onClose(); }} className="w-full py-4 font-orbitron font-black tracking-[0.5em] text-xs rounded-2xl shadow-[0_4px_30px_rgba(56,189,248,0.4)] group relative overflow-hidden" style={{ background: COLORS.cyan, color: "#000" }}>
                <span className="relative z-10 uppercase">[ Extract Rewards ]</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
