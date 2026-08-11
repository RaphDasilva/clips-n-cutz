import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type Caption = { at: number; text: string };

export type Scene = {
  slug: string;
  title: string;
  subtitle: string;
  order: number;
  captions: Caption[];
  videoPath: string;
  durationMs: number;
};

export type Manifest = {
  generatedAt: string;
  scenes: Scene[];
};

const OUTPUT_DIR = resolve(new URL("..", import.meta.url).pathname, "output");
const MANIFEST_PATH = resolve(OUTPUT_DIR, "manifest.json");

export async function loadManifest(): Promise<Manifest> {
  try {
    const buf = await readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(buf) as Manifest;
  } catch {
    return { generatedAt: "", scenes: [] };
  }
}

export async function saveManifest(manifest: Manifest): Promise<void> {
  await mkdir(dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

export async function appendScene(scene: Scene): Promise<void> {
  const manifest = await loadManifest();
  const idx = manifest.scenes.findIndex((s) => s.slug === scene.slug);
  if (idx >= 0) manifest.scenes[idx] = scene;
  else manifest.scenes.push(scene);
  manifest.scenes.sort((a, b) => a.order - b.order);
  manifest.generatedAt = new Date(0).toISOString();
  await saveManifest(manifest);
}
