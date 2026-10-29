import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

/** Spring from 0 to 1 starting at `from` (local frames). */
export const usePop = (from: number, damping = 11) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - from, fps, config: { damping, stiffness: 170 } });
};

/** Scale children in around (x, y) from frame `from`; hidden before that. */
export const Pop: React.FC<{ x: number; y: number; from?: number; children: React.ReactNode }> = ({ x, y, from = 0, children }) => {
  const frame = useCurrentFrame();
  const s = usePop(from);
  if (frame < from) return null;
  return <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>{children}</g>;
};

export const Pill: React.FC<{ x: number; y: number; text: string; fill?: string; color?: string; size?: number }> = ({
  x, y, text, fill = theme.accent, color = "#fff", size = 54,
}) => {
  const w = text.length * size * 0.66 + size * 1.1;
  const h = size * 1.6;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={fill} stroke={theme.ink} strokeWidth={8} />
      <text x={x} y={y + size * 0.36} textAnchor="middle" fontFamily={theme.font} fontWeight={900} fontSize={size} fill={color}>
        {text}
      </text>
    </g>
  );
};

export const Word: React.FC<{ x: number; y: number; text: string; size?: number; color?: string; rotate?: number }> = ({
  x, y, text, size = 90, color = theme.ink, rotate = 0,
}) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={theme.font} fontWeight={900} fontSize={size} fill={color}
    stroke={theme.paper} strokeWidth={10} paintOrder="stroke" transform={`rotate(${rotate} ${x} ${y})`}>
    {text}
  </text>
);

/** Little flicking arcs that say "movement here". */
export const MotionLines: React.FC<{ x: number; y: number; r?: number; color?: string }> = ({ x, y, r = 70, color = theme.ink }) => {
  const frame = useCurrentFrame();
  const on = Math.floor(frame / 4) % 2;
  return (
    <g stroke={color} strokeWidth={8} strokeLinecap="round" fill="none">
      {[-40, 0, 40].map((a, i) => {
        const rr = r + ((i + on) % 2) * 14;
        const t = ((a - 90) * Math.PI) / 180;
        return <path key={a} d={`M ${x + Math.cos(t - 0.25) * rr} ${y + Math.sin(t - 0.25) * rr} A ${rr} ${rr} 0 0 1 ${x + Math.cos(t + 0.25) * rr} ${y + Math.sin(t + 0.25) * rr}`} />;
      })}
    </g>
  );
};

// Side-view brain: front faces screen-left, so the cerebellum sits lower-right.
const brainOutline = (() => {
  const n = 12;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a0 = Math.PI * (0.9 + (i / n) * 1.25);
    const a1 = Math.PI * (0.9 + ((i + 0.5) / n) * 1.25);
    const a2 = Math.PI * (0.9 + ((i + 1) / n) * 1.25);
    const p = (a: number, k: number) => `${Math.cos(a) * 260 * k} ${Math.sin(a) * 175 * k}`;
    if (i === 0) pts.push(`M ${p(a0, 1)}`);
    if (i < n) pts.push(`Q ${p(a1, 1.18)} ${p(a2, 1)}`);
  }
  return pts.join(" ") + " Q 120 190 -60 175 Q -230 170 -257 30 Z";
})();

