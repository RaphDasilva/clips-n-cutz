import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });

export default defineConfig({
  testDir: "./scenes",
  outputDir: "./output/pw-artifacts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./output/report", open: "never" }],
  ],
  timeout: 180_000,
  use: {
    baseURL: process.env.DEMO_APP_URL ?? "http://localhost:3000",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    video: { mode: "on", size: { width: 1920, height: 1080 } },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // IMPORTANT: viewport must be re-forced AFTER the devices spread,
        // otherwise recordings render 1280x720 inside a padded frame.
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        video: { mode: "on", size: { width: 1920, height: 1080 } },
      },
    },
  ],
});
