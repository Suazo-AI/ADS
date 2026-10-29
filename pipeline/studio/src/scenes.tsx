import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Arrow, Brain, ClockBadge, DocCard, MotionLines, Pill, Pop, Robot, Slider, Stamp, ThoughtBubble, Word, usePop } from "./props";
import { mirror, offset, poseAt, poses, squirm } from "./rig/poses";
import { StickFigure, rigJoints, type Expression } from "./rig/StickFigure";
import { theme } from "./theme";

export type SceneCtx = {
  dur: number;
  /** Local frame where the nth occurrence of `word` is spoken in this shot. */
  at: (word: string, nth?: number) => number;
  /** Local frame where the shot's kth line starts. */
  lineStart: (k: number) => number;
};

export type Cue = { f: number; sfx: string; volume?: number };

type Scene = { render: React.FC<{ ctx: SceneCtx }>; cues?: (ctx: SceneCtx) => Cue[] };

const ME = { x: 540, y: 1010, s: 1.25 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Moves focus point (fx, fy) to the frame's stage centre at zoom z, with a slow push-in. */
const Camera: React.FC<{ z?: number; fx?: number; fy?: number; dur: number; children: React.ReactNode }> = ({
  z = 1, fx = 540, fy = 900, dur, children,
}) => {
  const frame = useCurrentFrame();
  const zz = z * interpolate(frame, [0, dur], [1, 1.05], clamp);
  return <g transform={`translate(${540 - fx * zz} ${900 - fy * zz}) scale(${zz})`}>{children}</g>;
};

const Me: React.FC<{ expression: Expression; wiggle?: boolean; track: Parameters<typeof poseAt>[0]; amt?: number; x?: number; y?: number; s?: number }> = ({
  expression, wiggle, track, amt = 0, x = ME.x, y = ME.y, s = ME.s,
}) => {
  const frame = useCurrentFrame();
  const pose = squirm(poseAt(track, frame), frame, amt);
  const bounce = -Math.abs(Math.sin(frame * 0.45)) * 22 * amt;
  return <StickFigure pose={pose} x={x} y={y + bounce} scale={s} expression={expression} wiggle={wiggle} />;
};

const SelfTickle: Scene = {
  render: ({ ctx }) => (
    <Camera dur={ctx.dur}>
      <Me expression="o" wiggle track={[{ f: 0, pose: "stand" }, { f: 2, pose: "selfTickle" }]} />
      <MotionLines x={ME.x - 150} y={ME.y - 120} />
      <MotionLines x={ME.x + 150} y={ME.y - 120} />
    </Camera>
  ),
  cues: () => [{ f: 0, sfx: "pop" }],
};

const Wait: Scene = {
  render: ({ ctx }) => {
    const frame = useCurrentFrame();
    return (
      <Camera z={1.12} fy={860} dur={ctx.dur}>
        <Me expression="flat" wiggle track={[{ f: 0, pose: "selfTickle" }]} />
        <Pop x={820} y={420} from={ctx.at("wait") - 4}>
          <ClockBadge x={820} y={420} spin={Math.floor(frame / 6) * 30} />
        </Pop>
      </Camera>
    );
  },
  cues: (ctx) => [0, 6, 12, 18].map((d) => ({ f: ctx.at("wait") + d, sfx: "tick", volume: 0.6 })),
};

const Shrug: Scene = {
  render: ({ ctx }) => {
    const frame = useCurrentFrame();
    const j = rigJoints(poses.shrug, ME.x, ME.y, ME.s);
    const dots = Math.min(3, Math.floor(frame / 5));
    return (
      <Camera dur={ctx.dur}>
        <Me expression="meh" track={[{ f: 0, pose: "selfTickle" }, { f: 1, pose: "shrug", ease: 8 }]} />
        {Array.from({ length: dots }, (_, i) => (
          <circle key={i} cx={j.head.x - 50 + i * 50} cy={j.head.y - 130} r={13} fill={theme.ink} />
        ))}
      </Camera>
    );
  },
  cues: () => [{ f: 0, sfx: "boop" }],
};

const HeadZoom: Scene = {
  render: ({ ctx }) => {
    const j = rigJoints(poses.stand, ME.x, ME.y, ME.s);
    return (
      <Camera z={2.3} fx={j.head.x} fy={j.head.y + 30} dur={ctx.dur}>
        <Me expression="curious" track={[{ f: 0, pose: "stand" }]} />
        <Pop x={j.head.x + 105} y={j.head.y - 70} from={4}>
          <Word x={j.head.x + 105} y={j.head.y - 50} text="?" size={110} color={theme.accent} rotate={12} />
        </Pop>
      </Camera>
    );
  },
  cues: () => [{ f: 0, sfx: "whoosh" }],
};

const BrainCopy: Scene = {
  render: ({ ctx }) => {
    const frame = useCurrentFrame();
    const move = ctx.at("move");
    const copy = ctx.at("copy");
    const cere = ctx.at("cerebellum");
    const lit = interpolate(frame, [cere, cere + 6], [0, 1], clamp);
    // The copy rides from the front of the brain to the cerebellum.
    const t = interpolate(frame, [copy + 4, cere], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
    const bx = 540, by = 690, bs = 1.35;
    const start = { x: bx - 150 * bs, y: by - 60 * bs };
    const end = { x: bx + 175 * bs, y: by + 120 * bs };
    const card = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t - Math.sin(t * Math.PI) * 160 };
    return (
      <Camera dur={ctx.dur}>
        <Pop x={bx} y={by} from={0}>
          <Brain x={bx} y={by} scale={bs} lit={lit} />
        </Pop>
        <Arrow d={`M ${start.x} ${start.y + 120} Q ${start.x - 150} ${start.y + 300} ${start.x - 60} ${start.y + 420}`} from={move} length={500} />
        <Pop x={start.x - 40} y={start.y + 500} from={move + 6}>
          <Pill x={start.x - 40} y={start.y + 500} text="MOVE!" />
        </Pop>
        {frame >= copy && <Pop x={card.x} y={card.y} from={copy}><DocCard x={card.x} y={card.y} text="COPY" /></Pop>}
        <Pop x={700} y={by + 430} from={cere}>
          <Pill x={700} y={by + 430} text="CEREBELLUM" fill={theme.yellow} color={theme.ink} />
        </Pop>
      </Camera>
    );
  },
  cues: (ctx) => [
    { f: 0, sfx: "pop" },
    { f: ctx.at("move"), sfx: "whoosh" },
    { f: ctx.at("copy"), sfx: "pop" },
    { f: ctx.at("cerebellum"), sfx: "ding" },
  ],
};

const Predict: Scene = {
  render: ({ ctx }) => {
    const frame = useCurrentFrame();
    const me = { x: 300, y: 1080, s: 1.05 };
    const j = rigJoints(poses.stand, me.x, me.y, me.s);
    return (
      <Camera dur={ctx.dur}>
        <Me expression="curious" track={[{ f: 0, pose: "stand" }]} x={me.x} y={me.y} s={me.s} />
        <Pop x={700} y={560} from={2}>
          <ThoughtBubble cx={700} cy={540} rx={310} ry={230} tail={{ x: j.head.x + 60, y: j.head.y - 60 }}>
            <StickFigure pose={squirm(poses.selfTickle, frame, 0.3)} x={700} y={560} scale={0.45} expression="o" wiggle />
          </ThoughtBubble>
        </Pop>
        <Stamp x={720} y={640} text="PREDICTED" from={ctx.at("predict")} />
      </Camera>
    );
  },
  cues: (ctx) => [{ f: 2, sfx: "pop" }, { f: ctx.at("predict"), sfx: "boop" }],
};

const VolumeDown: Scene = {
  render: ({ ctx }) => {
    const down = ctx.at("down");
    const frame = useCurrentFrame();
    const level = interpolate(frame, [down - 6, down + 10], [0.92, 0.1], { ...clamp, easing: (x) => x * x * (3 - 2 * x) });
    return (
      <Camera dur={ctx.dur}>
        <Me expression={frame > down ? "flat" : "neutral"} wiggle track={[{ f: 0, pose: "selfTickle" }]} x={300} y={1080} s={0.95} />
        <Pop x={740} y={860} from={0}>
          <Slider x={740} top={560} bottom={1180} level={level} label="TICKLE" />
        </Pop>
      </Camera>
    );
  },
  cues: (ctx) => [{ f: 0, sfx: "pop" }, { f: ctx.at("down") - 4, sfx: "slidedown" }],
};

const OtherTickle: Scene = {
  render: ({ ctx }) => {
    const frame = useCurrentFrame();
    const friend = { x: 800, y: 1010, s: 1.15 };
    return (
      <Camera dur={ctx.dur}>
        <Me expression="laugh" track={[{ f: 0, pose: "squirm" }]} amt={1} x={400} />
        <StickFigure pose={offset(mirror(poses.tickleOther), { lLower: Math.sin(frame * 1.4) * 10 })} x={friend.x} y={friend.y}
          scale={friend.s} color={theme.blue} expression="smirk" wiggle blinkOffset={40} />
        <Pop x={260} y={480} from={6}><Word x={260} y={500} text="HA" size={110} color={theme.accent} rotate={-14} /></Pop>
        <Pop x={480} y={400} from={14}><Word x={480} y={420} text="HA!" size={130} color={theme.accent} rotate={10} /></Pop>
      </Camera>
    );
  },
  cues: () => [{ f: 4, sfx: "giggle" }, { f: 16, sfx: "giggle", volume: 0.7 }],
};

const FlatSelf: Scene = {
  render: ({ ctx }) => (
    <Camera z={1.1} fy={860} dur={ctx.dur}>
      <Me expression="flat" wiggle track={[{ f: 0, pose: "selfTickle" }]} />
      <Pop x={830} y={560} from={ctx.at("barely")}>
        <Word x={830} y={580} text="meh." size={96} color={theme.ink} rotate={8} />
      </Pop>
    </Camera>
  ),
  cues: (ctx) => [{ f: ctx.at("barely"), sfx: "boop" }],
};

/** Person on a handle at left, robot tickler at right. The robot copies the handle `delay` frames late. */
const RobotRig: React.FC<{ ctx: SceneCtx; delay: (f: number) => number; amt: (f: number) => number; expression: (f: number) => Expression; badge?: React.ReactNode; moveFrom?: number }> = ({
  ctx, delay, amt, expression, badge, moveFrom = 0,
}) => {
  const frame = useCurrentFrame();
  const me = { x: 280, y: 1040, s: 1.05 };
  const handle = (f: number) => (f < moveFrom ? 0 : Math.sin((f - moveFrom) * 0.32));
  const a = amt(frame);
  const pose = squirm(offset(poses.holdHandle, { rUpper: handle(frame) * 14, rLower: -handle(frame) * 10 }), frame, a);
  const j = rigJoints(pose, me.x, me.y, me.s);
  const base = { x: j.r.hand.x + 30, y: me.y + 110 };
  const lag = delay(frame);
  return (
    <>
      <path d={`M ${base.x} ${base.y + 30} C ${base.x + 120} ${base.y + 160}, 600 ${base.y + 160}, 700 ${base.y + 120}`} fill="none" stroke={theme.ink} strokeWidth={8} strokeDasharray="4 14" strokeLinecap="round" />
      <rect x={base.x - 50} y={base.y} width={100} height={40} rx={12} fill={theme.soft} stroke={theme.ink} strokeWidth={10} />
      <line x1={base.x} y1={base.y} x2={j.r.hand.x} y2={j.r.hand.y} stroke={theme.ink} strokeWidth={12} strokeLinecap="round" />
      <circle cx={j.r.hand.x} cy={j.r.hand.y} r={18} fill={theme.accent} stroke={theme.ink} strokeWidth={8} />
      <StickFigure pose={pose} x={me.x} y={me.y - Math.abs(Math.sin(frame * 0.45)) * 18 * a} scale={me.s} expression={expression(frame)} />
      <Pop x={820} y={1050} from={0}>
        <Robot x={820} y={1050} swing={-8 + handle(frame - lag) * 12} reach={380} blink={frame % 60 > 56} />
      </Pop>
      {badge}
      {a > 0.3 && <MotionLines x={me.x + 60} y={me.y - 150} color={theme.accent} />}
    </>
  );
};

const RobotScene: Scene = {
  render: ({ ctx }) => {
    const second = ctx.lineStart(1);
    const frame = useCurrentFrame();
    // A punch-in on the second line keeps the long shot moving.
    const z = frame >= second ? 1.18 : 1;
    return (
      <Camera z={z} fx={560} fy={900} dur={ctx.dur}>
        <RobotRig ctx={ctx} delay={() => 0} amt={() => 0} moveFrom={ctx.at("moved")}
          expression={(f) => (f >= ctx.at("tickled") ? "o" : "neutral")} />
      </Camera>
    );
  },
  cues: (ctx) => [{ f: 0, sfx: "boop" }, { f: ctx.at("handle"), sfx: "whoosh", volume: 0.5 }],
};

const RobotFlat: Scene = {
  render: ({ ctx }) => (
    <Camera dur={ctx.dur}>
      <RobotRig ctx={ctx} delay={() => 0} amt={() => 0} expression={() => "flat"}
        badge={<Pop x={540} y={330} from={0}><ClockBadge x={540} y={330} text="DELAY 0.0s" /></Pop>} />
    </Camera>
  ),
  cues: () => [{ f: 0, sfx: "tick" }],
};

const Delay: Scene = {
  render: ({ ctx }) => {
    const lag = ctx.at("lag");
    const back = ctx.at("back");
    const tickle = ctx.at("tickle");
    const frame = useCurrentFrame();
    const late = frame >= lag;
    return (
      <Camera dur={ctx.dur}>
        <RobotRig ctx={ctx} delay={(f) => (f >= lag ? 6 : 0)}
          amt={(f) => interpolate(f, [tickle, back + 6], [0, 1], clamp)}
          expression={(f) => (f >= back ? "laugh" : f >= tickle ? "o" : "flat")}
          badge={
            <Pop x={540} y={330} from={late ? lag : 0}>
              <ClockBadge x={540} y={330} text={late ? "DELAY 0.2s" : "DELAY 0.0s"} fill={late ? theme.yellow : "#fff"} spin={late ? frame * 12 : 0} />
            </Pop>
          } />
      </Camera>
    );
  },
  cues: (ctx) => [{ f: ctx.at("lag"), sfx: "tick" }, { f: ctx.at("lag") + 6, sfx: "tick" }, { f: ctx.at("back"), sfx: "giggle" }],
};

const Ending: Scene = {
  render: ({ ctx }) => {
    const frame = useCurrentFrame();
    const coming = ctx.at("coming");
    const j = rigJoints(poses.pointHead, ME.x, ME.y, ME.s);
    const float = Math.sin(frame * 0.12) * 10;
    const bob = usePop(2);
    return (
      <Camera dur={ctx.dur}>
        <Me expression={frame >= coming ? "smirk" : "neutral"} track={[{ f: 0, pose: "stand" }, { f: 3, pose: "pointHead", ease: 8 }]} />
        <g transform={`translate(0 ${float})`} opacity={bob}>
          <Brain x={j.head.x + 250} y={j.head.y - 230} scale={0.5} eyes={frame >= coming ? "wink" : "open"} />
        </g>
      </Camera>
    );
  },
  cues: (ctx) => [{ f: 2, sfx: "pop" }, { f: ctx.at("coming"), sfx: "ding" }],
};

export const scenes: Record<string, Scene> = {
  selfTickle: SelfTickle,
  wait: Wait,
  shrug: Shrug,
  headZoom: HeadZoom,
  brainCopy: BrainCopy,
  predict: Predict,
  volumeDown: VolumeDown,
  otherTickle: OtherTickle,
  flatSelf: FlatSelf,
  robot: RobotScene,
  robotFlat: RobotFlat,
  delay: Delay,
  ending: Ending,
};