export const Brain: React.FC<{ x: number; y: number; scale?: number; lit?: number; eyes?: "open" | "wink" | false }> = ({
  x, y, scale = 1, lit = 0, eyes = false,
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M 80 150 L 95 270 L 135 270 L 140 150 Z" fill="#F7C6C0" stroke={theme.ink} strokeWidth={12} strokeLinejoin="round" />
    <path d={brainOutline} fill="#F9D3CE" stroke={theme.ink} strokeWidth={14} strokeLinejoin="round" />
    <g fill="none" stroke={theme.ink} strokeWidth={9} strokeLinecap="round" opacity={0.85}>
      <path d="M -180 -40 Q -130 -90 -80 -40 T 20 -50" />
      <path d="M -150 60 Q -90 20 -40 70 T 70 40" />
      <path d="M 40 -120 Q 70 -60 130 -90 T 210 -20" />
      <path d="M -60 -140 Q -40 -100 -70 -70" />
    </g>
    <g transform="translate(175 120)">
      <ellipse rx={92} ry={58} fill={lit > 0 ? interpolateColor(lit) : "#F4B9B1"} stroke={theme.ink} strokeWidth={12} />
      <g fill="none" stroke={theme.ink} strokeWidth={7} strokeLinecap="round">
        <path d="M -70 -18 Q 0 -32 70 -18" />
        <path d="M -78 6 Q 0 -6 78 6" />
        <path d="M -66 30 Q 0 20 66 30" />
      </g>
    </g>
    {eyes && (
      <g>
        <circle cx={-90} cy={-10} r={26} fill="#fff" stroke={theme.ink} strokeWidth={8} />
        <circle cx={-84} cy={-8} r={10} fill={theme.ink} />
        {eyes === "open" ? (
          <>
            <circle cx={-10} cy={-10} r={26} fill="#fff" stroke={theme.ink} strokeWidth={8} />
            <circle cx={-4} cy={-8} r={10} fill={theme.ink} />
          </>
        ) : (
          <path d="M -36 -6 Q -10 -26 16 -6" fill="none" stroke={theme.ink} strokeWidth={9} strokeLinecap="round" />
        )}
        <path d="M -80 50 Q -45 75 -10 50" fill="none" stroke={theme.ink} strokeWidth={9} strokeLinecap="round" />
      </g>
    )}
  </g>
);

const interpolateColor = (t: number) => {
  const a = [0xf4, 0xb9, 0xb1];
  const b = [0xff, 0x5a, 0x36];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * Math.min(1, t))).join(",")})`;
};

export const ThoughtBubble: React.FC<{ cx: number; cy: number; rx: number; ry: number; tail: { x: number; y: number }; children?: React.ReactNode }> = ({
  cx, cy, rx, ry, tail, children,
}) => (
  <g>
    {[0.25, 0.5].map((k, i) => (
      <circle key={k} cx={tail.x + (cx - rx * 0.5 - tail.x) * k} cy={tail.y + (cy + ry * 0.7 - tail.y) * k} r={14 + i * 12}
        fill="#fff" stroke={theme.ink} strokeWidth={9} />
    ))}
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" stroke={theme.ink} strokeWidth={12} />
    {children}
  </g>
);

export const Stamp: React.FC<{ x: number; y: number; text: string; from: number }> = ({ x, y, text, from }) => {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const s = interpolate(frame - from, [0, 5], [2.2, 1], { extrapolateRight: "clamp" });
  const o = interpolate(frame - from, [0, 3], [0, 1], { extrapolateRight: "clamp" });
  const w = text.length * 46 + 70;
  return (
    <g transform={`translate(${x} ${y}) rotate(-10) scale(${s})`} opacity={o}>
      <rect x={-w / 2} y={-55} width={w} height={110} rx={14} fill="none" stroke={theme.accent} strokeWidth={12} />
      <text y={26} textAnchor="middle" fontFamily={theme.font} fontWeight={900} fontSize={76} fill={theme.accent}>{text}</text>
    </g>
  );
};

export const Slider: React.FC<{ x: number; top: number; bottom: number; level: number; label: string }> = ({ x, top, bottom, level, label }) => {
  const knobY = bottom - (bottom - top) * level;
  return (
    <g>
      <rect x={x - 46} y={top - 30} width={92} height={bottom - top + 60} rx={46} fill="#fff" stroke={theme.ink} strokeWidth={12} />
      <rect x={x - 22} y={knobY} width={44} height={Math.max(0, bottom - knobY)} rx={22} fill={theme.accent} />
      {Array.from({ length: 9 }, (_, i) => {
        const yy = top + ((bottom - top) * i) / 8;
        return <line key={i} x1={x + 70} x2={x + (i % 4 === 0 ? 120 : 98)} y1={yy} y2={yy} stroke={theme.ink} strokeWidth={8} strokeLinecap="round" />;
      })}
      <rect x={x - 80} y={knobY - 34} width={160} height={68} rx={20} fill={theme.yellow} stroke={theme.ink} strokeWidth={12} />
      <text x={x} y={top - 80} textAnchor="middle" fontFamily={theme.font} fontWeight={900} fontSize={60} fill={theme.ink}>{label}</text>
    </g>
  );
};

export const ClockBadge: React.FC<{ x: number; y: number; text?: string; spin?: number; fill?: string }> = ({ x, y, text, spin = 0, fill = "#fff" }) => {
  const a = (spin * Math.PI) / 180;
  const w = text ? text.length * 40 + 190 : 140;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-70} width={w} height={140} rx={70} fill={fill} stroke={theme.ink} strokeWidth={10} />
      <g transform={`translate(${-w / 2 + 70} 0)`}>
        <circle r={44} fill="#fff" stroke={theme.ink} strokeWidth={9} />
        <line x1={0} y1={0} x2={Math.sin(a) * 32} y2={-Math.cos(a) * 32} stroke={theme.accent} strokeWidth={9} strokeLinecap="round" />
        <line x1={0} y1={0} x2={0} y2={-22} stroke={theme.ink} strokeWidth={9} strokeLinecap="round" />
      </g>
      {text && (
        <text x={-w / 2 + 130} y={20} fontFamily={theme.font} fontWeight={900} fontSize={60} fill={theme.ink}>{text}</text>
      )}
    </g>
  );
};

/** Dashed arrow that draws itself from `from` over `frames`. */
export const Arrow: React.FC<{ d: string; from: number; frames?: number; color?: string; length?: number }> = ({
  d, from, frames = 10, color = theme.accent, length = 900,
}) => {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const t = interpolate(frame - from, [0, frames], [0, 1], { extrapolateRight: "clamp" });
  const id = `m${Math.abs(d.length * 31 + from)}`;
  return (
    <g>
      <defs>
        <mask id={id}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={40} strokeDasharray={length} strokeDashoffset={length * (1 - t)} />
        </mask>
        <marker id={`${id}h`} markerWidth={4} markerHeight={4} refX={2} refY={2} orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 4 2 L 0 4 Z" fill={color} />
        </marker>
      </defs>
      <path d={d} fill="none" stroke={color} strokeWidth={14} strokeDasharray="28 18" strokeLinecap="round" mask={`url(#${id})`}
        markerEnd={t > 0.97 ? `url(#${id}h)` : undefined} strokeDashoffset={-frame * 3} />
    </g>
  );
};

