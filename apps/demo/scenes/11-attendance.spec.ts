import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanHover, pause } from "../lib/human.js";

test("attendance — check-ins, lateness and penalties", async ({ page }, testInfo) => {
  await loginAs(page, "manager");
  await recordScene(page, testInfo, {
    slug: "11-attendance",
    order: 5.6,
    title: "Attendance, Handled",
    subtitle: "Staff check themselves in — lateness penalties apply automatically",
    captions: [
      { at: 1.0, text: "Staff tap 'I'm in' on their own phone — the manager just confirms" },
      { at: 7.5, text: "One tap confirms the check-in at the real arrival time" },
      { at: 13.0, text: "Late after 11am? The ₦2,000 penalty is applied automatically" },
    ],
    steps: async () => {
      await page.goto("/dashboard/manager/attendance");
      await page.getByText("Attendance", { exact: true }).first().waitFor();
      await pause(page, 1800);

      // Confirm the pending check-in request
      await page.getByText("Waiting for confirmation").waitFor();
      await pause(page, 1200);
      await humanClick(page, page.getByRole("button", { name: "Confirm", exact: true }));
      await pause(page, 1800);

      // Summary strip + the late row with its automatic penalty
      await humanHover(page, page.getByText("Total Penalties"));
      await pause(page, 1400);
      await humanHover(page, page.getByText("Late", { exact: true }).first());
      await pause(page, 1800);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
