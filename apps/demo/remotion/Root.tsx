import { Composition } from "remotion";
import { Demo } from "./Demo";
import { DemoVertical, verticalTotalSeconds } from "./DemoVertical";
import { Cutaway } from "./Cutaway";
import { PaperNotebook } from "./problem-brolls/PaperNotebook";
import { WhatsAppOverflow } from "./problem-brolls/WhatsAppOverflow";
import { CHAT_IDS, cutawaySeconds } from "./mockups/chats";
import type { Manifest } from "../lib/scene-manifest";
import { FPS, landscapeDurationInFrames } from "./timeline";
import manifestJson from "../output/manifest.json";
import voiceoverJson from "../output/audio/voiceover.json";

const WIDTH = 1920;
const HEIGHT = 1080;
const V_WIDTH = 1080;
const V_HEIGHT = 1920;

const manifest = manifestJson as Manifest;
const voiceover = voiceoverJson as Record<string, { path: string; durationSeconds: number }>;

const PROBLEM_BROLLS: Record<string, React.FC> = {
  "problem-notebook": PaperNotebook,
  "problem-whatsapp": WhatsAppOverflow,
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="demo"
        component={Demo}
        durationInFrames={landscapeDurationInFrames(manifest, voiceover)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ manifest, voiceover }}
      />
      <Composition
        id="demo-vertical"
        component={DemoVertical}
        durationInFrames={Math.round(verticalTotalSeconds(manifest) * FPS)}
        fps={FPS}
        width={V_WIDTH}
        height={V_HEIGHT}
        defaultProps={{ manifest }}
      />

      {/* Customer-channel mockups — standalone, landscape + vertical.
          Each sized to exactly how long its conversation plays. */}
      {CHAT_IDS.map((id) => (
        <Composition
          key={`mockup-${id}`}
          id={`mockup-${id}`}
          component={Cutaway}
          durationInFrames={Math.round(cutawaySeconds(id) * FPS)}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{ id }}
        />
      ))}
      {CHAT_IDS.map((id) => (
        <Composition
          key={`mockup-${id}-vertical`}
          id={`mockup-${id}-vertical`}
          component={Cutaway}
          durationInFrames={Math.round(cutawaySeconds(id) * FPS)}
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
