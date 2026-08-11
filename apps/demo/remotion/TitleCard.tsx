import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  title: string;
  subtitle: string;
};

// STATIC title card — simple fades only, no kinetic word-by-word.
export const TitleCard: React.FC<Props> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgShift = interpolate(frame, [0, 90], [0, -40], { extrapolateRight: "clamp" });
  const brandBadge = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const accentLine = interpolate(frame, [4, 24], [0, 1], { extrapolateRight: "clamp" });

  const titleFade = interpolate(frame, [6, 26], [0, 1], { extrapolateRight: "clamp" });
  const subtitleFade = interpolate(frame, [22, 42], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY = interpolate(frame, [22, 42], [12, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #090909 0%, #1b160c 60%, #090909 100%)",
        color: "white",
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <BackgroundGrid shift={bgShift} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 160px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "10px 18px",
            borderRadius: 999,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "0.14em",
            marginBottom: 36,
            transform: `translateX(${(1 - brandBadge) * -20}px) scale(${0.9 + brandBadge * 0.1})`,
            opacity: brandBadge,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 5, background: "#C49A3C" }} />
          CLIPS N CUTZ · SALON OS
        </div>

        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: -12,
              left: 0,
              height: 3,
              background: "linear-gradient(90deg, #C49A3C 0%, #8a6a24 100%)",
              width: `${accentLine * 88}px`,
              borderRadius: 2,
            }}
          />
          <h1
            style={{
              fontSize: 110,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: 0,
              lineHeight: 1.02,
              maxWidth: 1500,
              opacity: titleFade,
            }}
          >
            {title}
          </h1>
        </div>

        <p
          style={{
            fontSize: 38,
            color: "#a39272",
            marginTop: 28,
            fontWeight: 400,
            maxWidth: 1400,
            opacity: subtitleFade,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          {subtitle}
        </p>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          bottom: 50,
          right: 90,
          fontSize: 16,
          color: "#6b6045",
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          opacity: interpolate(frame, [30, 55], [0, 0.8], { extrapolateRight: "clamp" }),
        }}
      >
        LVD Labs · Managed AI
      </div>
    </AbsoluteFill>
  );
};

const BackgroundGrid: React.FC<{ shift: number }> = ({ shift }) => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(rgba(196,154,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(196,154,60,0.05) 1px, transparent 1px)",
      backgroundSize: "80px 80px",
      transform: `translate(${shift}px, ${shift}px)`,
      opacity: 0.55,
    }}
  />
);
