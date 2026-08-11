import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanType, pause } from "../lib/human.js";

test("services — the salon menu, editable in seconds", async ({ page }, testInfo) => {
  await loginAs(page, "manager");
  await recordScene(page, testInfo, {
    slug: "10-services",
    order: 5.3,
    title: "The Service Menu",
    subtitle: "Every service and price, grouped by category — edit anytime",
    captions: [
      { at: 1.0, text: "The full price list lives in the app — grouped by category" },
      { at: 7.0, text: "Adding a new service takes seconds" },
      { at: 16.0, text: "Name, category, price — and it's live on the booking page instantly" },
    ],
    steps: async () => {
      await page.goto("/dashboard/manager/services");
      await page.getByText("active services").waitFor();
      await pause(page, 1600);

      await page.mouse.wheel(0, 500);
      await pause(page, 1300);
      await page.mouse.wheel(0, -500);
      await pause(page, 900);

      // Add a new service
      await humanClick(page, page.getByRole("button", { name: "+ New Service" }));
      await page.getByText("New Service", { exact: true }).waitFor();
      await pause(page, 500);
      await humanType(page, page.getByPlaceholder("e.g. Cut & Dye"), "Kids Barbing");
      await humanType(page, page.getByPlaceholder("e.g. Men's Haircut"), "Men's Haircut");
      await humanType(page, page.getByPlaceholder("5000"), "2500");
      await pause(page, 600);
      await humanClick(page, page.getByRole("button", { name: "Create Service" }));
      await page.getByText("Kids Barbing").waitFor();
      await pause(page, 1800);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
