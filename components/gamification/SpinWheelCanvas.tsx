'use client';

/**
 * Spin Wheel Canvas Component
 * Draws the wheel using Canvas API and animates it on spin.
 * onSpin  — called immediately, returns the server result (segment index)
 * onComplete — called AFTER the 4-second animation finishes, so the result
 *              card only appears once the wheel has stopped.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Segment {
  label: string;
  type:  string;
  color: string;
  icon:  string | null;
}

interface SpinWheelCanvasProps {
  segments:    Segment[];
  onSpin:      () => Promise<any>;
  onComplete?: (result: any) => void;  // fires after animation ends
  disabled?:   boolean;
  className?:  string;
}

const COLORS = [
  '#ff6b35', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899',
];

export default function SpinWheelCanvas({
  segments, onSpin, onComplete, disabled, className,
}: SpinWheelCanvasProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canvasSize, setCanvasSize] = useState(320);

  // Measure container width and cap canvas at 320px
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.min(320, el.clientWidth);
      setCanvasSize(w > 0 ? w : 320);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback((rot: number) => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;
    const ctx  = canvas.getContext('2d')!;
    const size = canvas.width;
    const cx   = size / 2;
    const cy   = size / 2;
    const r    = size / 2 - 8;
    const arc  = (2 * Math.PI) / segments.length;

    ctx.clearRect(0, 0, size, size);

    // Shadow ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();

    segments.forEach((seg, i) => {
      const start = rot + i * arc - Math.PI / 2;
      const end   = start + arc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color || COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign   = 'right';
      ctx.fillStyle   = '#ffffff';
      ctx.font        = `bold ${size < 300 ? 10 : 13}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur  = 4;
      ctx.fillText(seg.label, r - 12, 5);
      ctx.restore();
    });

    // Centre circle
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer (right side)
    ctx.beginPath();
    ctx.moveTo(cx + r + 4, cy);
    ctx.lineTo(cx + r + 22, cy - 8);
    ctx.lineTo(cx + r + 22, cy + 8);
    ctx.closePath();
    ctx.fillStyle = '#ff6b35';
    ctx.fill();
  }, [segments]);

  useEffect(() => { draw(rotation); }, [draw, rotation, canvasSize]);

  const handleSpin = async () => {
    if (spinning || disabled || segments.length === 0) return;
    setSpinning(true);

    try {
      // 1. Hit the API — disabled prop is now instantly true in parent
      const result = await onSpin();
      const target = result?.segment?.index ?? 0;
      const arc    = (2 * Math.PI) / segments.length;

      // 2. Calculate the exact final rotation so the pointer (right side, angle=0)
      //    lands on the CENTER of the winning segment.
      //
      //    Segment i is drawn starting at: rot + i*arc - π/2
      //    Center of segment i is at:      rot + i*arc + arc/2 - π/2
      //    For center of segment `target` to equal 0 (pointer):
      //      rot = π/2 - (target + 0.5) * arc
      //
      const extraSpins = Math.floor(5 + Math.random() * 3); // 5–7 full rotations
      let targetRot    = Math.PI / 2 - (target + 0.5) * arc;
      // Normalise to [0, 2π) so the wheel always spins forward
      targetRot = ((targetRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const finalRot = extraSpins * 2 * Math.PI + targetRot;

      let startTs: number | null = null;
      const duration = 4500; // ms

      const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

      const step = (ts: number) => {
        if (!startTs) startTs = ts;
        const elapsed  = ts - startTs;
        const progress = Math.min(elapsed / duration, 1);
        const current  = easeOut(progress) * finalRot;
        // Draw with raw angle (no modulo) for smooth continuous rotation
        draw(current);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // 3. Animation done — save final resting angle then show the result
          setRotation(targetRot);
          draw(targetRot);
          setSpinning(false);
          onComplete?.(result);
        }
      };

      requestAnimationFrame(step);
    } catch {
      setSpinning(false);
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-6 w-full', className)}>
      <div ref={containerRef} className="w-full max-w-[320px] relative">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="rounded-full w-full"
          style={{ filter: spinning ? 'drop-shadow(0 0 20px rgba(255,107,53,0.6))' : 'none' }}
        />
      </div>

      <motion.button
        onClick={handleSpin}
        disabled={spinning || disabled}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: disabled || spinning ? 1 : 1.02 }}
        className={cn(
          'btn-primary px-10 py-4 text-lg font-display',
          (spinning || disabled) && 'opacity-60 cursor-not-allowed',
        )}
      >
        {spinning ? (
          <span className="flex items-center gap-2">
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              🎰
            </motion.span>
            Spinning…
          </span>
        ) : disabled ? (
          '⏳ Come back later'
        ) : (
          '🎡 SPIN!'
        )}
      </motion.button>
    </div>
  );
}
