import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PhoneShell } from "../mockups/PhoneShell";

type Chat = {
  initials: string;
  name: string;
  preview: string;
  time: string;
  colour: string;
  appearAt: number; // seconds
  finalUnread: number;
};

const CHATS: Chat[] = [
  { initials: "AE", name: "Amaka E.", preview: "Can I book braids for Saturday?", time: "now", colour: "#0ea5e9", appearAt: 0.0, finalUnread: 3 },
  { initials: "TB", name: "Tunde B.", preview: "How much for locs retouch?", time: "1m", colour: "#f97316", appearAt: 0.3, finalUnread: 2 },
  { initials: "ZY", name: "Zainab Yusuf", preview: "Are you open on Sunday??", time: "3m", colour: "#a855f7", appearAt: 0.6, finalUnread: 5 },
  { initials: "MB", name: "Mrs Balogun", preview: "Pls what time tomorrow?", time: "8m", colour: "#22c55e", appearAt: 1.0, finalUnread: 1 },
  { initials: "EO", name: "Emeka Obi", preview: "Sent the transfer 👍", time: "12m", colour: "#ef4444", appearAt: 1.3, finalUnread: 4 },
  { initials: "IN", name: "Ifeoma N.", preview: "Wig install — do you have slots?", time: "20m", colour: "#111827", appearAt: 1.7, finalUnread: 2 },
  { initials: "DO", name: "Dapo O.", preview: "Barbing for me and my 2 boys", time: "32m", colour: "#eab308", appearAt: 2.0, finalUnread: 6 },
  { initials: "SA", name: "Sade A.", preview: "🎉 Love the new colour!!", time: "1h", colour: "#ec4899", appearAt: 2.4, finalUnread: 1 },
  { initials: "UM", name: "Uche M.", preview: "Did you see my message from yesterday?", time: "2h", colour: "#06b6d4", appearAt: 2.7, finalUnread: 2 },
  { initials: "LB", name: "Lekan B.", preview: "Trying to rebook — no reply 😕", time: "3h", colour: "#8b5cf6", appearAt: 3.0, finalUnread: 8 },
];

export const WhatsAppOverflow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const isPortrait = height > width;
  const phoneScale = isPortrait ? 1.75 : 1.35;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <PhoneShell scale={phoneScale}>
        <div
          style={{
            background: "#075E54",
            color: "#fff",
            padding: "44px 16px 12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>WhatsApp</div>
            <TotalUnreadCounter chats={CHATS} t={t} />
          </div>
          <div
            style={{
              marginTop: 10,
              background: "rgba(255,255,255,0.16)",
              borderRadius: 10,
              padding: "6px 12px",
              fontSize: 13,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            Search
          </div>
        </div>
        <div style={{ flex: 1, background: "#fff", overflow: "hidden" }}>
          {CHATS.map((chat) => (
            <ChatRow key={chat.name} chat={chat} t={t} />
          ))}
        </div>
      </PhoneShell>
    </AbsoluteFill>
  );
};

const TotalUnreadCounter: React.FC<{ chats: Chat[]; t: number }> = ({ chats, t }) => {
  const total = chats.reduce((sum, c) => {
    if (t < c.appearAt) return sum;
    const eased = Math.min(1, (t - c.appearAt) / 0.35);
    return sum + Math.round(c.finalUnread * eased);
  }, 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}>
      <span style={{ opacity: 0.75 }}>Unread</span>
      <span
        style={{
          background: "#25D366",
          color: "#075E54",
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 14,
          minWidth: 32,
          textAlign: "center",
        }}
      >
        {total}
      </span>
    </div>
  );
};

const ChatRow: React.FC<{ chat: Chat; t: number }> = ({ chat, t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appearFrame = Math.round(chat.appearAt * fps);
  const enter = spring({ frame: frame - appearFrame, fps, config: { damping: 20, stiffness: 100 } });
  if (frame < appearFrame - 2) return null;
  const translateY = (1 - enter) * -30;
  const unreadT = Math.max(0, t - chat.appearAt);
  const unreadCount = Math.min(chat.finalUnread, Math.max(1, Math.round(unreadT / 0.28) + 1));
  const unreadPulse = spring({ frame: frame - appearFrame - 4, fps, config: { damping: 12, stiffness: 200 } });
  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          background: chat.colour,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {chat.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>{chat.name}</div>
          <div style={{ fontSize: 11, color: "#25D366", fontWeight: 600 }}>{chat.time}</div>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#64748b",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {chat.preview}
        </div>
      </div>
      <div
        style={{
          background: "#25D366",
          color: "#fff",
          fontWeight: 700,
          fontSize: 12,
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 6px",
          transform: `scale(${0.9 + unreadPulse * 0.2})`,
        }}
      >
        {unreadCount}
      </div>
    </div>
  );
};
