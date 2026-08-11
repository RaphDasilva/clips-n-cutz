import { test } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanType, pause } from "../lib/human.js";

test("login with phone + PIN", async ({ page }, testInfo) => {
  await recordScene(page, testInfo, {
    slug: "00-login",
    order: 0,
    title: "Sign In",
    subtitle: "Phone number + 4-digit PIN — no email, no passwords",
    captions: [
      { at: 1.0, text: "Staff sign in with just a phone number and a 4-digit PIN" },
      { at: 6.5, text: "Built for busy salon staff — no emails, no passwords to forget" },
      { at: 12.0, text: "Straight into the manager dashboard" },
    ],
    steps: async () => {
      await page.goto("/login");
      await page.getByText("Unisex Salon").first().waitFor();
      await pause(page, 1200);

      await humanType(page, page.getByPlaceholder("08012345678"), "08062510256");
      await humanType(page, page.getByPlaceholder("••••"), "4321");
      await pause(page, 600);

      await humanClick(page, page.getByRole("button", { name: "Sign In" }));
      await page.waitForURL("**/dashboard/manager");
      await page.getByText("Walk-in").first().waitFor();
      await pause(page, 1500);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
