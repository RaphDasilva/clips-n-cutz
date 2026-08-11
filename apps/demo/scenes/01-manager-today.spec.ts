import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanHover, pause } from "../lib/human.js";

test("manager dashboard — today at a glance", async ({ page }, testInfo) => {
  await loginAs(page, "manager");
  await recordScene(page, testInfo, {
    slug: "01-manager-today",
    order: 1,
    title: "Today at a Glance",
    subtitle: "Walk-ins, appointments and revenue — live",
    captions: [
      { at: 1.0, text: "The manager opens the day here — walk-ins, appointments, revenue" },
      { at: 5.0, text: "Every walk-in logged today, with staff, services and payment method" },
      { at: 10.0, text: "Today's appointments and tips per staff member — all on one screen" },
    ],
    steps: async () => {
      await page.goto("/dashboard/manager");
      await page.getByText("Recent Walk-ins").waitFor();
      await pause(page, 2000);

      await humanHover(page, page.getByText("Revenue", { exact: true }).first());
      await pause(page, 1600);

      await humanHover(page, page.getByText("Today's Appointments"));
      await pause(page, 1600);

      await page.mouse.wheel(0, 500);
      await pause(page, 1400);
      await humanHover(page, page.getByText("Tips Today"));
      await pause(page, 1400);
      await page.mouse.wheel(0, -500);
      await pause(page, 1000);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
