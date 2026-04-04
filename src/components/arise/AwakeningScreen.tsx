"use client";

import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ManaParticles = lazy(() => import("./ManaParticles"));
import { JOB_CLASS_ICONS, JOB_CLASS_COLORS } from "@/lib/constants";
import { signInWithGoogle, signUpWithUsername, signInWithUsername } from "@/lib/auth-helpers";
import { checkUsernameAvailable } from "@/lib/services/userService";
import { X, Globe } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SYSTEM_TEXT = [
  "[SYSTEM NOTIFICATION]",
  "",
  "A new presence has been detected.",
  "You have been selected as a Player.",
  "",
  "\"Should you choose to accept...",
  " we will level your body beyond",
  " what you believed possible.\"",
  "",
  "Do you accept the System's call?",
];

interface TypewriterProps {
  lines: string[];
  onDone: () => void;
}

function Typewriter({ lines, onDone }: TypewriterProps) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    if (lineIdx >= lines.length) { onDone(); return; }
    const line = lines[lineIdx];
    if (charIdx <= line.length) {
      const t = setTimeout(() => {
        setDisplayed(prev => {
          const next = [...prev];
          next[lineIdx] = line.slice(0, charIdx);
          return next;
        });
        setCharIdx(c => c + 1);
      }, charIdx === 0 && line === "" ? 40 : 20);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setLineIdx(l => l + 1); setCharIdx(0); }, 20);
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx, lines, onDone]);

  return (
    <div className="text-center font-system text-[11px] leading-relaxed text-[#06B6D4] tracking-[0.1em] uppercase flex flex-col items-center">
      {displayed.map((l, i) => (
        <div key={i} className={cn(
          "min-h-[1.5rem] flex items-center justify-center w-full",
          l.startsWith("[") ? "text-[#E2E8F0] font-bold text-[12px] mb-2" : 
          l.startsWith('"') ? "text-[#A855F7] font-medium" : ""
        )}>
          {l || " "}
        </div>
      ))}
      <span className="inline-block w-1.5 h-3.5 bg-[#06B6D4] animate-pulse mt-1" />
    </div>
  );
}

interface AwakeningScreenProps {
  onStart: (name: string, jobClass: string) => void;
}

