import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanHover, pause } from "../lib/human.js";

test("owner dashboard — revenue and commission", async ({ page }, testInfo) => {
  await loginAs(page, "owner");
  await recordScene(page, testInfo, {
    slug: "07-owner",
    order: 7,
    title: "The Owner's View",
    subtitle: "Net profit, revenue trend and the 70/30 split — read only",
    captions: [
      { at: 1.0, text: "The owner logs in with the same app — and sees money, not admin" },
      { at: 6.0, text: "Net profit today, this week and this month" },
      { at: 12.0, text: "Revenue trend over 7 or 30 days" },
      { at: 19.0, text: "The 70/30 split: staff commission and the owner's share, computed automatically" },
    ],
    steps: async () => {
      await page.goto("/dashboard/owner");
      await page.getByText("Financial overview — read only").waitFor();
      await pause(page, 2000);

      await humanHover(page, page.getByText("Net Profit", { exact: true }).first());
      await pause(page, 1600);

      await page.mouse.wheel(0, 600);
      await pause(page, 1500);
      await humanClick(page, page.getByRole("button", { name: "30 days" }));
      await pause(page, 1800);

      await page.mouse.wheel(0, 700);
      await pause(page, 1400);
      await humanHover(page, page.getByText("This Month — Profit Split"));
      await pause(page, 2000);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
