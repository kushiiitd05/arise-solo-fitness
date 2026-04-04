"use client";

import { useEffect, useRef } from "react";

interface DungeonPortalProps {
  isOpen: boolean;
  width?: number;
  height?: number;
}

export default function DungeonPortal({ isOpen, width = 320, height = 320 }: DungeonPortalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const cx = width / 2;
    const cy = height / 2;
    let t = 0;
    let animId: number;

    // Vortex particles pulled toward center
    interface VortexParticle {
      angle: number;
      radius: number;
      speed: number;
      size: number;
      color: [number, number, number];
      alpha: number;
      spiralRate: number;
    }

    const particles: VortexParticle[] = [];
    const PARTICLE_COUNT = 140;

    const COLORS_OPEN: [number, number, number][] = [
      [6, 182, 212],   // cyan
      [56, 189, 248],  // sky
      [124, 58, 237],  // purple
      [168, 85, 247],  // bright purple
      [255, 255, 255], // white
    ];
    const COLORS_CLOSED: [number, number, number][] = [
      [220, 38, 38],   // red
      [239, 68, 68],   // bright red
      [124, 58, 237],  // purple
      [80, 20, 20],    // dark red
    ];

    const ACTIVE_COLORS = isOpen ? COLORS_OPEN : COLORS_CLOSED;

    interface StarPoint { x: number; y: number; alpha: number; phase: number; }
    const stars: StarPoint[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 130 + Math.random() * 25;
      stars.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        alpha: Math.random(),
        phase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const colorSet = ACTIVE_COLORS;
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 60 + Math.random() * 120,
        speed: 0.008 + Math.random() * 0.025,
        size: 0.8 + Math.random() * 2.5,
        color: colorSet[Math.floor(Math.random() * colorSet.length)],
        alpha: 0.3 + Math.random() * 0.7,
        spiralRate: 0.3 + Math.random() * 0.8,
      });
    }

    const outerRingColor  = isOpen ? "#06B6D4" : "#DC2626";
    const midRingColor    = isOpen ? "#7C3AED" : "#991B1B";
    const innerRingColor  = isOpen ? "#38BDF8" : "#EF4444";
    const coreColor1      = isOpen ? "rgba(6,182,212,0.3)" : "rgba(220,38,38,0.2)";
    const coreColor2      = isOpen ? "rgba(124,58,237,0.5)" : "rgba(153,27,27,0.4)";
    const coreColor3      = isOpen ? "rgba(168,85,247,0.8)" : "rgba(239,68,68,0.7)";

    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return { r, g, b };
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      t += 0.016;

      // ── OUTER ROTATING RING ──
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(t * 0.4);
      const outerRgb = hexToRgb(outerRingColor);
      const outerGrad = ctx!.createLinearGradient(-120, 0, 120, 0);
      outerGrad.addColorStop(0, `rgba(${outerRgb.r},${outerRgb.g},${outerRgb.b},0.8)`);
      outerGrad.addColorStop(0.5, `rgba(${outerRgb.r},${outerRgb.g},${outerRgb.b},0.2)`);
      outerGrad.addColorStop(1, `rgba(${outerRgb.r},${outerRgb.g},${outerRgb.b},0.8)`);

      // Outer dashed ring segments
      const segCount = 12;
      for (let i = 0; i < segCount; i++) {
        const a0 = (i / segCount) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2) / segCount * 0.7;
        ctx!.beginPath();
        ctx!.arc(0, 0, 120, a0, a1);
        ctx!.strokeStyle = `rgba(${outerRgb.r},${outerRgb.g},${outerRgb.b},${0.5 + 0.4 * Math.sin(t * 2 + i)})`;
        ctx!.lineWidth = 3;
        ctx!.shadowColor = outerRingColor;
        ctx!.shadowBlur = 12;
        ctx!.stroke();
      }
      ctx!.restore();

      // ── ATMOSPHERIC HALO ──
      const haloAlpha = 0.08 + 0.04 * Math.sin(t * 0.8);
      const haloGrad = ctx!.createRadialGradient(cx, cy, 130, cx, cy, 155);
      haloGrad.addColorStop(0, isOpen ? `rgba(6,182,212,${haloAlpha})` : `rgba(220,38,38,${haloAlpha})`);
      haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.beginPath();
      ctx!.arc(cx, cy, 155, 0, Math.PI * 2);
      ctx!.fillStyle = haloGrad;
      ctx!.fill();

      // ── TWINKLING STARS ──
      for (const star of stars) {
        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + star.phase));
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, 0.8, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${twinkle * 0.6})`;
        ctx!.shadowColor = 'rgba(255,255,255,0.5)';
        ctx!.shadowBlur = 3;
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }

      // ── MID COUNTER-ROTATING RING ──
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(-t * 0.7);
      const midRgb = hexToRgb(midRingColor);
      const midSegCount = 8;
      for (let i = 0; i < midSegCount; i++) {
        const a0 = (i / midSegCount) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2) / midSegCount * 0.5;
        ctx!.beginPath();
        ctx!.arc(0, 0, 85, a0, a1);
        ctx!.strokeStyle = `rgba(${midRgb.r},${midRgb.g},${midRgb.b},${0.6 + 0.4 * Math.sin(t * 3 + i * 0.8)})`;
        ctx!.lineWidth = 4;
        ctx!.shadowColor = midRingColor;
        ctx!.shadowBlur = 16;
        ctx!.stroke();
      }
      ctx!.restore();

      // ── INNER FAST RING ──
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(t * 1.2);
      const innerRgb = hexToRgb(innerRingColor);
      const innerSegCount = 6;
      for (let i = 0; i < innerSegCount; i++) {
        const a0 = (i / innerSegCount) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2) / innerSegCount * 0.4;
        ctx!.beginPath();
        ctx!.arc(0, 0, 52, a0, a1);
        ctx!.strokeStyle = `rgba(${innerRgb.r},${innerRgb.g},${innerRgb.b},${0.7 + 0.3 * Math.sin(t * 5 + i)})`;
        ctx!.lineWidth = 2.5;
        ctx!.shadowColor = innerRingColor;
        ctx!.shadowBlur = 20;
        ctx!.stroke();
      }
      ctx!.restore();

      // ── DARK ENERGY RIPPLES ──
      for (let r = 0; r < 3; r++) {
        const ripplePhase = (t * 0.5 + r * 0.9) % (Math.PI * 2);
        const rippleRadius = 30 + 90 * (ripplePhase / (Math.PI * 2));
        const rippleAlpha = 0.25 * (1 - ripplePhase / (Math.PI * 2));
        ctx!.beginPath();
        ctx!.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
        ctx!.strokeStyle = isOpen
          ? `rgba(6,182,212,${rippleAlpha})`
          : `rgba(220,38,38,${rippleAlpha})`;
        ctx!.lineWidth = 1.5;
        ctx!.shadowBlur = 0;
        ctx!.stroke();
      }

      // ── ENERGY ARCS ──
      const ARC_COUNT = 3;
      for (let i = 0; i < ARC_COUNT; i++) {
        const arcPhase = t * 2 + (i * Math.PI * 2) / ARC_COUNT;
        if (Math.sin(arcPhase * 3) > 0.7) { // only spark occasionally
          const a1 = arcPhase % (Math.PI * 2);
          const a2 = a1 + 0.8 + Math.random() * 0.4;
          const r1 = 52; // inner ring
          const r2 = 85; // mid ring
          ctx!.beginPath();
          const sx = cx + Math.cos(a1) * r1;
          const sy = cy + Math.sin(a1) * r1;
          const ex = cx + Math.cos(a2) * r2;
          const ey = cy + Math.sin(a2) * r2;
          // zigzag points
          const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 20;
          const my = (sy + ey) / 2 + (Math.random() - 0.5) * 20;
          ctx!.moveTo(sx, sy);
          ctx!.quadraticCurveTo(mx, my, ex, ey);
          ctx!.strokeStyle = isOpen ? `rgba(56,189,248,${0.3 + Math.random() * 0.5})` : `rgba(239,68,68,${0.3 + Math.random() * 0.5})`;
          ctx!.lineWidth = 0.8;
          ctx!.shadowColor = isOpen ? '#38BDF8' : '#EF4444';
          ctx!.shadowBlur = 8;
          ctx!.stroke();
          ctx!.shadowBlur = 0;
        }
      }

      // ── CORE RADIAL GLOW ──
      const coreGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 50);
      coreGrad.addColorStop(0, coreColor3);
      coreGrad.addColorStop(0.4, coreColor2);
      coreGrad.addColorStop(0.8, coreColor1);
      coreGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(cx, cy, 50 + 5 * Math.sin(t * 2), 0, Math.PI * 2);
      ctx!.fillStyle = coreGrad;
      ctx!.fill();

      // ── VORTEX PARTICLES ──
      for (const p of particles) {
        // Spiral inward
        p.radius = Math.max(8, p.radius - p.spiralRate);
        p.angle += p.speed * (1 + (120 - p.radius) / 60);

        if (p.radius <= 8) {
          // Reset to outer edge
          p.radius = 100 + Math.random() * 40;
          p.angle = Math.random() * Math.PI * 2;
          p.color = ACTIVE_COLORS[Math.floor(Math.random() * ACTIVE_COLORS.length)];
        }

        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius;
        const alpha = p.alpha * (p.radius / 120);

        // Glow halo
        const grad = ctx!.createRadialGradient(px, py, 0, px, py, p.size * 4);
        grad.addColorStop(0, `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(${p.color[0]},${p.color[1]},${p.color[2]},0)`);
        ctx!.beginPath();
        ctx!.arc(px, py, p.size * 4, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();

        // Core dot
        ctx!.beginPath();
        ctx!.arc(px, py, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${alpha})`;
        ctx!.shadowColor = `rgb(${p.color[0]},${p.color[1]},${p.color[2]})`;
        ctx!.shadowBlur = 6;
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }

      // ── CENTER BRIGHT CORE ──
      const coreSize = 16 + 8 * Math.sin(t * 3);
      const centerGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
      centerGrad.addColorStop(0, "rgba(255,255,255,0.9)");
      centerGrad.addColorStop(0.3, isOpen ? "rgba(56,189,248,0.8)" : "rgba(239,68,68,0.8)");
      centerGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreSize, 0, Math.PI * 2);
      ctx!.fillStyle = centerGrad;
      ctx!.shadowColor = isOpen ? "#06B6D4" : "#DC2626";
      ctx!.shadowBlur = 30;
      ctx!.fill();
      ctx!.shadowBlur = 0;

      // ── DEPTH FOG ──
      const fogGrad = ctx!.createRadialGradient(cx, cy, 60, cx, cy, width / 2);
      fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
      fogGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
      fogGrad.addColorStop(1, 'rgba(3,3,8,0.7)');
      ctx!.beginPath();
      ctx!.arc(cx, cy, width / 2, 0, Math.PI * 2);
      ctx!.fillStyle = fogGrad;
      ctx!.fill();

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none"
      style={{ imageRendering: "crisp-edges" }}
    />
  );
}
