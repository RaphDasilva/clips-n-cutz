import {
  AbsoluteFill,
  OffthreadVideo,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { WhatsAppChat } from "./mockups/WhatsAppChat";
import { CHATS, cutawaySeconds } from "./mockups/chats";
import type { Manifest, Scene } from "../lib/scene-manifest";
import { FPS } from "./timeline";

// Vertical reel — the five beats the brief asks for:
// walk-in, WhatsApp booking conversation, WhatsApp enquiry,
// owner financial suite, 7-day follow-up.

type Beat =
  | { kind: "intro"; seconds: number; title: string; subtitle: string }
  | { kind: "chat"; id: string; headline: string; subhead: string }
  | { kind: "video"; slug: string; seconds: number; headline: string; subhead: string }
  | { kind: "outro"; seconds: number; title: string; cta: string };

const BEATS: Beat[] = [
  {
    kind: "intro",
    seconds: 3,
    title: "Clips N'Cutz",
    subtitle: "A Lagos salon that never forgets a client.",
  },
  {
    kind: "video",
    slug: "02-walkin",
    seconds: 12,
    headline: "Walk-ins logged in 30 seconds",
    subhead: "Client, visit and commission — captured on the spot.",
  },
  {
    kind: "chat",
    id: "wa-book-convo",
    headline: "Clients book right inside WhatsApp",
    subhead: "Ask, pick a slot, confirmed — all in the chat.",
  },
  {
    kind: "chat",
    id: "wa-enquiry",
    headline: "Questions answered instantly",
    subhead: "Prices, opening hours — no call needed.",
  },
  {
    kind: "video",
    slug: "16-owner-reports",
    seconds: 12,
    headline: "The owner sees every naira",
    subhead: "Net profit, payouts and reports — computed automatically.",
  },
  {
    kind: "chat",
    id: "wa-followup",
    headline: "7 days later — the follow-up sends itself",
    subhead: "Every visit becomes the next booking.",
  },
  {
    kind: "outro",
    seconds: 3,
    title: "Built by LVD Labs",
    cta: "DM us to build yours",
  },
];

function beatSeconds(beat: Beat): number {
  if (beat.kind === "chat") return cutawaySeconds(beat.id);
  return beat.seconds;
}

export function verticalTotalSeconds(_manifest: Manifest): number {
  return BEATS.reduce((s, b) => s + beatSeconds(b), 0);
}

type Props = {
  manifest: Manifest;
};

export const DemoVertical: React.FC<Props> = ({ manifest }) => {
  const sceneBySlug = new Map(manifest.scenes.map((s) => [s.slug, s]));
  return (
    <AbsoluteFill style={{ background: "#090909" }}>
      <Series>
        {BEATS.map((beat, i) => {
          const frames = Math.round(beatSeconds(beat) * FPS);
          return (
            <Series.Sequence key={i} durationInFrames={frames}>
              <AbsoluteFill>
                {beat.kind === "intro" ? (
                  <VerticalIntro title={beat.title} subtitle={beat.subtitle} />
                ) : beat.kind === "outro" ? (
                  <VerticalOutro title={beat.title} cta={beat.cta} />
                ) : beat.kind === "chat" ? (
                  <VerticalBeat headline={beat.headline} subhead={beat.subhead}>
                    <ChatBody id={beat.id} />
                  </VerticalBeat>
                ) : (
                  <VerticalBeat headline={beat.headline} subhead={beat.subhead} dark>
                    <VideoBody scene={sceneBySlug.get(beat.slug)} />
                  </VerticalBeat>
                )}
              </AbsoluteFill>
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};

const ChatBody: React.FC<{ id: string }> = ({ id }) => {
  const def = CHATS[id];
  if (!def) return null;
  return (
    <WhatsAppChat
      scale={1.35}
      contactName={def.contactName}
      contactSubtitle={def.contactSubtitle}
      revealDelayMs={def.revealDelayMs}
      messages={def.messages}
    />
  );
};

const VideoBody: React.FC<{ scene: Scene | undefined }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (!scene) return null;
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width: 990,
        height: 557,
        borderRadius: 24,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        transform: `scale(${zoom})`,
      }}
    >
      <OffthreadVideo
        src={staticFile(scene.videoPath)}
        muted
        startFrom={Math.round(1.5 * FPS)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
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
  dark?: boolean;
  children: React.ReactNode;
}> = ({ headline, subhead, dark = false, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const headlineFade = interpolate(frame, [4, 20], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: dark
          ? "linear-gradient(180deg, #090909 0%, #1b160c 100%)"
          : "linear-gradient(180deg, #f7f4ec 0%, #e6ddc8 100%)",
      }}
    >
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
              color: dark ? "#ffffff" : "#111111",
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
              color: dark ? "#a39272" : "#6b6045",
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
          {children}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
