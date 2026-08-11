import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanHover, pause } from "../lib/human.js";

test("owner — deletion audit trail", async ({ page }, testInfo) => {
  await loginAs(page, "owner");
  await recordScene(page, testInfo, {
    slug: "18-owner-oversight",
    order: 7.9,
    title: "Nothing Disappears Quietly",
    subtitle: "Every deleted visit is logged with a reason for the owner to review",
    captions: [
      { at: 1.0, text: "If the manager removes a visit, it lands here — with the reason" },
      { at: 7.0, text: "New deletions wait for the owner's acknowledgement" },
      { at: 12.0, text: "Reviewed? One tap dismisses it — the record stays forever" },
    ],
    steps: async () => {
      await page.goto("/dashboard/owner/deletions");
      await page.getByText("Deletion Audit").waitFor();
      await pause(page, 1800);

      await humanHover(page, page.getByText("Logged twice by mistake"));
      await pause(page, 1800);
      await humanClick(page, page.getByRole("button", { name: "Dismiss", exact: true }));
      await pause(page, 1600);
      await humanClick(page, page.getByRole("button", { name: "Unacknowledged" }));
      await page.getByText("Nothing waiting for your review.").waitFor();
      await pause(page, 1800);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
