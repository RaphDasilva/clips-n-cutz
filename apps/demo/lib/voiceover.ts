import { config as loadDotenv } from "dotenv";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadManifest } from "./scene-manifest.js";

loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });

export const INTRO_VO_SLUG = "__intro";
export const OUTRO_VO_SLUG = "__outro";

const ELEVENLABS_VOICE_ID = "XB0fDUnXU5powFXDhCwa"; // Charlotte — warm British female
const ELEVENLABS_MODEL = "eleven_multilingual_v2";
const OUTPUT_DIR = resolve(new URL("..", import.meta.url).pathname, "output/audio");

type SceneVo = {
  slug: string;
  text: string;
};

// Pronunciation notes from the brief:
//   Clips N'Cutz  → spoken "Clips and Cuts"
//   Cajetan       → spoken "Ka-jeh-tan"
export const SCENE_SCRIPTS: SceneVo[] = [
  {
    slug: INTRO_VO_SLUG,
    text: "Clips and Cuts is a busy unisex salon in Lagos. This is their salon management system — walk-ins, bookings, WhatsApp and payroll, all in one place. Built and operated by LVD Labs.",
  },
  {
    slug: "00-login",
    text: "No emails. No passwords. Everyone on the team signs in with their phone number and a four digit pin — quick enough for the busiest Saturday morning.",
  },
  {
    slug: "01-manager-today",
    text: "The manager, Ka-jeh-tan, starts his day here. Walk-ins, appointments, revenue and tips — the whole salon on one screen, updating live as clients come through the door.",
  },
  {
    slug: "02-walkin",
    text: "A client walks in. Name, phone, services, staff — and in under thirty seconds the visit is logged and commission is tracked. Seven days later, the client gets a friendly WhatsApp nudge to book again. Automatically. That's how a haircut becomes a regular.",
  },
  {
    slug: "03-booking",
    text: "Clients book themselves from a simple page — services, date, time. The moment they book, a WhatsApp confirmation lands on their phone. And the day before, a reminder goes out on its own — so the chair never waits for a no-show.",
  },
  {
    slug: "04-whatsapp",
    text: "But most clients never open a website — they just message the salon on WhatsApp. Watch: a client asks about Saturday braids, picks a slot, and walks away with a confirmed booking without leaving the chat. Price questions get answered the same way, in seconds.",
  },
  {
    slug: "04-appointments",
    text: "Every booking lands in one list. When the client arrives, one tap checks them in — the booking becomes a paid visit, and the staff member's commission is recorded on the spot.",
  },
  {
    slug: "05-clients",
    text: "Every client the salon has ever served — searchable in seconds, with phone numbers, notes and visit dates. The paper notebook is retired for good.",
  },
  {
    slug: "10-services",
    text: "The full price list lives in the app, grouped by category. Ka-jeh-tan adds a new service — name, category, price — and it's bookable everywhere, instantly.",
  },
  {
    slug: "11-attendance",
    text: "Attendance runs itself. Staff tap 'I'm in' from their own phones and the manager confirms with one tap. Arrive after eleven, and a two thousand naira lateness penalty applies automatically. No arguments — it's all on record.",
  },
  {
    slug: "12-discipline",
    text: "Mid-week cash advances and penalties are logged in seconds. And here's the clever part — they deduct themselves from that person's Sunday payout. Nobody has to remember. The system does.",
  },
  {
    slug: "06-team",
    text: "Staff management without the drama. Ka-jeh-tan adds a new team member with a starting pin, resets a forgotten pin in seconds, and switches accounts on or off — while every naira of history stays intact.",
  },
  {
    slug: "13-settings",
    text: "Security stays simple. Anyone can change their own pin from settings — current pin first, then the new one twice. Forgotten completely? The manager resets it from the Team page.",
  },
  {
    slug: "07-owner",
    text: "The owner's view is pure money. Net profit, revenue trends, and the seventy thirty commission split — computed automatically, and strictly read only.",
  },
  {
    slug: "14-owner-money",
    text: "Now the owner's money tools. Every expense is logged and categorised — products, light bills, supplies. And each evening the cash drawer count is checked against what the system expected. A short day shows up in red. Quiet leaks stop being quiet.",
  },
  {
    slug: "15-owner-payroll",
    text: "Sunday payday used to take a calculator and an argument. Now every staff payout is already computed — commission plus tips, minus penalties and advances — with bank details right there. One tap marks it paid. And the commission page shows the same thirty percent math for any period.",
  },
  {
    slug: "16-owner-reports",
    text: "For the full picture, one tap builds the report. Net profit with the working shown, revenue by service, revenue by staff, and every visit in the period. Any date range. Any payment method.",
  },
  {
    slug: "17-owner-lapsed",
    text: "Retention runs on autopilot. Anyone who hasn't visited in thirty days appears on this list — and gets a friendly WhatsApp that morning inviting them back. The owner just watches the list shrink.",
  },
  {
    slug: "18-owner-oversight",
    text: "Trust, with receipts. If the manager ever deletes a visit, it lands in the owner's audit trail with the reason attached. Nothing disappears quietly.",
  },
  {
    slug: "08-staff",
    text: "And each staff member sees only their own day. Their services, their commission on every job, and the Sunday payout building up through the week. Full transparency, zero arguments.",
  },
  {
    slug: "19-staff-book",
    text: "Staff can book their own regulars directly — the client is automatically assigned to them. And their earnings page shows every service with the exact commission earned on each. Fair, visible, and argument free.",
  },
  {
    slug: OUTRO_VO_SLUG,
    text: "One login. Three views. Zero forgotten clients. Built for Clips and Cuts by LVD Labs. If your salon needs the same, find us at LVD Labs dot io.",
  },
];

function scriptHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function ffprobeDurationSeconds(path: string): number {
  const res = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
    { encoding: "utf-8" },
  );
  if (res.status !== 0) throw new Error(`ffprobe failed on ${path}: ${res.stderr}`);
  const seconds = parseFloat(res.stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`ffprobe returned NaN for ${path}: "${res.stdout}"`);
  return seconds;
}

async function generateOne(
  slug: string,
  text: string,
): Promise<{ relativePath: string; durationSeconds: number; regenerated: boolean }> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const hash = scriptHash(text);
  const filename = `${slug}.${hash}.mp3`;
  const outPath = resolve(OUTPUT_DIR, filename);
  const relative = `audio/${filename}`;
  if (await fileExists(outPath)) {
    const dur = ffprobeDurationSeconds(outPath);
    console.log(`[vo] cache hit ${slug} (${hash}, ${dur.toFixed(2)}s)`);
    return { relativePath: relative, durationSeconds: dur, regenerated: false };
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY must be set");

  console.log(`[vo] generating ${slug} (${text.length} chars, hash ${hash})…`);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`elevenlabs ${slug} → HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  const dur = ffprobeDurationSeconds(outPath);
  console.log(`[vo] wrote ${outPath} (${buf.byteLength} bytes, ${dur.toFixed(2)}s)`);
  return { relativePath: relative, durationSeconds: dur, regenerated: true };
}

export type VoiceoverEntry = { path: string; durationSeconds: number };
export type VoiceoverManifest = Record<string, VoiceoverEntry>;

const VO_MANIFEST_PATH = resolve(OUTPUT_DIR, "voiceover.json");

export async function loadVoiceoverManifest(): Promise<VoiceoverManifest> {
  try {
    const buf = await readFile(VO_MANIFEST_PATH, "utf-8");
    return JSON.parse(buf) as VoiceoverManifest;
  } catch {
    return {};
  }
}

async function saveVoiceoverManifest(m: VoiceoverManifest): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(VO_MANIFEST_PATH, JSON.stringify(m, null, 2), "utf-8");
}

async function main(): Promise<void> {
  const manifest = await loadManifest();
  const scriptedSlugs = new Set(SCENE_SCRIPTS.map((s) => s.slug));
  const sceneSlugs = new Set([INTRO_VO_SLUG, OUTRO_VO_SLUG, ...manifest.scenes.map((s) => s.slug)]);
  const missing = [...sceneSlugs].filter((s) => !scriptedSlugs.has(s));
  if (missing.length > 0) {
    console.warn(`[vo] no script for: ${missing.join(", ")}`);
  }

  const out: VoiceoverManifest = {};
  for (const scene of SCENE_SCRIPTS) {
    const { relativePath, durationSeconds } = await generateOne(scene.slug, scene.text);
    out[scene.slug] = { path: relativePath, durationSeconds };
  }
  await saveVoiceoverManifest(out);
  console.log(`[vo] wrote ${Object.keys(out).length} entries to voiceover.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[vo] fatal:", err);
    process.exit(1);
  });
}
