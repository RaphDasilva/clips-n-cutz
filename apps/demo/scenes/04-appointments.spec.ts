import { test, loginAs } from "../fixtures/base.js";
import { recordScene } from "../lib/scene.js";
import { humanClick, pause } from "../lib/human.js";

test("appointments — check in turns a booking into a visit", async ({ page }, testInfo) => {
  await loginAs(page, "manager");
  await recordScene(page, testInfo, {
    slug: "04-appointments",
    order: 4,
    title: "Appointments",
    subtitle: "Every booking in one list — check in with one tap",
    captions: [
      { at: 1.0, text: "Every booking — online or by phone — lands in one list" },
      { at: 5.5, text: "Switch between today and upcoming days" },
      { at: 11.0, text: "When the client arrives, tap Check In" },
      { at: 17.0, text: "Assign the staff, confirm — the booking becomes a paid visit" },
    ],
    steps: async () => {
      await page.goto("/dashboard/manager/appointments");
      await page.getByText("View and manage all bookings").waitFor();
      await pause(page, 1800);

      await humanClick(page, page.getByRole("button", { name: "Upcoming" }));
      await pause(page, 1600);
      await humanClick(page, page.getByRole("button", { name: "Today", exact: true }));
      await pause(page, 1200);

      // Check in the 3pm client
      await humanClick(page, page.getByRole("button", { name: "Check In" }).first());
      await page.getByText("Client Arrived").waitFor();
      await pause(page, 800);

      const defaultStaff = page.locator("form select").first();
      await humanClick(page, defaultStaff);
      await defaultStaff.selectOption({ label: "Ngozi Okonkwo" });
      await pause(page, 900);

      await humanClick(page, page.getByRole("button", { name: "Confirm Check-In" }));
      await page.getByText("Checked in successfully.").waitFor();
      await pause(page, 1800);
      await page.waitForTimeout(5000); // VO padding
    },
  });
});
