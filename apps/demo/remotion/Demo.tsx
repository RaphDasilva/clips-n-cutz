import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { TitleCard } from "./TitleCard";
import { VideoScene } from "./VideoScene";
import { Cutaway } from "./Cutaway";
import type { Manifest } from "../lib/scene-manifest";
import { FPS, bookendSeconds, buildTimeline, layoutItem, type VoMap } from "./timeline";

type Props = {
  manifest: Manifest;
  voiceover: VoMap;
};

const INTRO_KEY = "__intro";
const OUTRO_KEY = "__outro";

export const Demo: React.FC<Props> = ({ manifest, voiceover }) => {
  const timeline = buildTimeline(manifest);
  const introSec = bookendSeconds(voiceover, INTRO_KEY);
  const outroSec = bookendSeconds(voiceover, OUTRO_KEY);

  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence durationInFrames={Math.round(introSec * FPS)}>
          <AbsoluteFill>
            <TitleCard
              title="Clips N'Cutz"
              subtitle="A Lagos salon, run from one screen — walk-ins to WhatsApp"
            />
            {voiceover[INTRO_KEY] ? (
              <Audio src={staticFile(voiceover[INTRO_KEY].path)} volume={0.95} />
            ) : null}
          </AbsoluteFill>
        </Series.Sequence>

        {timeline.map((item) => {
          const scene = item.scene;
          const layout = layoutItem(item, voiceover);
          const cutawayIds = item.kind === "video" ? item.cutaways : item.scene.cutaways;

          return (
            <Series.Sequence key={scene.slug} durationInFrames={layout.totalFrames}>
              <AbsoluteFill>
                {voiceover[scene.slug] ? (
                  <Audio src={staticFile(voiceover[scene.slug].path)} volume={0.95} />
                ) : null}
                <Series>
                  <Series.Sequence durationInFrames={layout.titleFrames}>
                    <TitleCard title={scene.title} subtitle={scene.subtitle} />
                  </Series.Sequence>
                  {item.kind === "video" ? (
                    <Series.Sequence durationInFrames={layout.videoFrames}>
                      <VideoScene videoPath={item.scene.videoPath} captions={item.scene.captions} />
                    </Series.Sequence>
                  ) : null}
                  {cutawayIds.map((cid, i) => (
                    <Series.Sequence key={cid} durationInFrames={layout.cutawayFrames[i]}>
                      <Cutaway id={cid} />
                    </Series.Sequence>
                  ))}
                </Series>
              </AbsoluteFill>
            </Series.Sequence>
          );
        })}

        <Series.Sequence durationInFrames={Math.round(outroSec * FPS)}>
          <AbsoluteFill>
            <TitleCard title="That's the tour" subtitle="Built + operated by LVD Labs · lvdlabs.io" />
            {voiceover[OUTRO_KEY] ? (
              <Audio src={staticFile(voiceover[OUTRO_KEY].path)} volume={0.95} />
            ) : null}
          </AbsoluteFill>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
