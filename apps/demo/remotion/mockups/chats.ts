import { chatDurationSeconds, type ChatMessage } from "./WhatsAppChat";

// Every WhatsApp cutaway in one place, so the Root can size each
// composition to exactly how long the conversation takes to play out.
// All names fictional. "me" = the client's side of the chat.

export type ChatDef = {
  caption: string;
  contactName: string;
  contactSubtitle?: string;
  revealDelayMs: number;
  messages: ChatMessage[];
};

export const CHATS: Record<string, ChatDef> = {
  // Client opens WhatsApp and books end-to-end in the chat.
  "wa-book-convo": {
    caption: "A client books the whole appointment inside WhatsApp",
    contactName: "Clips N'Cutz",
    contactSubtitle: "online",
    revealDelayMs: 900,
    messages: [
      { from: "me", body: "Good morning! Do you have a free slot for medium braids this Saturday?", time: "10:02" },
      {
        from: "them",
        body: "Good morning! 😊 Yes — Saturday we have 11:00 AM or 2:00 PM free for Medium Braids (₦40,000). Which works for you?",
        time: "10:03",
      },
      { from: "me", body: "11am please, for Chidera", time: "10:04" },
      {
        from: "them",
        body: "Booked ✅\n\n📅 Saturday, 11:00 AM\n💇 Medium Braids — ₦40,000\n👤 Chidera\n\nYou'll get a reminder the day before. See you soon!\n— Clips N'Cutz Unisex Salon",
        time: "10:04",
      },
    ],
  },

  // Client asks a question, gets a helpful answer.
  "wa-enquiry": {
    caption: "Questions get answered right in the chat",
    contactName: "Clips N'Cutz",
    contactSubtitle: "online",
    revealDelayMs: 900,
    messages: [
      { from: "me", body: "Hello, how much is barbing? And what time do you open on Sundays?", time: "16:40" },
      {
        from: "them",
        body: "Hi! 👋 Barbing is ₦3,500 (Barb & Dye ₦6,000).\n\nWe're open Sundays from 12:00 PM. Walk in any time or book a slot here 👇\nclipncutz.com/book",
        time: "16:41",
      },
      { from: "me", body: "Thanks! I'll come Sunday 🙌", time: "16:42" },
      { from: "them", body: "Perfect — see you Sunday! ✂️", time: "16:42" },
    ],
  },

  "wa-booking-confirmation": {
    caption: "The client's WhatsApp — seconds after booking",
    contactName: "Clips N'Cutz",
    contactSubtitle: "online",
    revealDelayMs: 1200,
    messages: [
      {
        from: "them",
        body: "Hi Chidera! Your appointment at Clips N'Cutz is confirmed 🎉\n\n📅 Thursday, 2:00 PM\n💇 Medium Braids — ₦40,000\n\nSee you soon!\n— Clips N'Cutz Unisex Salon, Lagos",
        time: "14:03",
      },
      { from: "me", body: "Thank you! See you Thursday 🙌", time: "14:05" },
    ],
  },

  "wa-reminder": {
    caption: "…and a reminder the day before, automatically",
    contactName: "Clips N'Cutz",
    contactSubtitle: "online",
    revealDelayMs: 1200,
    messages: [
      {
        from: "them",
        body: "Hi Chidera — friendly reminder: your appointment is tomorrow at 2:00 PM for Medium Braids.\n\nNeed to change it? Just reply here.\n— Clips N'Cutz",
        time: "09:00",
      },
      { from: "me", body: "Perfect, I'll be there 👍", time: "09:12" },
    ],
  },

  "wa-followup": {
    caption: "7 days after the visit — the follow-up sends itself",
    contactName: "Clips N'Cutz",
    contactSubtitle: "online",
    revealDelayMs: 1200,
    messages: [
      {
        from: "them",
        body: "Hi Adaeze, hope you loved your fresh cut ✂️✨\n\nReady for your next appointment? Book here 👇\nclipncutz.com/book\n\n— Clips N'Cutz Unisex Salon",
        time: "10:00",
      },
      { from: "me", body: "Booking for Saturday now 😍", time: "10:14" },
    ],
  },
};

export const CHAT_IDS = Object.keys(CHATS);

export function cutawaySeconds(id: string): number {
  const def = CHATS[id];
  if (!def) return 8;
  return Math.max(8, chatDurationSeconds(def.messages, def.revealDelayMs));
}
