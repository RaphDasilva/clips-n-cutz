import { test } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, humanType, pause } from "../lib/human.js";

function bookingDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toLocaleDateString("en-CA");
}

test("client books an appointment online", async ({ page }, testInfo) => {
  await recordScene(page, testInfo, {
    slug: "03-booking",
    order: 3,
    title: "Clients Book Themselves",
    subtitle: "A public booking page — confirmed on WhatsApp",
    captions: [
      { at: 1.0, text: "Clients book from their phone — no calls, no DMs" },
      { at: 8.0, text: "They pick their services from the live menu with prices" },
      { at: 15.0, text: "Choose a date and time slot" },
      { at: 21.0, text: "Booked — and a WhatsApp confirmation goes out instantly" },
    ],
    steps: async () => {
      await page.goto("/book");
      await page.getByText("Book an Appointment").waitFor();
      await pause(page, 1200);

      await humanType(page, page.getByPlaceholder("e.g. Emeka Obi"), "Chidera Ude");
      await humanType(page, page.getByPlaceholder("08012345678"), "08087654321");

      await humanClick(page, page.getByRole("button", { name: /Choose your services/ }));
      await page.getByText("Select services").waitFor();
      await pause(page, 500);
      await humanClick(page, page.getByRole("button", { name: /^Medium Braids/ }));
      await humanClick(page, page.getByRole("button", { name: "Done" }));
      await pause(page, 800);

      // Date
      const dateInput = page.locator('input[type="date"]');
      await humanClick(page, dateInput);
      await dateInput.fill(bookingDate()); // native date picker — off-camera value set
      await pause(page, 900);

      // Time slot
      await humanClick(page, page.getByRole("button", { name: "2:00 PM", exact: true }));

      await humanClick(page, page.getByRole("button", { name: /Book Appointment/ }));
      await page.getByText("Booking Confirmed!").waitFor();
      await pause(page, 2200);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
