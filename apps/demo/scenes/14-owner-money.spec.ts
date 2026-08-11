import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanHover, humanType, pause } from "../lib/human.js";

test("owner — expenses and cash reconciliation", async ({ page }, testInfo) => {
  await loginAs(page, "owner");
  await recordScene(page, testInfo, {
    slug: "14-owner-money",
    order: 7.3,
    title: "Expenses & Cash Control",
    subtitle: "Money out, and the daily drawer count vs what's expected",
    captions: [
      { at: 1.0, text: "Every naira going out is logged — products, bills, supplies" },
      { at: 9.0, text: "Adding an expense takes seconds, categorised for reports" },
      { at: 18.0, text: "And every evening the cash drawer is counted against what the system expects" },
      { at: 24.0, text: "Short days stand out instantly — no more quiet leaks" },
    ],
    steps: async () => {
      await page.goto("/dashboard/owner/expenses");
      await page.getByText("Money out — products, bills, supplies.").waitFor();
      await pause(page, 1800);

      // Add an expense
      await humanClick(page, page.getByRole("button", { name: "Add Expense" }).first());
      await page.getByText("New Expense").waitFor();
      await pause(page, 500);
      await humanType(page, page.getByPlaceholder("0").first(), "15000");
      await humanClick(page, page.getByRole("button", { name: "Electricity", exact: true }));
      await humanType(page, page.getByPlaceholder("e.g. ABC Hair Supplies"), "Ikeja Electric");
      await pause(page, 500);
      await humanClick(page, page.getByRole("button", { name: "Add Expense" }).last());
      await page.getByText("Ikeja Electric").first().waitFor();
      await pause(page, 1800);

      // Cash reconciliations
      await humanClick(page, page.getByRole("link", { name: "Cash" }).first());
      await page.getByText("Cash Reconciliations").waitFor();
      await pause(page, 1600);
      await humanHover(page, page.getByText("Net variance"));
      await pause(page, 1400);
      await page.mouse.wheel(0, 450);
      await pause(page, 2000);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
