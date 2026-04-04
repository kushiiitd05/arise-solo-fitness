"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number;
  r: number; g: number; b: number;
  size: number;
  alpha: number;
  phase: number;
}

export default function ManaParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    const COLORS: [number, number, number][] = [
      [124, 58, 237],   // purple
      [124, 58, 237],   // purple (weighted)
      [124, 58, 237],   // purple (weighted)
      [6, 182, 212],    // cyan
      [168, 85, 247],   // bright purple
      [180, 180, 210],  // silver
    ];

    const particles: Particle[] = [];
    const COUNT = 140;

    function resize() {
      w = canvas!.width  = window.innerWidth;
      h = canvas!.height = window.innerHeight;
    }

    function spawn(): Particle {
      const [r, g, b] = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.4 - 0.1,
        r, g, b,
        size: Math.random() * 2.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        phase: Math.random() * Math.PI * 2,
      };
    }

    resize();
    for (let i = 0; i < COUNT; i++) particles.push(spawn());

    window.addEventListener("resize", resize);

    let t = 0;
    function draw() {
      ctx!.clearRect(0, 0, w, h);
      t += 0.008;

      for (const p of particles) {
        p.x += p.vx + Math.sin(t + p.phase) * 0.12;
        p.y += p.vy;

        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const pulse = 0.7 + 0.3 * Math.sin(t * 1.5 + p.phase);
        const a = p.alpha * pulse * (0.5 + p.z * 0.5);

        // Glow pass
        // Outer glow halo
        const glow = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 7);
        glow.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${a * 0.55})`);
        glow.addColorStop(0.4, `rgba(${p.r},${p.g},${p.b},${a * 0.2})`);
        glow.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 7, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();

        // Bright core
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * (0.6 + p.z * 0.6), 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.r},${p.g},${p.b},${Math.min(a * 1.3, 1)})`;
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
