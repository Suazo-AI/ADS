import { Easing, interpolate } from "remotion";

// Joint angles in degrees. Limbs: 0 = hanging straight down, positive swings
// toward screen-right. Torso: 0 = upright, positive leans screen-right.
// Arms hang from the torso, so their angles are relative to it; forearms and
// shins are relative to their upper limb. "L"/"R" mean screen-left/right.
export type Pose = {
  torso: number;
  head: number;
  lUpper: number;
  lLower: number;
  rUpper: number;
  rLower: number;
  lThigh: number;
  lShin: number;
  rThigh: number;
  rShin: number;
};

export const poses = {
  stand: { torso: 0, head: 0, lUpper: -15, lLower: -5, rUpper: 15, rLower: 5, lThigh: -8, lShin: 0, rThigh: 8, rShin: 0 },
  flat: { torso: 0, head: -6, lUpper: -10, lLower: 0, rUpper: 10, rLower: 0, lThigh: -6, lShin: 0, rThigh: 6, rShin: 0 },
  selfTickle: { torso: 0, head: 4, lUpper: -60, lLower: 122, rUpper: 60, rLower: -122, lThigh: -8, lShin: 0, rThigh: 8, rShin: 0 },
  shrug: { torso: 0, head: 10, lUpper: -42, lLower: -80, rUpper: 42, rLower: 80, lThigh: -8, lShin: 0, rThigh: 8, rShin: 0 },
  squirm: { torso: 8, head: -12, lUpper: -55, lLower: 120, rUpper: 62, rLower: -118, lThigh: -4, lShin: 18, rThigh: 16, rShin: -12 },
  tickleOther: { torso: 10, head: 6, lUpper: 62, lLower: 22, rUpper: 78, rLower: 12, lThigh: -10, lShin: 0, rThigh: 12, rShin: 0 },
  holdHandle: { torso: 2, head: 0, lUpper: -15, lLower: -5, rUpper: 55, rLower: 35, lThigh: -8, lShin: 0, rThigh: 8, rShin: 0 },
  pointHead: { torso: 0, head: -8, lUpper: -15, lLower: -5, rUpper: 97, rLower: 105, lThigh: -8, lShin: 0, rThigh: 8, rShin: 0 },
  armsUp: { torso: 0, head: 0, lUpper: -150, lLower: -10, rUpper: 150, rLower: 10, lThigh: -12, lShin: 0, rThigh: 12, rShin: 0 },
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof poses;

const keys = Object.keys(poses.stand) as (keyof Pose)[];

export const blend = (a: Pose, b: Pose, t: number): Pose =>
  Object.fromEntries(keys.map((k) => [k, a[k] + (b[k] - a[k]) * t])) as Pose;

export const offset = (p: Pose, d: Partial<Pose>): Pose =>
  Object.fromEntries(keys.map((k) => [k, p[k] + (d[k] ?? 0)])) as Pose;

/** Same pose facing the other way: swap sides and negate every angle. */
export const mirror = (p: Pose): Pose => ({
  torso: -p.torso, head: -p.head,
  lUpper: -p.rUpper, lLower: -p.rLower, rUpper: -p.lUpper, rLower: -p.lLower,
  lThigh: -p.rThigh, lShin: -p.rShin, rThigh: -p.lThigh, rShin: -p.lShin,
});

/** Procedural wriggle layered on any pose; `amt` 0..1. */
export const squirm = (p: Pose, frame: number, amt: number): Pose =>
  offset(p, {
    torso: Math.sin(frame * 0.9) * 9 * amt,
    head: Math.sin(frame * 0.9 + 1) * 12 * amt,
    lLower: Math.sin(frame * 1.1) * 18 * amt,
    rLower: -Math.sin(frame * 1.1 + 0.5) * 18 * amt,
    lShin: Math.max(0, Math.sin(frame * 0.6)) * 20 * amt,
    rShin: -Math.max(0, Math.sin(frame * 0.6 + Math.PI)) * 20 * amt,
  });

// A pose track: hold each pose from its frame, easing into it over `ease` frames.
export type PoseKey = { f: number; pose: PoseName; ease?: number };

export const poseAt = (track: PoseKey[], frame: number): Pose => {
  let current: Pose = poses[track[0].pose];
  for (let i = 1; i < track.length; i++) {
    const k = track[i];
    if (frame < k.f) break;
    const t = interpolate(frame, [k.f, k.f + (k.ease ?? 6)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.6)),
    });
    current = blend(current, poses[k.pose], t);
  }
  return current;
};
