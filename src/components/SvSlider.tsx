import type { CSSProperties } from "react";

// A slider drawn with plain elements: grey track, white fill, white ball.
// The real <input type="range"> sits on top, transparent, and handles clicks, drags and keys.
// The ball is positioned the same way as a native thumb: its centre moves from 6px to (width - 6px).
export function SvSlider({
  value,
  min = 0,
  max = 1,
  step,
  onChange,
  ariaLabel,
  thickness,
  className = "",
}: {
  value: number;
  min?: number;
  max?: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  thickness: number;
  className?: string;
}) {
  const span = max > min ? max - min : 1;
  const f = Math.min(1, Math.max(0, (value - min) / span));
  const ball = 12;
  const style = {
    "--f": String(f),
  } as CSSProperties;

  return (
    <div className={`relative h-3 ${className}`} style={style}>
      {/* grey track (unused part) */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-[#6b7280]"
        style={{ height: thickness }}
      />
      {/* white fill (used part) up to the ball centre */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{ height: thickness, width: `calc(${ball / 2}px + (100% - ${ball}px) * var(--f))` }}
      />
      {/* white ball */}
      <div
        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(0,0,0,0.45)]"
        style={{ left: `calc((100% - ${ball}px) * var(--f))` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}
