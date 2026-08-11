import { resolve } from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import { appendScene, type Caption, type Manifest, type Scene } from "./scene-manifest.js";

export { appendScene, loadManifest, saveManifest } from "./scene-manifest.js";
export type { Caption, Manifest, Scene };

const OUTPUT_DIR = resolve(new URL("..", import.meta.url).pathname, "output");

export type RecordSceneInput = {
  slug: string;
  order: number;
  title: string;
  subtitle: string;
  captions: Caption[];
  steps: () => Promise<void>;
};

export async function recordScene(
  page: Page,
  testInfo: TestInfo,
  input: RecordSceneInput,
): Promise<void> {
  const start = performance.now();
  await input.steps();
  await page.waitForTimeout(600);
  const durationMs = performance.now() - start;

  const video = page.video();
  if (!video) throw new Error(`scene "${input.slug}" has no video attached`);
  const rawPath = await video.path();
  await page.close();
  await video.saveAs(resolve(OUTPUT_DIR, "videos", `${input.slug}.webm`));

  await appendScene({
    slug: input.slug,
    order: input.order,
    title: input.title,
    subtitle: input.subtitle,
    captions: input.captions,
    videoPath: `videos/${input.slug}.webm`,
    durationMs,
  });

  testInfo.annotations.push({ type: "scene", description: `${input.slug} raw=${rawPath}` });
}
