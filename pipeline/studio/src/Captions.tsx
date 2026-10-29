import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Word } from "./Episode";
import { theme } from "./theme";

type Chunk = { words: Word[]; start: number; end: number };

/**
 * Split each phrase (text between punctuation, never across lines) into
 * evenly sized captions of at most three words, so a four-word phrase
 * becomes 2+2 instead of 3+1.
 */
export const chunkWords = (words: Word[]): Chunk[] => {
  const phrases: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    if (/[,.?!]$/.test(w.text) || words[i + 1]?.line !== w.line) {
      phrases.push(cur);
      cur = [];
    }
  });
  if (cur.length) phrases.push(cur);
  const chunks: Chunk[] = [];
  for (const p of phrases) {
    const k = Math.ceil(p.length / 3);
    for (let c = 0; c < k; c++) {
      const part = p.slice(Math.round((c * p.length) / k), Math.round(((c + 1) * p.length) / k));
      chunks.push({ words: part, start: part[0].start, end: part[part.length - 1].end });
    }
  }
  // Hold each caption until the next one, unless there is a real pause.
  chunks.forEach((c, i) => {
    const next = chunks[i + 1];
    c.end = next && next.start - c.end < 0.4 ? next.start : c.end + 0.25;
  });
  return chunks;
};

export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const chunks = React.useMemo(() => chunkWords(words), [words]);
  const chunk = chunks.find((c) => t >= c.start && t < c.end);
  if (!chunk) return null;
  return (
    <div style={{ position: "absolute", top: 1430, left: 50, right: 50, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 28px" }}>
      {chunk.words.map((w, i) => {
        const active = t >= w.start;
        const pop = interpolate(t - w.start, [0, 0.08, 0.16], [0.85, 1.08, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span key={i} style={{
            fontFamily: theme.font, fontWeight: 900, fontSize: 104, lineHeight: 1.15, textTransform: "uppercase",
            color: active ? theme.accent : theme.ink, WebkitTextStroke: "16px #fff", paintOrder: "stroke fill",
            transform: `scale(${active ? pop : 1})`, display: "inline-block",
          }}>
            {w.text.replace(/[,.]$/, "")}
          </span>
        );
      })}
    </div>
  );
};
