import { useEffect, useRef } from "react";

interface WaveCanvasProps {
  className?: string;
}

/**
 * Animated "AI-style" hero background (Prompt 21).
 *
 * Two layered effects painted on one requestAnimationFrame canvas:
 *   1. drifting grid blocks whose brightness rides a traveling sine field;
 *   2. three undulating forge-palette wave ribbons.
 *
 * Zero dependencies. Honors prefers-reduced-motion (single static frame),
 * pauses when the tab is hidden, and is DPR-aware via ResizeObserver.
 */
export function WaveCanvas({ className = "" }: WaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    type Ribbon = {
      baseY: number;
      amplitude: number;
      frequency: number;
      speed: number;
      phase: number;
      color: string;
      fill: string;
    };
    const RIBBONS: Ribbon[] = [
      { baseY: 0.62, amplitude: 46, frequency: 0.008, speed: 0.00045, phase: 0.0, color: "rgba(224,146,66,0.55)", fill: "rgba(201,106,34,0.10)" },
      { baseY: 0.72, amplitude: 60, frequency: 0.006, speed: 0.00032, phase: 1.9, color: "rgba(225,156,77,0.38)", fill: "rgba(217,127,43,0.07)" },
      { baseY: 0.84, amplitude: 74, frequency: 0.0045, speed: 0.00024, phase: 3.7, color: "rgba(234,185,125,0.26)", fill: "rgba(167,82,30,0.06)" },
    ];

    const BLOCK_SIZE = 26;
    const BLOCK_GAP = 10;

    const drawBackground = (): void => {
      const gradient = g.createLinearGradient(0, 0, width * 0.4, height);
      gradient.addColorStop(0, "#020617");
      gradient.addColorStop(0.55, "#0b1120");
      gradient.addColorStop(1, "#111a2e");
      g.fillStyle = gradient;
      g.fillRect(0, 0, width, height);

      const glow = g.createRadialGradient(
        width * 0.72,
        height * 0.18,
        40,
        width * 0.72,
        height * 0.18,
        Math.max(width, height) * 0.55,
      );
      glow.addColorStop(0, "rgba(217,127,43,0.16)");
      glow.addColorStop(1, "rgba(2,6,23,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, width, height);
    };

    const drawBlocks = (time: number): void => {
      const cols = Math.ceil(width / (BLOCK_SIZE + BLOCK_GAP)) + 1;
      const rows = Math.ceil(height / (BLOCK_SIZE + BLOCK_GAP)) + 1;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * (BLOCK_SIZE + BLOCK_GAP);
          const y = row * (BLOCK_SIZE + BLOCK_GAP);
          const field =
            Math.sin(x * 0.012 + time * 0.0011 + row * 0.7) +
            Math.cos(y * 0.016 - time * 0.0009 + col * 0.5);
          const intensity = (field + 2) / 4; // 0..1
          const alpha = 0.02 + intensity * intensity * 0.16;
          const warm = intensity > 0.72;
          g.fillStyle = warm
            ? `rgba(224,146,66,${alpha + 0.05})`
            : `rgba(148,163,184,${alpha})`;
          g.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
    };

    const ribbonY = (ribbon: Ribbon, x: number, time: number): number =>
      height * ribbon.baseY +
      Math.sin(x * ribbon.frequency + time * ribbon.speed + ribbon.phase) * ribbon.amplitude +
      Math.sin(x * ribbon.frequency * 2.3 + time * ribbon.speed * 1.6) * (ribbon.amplitude * 0.35);

    const drawRibbon = (ribbon: Ribbon, time: number): void => {
      g.beginPath();
      g.moveTo(-4, height + 4);
      for (let x = -4; x <= width + 4; x += 6) {
        g.lineTo(x, ribbonY(ribbon, x, time));
      }
      g.lineTo(width + 4, height + 4);
      g.closePath();
      g.fillStyle = ribbon.fill;
      g.fill();

      g.beginPath();
      for (let x = -4; x <= width + 4; x += 6) {
        const y = ribbonY(ribbon, x, time);
        if (x === -4) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokeStyle = ribbon.color;
      g.lineWidth = 1.5;
      g.stroke();
    };

    const paint = (time: number): void => {
      g.clearRect(0, 0, width, height);
      drawBackground();
      drawBlocks(time);
      for (const ribbon of RIBBONS) drawRibbon(ribbon, time);
    };

    if (reduceMotion) {
      paint(4000);
      return () => ro.disconnect();
    }

    const loop = (now: number): void => {
      if (!document.hidden) paint(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
