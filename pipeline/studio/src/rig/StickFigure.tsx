import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import type { Pose } from "./poses";

export type Expression = "neutral" | "happy" | "flat" | "laugh" | "o" | "smirk" | "curious" | "meh";

const L = { torso: 190, neck: 14, head: 56, upper: 104, lower: 96, thigh: 124, shin: 118 };

type Pt = { x: number; y: number };
const rad = (d: number) => (d * Math.PI) / 180;
// Limb direction: 0 deg points down, positive swings toward screen-right.
const along = (p: Pt, deg: number, len: number): Pt => ({
  x: p.x + Math.sin(rad(deg)) * len,
  y: p.y + Math.cos(rad(deg)) * len,
});

/** Joint positions for a pose, so scenes can attach props to hands or the head. */
export const rigJoints = (pose: Pose, x: number, y: number, s: number) => {
  const hip = { x, y };
  // Torso 0 points up; leaning the torso rotates the hanging arms with it.
  const neck = along(hip, 180 - pose.torso, L.torso * s);
  const shoulder = along(hip, 180 - pose.torso, (L.torso - 14) * s);
  const head = along(hip, 180 - pose.torso, (L.torso + L.neck + L.head) * s);
  const arm = (upper: number, lower: number) => {
    const elbow = along(shoulder, upper - pose.torso, L.upper * s);
    return { elbow, hand: along(elbow, upper - pose.torso + lower, L.lower * s) };
  };
  const leg = (thigh: number, shin: number) => {
    const knee = along(hip, thigh, L.thigh * s);
    return { knee, foot: along(knee, thigh + shin, L.shin * s) };
  };
  return {
    hip, neck, shoulder, head,
    l: arm(pose.lUpper, pose.lLower),
    r: arm(pose.rUpper, pose.rLower),
    lLeg: leg(pose.lThigh, pose.lShin),
    rLeg: leg(pose.rThigh, pose.rShin),
  };
};

const Face: React.FC<{ expression: Expression; color: string; blink: boolean }> = ({ expression, color, blink }) => {
  const eye = (cx: number) => {
    if (expression === "laugh") return <path d={`M ${cx - 10} -2 Q ${cx} -16 ${cx + 10} -2`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />;
    if (blink) return <line x1={cx - 8} y1={-6} x2={cx + 8} y2={-6} stroke={color} strokeWidth={6} strokeLinecap="round" />;
    return (
      <g>
        <circle cx={cx} cy={-6} r={7} fill={color} />
        {(expression === "flat" || expression === "meh") && (
          <line x1={cx - 11} y1={-12} x2={cx + 11} y2={-12} stroke={color} strokeWidth={6} strokeLinecap="round" />
        )}
      </g>
    );
  };
  const mouths: Record<Expression, React.ReactNode> = {
    neutral: <path d="M -14 18 Q 0 28 14 18" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />,
    happy: <path d="M -24 13 Q 0 40 24 13" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />,
    flat: <line x1={-16} y1={22} x2={16} y2={22} stroke={color} strokeWidth={6} strokeLinecap="round" />,
    laugh: <path d="M -26 12 Q 0 52 26 12 Z" fill={color} stroke={color} strokeWidth={4} strokeLinejoin="round" />,
    o: <circle cx={0} cy={22} r={9} fill={color} />,
    smirk: <path d="M -16 22 Q 6 28 20 12" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />,
    curious: <circle cx={4} cy={22} r={7} fill={color} />,
    meh: <path d="M -16 24 Q -4 18 4 23 T 18 22" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />,
  };
  return (
    <g>
      {eye(-19)}
      {eye(19)}
      {expression === "curious" && <path d="M 8 -26 Q 19 -34 30 -26" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />}
      {mouths[expression]}
    </g>
  );
};

const Fingers: React.FC<{ at: Pt; frame: number; s: number; color: string; phase: number }> = ({ at, frame, s, color, phase }) => (
  <g>
    {[-35, 0, 35].map((spread, i) => {
      const a = rad(spread + Math.sin(frame * 1.3 + i + phase) * 25 - 90);
      return <line key={i} x1={at.x} y1={at.y} x2={at.x + Math.cos(a) * 22 * s} y2={at.y + Math.sin(a) * 22 * s}
        stroke={color} strokeWidth={8 * s} strokeLinecap="round" />;
    })}
  </g>
);

export const StickFigure: React.FC<{
  pose: Pose;
  x: number;
  y: number;
  scale?: number;
  color?: string;
  expression?: Expression;
  wiggle?: boolean;
  blinkOffset?: number;
}> = ({ pose, x, y, scale = 1, color = theme.ink, expression = "neutral", wiggle = false, blinkOffset = 0 }) => {
  const frame = useCurrentFrame();
  const s = scale;
  const j = rigJoints(pose, x, y, s);
  const w = theme.line * s;
  const blink = (frame + blinkOffset) % 97 >= 93;
  const line = (pts: Pt[]) => (
    <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth={w}
      strokeLinecap="round" strokeLinejoin="round" />
  );
  const groundY = Math.max(j.lLeg.foot.y, j.rLeg.foot.y) + 8 * s;
  return (
    <g>
      <ellipse cx={x} cy={groundY} rx={110 * s} ry={14 * s} fill={theme.soft} />
      {line([j.hip, j.lLeg.knee, j.lLeg.foot])}
      {line([j.hip, j.rLeg.knee, j.rLeg.foot])}
      {line([j.hip, j.neck])}
      {line([j.shoulder, j.l.elbow, j.l.hand])}
      {line([j.shoulder, j.r.elbow, j.r.hand])}
      {wiggle && <Fingers at={j.l.hand} frame={frame} s={s} color={color} phase={0} />}
      {wiggle && <Fingers at={j.r.hand} frame={frame} s={s} color={color} phase={2} />}
      <circle cx={j.head.x} cy={j.head.y} r={L.head * s} fill={theme.paper} stroke={color} strokeWidth={w} />
      <g transform={`translate(${j.head.x} ${j.head.y}) rotate(${pose.head}) scale(${s})`}>
        <Face expression={expression} color={color} blink={blink} />
      </g>
    </g>
  );
};