export default function AwakeningScreen({ onStart }: AwakeningScreenProps) {
  const [phase, setPhase] = useState<"intro" | "buttons" | "declined" | "auth_choice" | "login" | "signup_name" | "signup_password" | "class">("intro");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [throttle, setThrottle] = useState(0);

  useEffect(() => {
    if (throttle > 0) {
      const timer = setTimeout(() => setThrottle(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [throttle]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === "declined") {
      timer = setTimeout(() => setPhase("intro"), 3500);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [phase]);

  const handleLoginSubmit = async () => {
    if (!name || !password || authLoading) return;
    setAuthLoading(true);
    setAuthError("");
    const { error } = await signInWithUsername(name.trim(), password);
    if (error) {
      setAuthError(error.message.includes("credentials") ? "INVALID IDENTIFIER OR KEY." : error.message.toUpperCase());
      setAuthLoading(false);
    }
  };

  const checkAndProceedToPassword = async () => {
    if (!name.trim() || authLoading) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const available = await checkUsernameAvailable(name.trim());
      if (!available) {
        setAuthError("DESIGNATION_TAKEN. TRY LOGGING IN.");
        setAuthLoading(false);
      } else {
        setPhase("signup_password");
        setAuthLoading(false);
      }
    } catch (e) {
      setPhase("signup_password");
      setAuthLoading(false);
    }
  };

  const handleFinalSignup = async (jobClass: string) => {
    if (password.length < 6) {
      setAuthError("KEY_TOO_SHORT: MIN 6.");
      return;
    }
    if (authLoading || throttle > 0) return;
    setAuthLoading(true);
    setAuthError("");
    const { data, error } = await signUpWithUsername(name.trim(), password);
    if (error) {
      if (error.message.includes("rate limit")) {
        setAuthError("SYSTEM_THROTTLED. WAIT 60S.");
        setThrottle(60);
      } else if (error.message === "INVALID_KEY_FOR_EXISTING_HUNTER") {
        setAuthError("WRONG KEY FOR THIS HUNTER.");
      } else {
        setAuthError(error.message.toUpperCase());
      }
      setAuthLoading(false);
      return;
    }
    if (data?.user) onStart(name.trim(), jobClass);
    else {
      setAuthError("SYNC FAILED.");
      setAuthLoading(false);
    }
  };

  return (
    <div className="bg-[#030308] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden font-exo selection:bg-[#7C3AED]/30">
      <style jsx global>{`
        html, body {
          background-color: #030308 !important;
          color: #E2E8F0 !important;
          margin: 0; padding: 0; min-height: 100vh;
        }
        @keyframes shimmer-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.5), 0 0 40px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 35px rgba(124,58,237,0.8), 0 0 70px rgba(124,58,237,0.4), 0 0 100px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.2); }
        }
        .accept-power-btn { animation: shimmer-pulse 2.5s ease-in-out infinite; }
        @keyframes corner-scan {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        .corner-accent { animation: corner-scan 3s ease-in-out infinite; }
      `}</style>

      {/* 3D Mana Particle Field — z-index 0, BEHIND card content */}
      <Suspense fallback={null}>
        <div className="absolute inset-0 z-0 pointer-events-none">
          <ManaParticles />
        </div>
      </Suspense>
      {/* Atmospheric radial glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#7C3AED] opacity-[0.07] blur-[140px]" />
        <div className="absolute top-1/4 right-1/3 w-[350px] h-[350px] rounded-full bg-[#06B6D4] opacity-[0.04] blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-[#7C3AED] opacity-[0.05] blur-[80px]" />
      </div>
      {/* Scanlines overlay */}
      <div className="scanlines absolute inset-0 pointer-events-none z-[2]" />

      {/* Center content wrapper — z-10 ensures it's above canvas */}
      <div className="relative z-10 w-full flex flex-col items-center px-4" style={{ maxWidth: "28rem" }}>
        {/* Header Section */}
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8 flex flex-col items-center">
          <div className="text-4xl mb-3 filter drop-shadow-[0_0_25px_#7C3AED] animate-pulse" style={{ filter: 'drop-shadow(0 0 25px #7C3AED) drop-shadow(0 0 50px rgba(124,58,237,0.5))' }}>⚡</div>
          <h1
            className="font-orbitron font-black text-white text-3xl tracking-[0.2em] uppercase mb-1 italic"
            style={{
              textShadow: [
                '0 0 20px rgba(124,58,237,0.9)',
                '0 0 40px rgba(124,58,237,0.6)',
                '0 0 80px rgba(124,58,237,0.3)',
                '2px 2px 0 rgba(168,85,247,0.4)',
                '4px 4px 0 rgba(124,58,237,0.2)',
                '6px 6px 0 rgba(76,29,149,0.15)',
                '-1px -1px 0 rgba(6,182,212,0.15)',
              ].join(', '),
              letterSpacing: '0.25em',
            }}
          >ARISE</h1>
          <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#7C3AED]/60 to-transparent my-2" />
          <div className="text-[8px] font-mono tracking-[0.6em] text-slate-400 uppercase font-black opacity-70">SOLO LEVELING FITNESS</div>
        </motion.div>

        <AnimatePresence mode="wait">
          {(phase === "intro" || phase === "buttons") && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full bg-[#0a0a14]/90 border border-[#7C3AED]/25 p-8 rounded-2xl flex flex-col items-center backdrop-blur-sm relative"
              style={{ boxShadow: '0 0 60px rgba(124,58,237,0.12), 0 25px 50px rgba(0,0,0,0.6), inset 0 0 30px rgba(124,58,237,0.04)' }}
            >
              {/* Corner accents */}
              <div className="corner-accent absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#7C3AED]/60 rounded-tr-2xl" />
              <div className="corner-accent absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#06B6D4]/40 rounded-bl-2xl" />
              {/* Top accent line */}
              <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#7C3AED]/40 to-transparent" />

              <div className="mb-8 min-h-[9rem] flex flex-col items-center justify-center w-full">
                {phase === "intro"
                  ? <Typewriter lines={SYSTEM_TEXT} onDone={() => setPhase("buttons")} />
                  : <div className="text-center font-mono text-[10px] items-center italic w-full opacity-70">
                      {SYSTEM_TEXT.map((l, i) => (
                        <div key={i} className={cn("min-h-[1.5rem] text-[#06B6D4]", l.startsWith("[") ? "text-[#E2E8F0] font-bold" : "")}>{l || " "}</div>
                      ))}
                    </div>
                }
              </div>
              {phase === "buttons" && (
                <div className="space-y-3 w-full">
                  <button
                    onClick={() => setPhase("auth_choice")}
                    className="accept-power-btn w-full py-4 bg-[#7C3AED] text-white font-orbitron font-bold text-[10px] tracking-[0.2em] rounded-lg hover:bg-[#8B5CF6] transition-all active:scale-95 relative overflow-hidden"
                  >
                    <span className="relative z-10">[ ACCEPT POWER ]</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                  </button>
                  <button onClick={() => setPhase("declined")} className="w-full py-2 text-slate-700 text-[9px] tracking-[0.4em] font-bold hover:text-slate-500 transition-colors">REMAIN_DORMANT</button>
                </div>
              )}
            </motion.div>
          )}

          {phase === "auth_choice" && (
            <motion.div key="auth" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full bg-[#0a0a14]/90 border border-[#7C3AED]/25 p-8 rounded-2xl flex flex-col items-center backdrop-blur-sm relative"
              style={{ boxShadow: '0 0 60px rgba(124,58,237,0.12), 0 25px 50px rgba(0,0,0,0.6), inset 0 0 30px rgba(124,58,237,0.04)' }}
            >
              {/* Corner accents */}
              <div className="corner-accent absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#7C3AED]/60 rounded-tr-2xl" />
              <div className="corner-accent absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#06B6D4]/40 rounded-bl-2xl" />
              <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#7C3AED]/40 to-transparent" />

              <h3 className="font-orbitron font-bold text-white tracking-[0.3em] mb-6 text-sm italic" style={{ textShadow: '0 0 20px rgba(124,58,237,0.5)' }}>AUTHENTICATION</h3>
              <div className="space-y-3 w-full border-t border-white/5 pt-6">
                <button
                  onClick={() => setPhase("signup_name")}
                  className="w-full py-4 bg-[#06B6D4]/5 border border-[#06B6D4]/40 hover:border-[#06B6D4]/80 hover:bg-[#06B6D4]/10 rounded-xl text-[10px] font-orbitron tracking-[0.3em] text-[#06B6D4] transition-all"
                  onMouseEnter={e => (e.currentTarget.style.boxShadow='0 0 20px rgba(6,182,212,0.25), inset 0 0 15px rgba(6,182,212,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}
                >
                  CREATE_IDENTIFIER
                </button>
                <button
                  onClick={() => setPhase("login")}
                  className="w-full py-4 bg-[#7C3AED]/5 border border-[#7C3AED]/40 hover:border-[#7C3AED]/80 hover:bg-[#7C3AED]/10 rounded-xl text-[10px] font-orbitron tracking-[0.3em] text-[#7C3AED] transition-all"
                  onMouseEnter={e => (e.currentTarget.style.boxShadow='0 0 20px rgba(124,58,237,0.25), inset 0 0 15px rgba(124,58,237,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}
                >
                  REACTIVATE_LINK
                </button>
              </div>
              <div className="w-full h-[1px] bg-white/5 my-8 relative">
                <span className="absolute left-1/2 -top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0a14] px-3 text-[7px] text-slate-800 tracking-[0.4em]">OR</span>
              </div>
              <button onClick={() => signInWithGoogle()} className="w-full py-3 border border-white/5 rounded-xl text-[8px] text-slate-500 font-bold hover:bg-white/10 hover:border-white/10 flex items-center justify-center gap-2 transition-all">
                <Globe size={12} /> STRIKE_VIA_GOOGLE
              </button>
              <button onClick={() => setPhase("buttons")} className="mt-8 text-[8px] text-slate-800 hover:text-slate-500 tracking-[0.4em] font-bold italic transition-colors">← ABORT</button>
            </motion.div>
          )}

          {(phase === "login" || phase === "signup_name" || phase === "signup_password") && (
            <motion.div key="form" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="w-full bg-[#0a0a14]/90 border border-[#7C3AED]/25 p-10 rounded-2xl flex flex-col items-center backdrop-blur-sm relative"
              style={{ boxShadow: '0 0 60px rgba(124,58,237,0.12), 0 25px 50px rgba(0,0,0,0.6), inset 0 0 30px rgba(124,58,237,0.04)' }}
            >
              {/* Corner accents */}
              <div className="corner-accent absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#7C3AED]/60 rounded-tr-2xl" />
              <div className="corner-accent absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#06B6D4]/40 rounded-bl-2xl" />
              <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#7C3AED]/40 to-transparent" />

              <h3 className="font-orbitron font-bold text-white tracking-[0.3em] mb-10 text-lg italic" style={{ textShadow: '0 0 20px rgba(124,58,237,0.5)' }}>
                {phase === "login" ? "LINK_ACCESS" : "INITIAL_SYNC"}
              </h3>
              <div className="space-y-8 w-full flex flex-col items-center">
                {(phase === "login" || phase === "signup_name") && (
                  <div className="space-y-2 w-full">
                    <label className="text-[8px] text-[#06B6D4] tracking-[0.3em] font-bold uppercase ml-1 block">DESIGNATION</label>
                    <input
                      autoFocus value={name} onChange={e => setName(e.target.value)}
                      placeholder="DESIGNATE_NAME..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-base font-orbitron text-white focus:border-[#06B6D4] outline-none text-center transition-all"
                      style={{ boxShadow: 'none' }}
                      onFocus={e => (e.currentTarget.style.boxShadow='0 0 15px rgba(6,182,212,0.2)')}
                      onBlur={e => (e.currentTarget.style.boxShadow='none')}
                    />
                  </div>
                )}
                {(phase === "login" || phase === "signup_password") && (
                  <div className="space-y-2 w-full">
                    <label className="text-[8px] text-[#7C3AED] tracking-[0.3em] font-bold uppercase ml-1 block">CRYPTOGRAPHIC_KEY</label>
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      onKeyDown={e => e.key === "Enter" && (phase === "login" ? handleLoginSubmit() : password.length >= 6 && setPhase("class"))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-2xl font-orbitron text-white focus:border-[#7C3AED] outline-none text-center tracking-[0.6em] transition-all"
                      onFocus={e => (e.currentTarget.style.boxShadow='0 0 15px rgba(124,58,237,0.2)')}
                      onBlur={e => (e.currentTarget.style.boxShadow='none')}
                    />
                  </div>
                )}
                {authError && (
                  <div className="flex gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl items-center w-full">
                    <X size={14} className="text-red-500 shrink-0" />
                    <span className="text-[9px] text-red-400 font-bold">{authError}</span>
                  </div>
                )}
                <button
                  onClick={() => { if (phase === "login") handleLoginSubmit(); else if (phase === "signup_name") checkAndProceedToPassword(); else if (phase === "signup_password") setPhase("class"); }}
                  disabled={authLoading || throttle > 0 || !name.trim()}
                  className="w-full py-4 bg-[#7C3AED] text-white font-orbitron font-black text-[10px] tracking-[0.2em] rounded-xl disabled:opacity-20 transition-all hover:bg-[#8B5CF6] active:scale-95"
                  style={{ boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
                >
                  {throttle > 0 ? `LOCKED (${throttle}S)` : authLoading ? "SYNCING..." : "CONFIRM_IDENTITY"}
                </button>
              </div>
              <button onClick={() => setPhase("auth_choice")} className="mt-8 text-[8px] text-slate-800 hover:text-slate-500 tracking-[0.4em] font-bold italic transition-colors">← REVERT</button>
            </motion.div>
          )}

          {phase === "class" && (
            <motion.div key="class" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center">
              <div
                className="bg-[#0a0a14]/90 border border-[#7C3AED]/35 p-10 rounded-xl w-full flex flex-col items-center backdrop-blur-sm relative"
                style={{ boxShadow: '0 0 80px rgba(124,58,237,0.15), 0 25px 50px rgba(0,0,0,0.7), inset 0 0 40px rgba(124,58,237,0.05)' }}
              >
                {/* Corner accents */}
                <div className="corner-accent absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#7C3AED]/60 rounded-tr-xl" />
                <div className="corner-accent absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#06B6D4]/40 rounded-bl-xl" />
                <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#7C3AED]/40 to-transparent" />

                <h3 className="font-orbitron font-black text-white text-2xl tracking-[0.2em] mb-2 italic" style={{ textShadow: '0 0 20px rgba(124,58,237,0.5)' }}>JOB_CLASS</h3>
                <p className="text-[8px] text-[#06B6D4] tracking-[0.4em] mb-8 font-bold opacity-60 uppercase font-mono">FINAL_SYNC_PROTOCOL</p>
                <div className="w-full space-y-3">
                  {(["FIGHTER", "ASSASSIN", "TANK", "MAGE", "HEALER"] as const).map(cls => (
                    <button
                      key={cls} onClick={() => handleFinalSignup(cls)} disabled={authLoading || throttle > 0}
                      className="w-full group relative p-4 bg-black/40 border border-[#7C3AED]/20 hover:border-[#06B6D4]/60 rounded-xl transition-all flex items-center justify-between px-8 hover:bg-[#06B6D4]/5 active:scale-[0.98]"
                      onMouseEnter={e => (e.currentTarget.style.boxShadow='0 0 20px rgba(6,182,212,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}
                    >
                      <div className="flex items-center gap-6">
                        <span className="text-3xl filter transition-transform group-hover:scale-110">{JOB_CLASS_ICONS[cls]}</span>
                        <span className="font-orbitron font-bold text-xs tracking-[0.1em]" style={{ color: JOB_CLASS_COLORS[cls] }}>{cls}</span>
                      </div>
                      <div className="text-[9px] font-orbitron text-[#06B6D4] opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">SELECT →</div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#06B6D4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setPhase("signup_password")} className="mt-8 text-[10px] text-slate-800 hover:text-slate-500 tracking-[0.4em] font-bold italic transition-colors">← RECONSIDER</button>
            </motion.div>
          )}

          {phase === "declined" && (
            <motion.div key="declined" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full text-center p-12 bg-[#0a0a14] border border-red-500/30 rounded-2xl flex flex-col items-center"
              style={{ boxShadow: '0 0 40px rgba(220,38,38,0.1)' }}
            >
              <p className="font-orbitron font-bold text-red-500 text-xl tracking-[0.2em] italic">"THE_SYSTEM_WAITS_FOR_NO_ONE."</p>
              <div className="w-32 h-[1px] bg-red-400/20 mt-6 relative overflow-hidden">
                <motion.div initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-red-500/40" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="fixed bottom-4 left-4 opacity-10 text-[7px] tracking-[0.3em] pointer-events-none uppercase font-mono">AR_LINK_STABLE_V4.0</div>
    </div>
  );
}
