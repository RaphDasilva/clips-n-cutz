import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PhoneShell } from "./PhoneShell";

type Message = {
  from: "them" | "me";
  body: string;
  time: string;
};

type Props = {
  contactName: string;
  contactSubtitle?: string;
  messages: Message[];
  scale?: number;
  revealDelayMs?: number;
  intervalMs?: number;
  /** Show a 3-dot typing indicator for ~1.2s before each incoming bubble. */
  typingIndicator?: boolean;
};

const HEADER_HEIGHT = 88;
const TYPING_MS = 1200;

const TypingDots: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "12px 16px",
          borderRadius: 8,
          display: "flex",
          gap: 5,
          boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
        }}
      >
        {[0, 1, 2].map((i) => {
          const phase = (frame / 8 + i * 0.33) % 1;
          const lift = Math.sin(phase * Math.PI * 2) * 3;
          return (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: "#9aa5ad",
                display: "inline-block",
                transform: `translateY(${-Math.max(0, lift)}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const WhatsAppChat: React.FC<Props> = ({
  contactName,
  contactSubtitle,
  messages,
  scale = 1,
  revealDelayMs = 1000,
  intervalMs = 1600,
  typingIndicator = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const initialDelayFrames = Math.round((revealDelayMs / 1000) * fps);
  const intervalFrames = Math.round((intervalMs / 1000) * fps);
  const typingFrames = Math.round((TYPING_MS / 1000) * fps);

  return (
    <PhoneShell scale={scale}>
      <div
        style={{
          height: HEADER_HEIGHT,
          background: "#075E54",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          padding: "40px 16px 8px",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: "#C49A3C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#111",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {contactName
            .split(/\s+/)
            .slice(0, 2)
            .map((s) => s[0])
            .join("")
            .toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{contactName}</div>
          {contactSubtitle ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>{contactSubtitle}</div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background: "#ECE5DD",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflow: "hidden",
        }}
      >
        {messages.map((msg, idx) => {
          const showAt = initialDelayFrames + idx * intervalFrames;
          const isIncoming = msg.from === "them";
          const typingStart = showAt - typingFrames;

          if (isIncoming && typingIndicator && frame >= typingStart && frame < showAt) {
            return <TypingDots key={`typing-${idx}`} />;
          }
          if (frame < showAt) return null;

          const enter = interpolate(frame, [showAt, showAt + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateY = interpolate(frame, [showAt, showAt + 12], [8, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: msg.from === "me" ? "flex-end" : "flex-start",
                opacity: enter,
                transform: `translateY(${translateY}px)`,
              }}
            >
              <div
                style={{
                  background: msg.from === "me" ? "#DCF8C6" : "#fff",
                  padding: "8px 12px",
                  borderRadius: 8,
                  maxWidth: "82%",
                  fontSize: 14,
                  color: "#111",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.35,
                  boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
                }}
              >
                {msg.body}
                <div
                  style={{
                    fontSize: 10,
                    color: "#7d8b95",
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PhoneShell>
  );
};
