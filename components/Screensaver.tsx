
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Utensils, Coffee, PhoneOff, Phone, Zap, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CallNotification, NotificationItem, ScreensaverAnimationType } from '../types';
import { getAppIconInfo, getInitials, stringToColor } from '../utils';

interface ScreensaverProps {
  onDismiss: () => void;
  batteryLevel?: number;
  isCharging?: boolean;
  incomingCall?: CallNotification;
  notifications?: NotificationItem[];
  onAnswer?: () => void;
  onDecline?: () => void;
  nebulaEnabled?: boolean;
  opacity?: number;
  animationsEnabled?: boolean;
  backgroundUrl?: string;
  showDrinkWater?: boolean;
  waterQty?: number;
  dailyWaterTotal?: number;
  dailyWaterGoal?: number;
  drinkWaterEnabled?: boolean;
  onDrinkWaterConfirm?: () => void;
  onDrinkWaterSkip?: () => void;
  animationType?: ScreensaverAnimationType;
}

const AuroraCanvas: React.FC<{ intensity: number; animationsEnabled: boolean }> = React.memo(({ intensity, animationsEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true }); if (!ctx) return;
    let w = window.innerWidth, h = window.innerHeight;
    const resize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h; };
    resize();
    window.addEventListener('resize', resize);

    const bands = [
      { color: [32, 178, 170],  yFrac: 0.28, amp: 0.06, freq: 1.2, speed: 0.18, opacity: 0.55, thick: 0.13 },
      { color: [72, 61, 139],   yFrac: 0.38, amp: 0.08, freq: 0.9, speed: 0.12, opacity: 0.45, thick: 0.10 },
      { color: [0, 206, 148],   yFrac: 0.22, amp: 0.05, freq: 1.6, speed: 0.22, opacity: 0.50, thick: 0.09 },
      { color: [138, 43, 226],  yFrac: 0.48, amp: 0.07, freq: 0.7, speed: 0.09, opacity: 0.35, thick: 0.12 },
      { color: [0, 255, 200],   yFrac: 0.18, amp: 0.04, freq: 2.1, speed: 0.28, opacity: 0.40, thick: 0.07 },
    ];
    let t = 0;

    const frame = (ts: number) => {
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;
      if (animationsEnabled) t += dt;
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);

      bands.forEach(b => {
        const cx = (b.color[0]), cy = (b.color[1]), cz = (b.color[2]);
        const bandH = b.thick * h;
        const yCenter = b.yFrac * h;

        ctx.beginPath();
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * w;
          const wave = Math.sin(i / steps * Math.PI * 2 * b.freq + t * b.speed) * b.amp * h
                     + Math.sin(i / steps * Math.PI * 4 * b.freq + t * b.speed * 1.7) * b.amp * h * 0.4;
          const y = yCenter + wave;
          i === 0 ? ctx.moveTo(x, y - bandH / 2) : ctx.lineTo(x, y - bandH / 2);
        }
        for (let i = steps; i >= 0; i--) {
          const x = (i / steps) * w;
          const wave = Math.sin(i / steps * Math.PI * 2 * b.freq + t * b.speed) * b.amp * h
                     + Math.sin(i / steps * Math.PI * 4 * b.freq + t * b.speed * 1.7) * b.amp * h * 0.4;
          const y = yCenter + wave;
          ctx.lineTo(x, y + bandH / 2);
        }
        ctx.closePath();

        const yMid = yCenter;
        const grad = ctx.createLinearGradient(0, yMid - bandH, 0, yMid + bandH);
        grad.addColorStop(0,   `rgba(${cx},${cy},${cz},0)`);
        grad.addColorStop(0.5, `rgba(${cx},${cy},${cz},${b.opacity * intensity})`);
        grad.addColorStop(1,   `rgba(${cx},${cy},${cz},0)`);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * w;
          const wave = Math.sin(i / steps * Math.PI * 2 * b.freq + t * b.speed) * b.amp * h
                     + Math.sin(i / steps * Math.PI * 4 * b.freq + t * b.speed * 1.7) * b.amp * h * 0.4;
          i === 0 ? ctx.moveTo(x, yCenter + wave) : ctx.lineTo(x, yCenter + wave);
        }
        ctx.strokeStyle = `rgba(${cx},${cy},${cz},${(b.opacity * 0.6) * intensity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
      if (animationsEnabled) rafRef.current = requestAnimationFrame(frame);
    };

    lastTsRef.current = performance.now();
    if (animationsEnabled) { rafRef.current = requestAnimationFrame(frame); } else { frame(lastTsRef.current + 16); }
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, [intensity, animationsEnabled]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }} className="pointer-events-none" />;
});

const BioluminescenceCanvas: React.FC<{ intensity: number; animationsEnabled: boolean }> = React.memo(({ intensity, animationsEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true }); if (!ctx) return;
    let w = window.innerWidth, h = window.innerHeight;
    const resize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h; };
    resize();
    window.addEventListener('resize', resize);

    const NUM = 120;
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; glowR: number; phase: number; phaseSpeed: number;
      color: [number,number,number];
    }
    const colors: [number,number,number][] = [
      [0,255,200],[0,220,255],[64,224,208],[127,255,212],[0,191,255],[72,209,204],
    ];
    const particles: Particle[] = Array.from({ length: NUM }, () => ({
      x: Math.random() * (window.innerWidth),
      y: Math.random() * (window.innerHeight),
      vx: (Math.random() - 0.5) * 12,
      vy: -(Math.random() * 18 + 4),
      r: Math.random() * 2.5 + 0.8,
      glowR: Math.random() * 20 + 10,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: Math.random() * 1.5 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let t = 0;
    const frame = (ts: number) => {
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;
      if (animationsEnabled) t += dt;

      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);

      particles.forEach(p => {
        if (animationsEnabled) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.phase += p.phaseSpeed * dt;
          if (p.y < -20) {
            p.y = h + 20;
            p.x = Math.random() * w;
            p.vx = (Math.random() - 0.5) * 12;
            p.vy = -(Math.random() * 18 + 4);
          }
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
        }
        const pulse = (Math.sin(p.phase) + 1) / 2;
        const alpha = (0.4 + 0.6 * pulse) * intensity;
        const [r,g,b] = p.color;

        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowR * (0.7 + 0.3 * pulse));
        grd.addColorStop(0,   `rgba(${r},${g},${b},${alpha * 0.6})`);
        grd.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.2})`);
        grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.glowR * (0.7 + 0.3 * pulse), 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.8 + 0.2 * pulse), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
      });

      ctx.globalAlpha = 1;
      if (animationsEnabled) rafRef.current = requestAnimationFrame(frame);
    };

    lastTsRef.current = performance.now();
    if (animationsEnabled) { rafRef.current = requestAnimationFrame(frame); } else { frame(lastTsRef.current + 16); }
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, [intensity, animationsEnabled]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }} className="pointer-events-none" />;
});

