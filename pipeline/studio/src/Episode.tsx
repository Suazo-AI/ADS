import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, type CalculateMetadataFunction } from "remotion";
import { Captions } from "./Captions";
import { scenes, type SceneCtx } from "./scenes";
import { theme } from "./theme";

export type Line = { index: number; beat: string; scene: string; text: string; start: number; end: number };
export type Word = { text: string; line: number; start: number; end: number };
export type EpisodeProps = { episodeId: string; lines?: Line[]; words?: Word[]; duration?: number };

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

/** Load the files written by tools/tts.py and tools/align.py; size the video to the voiceover. */
export const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const base = `episodes/${props.episodeId}`;
  const [timeline, words, episode] = await Promise.all(
    ["timeline.json", "words.json", "episode.json"].map((f) => fetch(staticFile(`${base}/${f}`)).then((r) => r.json())),
  );
  const { fps, width, height } = episode.format;
  return {
    fps, width, height,
    durationInFrames: Math.ceil(timeline.duration * fps),
    props: { ...props, lines: timeline.lines, words: words.words, duration: timeline.duration },
  };
};

type Shot = { scene: string; lines: Line[]; from: number; dur: number };

const toShots = (lines: Line[], fps: number, total: number): Shot[] => {
  const shots: Shot[] = [];
  for (const l of lines) {
    const last = shots[shots.length - 1];
    if (last && last.scene === l.scene) last.lines.push(l);
    else shots.push({ scene: l.scene, lines: [l], from: shots.length ? Math.round(l.start * fps) : 0, dur: 0 });
  }
  shots.forEach((s, i) => (s.dur = (shots[i + 1]?.from ?? total) - s.from));
  return shots;
};

export const Episode: React.FC<EpisodeProps> = ({ episodeId, lines = [], words = [], duration = 0 }) => {
  const fps = 30;
  const total = Math.ceil(duration * fps);
  const shots = toShots(lines, fps, total);
  return (
    <AbsoluteFill style={{ background: theme.paper }}>
      {shots.map((shot, i) => {
        const scene = scenes[shot.scene];
        if (!scene) throw new Error(`Unknown scene "${shot.scene}"`);
        const idx = new Set(shot.lines.map((l) => l.index));
        const shotWords = words.filter((w) => idx.has(w.line));
        const ctx: SceneCtx = {
          dur: shot.dur,
          at: (word, nth = 0) => {
            const hits = shotWords.filter((w) => norm(w.text) === norm(word));
            if (!hits[nth]) throw new Error(`"${word}" #${nth} not spoken in scene "${shot.scene}"`);
            return Math.round(hits[nth].start * fps) - shot.from;
          },
          lineStart: (k) => Math.round(shot.lines[k].start * fps) - shot.from,
        };
        const Render = scene.render;
        return (
          <Sequence key={i} from={shot.from} durationInFrames={shot.dur} name={`${shot.scene}`}>
            <AbsoluteFill>
              <svg width={1080} height={1920} viewBox="0 0 1080 1920">
                <Render ctx={ctx} />
              </svg>
            </AbsoluteFill>
            {(scene.cues?.(ctx) ?? []).map((c, k) => (
              <Sequence key={k} from={Math.max(0, c.f)} layout="none">
                <Audio src={staticFile(`sfx/${c.sfx}.wav`)} volume={c.volume ?? 0.8} />
              </Sequence>
            ))}
          </Sequence>
        );
      })}
      <Captions words={words} />
      <Audio src={staticFile(`episodes/${episodeId}/voice.wav`)} />
    </AbsoluteFill>
  );
};