export const DocCard: React.FC<{ x: number; y: number; text: string }> = ({ x, y, text }) => (
  <g transform={`translate(${x} ${y}) rotate(-6)`}>
    <rect x={-95} y={-60} width={190} height={120} rx={12} fill="#fff" stroke={theme.ink} strokeWidth={10} />
    <text y={20} textAnchor="middle" fontFamily={theme.font} fontWeight={900} fontSize={52} fill={theme.ink}>{text}</text>
  </g>
);

/** Boxy robot whose arm reaches screen-left; `swing` is the arm angle in degrees. */
export const Robot: React.FC<{ x: number; y: number; swing: number; reach?: number; blink?: boolean }> = ({ x, y, swing, reach = 380, blink }) => {
  const a = (swing * Math.PI) / 180;
  const shoulder = { x: x - 110, y: y - 60 };
  const elbow = { x: shoulder.x - (reach * 0.5) * Math.cos(a * 0.4), y: shoulder.y + reach * 0.5 * Math.sin(a * 0.4) };
  const tip = { x: elbow.x - reach * 0.5 * Math.cos(a), y: elbow.y + reach * 0.5 * Math.sin(a) };
  return (
    <g>
      <ellipse cx={x} cy={y + 245} rx={150} ry={16} fill={theme.soft} />
      <line x1={x} y1={y - 210} x2={x} y2={y - 270} stroke={theme.ink} strokeWidth={10} strokeLinecap="round" />
      <circle cx={x} cy={y - 280} r={16} fill={theme.accent} stroke={theme.ink} strokeWidth={8} />
      <rect x={x - 120} y={y - 210} width={240} height={190} rx={30} fill="#D9E4F5" stroke={theme.ink} strokeWidth={12} />
      <rect x={x - 90} y={y - 180} width={180} height={110} rx={20} fill={theme.ink} />
      {blink ? (
        <g stroke="#7CF2C4" strokeWidth={10} strokeLinecap="round">
          <line x1={x - 55} y1={y - 125} x2={x - 25} y2={y - 125} />
          <line x1={x + 25} y1={y - 125} x2={x + 55} y2={y - 125} />
        </g>
      ) : (
        <g fill="#7CF2C4">
          <circle cx={x - 40} cy={y - 125} r={18} />
          <circle cx={x + 40} cy={y - 125} r={18} />
        </g>
      )}
      <rect x={x - 100} y={y - 20} width={200} height={200} rx={24} fill="#D9E4F5" stroke={theme.ink} strokeWidth={12} />
      <rect x={x - 70} y={y + 180} width={50} height={60} fill="#D9E4F5" stroke={theme.ink} strokeWidth={12} />
      <rect x={x + 20} y={y + 180} width={50} height={60} fill="#D9E4F5" stroke={theme.ink} strokeWidth={12} />
      <polyline points={`${shoulder.x},${shoulder.y} ${elbow.x},${elbow.y} ${tip.x},${tip.y}`} fill="none" stroke={theme.ink}
        strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${shoulder.x},${shoulder.y} ${elbow.x},${elbow.y} ${tip.x},${tip.y}`} fill="none" stroke="#9FB3D1"
        strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={elbow.x} cy={elbow.y} r={18} fill="#D9E4F5" stroke={theme.ink} strokeWidth={8} />
      <g transform={`translate(${tip.x} ${tip.y}) rotate(${-swing - 90})`}>
        <path d="M 0 0 C -30 -40 -20 -110 0 -140 C 20 -110 30 -40 0 0 Z" fill={theme.yellow} stroke={theme.ink} strokeWidth={8} />
        <line x1={0} y1={0} x2={0} y2={-120} stroke={theme.ink} strokeWidth={5} />
      </g>
    </g>
  );
};
