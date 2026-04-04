"use client";
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { RANK_COLORS } from "@/lib/constants";

interface RankUpCeremonyProps {
  oldRank: string;
  newRank: string;
  xpBonus: number;
  statPoints: number;
  onDismiss: () => void;
  dispatch: React.Dispatch<any>;
}

export default function RankUpCeremony({
  oldRank, newRank, xpBonus, statPoints, onDismiss, dispatch,
}: RankUpCeremonyProps) {
  const oldColor = RANK_COLORS[oldRank as keyof typeof RANK_COLORS] ?? "#9ca3af";
  const newColor = RANK_COLORS[newRank as keyof typeof RANK_COLORS] ?? "#22c55e";

  const burstCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fire rank-up notification once on mount
  useEffect(() => {
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "SYSTEM",
        title: `RANK ADVANCED: ${oldRank} → ${newRank}`,
        body: `+5 stat points and +${xpBonus.toLocaleString()} XP awarded.`,
        icon: "⬆️",
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally no deps — fires once

  useEffect(() => {
    const canvas = burstCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    interface BurstParticle {
      x: number; y: number;
      vx: number; vy: number;
      radius: number;
      alpha: number;
      color: string;
    }

    const rankHex = newColor; // from closure
    const particles: BurstParticle[] = [];
    for (let i = 0; i < 120; i++) {
      const angle = (i / 120) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        alpha: 1,
        color: Math.random() > 0.4 ? rankHex : '#ffffff',
      });
    }

    let shockRadius = 0;
    let shockAlpha = 1;
    let startTime = performance.now();
    let animId: number;

    function draw() {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 2.5) {
        cancelAnimationFrame(animId);
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        return;
      }

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Shockwave ring
      shockRadius = elapsed * 600;
      shockAlpha = Math.max(0, 1 - elapsed * 1.5);
      if (shockAlpha > 0) {
        ctx!.beginPath();
        ctx!.arc(cx, cy, shockRadius, 0, Math.PI * 2);
        ctx!.strokeStyle = rankHex;
        ctx!.globalAlpha = shockAlpha * 0.6;
        ctx!.lineWidth = 3 * shockAlpha;
        ctx!.shadowColor = rankHex;
        ctx!.shadowBlur = 20;
        ctx!.stroke();
        ctx!.shadowBlur = 0;
        ctx!.globalAlpha = 1;
      }

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.alpha = Math.max(0, 1 - elapsed / 2.5);
        p.radius *= 0.99;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.alpha;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = 8;
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }
      ctx!.globalAlpha = 1;

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <canvas
      ref={burstCanvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 199 }}
    />
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[200] bg-[#030308] flex flex-col items-center justify-center p-8"
      style={{ background: `radial-gradient(ellipse at center, rgba(217,119,6,0.08), #030308 70%)` }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-12 text-center"
      >
        <div className="font-orbitron text-[28px] font-black tracking-[0.25em] uppercase text-[#F59E0B]">
          RANK UP: {oldRank} → {newRank}
        </div>
      </motion.div>

      {/* Badge reveal sequence */}
      <div className="flex items-center gap-8 mb-16">
        {/* Old rank badge — slides in from left */}
        <motion.div
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="w-16 h-16 hex-frame flex items-center justify-center font-orbitron text-[28px] font-black border-2"
            style={{
              backgroundColor: `${oldColor}30`,
              borderColor: oldColor,
              color: oldColor,
            }}
          >
            {oldRank}
          </div>
          <span className="font-mono text-[10px] text-[#94A3B8] tracking-widest uppercase">PREVIOUS</span>
        </motion.div>

        {/* Arrow — fades in */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <ArrowRight size={28} style={{ color: "#D97706" }} />
        </motion.div>

        {/* New rank badge — springs in with glow */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.7 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="w-16 h-16 hex-frame flex items-center justify-center font-orbitron text-[28px] font-black border-2 animate-system-pulse"
            style={{
              backgroundColor: `${newColor}30`,
              borderColor: newColor,
              color: newColor,
              boxShadow: `0 0 30px ${newColor}60`,
            }}
          >
            {newRank}
          </div>
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: newColor }}>
            NEW RANK
          </span>
        </motion.div>
      </div>

      {/* Reward summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.1 }}
        className="system-panel mb-10 p-8 w-full max-w-sm text-center"
        style={{ borderColor: "rgba(217,119,6,0.4)" }}
      >
        <div className="font-mono text-[14px] text-[#F59E0B] mb-3 tracking-widest uppercase">
          +{xpBonus.toLocaleString()} RANK XP
        </div>
        <div className="font-mono text-[14px] text-[#A855F7] tracking-widest uppercase">
          +{statPoints} STAT POINTS AVAILABLE
        </div>
      </motion.div>

      {/* Dismiss button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 1.4 }}
        onClick={onDismiss}
        className="min-h-[44px] px-8 border font-orbitron text-[12px] font-black tracking-[0.25em] uppercase transition-all hover:bg-[#D97706]/10"
        style={{ borderColor: "#D97706", color: "#D97706" }}
      >
        ACKNOWLEDGE RANK UP
      </motion.button>
    </motion.div>
    </>
  );
}