const MandalaCanvas: React.FC<{ intensity: number; animationsEnabled: boolean }> = React.memo(({ intensity, animationsEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true }); if (!ctx) return;
    let w = window.innerWidth, h = window.innerHeight;
    const resize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h; };
    resize();
    window.addEventListener('resize', resize);

    const rings = [
      { folds: 6,  rFrac: 0.08, speed:  0.12, color: [199,210,254], lw: 1.0, petals: true  },
      { folds: 8,  rFrac: 0.14, speed: -0.08, color: [165,180,252], lw: 0.8, petals: false },
      { folds: 12, rFrac: 0.20, speed:  0.05, color: [139,92,246],  lw: 0.7, petals: true  },
      { folds: 6,  rFrac: 0.27, speed: -0.04, color: [196,181,253], lw: 0.9, petals: false },
      { folds: 16, rFrac: 0.34, speed:  0.03, color: [167,139,250], lw: 0.5, petals: true  },
      { folds: 8,  rFrac: 0.42, speed: -0.02, color: [221,214,254], lw: 0.6, petals: false },
    ];
    let t = 0;

    const drawRing = (cx: number, cy: number, ring: typeof rings[0], angle: number, breathe: number) => {
      const R = Math.min(w, h) * 0.5 * ring.rFrac * breathe;
      const [r,g,b] = ring.color;
      const alpha = 0.65 * intensity;
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = ring.lw;

      if (ring.petals) {
        for (let i = 0; i < ring.folds; i++) {
          const a = angle + (i / ring.folds) * Math.PI * 2;
          const px = cx + R * Math.cos(a);
          const py = cy + R * Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          const cp1x = cx + R * 0.6 * Math.cos(a - 0.3);
          const cp1y = cy + R * 0.6 * Math.sin(a - 0.3);
          const cp2x = cx + R * 0.6 * Math.cos(a + 0.3);
          const cp2y = cy + R * 0.6 * Math.sin(a + 0.3);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, px, py);
          ctx.bezierCurveTo(cp2x, cp2y, cp1x, cp1y, cx, cy);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.15})`;
          ctx.fill();
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        for (let i = 0; i <= ring.folds; i++) {
          const a = angle + (i / ring.folds) * Math.PI * 2;
          const x = cx + R * Math.cos(a);
          const y = cy + R * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        for (let i = 0; i < ring.folds; i++) {
          const a = angle + (i / ring.folds) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
          ctx.globalAlpha = alpha * 0.4;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    };

    const frame = (ts: number) => {
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;
      if (animationsEnabled) t += dt;

      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2;
      const breathe = 1 + 0.06 * Math.sin(t * 0.4);

      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * breathe);
      cg.addColorStop(0,   `rgba(199,210,254,${0.7 * intensity})`);
      cg.addColorStop(0.5, `rgba(139,92,246,${0.3 * intensity})`);
      cg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, 30 * breathe, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();

      rings.forEach(ring => {
        const angle = t * ring.speed;
        drawRing(cx, cy, ring, angle, breathe);
      });

      ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.46 * breathe, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(199,210,254,${0.08 * intensity})`; ctx.lineWidth = 0.5; ctx.stroke();

      ctx.globalAlpha = 1;
      if (animationsEnabled) rafRef.current = requestAnimationFrame(frame);
    };

    lastTsRef.current = performance.now();
    if (animationsEnabled) { rafRef.current = requestAnimationFrame(frame); } else { frame(lastTsRef.current + 16); }
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, [intensity, animationsEnabled]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }} className="pointer-events-none" />;
});

