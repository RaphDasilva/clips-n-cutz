import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanType, pause } from "../lib/human.js";

test("staff — book a client and check earnings history", async ({ page }, testInfo) => {
  await loginAs(page, "staff");
  await recordScene(page, testInfo, {
    slug: "19-staff-book",
    order: 8.5,
    title: "Staff Book & Earnings",
    subtitle: "Staff book their own clients and track every naira earned",
    captions: [
      { at: 1.0, text: "A regular calls their barber directly? Staff book them in themselves" },
      { at: 12.0, text: "The client is auto-assigned to that staff member — confirmation sent" },
      { at: 19.0, text: "And the history page shows every service and the commission on each" },
    ],
    steps: async () => {
      await page.goto("/dashboard/staff/book");
      await page.getByText("Book Appointment", { exact: true }).first().waitFor();
      await pause(page, 1400);

      await humanType(page, page.getByPlaceholder("e.g. Halima Bello"), "Chidera Ike");
      await humanType(page, page.getByPlaceholder("0803 000 0000"), "08123456701");

      const timeSelect = page.locator("select").first();
      await humanClick(page, timeSelect);
      await timeSelect.selectOption({ label: "2:00 PM" });
      await pause(page, 600);

      await humanClick(page, page.getByRole("button", { name: "+ Select services" }));
      await page.getByText("Select services").first().waitFor();
      await pause(page, 500);
      await humanClick(page, page.getByRole("button", { name: /^Barbing/ }));
      await humanClick(page, page.getByRole("button", { name: "Done" }));
      await pause(page, 800);

      await humanClick(page, page.getByRole("button", { name: "Book Appointment", exact: true }));
      await page.getByText("Appointment Booked").waitFor();
      await pause(page, 1800);

      // Earnings history
      await page.goto("/dashboard/staff/history");
      await page.getByRole("heading", { name: "My Earnings" }).waitFor();
      await pause(page, 1800);
      await page.mouse.wheel(0, 500);
      await pause(page, 2000);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
