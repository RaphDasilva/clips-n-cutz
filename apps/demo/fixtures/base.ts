import { test as base, expect, type Page } from "@playwright/test";
import { applyNetworkMocks } from "../stubs/network-mocks.js";
import { CURSOR_INIT_SCRIPT } from "../lib/human.js";
import { MANAGER, OWNER, STAFF_DEMO } from "../seed/fixtures.js";

export type Role = "manager" | "owner" | "staff";

const ROLE_USER: Record<Role, { id: string; name: string; phone: string }> = {
  manager: MANAGER,
  owner: OWNER,
  staff: STAFF_DEMO,
};

/**
 * Seeds the localStorage session the app's AuthGuard reads, so a scene
 * can start straight on a dashboard without re-recording the login flow.
 * (All /api/* calls are network-mocked, so no real auth ever happens.)
 */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const u = ROLE_USER[role];
  const session = {
    user: {
      id: u.id,
      name: u.name,
      phone: u.phone,
      role,
      mustChangePIN: false,
      actualRole: role,
    },
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  };
  await page.addInitScript((s) => {
    window.localStorage.setItem("cnc_session", JSON.stringify(s));
    window.localStorage.setItem("cnc_theme", "dark");
    // Hide the staff "what's new" announcement banner for clean takes.
    window.localStorage.setItem("cnc_seen_announcement_v1_book", "1");
  }, session);
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    page.on("dialog", (dialog) => {
      void dialog.accept("yes");
    });
    await applyNetworkMocks(page);
    await page.addInitScript(CURSOR_INIT_SCRIPT);
    // Deterministic dark theme even before login helpers run.
    await page.addInitScript(() => {
      window.localStorage.setItem("cnc_theme", "dark");
    });
    await use(page);
  },
});

export { expect };
