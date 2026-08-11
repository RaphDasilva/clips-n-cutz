import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanHover, pause } from "../lib/human.js";

test("owner — lapsed clients, chased automatically", async ({ page }, testInfo) => {
  await loginAs(page, "owner");
  await recordScene(page, testInfo, {
    slug: "17-owner-lapsed",
    order: 7.8,
    title: "Who Hasn't Come Back",
    subtitle: "Lapsed clients surface themselves — and get a WhatsApp nudge",
    captions: [
      { at: 1.0, text: "Clients who haven't visited in 30, 60 or 90 days — surfaced automatically" },
      { at: 8.0, text: "Each one gets a re-engagement WhatsApp every morning, no manual chasing" },
      { at: 14.0, text: "The owner just watches the list shrink" },
    ],
    steps: async () => {
      await page.goto("/dashboard/owner/lapsed");
      await page.getByText("Lapsed Clients").waitFor();
      await pause(page, 2000);

      await humanHover(page, page.getByText("days", { exact: false }).first());
      await pause(page, 1200);
      await humanClick(page, page.getByRole("button", { name: "60+ days" }));
      await pause(page, 1800);
      await humanClick(page, page.getByRole("button", { name: "90+ days" }));
      await pause(page, 1800);
      await humanClick(page, page.getByRole("button", { name: "30+ days" }));
      await pause(page, 1800);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
