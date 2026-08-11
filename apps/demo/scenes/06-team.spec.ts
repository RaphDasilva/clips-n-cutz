import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanType, pause } from "../lib/human.js";

test("team — add staff, reset PIN, active toggle", async ({ page }, testInfo) => {
  await loginAs(page, "manager");
  await recordScene(page, testInfo, {
    slug: "06-team",
    order: 6,
    title: "Team Control",
    subtitle: "Add staff, reset PINs, switch accounts on and off",
    captions: [
      { at: 1.0, text: "The whole team in one place — services, days off, phone numbers" },
      { at: 6.0, text: "Add a new staff member with a starting PIN — they log in immediately" },
      { at: 18.0, text: "Forgot a PIN? The manager resets it — no tech support needed" },
      { at: 26.0, text: "Staff are never deleted — flip them inactive and history stays intact" },
    ],
    steps: async () => {
      await page.goto("/dashboard/manager/team");
      await page.getByText("staff member", { exact: false }).first().waitFor();
      await pause(page, 2000);

      // Add a staff member
      await humanClick(page, page.getByRole("button", { name: "Add Staff" }));
      await page.getByText("Add Staff Member").waitFor();
      await humanType(page, page.getByPlaceholder("e.g. Chukwu Nnamdi"), "Chidinma Okoro");
      await humanType(page, page.getByPlaceholder("08012345678"), "08099887766");
      await humanType(page, page.getByPlaceholder("••••"), "2468");
      await humanClick(page, page.getByRole("button", { name: "Create Account" }));
      await page.getByText("Chidinma Okoro").first().waitFor();
      await pause(page, 1500);

      // Reset a PIN
      await humanClick(page, page.getByRole("button", { name: "Reset PIN" }).first());
      await page.getByText(/Reset PIN — /).waitFor();
      await humanType(page, page.getByPlaceholder("••••"), "5566");
      await humanClick(page, page.getByRole("button", { name: "Save New PIN" }));
      await pause(page, 1200);

      // Active / Inactive toggle — reactivate the inactive account
      const inactiveToggle = page.getByLabel("Set active").first();
      await humanClick(page, inactiveToggle);
      await pause(page, 1600);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
