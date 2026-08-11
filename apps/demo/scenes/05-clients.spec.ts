import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, pause } from "../lib/human.js";

test("clients — everyone who ever visited", async ({ page }, testInfo) => {
  await loginAs(page, "manager");
  await recordScene(page, testInfo, {
    slug: "05-clients",
    order: 5,
    title: "Every Client, Remembered",
    subtitle: "Names, numbers and notes — no more paper notebook",
    captions: [
      { at: 1.0, text: "Every client the salon has ever served — searchable in seconds" },
      { at: 6.5, text: "Phone numbers, notes and first-visit dates all kept automatically" },
      { at: 13.0, text: "Type a name or number and the client is right there" },
    ],
    steps: async () => {
      await page.goto("/dashboard/manager/clients");
      await page.getByText("Everyone who has visited the salon").waitFor();
      await pause(page, 2000);

      await page.mouse.wheel(0, 450);
      await pause(page, 1600);
      await page.mouse.wheel(0, -450);
      await pause(page, 1000);

      const search = page.getByPlaceholder("Search name or phone…");
      await humanClick(page, search);
      await search.pressSequentially("Amaka", { delay: 110 });
      await pause(page, 1800);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
