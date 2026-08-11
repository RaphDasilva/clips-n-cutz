import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanType, pause } from "../lib/human.js";

test("advances + penalties — deducted from payout automatically", async ({ page }, testInfo) => {
  await loginAs(page, "manager");
  await recordScene(page, testInfo, {
    slug: "12-discipline",
    order: 5.8,
    title: "Advances & Penalties",
    subtitle: "Mid-week cash advances and penalties — auto-deducted on payday",
    captions: [
      { at: 1.0, text: "A staff member needs cash mid-week? Record the advance in seconds" },
      { at: 12.0, text: "It's deducted from their Sunday payout automatically" },
      { at: 19.0, text: "Penalties work the same way — with the reason on record" },
    ],
    steps: async () => {
      await page.goto("/dashboard/manager/advances");
      await page.getByText("Staff Advances").waitFor();
      await pause(page, 1500);

      // Grant an advance
      const staffSelect = page.locator("select").first();
      await humanClick(page, staffSelect);
      await staffSelect.selectOption({ label: "Halima Ibrahim" });
      await pause(page, 600);
      await humanType(page, page.getByPlaceholder("5000"), "4000");
      await humanType(page, page.getByPlaceholder("e.g. Emergency, school fees"), "Transport emergency");
      await humanClick(page, page.getByRole("button", { name: "Record Advance" }));
      await page.getByText("Will be deducted next Sunday").first().waitFor();
      await pause(page, 2000);

      // Over to penalties
      await humanClick(page, page.getByRole("link", { name: "Penalties" }).first());
      await page.getByText("Issue a Penalty").waitFor();
      await pause(page, 1600);
      await page.mouse.wheel(0, 420);
      await pause(page, 2000);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
