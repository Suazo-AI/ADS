import React from "react";
import { AbsoluteFill } from "remotion";
import { poses, type PoseName } from "./rig/poses";
import { StickFigure, type Expression } from "./rig/StickFigure";
import { theme } from "./theme";

// QA sheet: every pose and expression in the library, for eyeballing the rig.
const exprs: Expression[] = ["neutral", "happy", "flat", "laugh", "o", "smirk", "curious", "meh", "neutral"];

export const RigSheet: React.FC = () => {
  const names = Object.keys(poses) as PoseName[];
  return (
    <AbsoluteFill style={{ background: theme.paper }}>
      <svg width={1080} height={1920}>
        {names.map((n, i) => {
          const x = 180 + (i % 3) * 360;
          const y = 380 + Math.floor(i / 3) * 600;
          return (
            <g key={n}>
              <StickFigure pose={poses[n]} x={x} y={y} scale={0.75} expression={exprs[i]} />
              <text x={x} y={y + 230} textAnchor="middle" fontFamily={theme.font} fontWeight={800} fontSize={34} fill={theme.ink}>
                {n} / {exprs[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
