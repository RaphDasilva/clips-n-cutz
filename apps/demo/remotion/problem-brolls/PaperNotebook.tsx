import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type Row = {
  text: string;
  appearAt: number;
  struck?: boolean;
  smudged?: boolean;
};

const ROWS: Row[] = [
  { text: "Amaka — braids?? said she'll come Sat", appearAt: 0.2 },
  { text: "Tunde 0803??? — call back for locs", appearAt: 0.6, smudged: true },
  { text: "Mrs Balogun pedicure — DONE", appearAt: 1.0, struck: true },
  { text: "wig install lady — lost her number", appearAt: 1.4, smudged: true },
  { text: "Emeka barbing — owes ₦500?", appearAt: 1.8 },
  { text: "??? — said follow up next week", appearAt: 2.2, smudged: true },
  { text: "remind Zainab re-touch (forgot again)", appearAt: 2.6 },
];

export const PaperNotebook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 60 } });
  const tilt = isPortrait ? -1.5 : -2.5;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #3f3f46 0%, #27272a 60%, #18181b 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Comic Sans MS', 'Bradley Hand', cursive",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: isPortrait ? 160 : 70,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#fca5a5",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: isPortrait ? 40 : 34,
          fontWeight: 700,
          opacity: interpolate(frame, [Math.round(2.8 * fps), Math.round(3.2 * fps)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          textAlign: "center",
          width: "90%",
        }}
      >
        Clients tracked in a notebook. Follow-ups forgotten.
      </div>

      <div
        style={{
          width: isPortrait ? 860 : 780,
          background: "#fefce8",
          borderRadius: 6,
          padding: "50px 50px 60px 90px",
          boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          transform: `rotate(${tilt}deg) scale(${0.96 + enter * 0.04}) ${isPortrait ? "scale(1.15)" : ""}`,
          opacity: enter,
          position: "relative",
          backgroundImage:
            "repeating-linear-gradient(transparent, transparent 55px, #bfdbfe 55px, #bfdbfe 57px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 64,
            width: 2,
            background: "#fca5a5",
          }}
        />
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "#1e3a8a",
            marginBottom: 20,
            textDecoration: "underline",
          }}
        >
          SALON CLIENTS — AUG
        </div>
        {ROWS.map((row) => {
          const appearFrame = Math.round(row.appearAt * fps);
          const rowEnter = interpolate(frame, [appearFrame, appearFrame + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={row.text}
              style={{
                fontSize: 27,
                color: row.smudged ? "#9ca3af" : "#1e3a8a",
                lineHeight: "57px",
                opacity: rowEnter * (row.smudged ? 0.65 : 1),
                textDecoration: row.struck ? "line-through" : "none",
                filter: row.smudged ? "blur(0.6px)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {row.text}
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            right: 40,
            bottom: 30,
            width: 110,
            height: 110,
            borderRadius: "50%",
            border: "14px solid rgba(180, 83, 9, 0.22)",
            filter: "blur(1px)",
            transform: "rotate(-6deg) scaleX(1.05)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
