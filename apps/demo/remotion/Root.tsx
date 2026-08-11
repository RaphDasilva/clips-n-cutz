import { Composition } from "remotion";
import { Demo } from "./Demo";
import { DemoVertical, VERTICAL_TOTAL_SECONDS } from "./DemoVertical";
import { Cutaway } from "./Cutaway";
import { PaperNotebook } from "./problem-brolls/PaperNotebook";
import { WhatsAppOverflow } from "./problem-brolls/WhatsAppOverflow";
import type { Manifest } from "../lib/scene-manifest";
import manifestJson from "../output/manifest.json";
import voiceoverJson from "../output/audio/voiceover.json";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const V_WIDTH = 1080;
const V_HEIGHT = 1920;
const TITLE_SECONDS = 2.8;
const INTRO_OUTRO_MIN_SECONDS = 5;
const CUTAWAY_SECONDS = 8;
const VIDEO_TAIL_TRIM_SECONDS = 4;

const manifest = manifestJson as Manifest;
const voiceover = voiceoverJson as Record<string, { path: string; durationSeconds: number }>;

export const CUTAWAYS: Record<string, string[]> = {
  "02-walkin": ["wa-followup"],
  "03-booking": ["wa-booking-confirmation", "wa-reminder"],
};

const MOCKUP_IDS = ["wa-booking-confirmation", "wa-reminder", "wa-followup"];

const PROBLEM_BROLLS: Record<string, React.FC> = {
  "problem-notebook": PaperNotebook,
  "problem-whatsapp": WhatsAppOverflow,
};

function bookendSeconds(slug: "__intro" | "__outro"): number {
  const audio = voiceover[slug]?.durationSeconds ?? 0;
  return Math.max(INTRO_OUTRO_MIN_SECONDS, audio + 1.2);
}

function sceneSeconds(slug: string, videoDurationMs: number): number {
  const videoSec = Math.max(3, videoDurationMs / 1000 - VIDEO_TAIL_TRIM_SECONDS);
  const cutawaySec = (CUTAWAYS[slug]?.length ?? 0) * CUTAWAY_SECONDS;
  const timelineFromVideo = TITLE_SECONDS + videoSec + cutawaySec;
  const audio = voiceover[slug]?.durationSeconds ?? 0;
  const timelineFromAudio = TITLE_SECONDS + audio + cutawaySec + 1.0;
  return Math.max(timelineFromVideo, timelineFromAudio);
}

function landscapeDurationInFrames(): number {
  const introFrames = Math.round(bookendSeconds("__intro") * FPS);
  const outroFrames = Math.round(bookendSeconds("__outro") * FPS);
  const sceneFrames = manifest.scenes.reduce((total, s) => {
    return total + Math.round(sceneSeconds(s.slug, s.durationMs) * FPS);
  }, 0);
  return Math.max(60, introFrames + outroFrames + sceneFrames);
}

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="demo"
        component={Demo}
        durationInFrames={landscapeDurationInFrames()}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ manifest, voiceover, cutaways: CUTAWAYS }}
      />
      <Composition
        id="demo-vertical"
        component={DemoVertical}
        durationInFrames={Math.round(VERTICAL_TOTAL_SECONDS * FPS)}
        fps={FPS}
        width={V_WIDTH}
        height={V_HEIGHT}
        defaultProps={{ voiceover }}
      />

      {/* Customer-channel mockups — standalone, landscape + vertical */}
      {MOCKUP_IDS.map((id) => (
        <Composition
          key={`mockup-${id}`}
          id={`mockup-${id}`}
          component={Cutaway}
          durationInFrames={Math.round(CUTAWAY_SECONDS * FPS)}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{ id }}
        />
      ))}
      {MOCKUP_IDS.map((id) => (
        <Composition
          key={`mockup-${id}-vertical`}
          id={`mockup-${id}-vertical`}
          component={Cutaway}
          durationInFrames={Math.round(CUTAWAY_SECONDS * FPS)}
          fps={FPS}
          width={V_WIDTH}
          height={V_HEIGHT}
          defaultProps={{ id }}
        />
      ))}

      {/* Problem-framing B-rolls — landscape + vertical */}
      {Object.entries(PROBLEM_BROLLS).map(([id, component]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={Math.round(4.5 * FPS)}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
      {Object.entries(PROBLEM_BROLLS).map(([id, component]) => (
        <Composition
          key={`${id}-vertical`}
          id={`${id}-vertical`}
          component={component}
          durationInFrames={Math.round(4.5 * FPS)}
          fps={FPS}
          width={V_WIDTH}
          height={V_HEIGHT}
        />
      ))}
    </>
  );
};
