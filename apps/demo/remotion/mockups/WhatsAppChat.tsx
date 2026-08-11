import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PhoneShell } from "./PhoneShell";

export type ChatMessage = {
  from: "them" | "me";
  body: string;
  time: string;
};

type Props = {
  contactName: string;
  contactSubtitle?: string;
  messages: ChatMessage[];
  scale?: number;
  revealDelayMs?: number;
  /** Live composition: outgoing messages are typed char-by-char in the
   *  input bar before being "sent" up into a bubble. Default on. */
  composeOutgoing?: boolean;
};

const HEADER_HEIGHT = 88;
const TYPING_MS = 1200; // incoming three-dot indicator
const READ_PAUSE_MS = 1100; // beat after an incoming bubble lands
const SEND_PAUSE_MS = 800; // beat after an outgoing bubble lands
const CHAR_MS = 55; // outgoing typing speed in the input bar
const MIN_TYPE_MS = 900;
const MAX_TYPE_MS = 4200;

function outgoingTypeMs(body: string): number {
  return Math.min(MAX_TYPE_MS, Math.max(MIN_TYPE_MS, body.length * CHAR_MS));
}

type Step = {
  msg: ChatMessage;
  /** ms when the bubble appears */
  bubbleAt: number;
  /** for incoming: dots start; for outgoing: typing starts */
  leadAt: number;
};

function buildSchedule(
  messages: ChatMessage[],
  revealDelayMs: number,
): { steps: Step[]; totalMs: number } {
  let t = revealDelayMs;
  const steps: Step[] = [];
  for (const msg of messages) {
    if (msg.from === "them") {
      const leadAt = t;
      const bubbleAt = t + TYPING_MS;
      steps.push({ msg, leadAt, bubbleAt });
      t = bubbleAt + READ_PAUSE_MS;
    } else {
      const typeMs = outgoingTypeMs(msg.body);
      const leadAt = t;
      const bubbleAt = t + typeMs;
      steps.push({ msg, leadAt, bubbleAt });
      t = bubbleAt + SEND_PAUSE_MS;
    }
  }
  return { steps, totalMs: t };
}

/** Seconds a chat needs to fully play out (+ a settle tail). Used by the
 *  Root to size each cutaway composition so nothing gets clipped. */
export function chatDurationSeconds(messages: ChatMessage[], revealDelayMs = 1000): number {
  return buildSchedule(messages, revealDelayMs).totalMs / 1000 + 2.2;
}

const TypingDots: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
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
  composeOutgoing = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const { steps } = buildSchedule(messages, revealDelayMs);

  // What's currently in the input bar (an outgoing message mid-type)?
  let composing = "";
  let composingCursor = false;
  if (composeOutgoing) {
    for (const step of steps) {
      if (step.msg.from === "me" && ms >= step.leadAt && ms < step.bubbleAt) {
        const progress = (ms - step.leadAt) / (step.bubbleAt - step.leadAt);
        const chars = Math.max(0, Math.floor(step.msg.body.length * progress));
        composing = step.msg.body.slice(0, chars);
        composingCursor = true;
      }
    }
  }

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
          justifyContent: "flex-end",
          gap: 8,
          overflow: "hidden",
        }}
      >
        {steps.map((step, idx) => {
          const isIncoming = step.msg.from === "them";
          const bubbleAtFrame = (step.bubbleAt / 1000) * fps;

          if (isIncoming && ms >= step.leadAt && ms < step.bubbleAt) {
            return <TypingDots key={`typing-${idx}`} />;
          }
          if (ms < step.bubbleAt) return null;

          const enter = interpolate(frame, [bubbleAtFrame, bubbleAtFrame + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateY = interpolate(frame, [bubbleAtFrame, bubbleAtFrame + 12], [10, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: step.msg.from === "me" ? "flex-end" : "flex-start",
                opacity: enter,
                transform: `translateY(${translateY}px)`,
              }}
            >
              <div
                style={{
                  background: step.msg.from === "me" ? "#DCF8C6" : "#fff",
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
                {step.msg.body}
                <div
                  style={{
                    fontSize: 10,
                    color: "#7d8b95",
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {step.msg.time}
                  {step.msg.from === "me" ? "  ✓✓" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {composeOutgoing ? (
        <div
          style={{
            background: "#F0F0F0",
            padding: "8px 10px 14px",
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 22,
              padding: "10px 16px",
              fontSize: 14,
              color: composing ? "#111" : "#9aa5ad",
              minHeight: 22,
              lineHeight: 1.35,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {composing || "Message"}
            {composingCursor ? (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 15,
                  background: "#075E54",
                  marginLeft: 1,
                  verticalAlign: "text-bottom",
                  opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
                }}
              />
            ) : null}
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              background: "#25D366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            ➤
          </div>
        </div>
      ) : null}
    </PhoneShell>
  );
};
