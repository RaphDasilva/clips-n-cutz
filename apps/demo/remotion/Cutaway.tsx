import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { WhatsAppChat } from "./mockups/WhatsAppChat";

type CutawayId = "wa-booking-confirmation" | "wa-reminder" | "wa-followup";

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
  switch (id as CutawayId) {
    case "wa-booking-confirmation":
      return (
        <CutawayFrame caption="The client's WhatsApp — seconds after booking">
          <WhatsAppChat
            scale={1.12}
            contactName="Clips N'Cutz"
            contactSubtitle="online"
            revealDelayMs={1600}
            messages={[
              {
                from: "them",
                body: "Hi Chidera! Your appointment at Clips N'Cutz is confirmed 🎉\n\n📅 Thursday, 2:00 PM\n💇 Medium Braids — ₦40,000\n\nSee you soon!\n— Clips N'Cutz Unisex Salon, Lagos",
                time: "14:03",
              },
              { from: "me", body: "Thank you! See you Thursday 🙌", time: "14:05" },
            ]}
          />
        </CutawayFrame>
      );

    case "wa-reminder":
      return (
        <CutawayFrame caption="…and a reminder the day before, automatically">
          <WhatsAppChat
            scale={1.12}
            contactName="Clips N'Cutz"
            contactSubtitle="online"
            revealDelayMs={1600}
            messages={[
              {
                from: "them",
                body: "Hi Chidera — friendly reminder: your appointment is tomorrow at 2:00 PM for Medium Braids.\n\nNeed to change it? Just reply here.\n— Clips N'Cutz",
                time: "09:00",
              },
              { from: "me", body: "Perfect, I'll be there 👍", time: "09:12" },
            ]}
          />
        </CutawayFrame>
      );

    case "wa-followup":
      return (
        <CutawayFrame caption="7 days after the visit — the follow-up sends itself">
          <WhatsAppChat
            scale={1.12}
            contactName="Clips N'Cutz"
            contactSubtitle="online"
            revealDelayMs={1600}
            messages={[
              {
                from: "them",
                body: "Hi Adaeze, hope you loved your fresh cut ✂️✨\n\nReady for your next appointment? Book here 👇\nclipncutz.com/book\n\n— Clips N'Cutz Unisex Salon",
                time: "10:00",
              },
              { from: "me", body: "Booking for Saturday now 😍", time: "10:14" },
            ]}
          />
        </CutawayFrame>
      );

    default:
      return (
        <AbsoluteFill
          style={{ background: "#f7f4ec", justifyContent: "center", alignItems: "center" }}
        >
          <div style={{ color: "#9aa5ad" }}>[cutaway not found: {id}]</div>
        </AbsoluteFill>
      );
  }
};