const LavaLampCanvas: React.FC<{ intensity: number; animationsEnabled: boolean }> = React.memo(({ intensity, animationsEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true }); if (!ctx) return;
    let w = window.innerWidth, h = window.innerHeight;
    const resize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h; };
    resize();
    window.addEventListener('resize', resize);

    const blobColors: [number,number,number][] = [
      [255,100,50],[255,140,0],[220,80,80],[255,160,60],[200,60,100],[255,120,30],
    ];
    interface Blob {
      x: number; y: number; vx: number; vy: number;
      r: number; color: [number,number,number]; phase: number; phaseSpeed: number;
    }
    const blobs: Blob[] = Array.from({ length: 7 }, (_, i) => ({
      x: (window.innerWidth) * (0.15 + 0.7 * Math.random()),
      y: (window.innerHeight) * (0.1 + 0.8 * Math.random()),
      vx: (Math.random() - 0.5) * 28,
      vy: (Math.random() - 0.5) * 20,
      r: Math.min(window.innerWidth, window.innerHeight) * (0.08 + 0.06 * Math.random()),
      color: blobColors[i % blobColors.length],
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: Math.random() * 0.5 + 0.2,
    }));

    const frame = (ts: number) => {
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);

      blobs.forEach(b => {
        if (animationsEnabled) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.phase += b.phaseSpeed * dt;
          if (b.x - b.r < 0)     { b.x = b.r;     b.vx = Math.abs(b.vx); }
          if (b.x + b.r > w)     { b.x = w - b.r;  b.vx = -Math.abs(b.vx); }
          if (b.y - b.r < 0)     { b.y = b.r;     b.vy = Math.abs(b.vy); }
          if (b.y + b.r > h)     { b.y = h - b.r;  b.vy = -Math.abs(b.vy); }
          const dy = h / 2 - b.y;
          b.vy += dy * 0.003 * dt;
          const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (spd > 60) { b.vx = b.vx / spd * 60; b.vy = b.vy / spd * 60; }
        }

        const pulse = 0.9 + 0.1 * Math.sin(b.phase);
        const [r,g,bb] = b.color;
        const glowR = b.r * 2.2 * pulse;

        const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowR);
        grd.addColorStop(0,   `rgba(${r},${g},${bb},${0.55 * intensity})`);
        grd.addColorStop(0.4, `rgba(${r},${g},${bb},${0.30 * intensity})`);
        grd.addColorStop(0.75,`rgba(${r},${g},${bb},${0.08 * intensity})`);
        grd.addColorStop(1,   `rgba(${r},${g},${bb},0)`);
        ctx.beginPath(); ctx.arc(b.x, b.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      });

      ctx.globalAlpha = 1;
      if (animationsEnabled) rafRef.current = requestAnimationFrame(frame);
    };

    lastTsRef.current = performance.now();
    if (animationsEnabled) { rafRef.current = requestAnimationFrame(frame); } else { frame(lastTsRef.current + 16); }
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, [intensity, animationsEnabled]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }} className="pointer-events-none" />;
});

