import type { Manifest, Scene } from "../lib/scene-manifest";
import { cutawaySeconds } from "./mockups/chats";

// ── Shared landscape timeline math ───────────────────────────
// Used by both Root (total duration) and Demo (per-scene layout)
// so the two can never disagree.

export const FPS = 30;
export const TITLE_SECONDS = 2.8;
export const INTRO_OUTRO_MIN_SECONDS = 5;
export const VIDEO_TAIL_TRIM_SECONDS = 4;

export type VoMap = Record<string, { path: string; durationSeconds: number }>;

/** WhatsApp cutaways attached to the END of a recorded scene. */
export const CUTAWAYS: Record<string, string[]> = {
  "02-walkin": ["wa-followup"],
  "03-booking": ["wa-booking-confirmation", "wa-reminder"],
};

/** A scene with no dashboard footage — pure mockup theatre.
 *  Inserted into the sequence at its `order` position. */
export type MockupScene = {
  slug: string;
  order: number;
  title: string;
  subtitle: string;
  cutaways: string[];
};

export const MOCKUP_SCENES: MockupScene[] = [
  {
    slug: "04-whatsapp",
    order: 4,
    title: "The Salon's WhatsApp Front Desk",
    subtitle: "Clients book and ask questions right in the chat",
    cutaways: ["wa-book-convo", "wa-enquiry"],
  },
];

export type TimelineItem =
  | { kind: "video"; scene: Scene; cutaways: string[] }
  | { kind: "mockups"; scene: MockupScene };

export function buildTimeline(manifest: Manifest): TimelineItem[] {
  const items: TimelineItem[] = manifest.scenes.map((scene) => ({
    kind: "video" as const,
    scene,
    cutaways: CUTAWAYS[scene.slug] ?? [],
  }));
  for (const m of MOCKUP_SCENES) {
    // Insert before the first video scene with a higher order.
    const idx = items.findIndex(
      (it) => it.kind === "video" && it.scene.order >= m.order,
    );
    const item: TimelineItem = { kind: "mockups", scene: m };
    if (idx === -1) items.push(item);
    else items.splice(idx, 0, item);
  }
  return items;
}

export function bookendSeconds(vo: VoMap, slug: "__intro" | "__outro"): number {
  const audio = vo[slug]?.durationSeconds ?? 0;
  return Math.max(INTRO_OUTRO_MIN_SECONDS, audio + 1.2);
}

export type SceneLayout = {
  titleFrames: number;
  /** frames of dashboard footage (0 for mockup scenes) */
  videoFrames: number;
  /** frames for each cutaway, in order (last one absorbs any VO overhang) */
  cutawayFrames: number[];
  totalFrames: number;
};

export function layoutItem(item: TimelineItem, vo: VoMap): SceneLayout {
  const titleFrames = Math.round(TITLE_SECONDS * FPS);
  const slug = item.kind === "video" ? item.scene.slug : item.scene.slug;
  const audioSec = vo[slug]?.durationSeconds ?? 0;
  const cutawayIds = item.kind === "video" ? item.cutaways : item.scene.cutaways;
  const cutawayFrames = cutawayIds.map((id) => Math.round(cutawaySeconds(id) * FPS));
  const cutawayTotal = cutawayFrames.reduce((a, b) => a + b, 0);

  if (item.kind === "video") {
    const videoSec = Math.max(3, item.scene.durationMs / 1000 - VIDEO_TAIL_TRIM_SECONDS);
    const fromVideo = Math.round(videoSec * FPS) + cutawayTotal;
    const fromAudio = Math.round((audioSec + 1.0) * FPS) + cutawayTotal;
    const contentFrames = Math.max(fromVideo, fromAudio);
    const videoFrames = contentFrames - cutawayTotal;
    return { titleFrames, videoFrames, cutawayFrames, totalFrames: titleFrames + contentFrames };
  }

  // Mockup-only scene: cutaways ARE the content. If the VO runs longer
  // than the conversations, the last cutaway holds on screen.
  const fromAudio = Math.round((audioSec + 1.0) * FPS);
  const deficit = Math.max(0, fromAudio - cutawayTotal);
  const frames = [...cutawayFrames];
  if (frames.length > 0) frames[frames.length - 1] += deficit;
  const contentFrames = frames.reduce((a, b) => a + b, 0);
  return { titleFrames, videoFrames: 0, cutawayFrames: frames, totalFrames: titleFrames + contentFrames };
}

export function landscapeDurationInFrames(manifest: Manifest, vo: VoMap): number {
  const introFrames = Math.round(bookendSeconds(vo, "__intro") * FPS);
  const outroFrames = Math.round(bookendSeconds(vo, "__outro") * FPS);
  const sceneFrames = buildTimeline(manifest).reduce(
    (total, item) => total + layoutItem(item, vo).totalFrames,
    0,
  );
  return Math.max(60, introFrames + outroFrames + sceneFrames);
}
