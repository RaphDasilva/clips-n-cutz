import type { Page, Route } from "@playwright/test";
import {
  CLIENTS,
  CLIENTS_TOTAL,
  MANAGER,
  SERVICES,
  STAFF,
  appointmentRows,
  lagosToday,
  managerTips,
  managerToday,
  ownerChart,
  ownerLapsed,
  ownerSummary,
  staffBank,
  staffNextPayout,
  staffToday,
} from "../seed/fixtures.js";

// EVERY request to /api/* is answered locally from fixtures.
// The Next.js server never sees an API call, so the recorder can
// never touch the live salon database or send a real WhatsApp.

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function applyNetworkMocks(page: Page): Promise<void> {
  // Mutable copy of staff active-state so the Team toggle feels real.
  const activeState = new Map(STAFF.map((s) => [s.id, s.is_active]));
  const addedStaff: Array<Record<string, unknown>> = [];

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    // ── Auth ─────────────────────────────────────────────────
    if (path === "/api/auth/login" && method === "POST") {
      return json(route, {
        user: {
          id: MANAGER.id,
          name: MANAGER.name,
          phone: MANAGER.phone,
          role: "manager",
          mustChangePIN: false,
          actualRole: "manager",
        },
      });
    }
    if (path.startsWith("/api/auth/")) return json(route, { ok: true });

    // ── Public booking ───────────────────────────────────────
    if (path === "/api/public/services") return json(route, { services: SERVICES });
    if (path === "/api/book" && method === "POST") {
      const body = req.postDataJSON() as {
        date: string;
        timeLabel: string;
        serviceIds: string[];
      };
      const names = SERVICES.filter((s) => body.serviceIds.includes(s.id))
        .map((s) => s.name)
        .join(", ");
      const displayDate = new Date(body.date + "T12:00:00").toLocaleDateString("en-NG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return json(route, { displayDate, timeLabel: body.timeLabel, serviceNames: names });
    }

    // ── Manager ──────────────────────────────────────────────
    if (path === "/api/manager/today") return json(route, managerToday());
    if (path === "/api/manager/tips") return json(route, managerTips());
    if (path === "/api/manager/services") return json(route, { services: SERVICES });

    if (path === "/api/manager/staff" && method === "GET") {
      const staff = [
        ...STAFF.map((s) => ({ ...s, is_active: activeState.get(s.id) ?? s.is_active })),
        ...addedStaff,
      ];
      return json(route, { staff });
    }
    if (path === "/api/manager/staff" && method === "POST") {
      const body = req.postDataJSON() as { name: string; phone: string; offDays?: number[] };
      const row = {
        id: `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, "0")}`,
        name: body.name,
        phone: body.phone,
        role: "staff",
        is_active: true,
        must_change_pin: true,
        sunday_grace: false,
        off_days: body.offDays ?? [],
        created_at: new Date().toISOString(),
        serviceIds: [],
        categories: [],
      };
      addedStaff.push(row);
      activeState.set(row.id, true);
      return json(route, { staff: row });
    }
    if (path.startsWith("/api/manager/staff/") && method === "PATCH") {
      const id = path.split("/").pop() as string;
      const body = req.postDataJSON() as { action?: string };
      if (body.action === "toggle") {
        const next = !(activeState.get(id) ?? true);
        activeState.set(id, next);
        return json(route, { is_active: next });
      }
      if (body.action === "toggle-sunday-grace") return json(route, { sunday_grace: true });
      if (body.action === "set-off-days") {
        const b = req.postDataJSON() as { offDays: number[] };
        return json(route, { off_days: b.offDays });
      }
      return json(route, { ok: true });
    }

    if (path === "/api/manager/appointments" && method === "GET") {
      return json(route, appointmentRows(url.searchParams.get("filter") ?? "today"));
    }
    if (path === "/api/manager/appointments" && method === "POST") return json(route, { ok: true });
    if (path.startsWith("/api/manager/appointments/")) return json(route, { ok: true });

    if (path === "/api/manager/clients") {
      const q = url.searchParams.get("q")?.toLowerCase();
      if (q) {
        const matches = CLIENTS.filter(
          (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q),
        );
        return json(route, { clients: matches, total: matches.length, pageSize: 50 });
      }
      return json(route, { clients: CLIENTS, total: CLIENTS_TOTAL, pageSize: 50 });
    }

    if (path === "/api/manager/walkin" && method === "POST") {
      const body = req.postDataJSON() as {
        clientName: string;
        lines: Array<{ priceNgn: number }>;
      };
      const total = body.lines.reduce((s, l) => s + (l.priceNgn || 0), 0);
      return json(route, {
        clientName: body.clientName,
        totalNgn: total,
        serviceCount: body.lines.length,
      });
    }

    if (path === "/api/manager/reconciliation" && method === "GET") {
      return json(route, { expected: 34500, visitCount: 3, record: null });
    }
    if (path === "/api/manager/penalties") return json(route, { penalties: [] });
    if (path === "/api/manager/advances") return json(route, { advances: [] });
    if (path.startsWith("/api/manager/")) return json(route, { ok: true });

    // ── Owner ────────────────────────────────────────────────
    if (path === "/api/owner/summary") return json(route, ownerSummary());
    if (path === "/api/owner/chart") {
      return json(route, ownerChart(Number(url.searchParams.get("days") ?? "7")));
    }
    if (path === "/api/owner/deletions") return json(route, { deletions: [] });
    if (path === "/api/owner/lapsed-clients") return json(route, ownerLapsed());
    if (path === "/api/owner/advances") return json(route, { outstanding: [] });
    if (path.startsWith("/api/owner/")) return json(route, { ok: true });

    // ── Staff ────────────────────────────────────────────────
    if (path === "/api/staff/today") return json(route, staffToday());
    if (path === "/api/staff/next-payout") return json(route, staffNextPayout());
    if (path === "/api/staff/bank") return json(route, staffBank());
    if (path.startsWith("/api/staff/")) return json(route, { ok: true });

    // Anything else: succeed blandly. Never let a request escape
    // to the real server.
    return json(route, { ok: true });
  });
}
