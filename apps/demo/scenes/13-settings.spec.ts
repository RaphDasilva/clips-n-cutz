import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanType, pause } from "../lib/human.js";

test("settings — change your own PIN", async ({ page }, testInfo) => {
  await loginAs(page, "manager");
  await recordScene(page, testInfo, {
    slug: "13-settings",
    order: 6.5,
    title: "Settings & PIN",
    subtitle: "Anyone can change their own PIN — current PIN required",
    captions: [
      { at: 1.0, text: "Every user can change their own PIN from Settings" },
      { at: 6.0, text: "Current PIN first — then the new one, twice" },
      { at: 14.0, text: "Done. Sign back in with the new PIN" },
    ],
    steps: async () => {
      await page.goto("/dashboard/manager/settings");
      await page.getByText("Change PIN").waitFor();
      await pause(page, 1500);

      const pins = page.locator('input[type="password"]');
      await humanType(page, pins.nth(0), "4321");
      await humanType(page, pins.nth(1), "7275");
      await humanType(page, pins.nth(2), "7275");
      await pause(page, 500);
      await humanClick(page, page.getByRole("button", { name: "Save New PIN" }));
      await page.getByText("PIN changed successfully.").waitFor();
      await pause(page, 1600);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
