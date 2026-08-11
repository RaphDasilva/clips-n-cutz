import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanHover, pause } from "../lib/human.js";

test("owner — weekly payouts and commission", async ({ page }, testInfo) => {
  await loginAs(page, "owner");
  await recordScene(page, testInfo, {
    slug: "15-owner-payroll",
    order: 7.5,
    title: "Sunday Payouts",
    subtitle: "Commission + tips − penalties − advances, per staff — one tap to pay",
    captions: [
      { at: 1.0, text: "Every Sunday, each staff member's payout is already computed" },
      { at: 7.0, text: "Commission, tips, penalties and advances — all netted automatically" },
      { at: 14.0, text: "Bank details on screen, one tap marks it paid" },
      { at: 22.0, text: "And the commission page shows the same 30% math per staff, any period" },
    ],
    steps: async () => {
      await page.goto("/dashboard/owner/payouts");
      await page.getByText("Weekly Payouts").waitFor();
      await pause(page, 2000);

      await page.mouse.wheel(0, 350);
      await pause(page, 1400);

      // Mark the first pending staff paid
      await humanClick(page, page.getByRole("button", { name: "Mark Paid", exact: true }).first());
      await page.getByText("Send to").waitFor();
      await pause(page, 2200);
      await humanClick(page, page.getByRole("button", { name: /Mark Paid ·/ }));
      await page.getByText("1 paid").waitFor();
      await pause(page, 1800);

      // Commission view
      await humanClick(page, page.getByRole("link", { name: "Commission" }).first());
      await page.getByText("30% of each service goes to the staff member").waitFor();
      await pause(page, 1800);
      await humanHover(page, page.getByText("Commission (30%)"));
      await pause(page, 1500);
      await page.mouse.wheel(0, 400);
      await pause(page, 1800);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
