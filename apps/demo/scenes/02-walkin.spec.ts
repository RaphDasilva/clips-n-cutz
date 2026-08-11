import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanType, pause } from "../lib/human.js";

test("walk-in — client + visit in under 30 seconds", async ({ page }, testInfo) => {
  await loginAs(page, "manager");
  await recordScene(page, testInfo, {
    slug: "02-walkin",
    order: 2,
    title: "The 30-Second Walk-in",
    subtitle: "Name, phone, services — client and visit created instantly",
    captions: [
      { at: 1.0, text: "A client walks in — the manager taps Walk-in and types their name" },
      { at: 9.0, text: "Pick the services from the full salon menu" },
      { at: 16.0, text: "Assign the staff member — commission is tracked automatically" },
      { at: 22.0, text: "One tap: client record, visit and follow-up all created" },
    ],
    steps: async () => {
      await page.goto("/dashboard/manager/walk-in");
      await page.getByText("New Walk-in").waitFor();
      await pause(page, 1000);

      await humanType(page, page.getByPlaceholder("e.g. Emeka Obi"), "Adaeze Nwankwo");
      await humanType(
        page,
        page.getByPlaceholder("08012345678 — leave blank if not given"),
        "08123457890",
      );

      // Default staff
      const staffSelect = page.locator("select").first();
      await humanClick(page, staffSelect);
      await staffSelect.selectOption({ label: "Tunde Bello" });
      await pause(page, 700);

      // Pick services
      await humanClick(page, page.getByRole("button", { name: /Add services for this visit/ }));
      await page.getByText("Select services").waitFor();
      await pause(page, 600);
      await humanClick(page, page.getByRole("button", { name: /^Barbing/ }));
      await humanClick(page, page.getByRole("button", { name: /^Washing/ }).first());
      await humanClick(page, page.getByRole("button", { name: "Done" }));
      await pause(page, 1000);

      // Log the visit
      await humanClick(page, page.getByRole("button", { name: /Log Visit/ }));
      await page.getByText("Visit Logged").waitFor();
      await page.getByText("Follow-up scheduled in 7 days").waitFor();
      await pause(page, 2000);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
