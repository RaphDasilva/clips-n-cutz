import { AbsoluteFill, Audio, Series, staticFile, useVideoConfig } from "remotion";
import { TitleCard } from "./TitleCard";
import { VideoScene } from "./VideoScene";
import { Cutaway } from "./Cutaway";
import type { Manifest } from "../lib/scene-manifest";

type VoEntry = { path: string; durationSeconds: number };

type Props = {
  manifest: Manifest;
  voiceover: Record<string, VoEntry>;
  cutaways: Record<string, string[]>;
};

const TITLE_SECONDS = 2.8;
const INTRO_OUTRO_MIN_SECONDS = 5;
const CUTAWAY_SECONDS = 8;
const VIDEO_TAIL_TRIM_SECONDS = 4;

const INTRO_KEY = "__intro";
const OUTRO_KEY = "__outro";

export const Demo: React.FC<Props> = ({ manifest, voiceover, cutaways }) => {
  const { fps } = useVideoConfig();
  const titleFrames = Math.round(TITLE_SECONDS * fps);
  const cutawayFrames = Math.round(CUTAWAY_SECONDS * fps);

  const introSec = Math.max(INTRO_OUTRO_MIN_SECONDS, (voiceover[INTRO_KEY]?.durationSeconds ?? 0) + 1.2);
  const outroSec = Math.max(INTRO_OUTRO_MIN_SECONDS, (voiceover[OUTRO_KEY]?.durationSeconds ?? 0) + 1.2);

  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence durationInFrames={Math.round(introSec * fps)}>
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

        {manifest.scenes.map((scene) => {
          // Each recording ends with ~5s of static VO padding; trim most
          // of it so the landscape cut stays close to the 3-minute target.
          const videoFrames = Math.max(
            Math.round(3 * fps),
            Math.round((scene.durationMs / 1000 - VIDEO_TAIL_TRIM_SECONDS) * fps),
          );
          const cutawayIds = cutaways[scene.slug] ?? [];
          const cutawaysTotalFrames = cutawayIds.length * cutawayFrames;
          const audioFrames = Math.round((voiceover[scene.slug]?.durationSeconds ?? 0) * fps);

          const contentFramesFromVideo = videoFrames + cutawaysTotalFrames;
          const contentFramesFromAudio = audioFrames + cutawaysTotalFrames + Math.round(1 * fps);
          const contentFrames = Math.max(contentFramesFromVideo, contentFramesFromAudio);
          const videoPhaseFrames = contentFrames - cutawaysTotalFrames;

          const totalFrames = titleFrames + contentFrames;

          return (
            <Series.Sequence key={scene.slug} durationInFrames={totalFrames}>
              <AbsoluteFill>
                {voiceover[scene.slug] ? (
                  <Audio src={staticFile(voiceover[scene.slug].path)} volume={0.95} />
                ) : null}
                <Series>
                  <Series.Sequence durationInFrames={titleFrames}>
                    <TitleCard title={scene.title} subtitle={scene.subtitle} />
                  </Series.Sequence>
                  <Series.Sequence durationInFrames={videoPhaseFrames}>
                    <VideoScene videoPath={scene.videoPath} captions={scene.captions} />
                  </Series.Sequence>
                  {cutawayIds.map((cid) => (
                    <Series.Sequence key={cid} durationInFrames={cutawayFrames}>
                      <Cutaway id={cid} />
                    </Series.Sequence>
                  ))}
                </Series>
              </AbsoluteFill>
            </Series.Sequence>
          );
        })}

        <Series.Sequence durationInFrames={Math.round(outroSec * fps)}>
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
