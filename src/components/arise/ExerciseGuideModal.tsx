"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2 } from "lucide-react";

interface ExerciseGuide {
  steps: string[];
  mistakes: string[];
  breathing: string[];
  tip: string;
}

interface ExerciseGuideModalProps {
  exercise: { id: string; name: string; description: string };
  userId: string;
  currentMana: number;
  onClose: () => void;
  onManaSpent: () => void;
}

type VisualState = "idle" | "loading" | "unlocked";

export function ExerciseGuideModal({
  exercise,
  userId,
  currentMana,
  onClose,
  onManaSpent,
}: ExerciseGuideModalProps) {
  const [guide, setGuide] = useState<ExerciseGuide | null>(null);
  const [guideLoading, setGuideLoading] = useState(true);
  const [visualState, setVisualState] = useState<VisualState>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [shouldShake, setShouldShake] = useState(false);
  const [showInsufficientTooltip, setShowInsufficientTooltip] = useState(false);

  // Fetch text guide on mount
  useEffect(() => {
    let cancelled = false;
    setGuideLoading(true);

    fetch(`/api/exercise-guide?exerciseId=${encodeURIComponent(exercise.id)}`, {
      headers: { Authorization: `Bearer ${userId}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.guide) {
          setGuide(data.guide);
        }
      })
      .catch(() => {
        // Silent fallback — guide remains null, empty state shown
      })
      .finally(() => {
        if (!cancelled) setGuideLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exercise.id, userId]);

  const hasMana = currentMana >= 1;

  const handleVisualUnlock = async () => {
    if (visualState !== "idle") return;

    if (!hasMana) {
      // Shake + tooltip
      setShouldShake(true);
      setShowInsufficientTooltip(true);
      setTimeout(() => {
        setShouldShake(false);
        setShowInsufficientTooltip(false);
      }, 1500);
      return;
    }

    setVisualState("loading");

    try {
      const res = await fetch("/api/exercise-guide/visual-unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ exerciseId: exercise.id }),
      });

      if (!res.ok) {
        // 402 = insufficient mana (race condition), or other server error
        setVisualState("idle");
        return;
      }

      const data = await res.json();
      setImageUrl(data.imageUrl);
      setVisualState("unlocked");

      // Notify parent to dispatch USE_MANA — idempotent case skips mana deduction
      if (!data.alreadyUnlocked) {
        onManaSpent();
      }
    } catch {
      setVisualState("idle");
    }
  };

  const shakeVariants = {
    idle: { x: 0 },
    shake: {
      x: [0, -4, 4, -4, 4, 0],
      transition: { duration: 0.3, ease: "linear" as const },
    },
  };

  return (
    // Outer overlay — same pattern as WorkoutEngine line 304
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl font-exo"
      onClick={onClose}
    >
      {/* Inner panel — stops propagation so clicks inside don't close */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto glass border border-[rgba(124,58,237,0.35)] rounded-3xl relative"
      >
        {/* Purple top gradient bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60 rounded-t-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <div className="text-[10px] font-mono tracking-[0.4em] text-cyan-400/60 uppercase mb-1">
              EXERCISE GUIDE
            </div>
            <h2 className="font-orbitron text-lg font-bold text-white uppercase tracking-widest">
              {exercise.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors p-2"
            aria-label="Close guide"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Exercise image — only when visual unlocked */}
          <AnimatePresence>
            {visualState === "unlocked" && imageUrl && (
              <motion.div
                key="exercise-image"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`Visual guide for ${exercise.name}`}
                  className="w-full max-h-48 object-cover rounded-xl border border-cyan-500/20"
                />
                <div className="mt-2 text-[10px] font-mono text-cyan-400/60 uppercase tracking-[0.3em] text-center">
                  Visual guidance acquired
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guide content */}
          {guideLoading ? (
            // Skeleton pulse — loading state
            <div className="space-y-3">
              <div className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-[0.3em] text-center animate-pulse">
                THE SYSTEM IS ACCESSING COMBAT DATA...
              </div>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-white/5 rounded animate-pulse"
                  style={{ opacity: 0.3 + i * 0.1, width: `${90 - i * 10}%` }}
                />
              ))}
            </div>
          ) : guide ? (
            <>
              {/* STEPS */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.4em] text-white/50 mb-3 pb-1 border-b border-purple-500/20">
                  STEPS
                </div>
                <ol className="space-y-2">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="text-[11px] font-mono text-cyan-400 font-bold mt-0.5 shrink-0">
                        {String(i + 1).padStart(2, "0")}.
                      </span>
                      <span className="font-exo text-base leading-relaxed text-white/80">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* MISTAKES */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.4em] text-white/50 mb-3 pb-1 border-b border-purple-500/20">
                  MISTAKES
                </div>
                <ul className="space-y-2">
                  {guide.mistakes.map((mistake, i) => (
                    <li key={i} className="font-exo text-base leading-relaxed text-white/80">
                      <span className="text-[11px] font-mono text-red-400 uppercase tracking-[0.2em]">
                        HUNTER WARNING:{" "}
                      </span>
                      {mistake.replace(/^HUNTER WARNING:\s*/i, "")}
                    </li>
                  ))}
                </ul>
              </div>

              {/* BREATHING */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.4em] text-white/50 mb-3 pb-1 border-b border-purple-500/20">
                  BREATHING
                </div>
                <ul className="space-y-1.5">
                  {guide.breathing.map((cue, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-cyan-400/60 mt-1">•</span>
                      <span className="font-exo text-base leading-relaxed text-white/80">
                        {cue}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* THE SYSTEM tip */}
              <div className="p-4 rounded-xl border border-cyan-500/10 bg-cyan-900/10">
                <div className="text-[11px] font-mono uppercase tracking-[0.4em] text-cyan-400/60 mb-2">
                  THE SYSTEM
                </div>
                <p className="font-mono text-[11px] italic text-cyan-400 leading-relaxed">
                  &ldquo;{guide.tip}&rdquo;
                </p>
              </div>
            </>
          ) : (
            // Empty / error state
            <div className="text-center py-6 space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/50">
                GUIDE UNAVAILABLE
              </div>
              <p className="font-exo text-sm text-white/40">
                THE SYSTEM could not retrieve data for this exercise. Continue your training.
              </p>
            </div>
          )}

          {/* Visual unlock button area */}
          <div className="relative pt-2">
            {visualState === "unlocked" ? (
              // Badge: replaces button after unlock
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-cyan-900/30 border border-cyan-500/30 rounded-xl">
                <CheckCircle2 size={14} className="text-cyan-400" />
                <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-cyan-400">
                  VISUAL GUIDANCE ACQUIRED
                </span>
              </div>
            ) : (
              <div className="relative">
                {/* Insufficient mana tooltip */}
                <AnimatePresence>
                  {showInsufficientTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/80 border border-red-500/30 rounded text-[11px] font-mono text-red-400 whitespace-nowrap z-10"
                    >
                      INSUFFICIENT MANA
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Visual unlock button */}
                <motion.button
                  variants={shakeVariants}
                  animate={shouldShake ? "shake" : "idle"}
                  onClick={handleVisualUnlock}
                  disabled={visualState === "loading"}
                  className={[
                    "w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-150",
                    "text-[11px] font-mono uppercase tracking-[0.3em]",
                    !hasMana
                      ? "opacity-40 cursor-not-allowed bg-transparent border border-cyan-500/20 text-cyan-400/40"
                      : visualState === "loading"
                      ? "cursor-wait bg-cyan-900/20 border border-cyan-500/30 text-cyan-400/70"
                      : [
                          "active:scale-95 bg-cyan-900/20 border border-cyan-500/40 text-cyan-400",
                          "hover:border-cyan-400/60",
                          "hover:shadow-[0_0_15px_rgba(56,189,248,0.5),0_0_30px_rgba(56,189,248,0.3)]",
                        ].join(" "),
                  ].join(" ")}
                  style={
                    hasMana && visualState === "idle"
                      ? {
                          boxShadow:
                            "0 0 15px rgba(56,189,248,0.15), 0 0 30px rgba(56,189,248,0.08)",
                        }
                      : undefined
                  }
                >
                  {visualState === "loading" ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      THE SYSTEM IS GENERATING VISUALS...
                    </>
                  ) : (
                    "VIEW VISUAL GUIDE · 1 MANA"
                  )}
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
