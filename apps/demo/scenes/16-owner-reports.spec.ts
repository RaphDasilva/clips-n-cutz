import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanHover, pause } from "../lib/human.js";

test("owner — one-tap financial report", async ({ page }, testInfo) => {
  await loginAs(page, "owner");
  await recordScene(page, testInfo, {
    slug: "16-owner-reports",
    order: 7.65,
    title: "The Full Report",
    subtitle: "Pick a date range — net profit, by service, by staff, every visit",
    captions: [
      { at: 1.0, text: "Pick any date range and run the report" },
      { at: 6.0, text: "Net profit, with the full math shown — revenue minus commission minus expenses" },
      { at: 13.0, text: "Which services actually make the money" },
      { at: 19.0, text: "Who's performing — revenue, commission and tips per staff" },
    ],
    steps: async () => {
      await page.goto("/dashboard/owner/reports");
      await page.getByText("Choose a date range to generate a full financial report").waitFor();
      await pause(page, 1500);

      await humanClick(page, page.getByRole("button", { name: "Run Report" }));
      await page.getByText("Net Profit ·").waitFor();
      await pause(page, 1400);
      await humanHover(page, page.getByText("Net Profit ·"));
      await pause(page, 2200);

      await page.mouse.wheel(0, 650);
      await pause(page, 2000);
      await page.mouse.wheel(0, 650);
      await pause(page, 2000);
      await page.mouse.wheel(0, 700);
      await pause(page, 2000);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
