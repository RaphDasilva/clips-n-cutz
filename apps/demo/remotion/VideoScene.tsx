import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Caption } from "../lib/scene-manifest";

type Props = {
  videoPath: string;
  captions: Caption[];
};

const CAPTION_HOLD_SECONDS = 3.6;

export const VideoScene: React.FC<Props> = ({ videoPath, captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;

  const entry = spring({ frame, fps, config: { damping: 22, stiffness: 60 } });
  const scale = 1.03 - entry * 0.03;
  const fade = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const active = captions.find(
    (c) => currentSec >= c.at && currentSec < c.at + CAPTION_HOLD_SECONDS,
  );

  return (
    <AbsoluteFill style={{ background: "#090909" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          opacity: fade,
          transformOrigin: "center center",
        }}
      >
        <OffthreadVideo
          src={staticFile(videoPath)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </AbsoluteFill>
      {active ? <StaticCaption text={active.text} sec={currentSec - active.at} /> : null}
    </AbsoluteFill>
  );
};

// Static caption pill — fade in/out only, no word-by-word animation.
const StaticCaption: React.FC<{ text: string; sec: number }> = ({ text, sec }) => {
  const enter = interpolate(sec, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    sec,
    [CAPTION_HOLD_SECONDS - 0.4, CAPTION_HOLD_SECONDS],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 76,
        left: 60,
        right: 60,
        display: "flex",
        justifyContent: "center",
        opacity: enter * exit,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(9, 9, 9, 0.94)",
          backdropFilter: "blur(6px)",
          color: "white",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 34,
          fontWeight: 500,
          padding: "22px 40px",
          borderRadius: 14,
          maxWidth: 1400,
          textAlign: "center",
          lineHeight: 1.3,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(196,154,60,0.18)",
        }}
      >
        {text}
      </div>
    </div>
  );
};
