import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanHover, pause } from "../lib/human.js";

test("staff view — my day, my earnings only", async ({ page }, testInfo) => {
  await loginAs(page, "staff");
  await recordScene(page, testInfo, {
    slug: "08-staff",
    order: 8,
    title: "The Staff View",
    subtitle: "Their own appointments and earnings — nothing else",
    captions: [
      { at: 1.0, text: "Staff see only their own day — never other staff or salon revenue" },
      { at: 6.0, text: "Today's services with the exact commission earned on each" },
      { at: 12.5, text: "And the Sunday payout building up through the week — full transparency" },
    ],
    steps: async () => {
      await page.goto("/dashboard/staff");
      await page.getByText("Services Completed Today").waitFor();
      await pause(page, 2200);

      await humanHover(page, page.getByText("Services Completed Today"));
      await pause(page, 1500);

      await page.mouse.wheel(0, 550);
      await pause(page, 1800);
      await page.mouse.wheel(0, 550);
      await pause(page, 1800);
      await page.mouse.wheel(0, -1100);
      await pause(page, 1200);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
