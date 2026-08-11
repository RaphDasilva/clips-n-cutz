import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { WhatsAppChat } from "./mockups/WhatsAppChat";
import { CHATS } from "./mockups/chats";

const captionBaseStyle = {
  color: "#111111",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 30,
  fontWeight: 600,
  background: "rgba(250, 248, 243, 0.96)",
  padding: "12px 26px",
  borderRadius: 999,
  boxShadow: "0 6px 20px rgba(17,17,17,0.14)",
  zIndex: 5,
  whiteSpace: "nowrap" as const,
};

const CutawayFrame: React.FC<{
  caption: string;
  children: React.ReactNode;
}> = ({ caption, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 70 } });
  const exit = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const backdropShift = interpolate(frame, [0, durationInFrames], [0, -30], {
    extrapolateRight: "clamp",
  });
  const captionTranslate = (1 - enter) * -18;
  const contentTranslate = (1 - enter) * 24;
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f7f4ec 0%, #e6ddc8 100%)",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(196,154,60,0.14) 0px, transparent 45%), radial-gradient(circle at 80% 70%, rgba(17,17,17,0.08) 0px, transparent 45%)",
          transform: `translate(${backdropShift}px, ${backdropShift / 2}px)`,
          opacity: enter,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 50,
          left: "50%",
          transform: `translate(-50%, ${captionTranslate}px)`,
          opacity: enter * exit,
          ...captionBaseStyle,
        }}
      >
        {caption}
      </div>
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${contentTranslate}px)`,
          opacity: enter * exit,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Cutaway: React.FC<{ id: string }> = ({ id }) => {
  const def = CHATS[id];
  if (!def) {
    return (
      <AbsoluteFill
        style={{ background: "#f7f4ec", justifyContent: "center", alignItems: "center" }}
      >
        <div style={{ color: "#9aa5ad" }}>[cutaway not found: {id}]</div>
      </AbsoluteFill>
    );
  }
  return (
    <CutawayFrame caption={def.caption}>
      <WhatsAppChat
        scale={1.12}
        contactName={def.contactName}
        contactSubtitle={def.contactSubtitle}
        revealDelayMs={def.revealDelayMs}
        messages={def.messages}
      />
    </CutawayFrame>
  );
};
