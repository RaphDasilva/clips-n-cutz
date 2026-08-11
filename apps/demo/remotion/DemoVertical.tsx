import {
  AbsoluteFill,
  Series,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { WhatsAppChat } from "./mockups/WhatsAppChat";
import { PaperNotebook } from "./problem-brolls/PaperNotebook";
import { WhatsAppOverflow } from "./problem-brolls/WhatsAppOverflow";

type VerticalScene =
  | { kind: "intro"; seconds: number; title: string; subtitle: string }
  | { kind: "beat"; seconds: number; headline: string; subhead: string; body: React.FC }
  | { kind: "outro"; seconds: number; title: string; cta: string };

const VERTICAL_SCENES: VerticalScene[] = [
  {
    kind: "intro",
    seconds: 3,
    title: "Clips N'Cutz",
    subtitle: "A Lagos salon that never forgets a client.",
  },
  {
    kind: "beat",
    seconds: 9,
    headline: "Before: the paper notebook",
    subhead: "Follow-ups forgotten. Clients drift away.",
    body: () => <PaperNotebook />,
  },
  {
    kind: "beat",
    seconds: 9,
    headline: "Bookings buried in one WhatsApp inbox",
    subhead: "Braids requests mixed into everything else.",
    body: () => <WhatsAppOverflow />,
  },
  {
    kind: "beat",
    seconds: 11,
    headline: "Now: clients book online",
    subhead: "WhatsApp confirmation lands in seconds.",
    body: () => (
      <WhatsAppChat
        scale={1.35}
        contactName="Clips N'Cutz"
        contactSubtitle="online"
        revealDelayMs={1400}
        messages={[
          {
            from: "them",
            body: "Hi Chidera! Your appointment is confirmed 🎉\n\n📅 Thursday, 2:00 PM\n💇 Medium Braids — ₦40,000\n\n— Clips N'Cutz",
            time: "14:03",
          },
          { from: "me", body: "Thank you! See you Thursday 🙌", time: "14:05" },
        ]}
      />
    ),
  },
  {
    kind: "beat",
    seconds: 11,
    headline: "7 days later — the follow-up sends itself",
    subhead: "Every visit becomes the next booking.",
    body: () => (
      <WhatsAppChat
        scale={1.35}
        contactName="Clips N'Cutz"
        contactSubtitle="online"
        revealDelayMs={1400}
        messages={[
          {
            from: "them",
            body: "Hi Adaeze, hope you loved your fresh cut ✂️✨\n\nReady for your next appointment? Book here 👇\nclipncutz.com/book",
            time: "10:00",
          },
          { from: "me", body: "Booking for Saturday now 😍", time: "10:14" },
        ]}
      />
    ),
  },
  {
    kind: "beat",
    seconds: 10,
    headline: "Reminders go out automatically",
    subhead: "No-shows drop. The chair stays busy.",
    body: () => (
      <WhatsAppChat
        scale={1.35}
        contactName="Clips N'Cutz"
        contactSubtitle="online"
        revealDelayMs={1400}
        messages={[
          {
            from: "them",
            body: "Hi Chidera — reminder: your appointment is tomorrow at 2:00 PM for Medium Braids. Reply here to change it. — Clips N'Cutz",
            time: "09:00",
          },
          { from: "me", body: "Perfect, I'll be there 👍", time: "09:12" },
        ]}
      />
    ),
  },
  {
    kind: "outro",
    seconds: 3,
    title: "Built by LVD Labs",
    cta: "DM us to build yours",
  },
];

export const VERTICAL_TOTAL_SECONDS = VERTICAL_SCENES.reduce((s, sc) => s + sc.seconds, 0);

type Props = {
  voiceover: Record<string, { path: string; durationSeconds: number }>;
};

export const DemoVertical: React.FC<Props> = ({ voiceover: _voiceover }) => {
  return (
    <AbsoluteFill style={{ background: "#090909" }}>
      <Series>
        {VERTICAL_SCENES.map((scene, i) => {
          const frames = Math.round(scene.seconds * 30);
          return (
            <Series.Sequence key={i} durationInFrames={frames}>
              <AbsoluteFill>
                {scene.kind === "intro" ? (
                  <VerticalIntro title={scene.title} subtitle={scene.subtitle} />
                ) : scene.kind === "outro" ? (
                  <VerticalOutro title={scene.title} cta={scene.cta} />
                ) : (
                  <VerticalBeat headline={scene.headline} subhead={scene.subhead} Body={scene.body} />
                )}
              </AbsoluteFill>
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};

const VerticalIntro: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #090909 0%, #1b160c 100%)",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "0 60px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.18)",
          padding: "10px 20px",
          borderRadius: 999,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "0.16em",
          marginBottom: 40,
          opacity: enter,
          transform: `translateY(${(1 - enter) * -20}px)`,
        }}
      >
        CLIPS N CUTZ · SALON OS
      </div>
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 30}px)`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 34,
          color: "#a39272",
          marginTop: 24,
          fontWeight: 400,
          maxWidth: 900,
          opacity: interpolate(frame, [12, 28], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};

const VerticalOutro: React.FC<{ title: string; cta: string }> = ({ title, cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #090909 0%, #1b160c 100%)",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        textAlign: "center",
        padding: "0 60px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 88,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          opacity: enter,
          transform: `translateY(${(1 - enter) * 30}px)`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 30,
          display: "inline-block",
          background: "linear-gradient(90deg, #C49A3C, #e0bd6a)",
          color: "#090909",
          padding: "18px 36px",
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 34,
          opacity: interpolate(frame, [12, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {cta}
      </div>
    </AbsoluteFill>
  );
};

const VerticalBeat: React.FC<{
  headline: string;
  subhead: string;
  Body: React.FC;
}> = ({ headline, subhead, Body }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const headlineFade = interpolate(frame, [4, 20], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #f7f4ec 0%, #e6ddc8 100%)" }}>
      <AbsoluteFill
        style={{
          padding: "80px 60px 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", textAlign: "center", marginBottom: 30 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 60,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.08,
              color: "#111111",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              opacity: headlineFade,
            }}
          >
            {headline}
          </h2>
          <p
            style={{
              margin: "18px 0 0",
              fontSize: 30,
              color: "#6b6045",
              fontWeight: 500,
              opacity: interpolate(frame, [24, 40], [0, 1], { extrapolateRight: "clamp" }),
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {subhead}
          </p>
        </div>
        <div
          style={{
            flex: 1,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: interpolate(frame, [12, 28], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${(1 - enter) * 20}px)`,
          }}
        >
          <Body />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