// Planetary Orbital System — canvas-based for buttery smooth 60fps
const PlanetaryOrbits: React.FC<{ isCharging?: boolean; intensity: number; animationsEnabled: boolean }> = React.memo(({ isCharging, intensity, animationsEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Always use window dimensions — screensaver is always fixed fullscreen
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Color palette ────────────────────────────────────────────────────────
    const chargeColors  = ['#6ee7b7','#34d399','#a7f3d0','#d1fae5','#6ee7b7','#10b981','#34d399'];
    const normalColors  = ['#f8fafc','#c7d2fe','#a5b4fc','#93c5fd','#e2e8f0','#bfdbfe','#ddd6fe'];
    const trailColors   = isCharging ? chargeColors : normalColors;
    const [sr, sg, sb]  = isCharging ? [52, 211, 153] : [199, 210, 254];
    const [or, og, ob]  = isCharging ? [52, 211, 153] : [148, 163, 184];

    // ── Orbit ring definitions ────────────────────────────────────────────────
    // rFrac = semi-major as fraction of baseR, ecc = eccentricity [0..1),
    // tiltDeg = orbit tilt (3-D illusion), speed via Kepler T∝a^1.5
    const ringDefs = [
      { rFrac: 0.09, ecc: 0.08, tiltDeg:  12, phase: 0.0,  size: 2.5, trailLen: 28, ci: 0 },
      { rFrac: 0.17, ecc: 0.28, tiltDeg: -22, phase: 1.5,  size: 3.5, trailLen: 38, ci: 1 },
      { rFrac: 0.27, ecc: 0.14, tiltDeg:  40, phase: 3.1,  size: 4.2, trailLen: 48, ci: 2 },
      { rFrac: 0.38, ecc: 0.38, tiltDeg:  -8, phase: 0.7,  size: 3.0, trailLen: 42, ci: 3 },
      { rFrac: 0.49, ecc: 0.18, tiltDeg:  53, phase: 2.2,  size: 5.5, trailLen: 58, ci: 4 },
      { rFrac: 0.61, ecc: 0.32, tiltDeg: -33, phase: 4.4,  size: 4.5, trailLen: 62, ci: 5 },
      { rFrac: 0.74, ecc: 0.10, tiltDeg:  19, phase: 1.1,  size: 6.5, trailLen: 70, ci: 6 },
    ];

    interface Planet {
      a: number; b: number; tilt: number; theta: number; speed: number;
      size: number; trailLen: number; color: string;
      trail: { x: number; y: number }[];
    }

    // ── Asteroid belt ─────────────────────────────────────────────────────────
    const NUM_AST = 70;
    interface Asteroid { a: number; b: number; tilt: number; theta: number; speed: number; size: number; }

    // ── Shooting stars ────────────────────────────────────────────────────────
    interface ShootingStar { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; }
    const shootingStars: ShootingStar[] = [];
    let nextSST = 4 + Math.random() * 8;

    // ── Build planets & asteroids from current screen size ───────────────────
    let planets: Planet[] = [];
    let asteroids: Asteroid[] = [];

    const buildOrbits = () => {
      const baseR = Math.min(w, h) * 0.46;

      planets = ringDefs.map(d => {
        const a = baseR * d.rFrac;
        const b = a * (1 - d.ecc);
        const speed = 0.008 / Math.pow(d.rFrac, 1.5); // Kepler's 3rd law — slow ambient drift
        return { a, b, tilt: d.tiltDeg * Math.PI / 180, theta: d.phase, speed, size: d.size, trailLen: d.trailLen, color: trailColors[d.ci], trail: [] };
      });

      const bR = baseR * 0.32;
      asteroids = Array.from({ length: NUM_AST }, (_, i) => ({
        a:     bR + (Math.random() - 0.5) * baseR * 0.036,
        b:     bR * 0.86 + (Math.random() - 0.5) * baseR * 0.028,
        tilt:  6 * Math.PI / 180,
        theta: (i / NUM_AST) * Math.PI * 2 + Math.random() * 0.14,
        speed: 0.004 + Math.random() * 0.001,
        size:  Math.random() * 0.9 + 0.2,
      }));
    };
    buildOrbits();

    // Extend resize to also rebuild orbits after size changes
    window.removeEventListener('resize', resize);
    const onResize = () => { resize(); buildOrbits(); };
    window.addEventListener('resize', onResize);

    // ── Helper: point on an ellipse with tilt ────────────────────────────────
    const getPos = (a: number, b: number, tilt: number, theta: number) => {
      const x0 = a * Math.cos(theta);
      const y0 = b * Math.sin(theta);
      return {
        x: w / 2 + x0 * Math.cos(tilt) - y0 * Math.sin(tilt),
        y: h / 2 + x0 * Math.sin(tilt) + y0 * Math.cos(tilt),
      };
    };

    const spawnShootingStar = () => {
      const side = Math.random() > 0.5 ? -1 : 1;
      const spd  = 500 + Math.random() * 400;
      const ang  = (Math.random() * 50 - 25) * Math.PI / 180;
      shootingStars.push({
        x: side > 0 ? -60 : w + 60,
        y: Math.random() * h * 0.65,
        vx: side * spd * Math.cos(ang),
        vy: spd * Math.sin(ang) + (Math.random() - 0.5) * 80,
        life: 0, maxLife: 1.0 + Math.random() * 0.7,
        size: 1.2 + Math.random() * 1.4,
      });
    };

    // ── Main draw loop ────────────────────────────────────────────────────────
    const frame = (ts: number) => {
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);

      // ── Central star glow ────────────────────────────────────────────────
      const starGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 26);
      starGrad.addColorStop(0,   `rgba(${sr},${sg},${sb},${intensity})`);
      starGrad.addColorStop(0.4, `rgba(${sr},${sg},${sb},${intensity * 0.4})`);
      starGrad.addColorStop(1,   `rgba(${sr},${sg},${sb},0)`);
      ctx.beginPath(); ctx.arc(w/2, h/2, 26, 0, Math.PI * 2);
      ctx.fillStyle = starGrad; ctx.fill();

      ctx.beginPath(); ctx.arc(w/2, h/2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${intensity})`; ctx.fill();

      // ── Orbit ellipses ───────────────────────────────────────────────────
      ctx.lineWidth = 0.5;
      planets.forEach(p => {
        ctx.save();
        ctx.translate(w/2, h/2);
        ctx.rotate(p.tilt);
        ctx.scale(1, p.b / p.a);
        ctx.beginPath(); ctx.arc(0, 0, p.a, 0, Math.PI * 2);
        ctx.restore();
        ctx.strokeStyle = `rgba(${or},${og},${ob},${intensity * 0.11})`;
        ctx.stroke();
      });

      // ── Asteroid belt ────────────────────────────────────────────────────
      const astFill = `rgba(${or},${og},${ob},${intensity * 0.38})`;
      asteroids.forEach(ast => {
        if (animationsEnabled) ast.theta += ast.speed * dt;
        const pos = getPos(ast.a, ast.b, ast.tilt, ast.theta);
        ctx.beginPath(); ctx.arc(pos.x, pos.y, ast.size, 0, Math.PI * 2);
        ctx.fillStyle = astFill; ctx.fill();
      });

      // ── Planets ──────────────────────────────────────────────────────────
      planets.forEach(p => {
        if (animationsEnabled) p.theta += p.speed * dt;
        const pos = getPos(p.a, p.b, p.tilt, p.theta);

        if (animationsEnabled) {
          p.trail.push({ x: pos.x, y: pos.y });
          if (p.trail.length > p.trailLen) p.trail.shift();
        }

        // Comet tail
        if (p.trail.length > 1) {
          for (let i = 1; i < p.trail.length; i++) {
            const t = i / p.trail.length;
            ctx.beginPath();
            ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
            ctx.globalAlpha = t * t * intensity * 0.55;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size * t * 0.65;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // Glow halo
        const gr = p.size * 3.8;
        const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, gr);
        grd.addColorStop(0,   p.color + 'cc');
        grd.addColorStop(0.5, p.color + '44');
        grd.addColorStop(1,   p.color + '00');
        ctx.globalAlpha = intensity * 0.75;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, gr, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        // Core
        ctx.globalAlpha = intensity;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.fill();
        ctx.globalAlpha = 1;
      });

      // ── Shooting stars ───────────────────────────────────────────────────
      if (animationsEnabled) {
        nextSST -= dt;
        if (nextSST <= 0) { spawnShootingStar(); nextSST = 5 + Math.random() * 12; }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const s = shootingStars[i];
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.life += dt;

          if (s.life >= s.maxLife || s.x < -200 || s.x > w + 200) {
            shootingStars.splice(i, 1); continue;
          }

          const fadeIn  = Math.min(1, s.life / 0.12);
          const fadeOut = Math.max(0, 1 - s.life / s.maxLife);
          const alpha   = fadeIn * fadeOut * intensity;
          const spd     = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
          const tailLen = 90;
          const tx = s.x - (s.vx / spd) * tailLen;
          const ty = s.y - (s.vy / spd) * tailLen;

          const tg = ctx.createLinearGradient(tx, ty, s.x, s.y);
          tg.addColorStop(0, 'rgba(255,255,255,0)');
          tg.addColorStop(1, `rgba(255,255,255,${alpha})`);
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y);
          ctx.strokeStyle = tg; ctx.lineWidth = s.size; ctx.globalAlpha = 1; ctx.stroke();

          ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      if (animationsEnabled) rafRef.current = requestAnimationFrame(frame);
    };

    lastTsRef.current = performance.now();
    if (animationsEnabled) {
      rafRef.current = requestAnimationFrame(frame);
    } else {
      frame(lastTsRef.current + 16);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [isCharging, intensity, animationsEnabled]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
      className="pointer-events-none"
    />
  );
});

export const Screensaver: React.FC<ScreensaverProps> = React.memo(({
  onDismiss,
  batteryLevel,
  isCharging,
  incomingCall,
  notifications = [],
  onAnswer,
  onDecline,
  nebulaEnabled = true,
  opacity = 0.8,
  animationsEnabled = true,
  backgroundUrl = '',
  showDrinkWater = false,
  waterQty = 250,
  dailyWaterTotal = 0,
  dailyWaterGoal = 2000,
  drinkWaterEnabled = false,
  onDrinkWaterConfirm,
  onDrinkWaterSkip,
  animationType = 'planetary'
}) => {
  const hasWallpaper = !!backgroundUrl;
  const [time, setTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number>(0);

  // Play notification bell when drink water reminder appears
  useEffect(() => {
    if (!showDrinkWater) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(1318, ctx.currentTime,        0.35, 0.30);
      playTone(1760, ctx.currentTime + 0.18, 0.35, 0.25);
      playTone(2093, ctx.currentTime + 0.36, 0.45, 0.20);
      setTimeout(() => ctx.close(), 1500);
    } catch { /* Audio not available */ }
  }, [showDrinkWater]);

  // --- Silent Break Reminders Logic ---
  const breakReminder = useMemo(() => {
    const h = time.getHours();
    const m = time.getMinutes();
    
    // Lunch Break: 1:20 PM (13:20) - Displaying until 1:50 PM
    if (h === 13 && m >= 20 && m < 50) {
      return { type: 'lunch', label: 'Lunch Break', icon: Utensils };
    }
    
    // Tea Break: 5:00 PM (17:00) - Displaying until 5:20 PM
    if (h === 17 && m >= 0 && m < 20) {
      return { type: 'tea', label: 'Tea Break', icon: Coffee };
    }
    
    return null;
  }, [time]);

  // Optimized Starfield generation
  const stars = useMemo(() => {
    if (!nebulaEnabled) return [];
    return Array.from({ length: 40 }).map((_, i) => ({ // Optimization: Reduced from 60 to 40
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 0.5}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 3 + 2}s`
    }));
  }, [nebulaEnabled]);

  // Charging Particles generation
  const chargingParticles = useMemo(() => {
    if (!isCharging) return [];
    return Array.from({ length: 10 }).map((_, i) => ({ // Optimization: Reduced from 15 to 10
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${Math.random() * 2 + 3}s`,
      xOffset: `${(Math.random() - 0.5) * 100}px`,
      size: `${Math.random() * 2 + 2}px`
    }));
  }, [isCharging]);

  const processedNotifications = useMemo(() => {
    return [...notifications].slice(-3).reverse();
  }, [notifications]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!nebulaEnabled || !containerRef.current || !animationsEnabled) return;
      
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;
        if (containerRef.current) {
          containerRef.current.style.setProperty('--mouse-x', `${x}`);
          containerRef.current.style.setProperty('--mouse-y', `${y}`);
        }
      });
    };

    const handleActivity = (e: any) => {
        if (e.target.closest('button')) return;
        onDismiss();
    };
    
    const options = { passive: true };
    if (nebulaEnabled && animationsEnabled) {
      window.addEventListener('mousemove', handleMouseMove, options);
    }
    
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, handleActivity, options));

    return () => {
      clearInterval(timer);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener('mousemove', handleMouseMove);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [onDismiss, nebulaEnabled, animationsEnabled]);

  const timeString = useMemo(() => time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }), [time]);
  const dateString = useMemo(() => time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }), [time]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[1000] flex items-center justify-center cursor-default animate-fade-in overflow-hidden transition-colors duration-1000 accelerated ${hasWallpaper ? 'bg-black' : (nebulaEnabled ? (isCharging ? 'bg-[#0a1512]' : 'bg-[#080a15]') : 'bg-black')}`}
      style={{
        '--mouse-x': '0',
        '--mouse-y': '0',
        ...(hasWallpaper ? {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {})
      } as React.CSSProperties}
      onClick={onDismiss}
    >
      {/* Dark overlay — always present when wallpaper is set so text stays readable */}
      {hasWallpaper && (
        <div className="absolute inset-0 pointer-events-none bg-black/50 backdrop-blur-[2px]" />
      )}

      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]"
        style={{ opacity }}
      ></div>

      {isCharging && (
        <div
          className={`absolute inset-0 pointer-events-none bg-emerald-500/10 transition-opacity duration-1000 accelerated ${animationsEnabled ? 'animate-pulse' : ''}`}
          style={{ opacity }}
        ></div>
      )}

      {isCharging && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity }}>
          {chargingParticles.map(p => (
            <div
              key={p.id}
              className={`absolute bottom-0 rounded-full bg-emerald-300/40 accelerated ${animationsEnabled ? 'animate-charging-particle' : 'hidden'}`}
              style={{
                left: p.left, width: p.size, height: p.size,
                '--duration': p.duration, '--delay': p.delay, '--x-offset': p.xOffset
              } as any}
            />
          ))}
        </div>
      )}

      {nebulaEnabled && !hasWallpaper && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none accelerated" style={{ opacity }}>
          <div
            className={`absolute top-1/2 left-1/2 w-[140vw] h-[140vh] blur-[80px] mix-blend-screen transition-all duration-[3000ms] ease-out accelerated ${isCharging ? 'bg-emerald-600/20' : 'bg-indigo-600/20'} ${animationsEnabled ? 'animate-nebula-morph-slow' : 'opacity-40'}`}
            style={{
              transform: animationsEnabled ? `translate3d(calc(-50% + (var(--mouse-x) * 100px)), calc(-50% + (var(--mouse-y) * 100px)), 0)` : 'translate(-50%, -50%)'
            }}
          />
          <div
            className={`absolute top-1/3 left-1/3 w-[110vw] h-[110vh] blur-[60px] mix-blend-screen transition-all duration-[4000ms] ease-out accelerated ${isCharging ? 'bg-teal-600/20' : 'bg-purple-600/20'} ${animationsEnabled ? 'animate-nebula-morph-fast' : 'opacity-40'}`}
            style={{
              animationDelay: '-15s',
              transform: animationsEnabled ? `translate3d(calc(-50% - (var(--mouse-x) * 150px)), calc(-50% - (var(--mouse-y) * 150px)), 0)` : 'translate(-50%, -50%)'
            }}
          />
          <div
            className={`absolute bottom-1/4 right-1/4 w-[120vw] h-[120vh] blur-[100px] mix-blend-screen transition-all duration-[5000ms] ease-out accelerated ${isCharging ? 'bg-green-600/20' : 'bg-blue-600/20'} ${animationsEnabled ? 'animate-nebula-morph-slow' : 'opacity-40'}`}
            style={{
              animationDelay: '-40s',
              transform: animationsEnabled ? `translate3d(calc(-50% + (var(--mouse-x) * 50px)), calc(-50% + (var(--mouse-y) * 50px)), 0)` : 'translate(-50%, -50%)'
            }}
          />
        </div>
      )}

      {nebulaEnabled && !hasWallpaper && (
        <div
          className="absolute inset-0 pointer-events-none opacity-50 transition-transform duration-[2000ms] ease-out accelerated"
          style={{ transform: animationsEnabled ? `translate3d(calc(var(--mouse-x) * 20px), calc(var(--mouse-y) * 20px), 0)` : 'none', opacity: 0.5 * opacity }}
        >
          {stars.map(star => (
            <div
              key={star.id}
              className={`absolute rounded-full bg-white accelerated ${animationsEnabled ? 'animate-star-twinkle' : 'opacity-40'}`}
              style={{
                top: star.top, left: star.left, width: star.size, height: star.size,
                '--twinkle-delay': star.delay, '--twinkle-duration': star.duration
              } as any}
            />
          ))}
        </div>
      )}

      {/* Background animation layer — always on top of nebula/stars */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: hasWallpaper ? 0.6 : 1 }}>
        {animationType === 'aurora'           && <AuroraCanvas intensity={opacity} animationsEnabled={animationsEnabled} />}
        {animationType === 'bioluminescence'  && <BioluminescenceCanvas intensity={opacity} animationsEnabled={animationsEnabled} />}
        {animationType === 'mandala'          && <MandalaCanvas intensity={opacity} animationsEnabled={animationsEnabled} />}
        {animationType === 'lava'             && <LavaLampCanvas intensity={opacity} animationsEnabled={animationsEnabled} />}
        {(animationType === 'planetary' || !animationType) && <PlanetaryOrbits isCharging={isCharging} intensity={opacity} animationsEnabled={animationsEnabled} />}
      </div>

      {/* BREAK REMINDER INDICATOR */}
      {breakReminder && !incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-12 left-1/2 -translate-x-1/2 z-[1010] pointer-events-none"
        >
          <div className="px-6 py-2.5 rounded-full bg-indigo-500/20 backdrop-blur-xl border border-white/20 flex items-center gap-3 shadow-2xl">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
            <breakReminder.icon className="w-4 h-4 text-indigo-300" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
              {breakReminder.label}
            </span>
          </div>
        </motion.div>
      )}


      <div className="relative z-10 text-center select-none w-full px-6 max-w-lg flex flex-col items-center justify-center min-h-screen accelerated">
        {incomingCall ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 accelerated" 
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-[0_0_60px_rgba(255,255,255,0.15)] border-2 border-white/30 animate-pulse-ring accelerated"
              style={{ backgroundColor: stringToColor(incomingCall.username) }}
            >
              {getInitials(incomingCall.username)}
            </div>
            <div>
              <div className="text-white text-3xl font-bold drop-shadow-md">{incomingCall.username}</div>
              <div className="text-indigo-300 text-sm tracking-[0.2em] uppercase mt-2 font-semibold">Incoming Call</div>
            </div>
            <div className="flex gap-10 mt-8">
              <button 
                onClick={(e) => { e.stopPropagation(); onDecline?.(); }}
                className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center text-2xl hover:bg-red-500 transition-all hover:scale-110 active:scale-95 shadow-xl accelerated"
                aria-label="Decline Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onAnswer?.(); onDismiss(); }}
                className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center text-2xl hover:bg-green-500 transition-all hover:scale-110 active:scale-95 shadow-xl accelerated"
                aria-label="Answer Call"
              >
                <Phone className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Drink Water iOS-style notification tile */}
            <AnimatePresence>
              {showDrinkWater && (
                <motion.div
                  key="drink-water-tile"
                  initial={{ opacity: 0, y: -60, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -60, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="w-[320px] mb-10 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)] border border-white/10"
                  style={{ background: 'rgba(28,28,30,0.75)', backdropFilter: 'blur(40px) saturate(180%)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header row */}
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                    <div className="w-5 h-5 rounded-md bg-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Droplets className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex-1">Wellness · Hydration</span>
                    <span className="text-[11px] text-white/35 font-medium">now</span>
                  </div>

                  {/* Body: flask + info side by side */}
                  <div className="px-4 pb-3 flex items-center gap-4">
                    {/* Mini water flask SVG */}
                    {(() => {
                      const pct = Math.min(1, dailyWaterTotal / dailyWaterGoal);
                      const flaskH = 52; // total fillable height in SVG units
                      const fillH = Math.round(pct * flaskH);
                      const fillY = 10 + (flaskH - fillH); // top of fill rect
                      return (
                        <svg viewBox="0 0 36 72" className="w-8 h-16 flex-shrink-0" fill="none">
                          {/* Flask body */}
                          <path d="M10 8 L6 18 L4 62 Q4 68 18 68 Q32 68 32 62 L30 18 L26 8 Z"
                            fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                          {/* Water fill — clipped to body */}
                          <clipPath id="flaskClip">
                            <path d="M10 8 L6 18 L4 62 Q4 68 18 68 Q32 68 32 62 L30 18 L26 8 Z" />
                          </clipPath>
                          <rect x="0" y={fillY + 10} width="36" height={fillH + 10} fill="rgba(34,211,238,0.55)" clipPath="url(#flaskClip)" />
                          {/* Wave line on top of fill */}
                          {fillH > 0 && (
                            <path d={`M4 ${fillY + 10} Q11 ${fillY + 7} 18 ${fillY + 10} Q25 ${fillY + 13} 32 ${fillY + 10}`}
                              stroke="rgba(103,232,249,0.8)" strokeWidth="1" fill="none" />
                          )}
                          {/* Neck highlight */}
                          <path d="M11 8 L25 8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                          {/* Cap */}
                          <rect x="12" y="4" width="12" height="5" rx="2" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                          {/* Percentage text */}
                          <text x="18" y="44" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" opacity="0.9">
                            {Math.round(pct * 100)}%
                          </text>
                        </svg>
                      );
                    })()}

                    {/* Text info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-white leading-snug">Time to Drink Water</p>
                      <p className="text-[12px] text-white/55 mt-0.5 leading-snug">
                        Drink <span className="text-cyan-400 font-semibold">{waterQty} ml</span> — stay hydrated.
                      </p>
                      {/* Daily progress */}
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] text-white/40 mb-1">
                          <span>Today's intake</span>
                          <span className="text-cyan-300 font-semibold">{dailyWaterTotal} / {dailyWaterGoal} ml</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.round((dailyWaterTotal / dailyWaterGoal) * 100))}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-white/30 mt-1">
                          {dailyWaterTotal >= dailyWaterGoal
                            ? '🎉 Daily goal reached!'
                            : `${dailyWaterGoal - dailyWaterTotal} ml remaining to goal`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.08] mx-4" />
                  <div className="flex">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDrinkWaterSkip?.(); }}
                      className="flex-1 py-3 text-[14px] font-semibold text-white/40 hover:text-white/60 active:bg-white/5 transition-colors border-r border-white/[0.08]"
                    >
                      Skip
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDrinkWaterConfirm?.(); }}
                      className="flex-[2] py-3 text-[14px] font-semibold text-cyan-400 hover:text-cyan-300 active:bg-white/5 transition-colors"
                    >
                      ✓ Drank {waterQty} ml
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`text-9xl sm:text-[11rem] font-extralight tracking-tighter text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-1000 accelerated ${isCharging && animationsEnabled ? 'scale-105' : 'scale-100'}`}>
              {timeString.split(' ')[0]}
              <span className="text-4xl sm:text-5xl ml-4 font-light opacity-40 uppercase tracking-normal">
                {timeString.split(' ')[1]}
              </span>
            </div>
            
            <div className="text-xl sm:text-2xl font-light text-white/40 mt-6 tracking-[0.3em] uppercase">
              {dateString}
            </div>

            {processedNotifications.length > 0 && (
              <div className="mt-16 space-y-4 animate-fade-in w-full max-h-[40vh] overflow-hidden px-4">
                {processedNotifications.map((notif: any, idx) => {
                  const iconInfo = getAppIconInfo(notif.appname);
                  return (
                    <div 
                      key={notif.id || idx} 
                      className="flex items-start gap-4 text-left p-4 rounded-[2.5rem] transition-all w-full border backdrop-blur-3xl group bg-white/10 border-white/20 shadow-lg accelerated"
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconInfo.bg} shadow-lg opacity-100`}>
                        <i className={`${iconInfo.icon} ${iconInfo.color} text-xl`}></i>
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="font-bold text-sm truncate uppercase tracking-widest text-white/80">
                          {notif.headline}
                        </p>
                        <p className="text-xs line-clamp-2 mt-1 leading-relaxed text-white/50 font-light">
                          {notif.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {(batteryLevel !== undefined) && !incomingCall && (
          <div className={`mt-14 flex items-center justify-center gap-4 text-white/30 text-[10px] font-black tracking-[0.4em] transition-all duration-500 accelerated ${isCharging ? 'text-emerald-300' : 'text-white/30'} ${animationsEnabled && isCharging ? 'scale-110' : ''}`}>
            {isCharging && <Zap className={`w-4 h-4 text-emerald-400 ${animationsEnabled ? 'animate-pulse' : ''}`} />}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-6 border rounded-[8px] p-[2px] relative overflow-hidden transition-colors accelerated ${isCharging ? 'border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-white/20'}`}>
                <div 
                  className={`h-full rounded-[4px] transition-all duration-1000 relative overflow-hidden accelerated ${isCharging ? 'bg-emerald-400/60' : (batteryLevel < 20 ? 'bg-red-500/60' : 'bg-white/40')}`}
                  style={{ width: `${batteryLevel}%` }}
                >
                  {isCharging && animationsEnabled && (
                    <div className="absolute inset-0 opacity-50 accelerated">
                      <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-emerald-200/50 rounded-[40%] animate-liquid-wave accelerated"></div>
                    </div>
                  )}
                </div>
              </div>
              <span className={isCharging ? 'text-emerald-300 font-bold' : ''}>{batteryLevel}%</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Large permanent Erlenmeyer flask — fixed bottom-left */}
      {drinkWaterEnabled && !incomingCall && (() => {
        const pct = Math.min(1, dailyWaterTotal / dailyWaterGoal);
        // viewBox 0 0 120 188 — neck y=5..55, conical body y=55..155, rounded bottom y=155..175
        const bodyTop = 55, bodyBottom = 155;
        const fillH = pct * (bodyBottom - bodyTop);
        const waterY = bodyBottom - fillH;
        const clr = pct >= 0.66 ? '34,211,238' : pct >= 0.33 ? '56,189,248' : '147,197,253';
        const glowPx = 6 + pct * 20;
        const glowA = 0.18 + pct * 0.42;
        const flaskPath = 'M48 5 L72 5 L72 55 C84 75 108 108 108 155 Q108 175 60 175 Q12 175 12 155 C12 108 36 75 48 55 Z';
        // Graduation marks: approx right-edge x at each level (linear interpolation)
        const gradMarks = [
          { y: 130, label: '25%', xR: 99 },
          { y: 105, label: '50%', xR: 90 },
          { y: 80,  label: '75%', xR: 81 },
        ];
        const amountLabel = dailyWaterTotal >= 1000
          ? `${(dailyWaterTotal / 1000).toFixed(1)} L`
          : `${dailyWaterTotal} ml`;
        return (
          <div className="absolute bottom-16 left-8 z-20 pointer-events-none select-none flex flex-col items-center gap-2">
            <svg
              viewBox="0 0 120 188"
              width="100"
              height="157"
              fill="none"
              style={{ filter: `drop-shadow(0 0 ${glowPx}px rgba(${clr},${glowA})) drop-shadow(0 0 2px rgba(${clr},0.15))` }}
            >
              <defs>
                <clipPath id="scrFlaskClip">
                  <path d={flaskPath} />
                </clipPath>
              </defs>

              {/* Flask glass body */}
              <path d={flaskPath}
                fill={`rgba(${clr},0.05)`}
                stroke={`rgba(${clr},0.28)`}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* Water + waves (clipped to flask) */}
              <g clipPath="url(#scrFlaskClip)">
                {/* Solid water fill */}
                <rect x="0" y={waterY} width="120" height="188" fill={`rgba(${clr},0.18)`} />

                {/* Primary wave */}
                {fillH > 2 && (
                  <path
                    d={`M-120 ${waterY} q15 -5 30 0 q15 5 30 0 q15 -5 30 0 q15 5 30 0 q15 -5 30 0 q15 5 30 0 q15 -5 30 0 q15 5 30 0 L360 188 L-120 188 Z`}
                    fill={`rgba(${clr},0.45)`}
                  >
                    {animationsEnabled && <animateTransform attributeName="transform" type="translate" from="0 0" to="-60 0" dur="2.8s" repeatCount="indefinite" />}
                  </path>
                )}

                {/* Counter shimmer wave */}
                {fillH > 6 && (
                  <path
                    d={`M-120 ${waterY} q10 3 20 0 q10 -3 20 0 q10 3 20 0 q10 -3 20 0 q10 3 20 0 q10 -3 20 0 q10 3 20 0 q10 -3 20 0 q10 3 20 0 L360 ${waterY + 8} L-120 ${waterY + 8} Z`}
                    fill={`rgba(${clr},0.22)`}
                  >
                    {animationsEnabled && <animateTransform attributeName="transform" type="translate" from="-20 0" to="20 0" dur="1.8s" repeatCount="indefinite" />}
                  </path>
                )}

                {/* Rising bubbles */}
                {fillH > 20 && (
                  <>
                    <circle cx="42" r="2.5" fill={`rgba(${clr},0.35)`}>
                      {animationsEnabled && <animate attributeName="cy" values={`${bodyBottom - 6};${waterY + 8}`} dur="3.2s" repeatCount="indefinite" begin="0s" />}
                      {animationsEnabled && <animate attributeName="opacity" values="0.5;0" dur="3.2s" repeatCount="indefinite" begin="0s" />}
                    </circle>
                    <circle cx="73" r="1.8" fill={`rgba(${clr},0.25)`}>
                      {animationsEnabled && <animate attributeName="cy" values={`${bodyBottom - 10};${waterY + 6}`} dur="4.1s" repeatCount="indefinite" begin="1.1s" />}
                      {animationsEnabled && <animate attributeName="opacity" values="0.4;0" dur="4.1s" repeatCount="indefinite" begin="1.1s" />}
                    </circle>
                    <circle cx="58" r="1.4" fill={`rgba(${clr},0.3)`}>
                      {animationsEnabled && <animate attributeName="cy" values={`${bodyBottom - 18};${waterY + 4}`} dur="2.7s" repeatCount="indefinite" begin="2.3s" />}
                      {animationsEnabled && <animate attributeName="opacity" values="0.4;0" dur="2.7s" repeatCount="indefinite" begin="2.3s" />}
                    </circle>
                  </>
                )}
              </g>

              {/* Graduation marks on right side */}
              {gradMarks.map(m => (
                <g key={m.y}>
                  <line x1={m.xR - 12} y1={m.y} x2={m.xR} y2={m.y}
                    stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeLinecap="round" />
                  <text x={m.xR + 4} y={m.y + 3.5} fontSize="7.5"
                    fill="rgba(255,255,255,0.2)" fontFamily="monospace">
                    {m.label}
                  </text>
                </g>
              ))}

              {/* H₂O label in neck */}
              <text x="60" y="36" textAnchor="middle" fontSize="10"
                fill={`rgba(${clr},0.55)`} fontFamily="monospace" fontWeight="bold" letterSpacing="2">
                H₂O
              </text>

              {/* Neck glass interior */}
              <path d="M48 5 L72 5 L72 55 L48 55 Z" fill="rgba(255,255,255,0.03)" />

              {/* Rim */}
              <line x1="48" y1="5" x2="72" y2="5"
                stroke={`rgba(${clr},0.55)`} strokeWidth="2" strokeLinecap="round" />

              {/* Glass highlight streak */}
              <path d="M50 62 C53 100 54 132 52 150"
                stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" strokeLinecap="round" fill="none" />

              {/* Subtle inner glow at water surface */}
              {fillH > 2 && (
                <line x1="14" y1={waterY} x2="106" y2={waterY}
                  stroke={`rgba(${clr},0.25)`} strokeWidth="1" strokeLinecap="round"
                  clipPath="url(#scrFlaskClip)" />
              )}
            </svg>

            {/* Label below flask */}
            <div className="text-center leading-tight">
              <div className="font-bold text-sm tracking-wide" style={{ color: `rgba(${clr},0.9)` }}>
                {amountLabel}
              </div>
              <div className="text-white/25 text-[10px] uppercase tracking-widest mt-0.5">
                of {dailyWaterGoal} ml
              </div>
              {pct >= 1 && (
                <div className="text-[9px] mt-0.5" style={{ color: `rgba(${clr},0.7)` }}>Goal Reached ✦</div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/20 text-[9px] font-black tracking-[0.6em] uppercase pointer-events-none accelerated">
        {incomingCall ? 'Action Required' : (isCharging ? 'Energy Flowing' : 'Move Mouse or Tap to Unlock')}
      </div>
    </div>
  );
});
