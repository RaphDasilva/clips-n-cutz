import type { Page, Route } from "@playwright/test";
import {
  CLIENTS,
  CLIENTS_TOTAL,
  MANAGER,
  SERVICES,
  STAFF,
  appointmentRows,
  expensesResponse,
  lagosToday,
  managerAttendance,
  managerTips,
  managerToday,
  ownerChart,
  ownerCommission,
  ownerLapsed,
  ownerReconciliations,
  ownerReport,
  ownerSummary,
  payoutRows,
  payoutsResponse,
  seedAdvances,
  seedDeletions,
  seedExpenses,
  seedPenalties,
  staffBank,
  staffHistory,
  staffNextPayout,
  staffToday,
  type AdvanceFx,
  type ExpenseFx,
  type PenaltyFx,
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

  // Stateful stores so create/confirm/mark-paid flows feel real on camera.
  const addedServices: Array<Record<string, unknown>> = [];
  const attendanceConfirmed = new Map<string, { checked_in_at: string; status: string; penalty_ngn: number }>();
  const advances: AdvanceFx[] = seedAdvances();
  const penalties: PenaltyFx[] = seedPenalties();
  const expenses: ExpenseFx[] = seedExpenses();
  const payouts = payoutRows();
  const deletions = seedDeletions();
  const staffNameById = new Map(STAFF.map((s) => [s.id, s.name]));

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
    if (path === "/api/manager/services" && method === "GET") {
      return json(route, { services: [...SERVICES, ...addedServices] });
    }
    if (path === "/api/manager/services" && method === "POST") {
      const body = req.postDataJSON() as {
        name: string;
        category: string;
        priceNgn: number;
        materialCostNgn?: number;
        sortOrder?: number;
      };
      const row = {
        id: `00000000-0000-4000-8000-9${String(Date.now()).slice(-11)}`,
        name: body.name,
        price_ngn: body.priceNgn,
        material_cost_ngn: body.materialCostNgn ?? 0,
        category: body.category,
        sort_order: body.sortOrder ?? 999,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      addedServices.push(row);
      return json(route, { service: row });
    }
    if (path.startsWith("/api/manager/services/")) return json(route, { ok: true });

    // ── Manager: attendance ──────────────────────────────────
    if (path === "/api/manager/attendance" && method === "GET") {
      const date = url.searchParams.get("date") ?? lagosToday();
      const data = managerAttendance(date);
      const staff = data.staff.map((s) =>
        attendanceConfirmed.has(s.id) ? { ...s, record: attendanceConfirmed.get(s.id)! } : s,
      );
      const pending = data.pending.filter((p) => !attendanceConfirmed.has(p.staff_id));
      return json(route, { staff, pending });
    }
    if (path === "/api/manager/attendance" && method === "POST") {
      const body = req.postDataJSON() as { action: string; staffId: string };
      if (body.action === "confirm") {
        const record = { checked_in_at: "08:58", status: "on_time", penalty_ngn: 0 };
        attendanceConfirmed.set(body.staffId, record);
        return json(route, record);
      }
      return json(route, { ok: true });
    }

    // ── Manager: advances + penalties ────────────────────────
    if (path === "/api/manager/advances" && method === "GET") {
      const outstandingMap = new Map<string, number>();
      for (const a of advances) {
        if (a.status === "outstanding") {
          outstandingMap.set(a.staff_id, (outstandingMap.get(a.staff_id) ?? 0) + a.amount_ngn);
        }
      }
      const outstanding = [...outstandingMap.entries()].map(([staffId, amount]) => ({
        staffId,
        staffName: staffNameById.get(staffId) ?? "Staff",
        outstanding: amount,
      }));
      return json(route, { advances, outstanding });
    }
    if (path === "/api/manager/advances" && method === "POST") {
      const body = req.postDataJSON() as { staffId: string; amountNgn: number; reason: string | null };
      const row: AdvanceFx = {
        id: `00000000-0000-4000-8000-a${String(Date.now()).slice(-11)}`,
        staff_id: body.staffId,
        amount_ngn: body.amountNgn,
        reason: body.reason,
        given_at: lagosToday(),
        status: "outstanding",
        deducted_at: null,
        deducted_payout_id: null,
        users: { name: staffNameById.get(body.staffId) ?? "Staff" },
      };
      advances.unshift(row);
      return json(route, { advance: row });
    }
    if (path === "/api/manager/penalties" && method === "GET") {
      const activeMap = new Map<string, number>();
      for (const p of penalties) {
        if (p.status === "active") {
          activeMap.set(p.staff_id, (activeMap.get(p.staff_id) ?? 0) + p.amount_ngn);
        }
      }
      const activeByStaff = [...activeMap.entries()].map(([staffId, amount]) => ({
        staffId,
        staffName: staffNameById.get(staffId) ?? "Staff",
        activeTotal: amount,
      }));
      return json(route, { penalties, activeByStaff });
    }
    if (path === "/api/manager/penalties" && method === "POST") {
      const body = req.postDataJSON() as { staffId: string; amountNgn: number; reason: string };
      const row: PenaltyFx = {
        id: `00000000-0000-4000-8000-b${String(Date.now()).slice(-11)}`,
        staff_id: body.staffId,
        amount_ngn: body.amountNgn,
        reason: body.reason,
        given_at: lagosToday(),
        status: "active",
        reversed_at: null,
        users: { name: staffNameById.get(body.staffId) ?? "Staff" },
      };
      penalties.unshift(row);
      return json(route, { penalty: row });
    }

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
    if (path.startsWith("/api/manager/")) return json(route, { ok: true });

    // ── Owner ────────────────────────────────────────────────
    if (path === "/api/owner/summary") return json(route, ownerSummary());
    if (path === "/api/owner/chart") {
      return json(route, ownerChart(Number(url.searchParams.get("days") ?? "7")));
    }
    // Note: the deletions page requests "/api/owner/deletions&limit=200"
    // (with "&" instead of "?") in "all" mode, so match by prefix.
    if (path.startsWith("/api/owner/deletions") && !path.includes("/deletions/") && method === "GET") {
      const unack = url.searchParams.get("unack") === "true";
      const items = unack ? deletions.filter((d) => !d.acknowledged_at) : deletions;
      return json(route, { deletions: items });
    }
    if (path.startsWith("/api/owner/deletions/") && method === "PATCH") {
      const id = path.split("/").pop() as string;
      const body = req.postDataJSON() as { acknowledged: boolean };
      const d = deletions.find((x) => x.id === id);
      if (d) d.acknowledged_at = body.acknowledged ? new Date().toISOString() : null;
      return json(route, { ok: true });
    }
    if (path === "/api/owner/lapsed-clients") {
      return json(route, ownerLapsed(Number(url.searchParams.get("days") ?? "30")));
    }
    if (path === "/api/owner/expenses" && method === "GET") {
      return json(route, expensesResponse(expenses));
    }
    if (path === "/api/owner/expenses" && method === "POST") {
      const body = req.postDataJSON() as {
        date: string;
        category: string;
        amountNgn: number;
        vendor: string;
        notes: string;
      };
      expenses.unshift({
        id: `00000000-0000-4000-8000-c${String(Date.now()).slice(-11)}`,
        date: body.date,
        category: body.category,
        amount_ngn: body.amountNgn,
        vendor: body.vendor || null,
        notes: body.notes || null,
        created_at: new Date().toISOString(),
        users: { name: MANAGER.name },
      });
      return json(route, { ok: true });
    }
    if (path.startsWith("/api/owner/expenses/") && method === "DELETE") {
      return json(route, { ok: true });
    }
    if (path === "/api/owner/payouts" && method === "GET") {
      return json(route, payoutsResponse(payouts));
    }
    if (path === "/api/owner/payouts" && method === "POST") {
      const body = req.postDataJSON() as { staffId: string; paidAmount: number; notes: string | null };
      const row = payouts.find((r) => r.staffId === body.staffId);
      if (row) {
        row.status = "paid";
        row.paid_at = new Date().toISOString();
        row.paid_amount_ngn = body.paidAmount;
        row.notes = body.notes;
        row.payoutId = `00000000-0000-4000-8000-d${String(Date.now()).slice(-11)}`;
      }
      return json(route, { ok: true });
    }
    if (path === "/api/owner/reports") return json(route, ownerReport());
    if (path === "/api/owner/commission") return json(route, ownerCommission());
    if (path === "/api/owner/reconciliations") return json(route, ownerReconciliations());
    if (path === "/api/owner/advances") return json(route, { outstanding: [] });
    if (path.startsWith("/api/owner/")) return json(route, { ok: true });

    // ── Staff ────────────────────────────────────────────────
    if (path === "/api/staff/today") return json(route, staffToday());
    if (path === "/api/staff/next-payout") return json(route, staffNextPayout());
    if (path === "/api/staff/bank") return json(route, staffBank());
    if (path === "/api/staff/history") return json(route, staffHistory());
    if (path === "/api/staff/appointments" && method === "POST") return json(route, { ok: true });
    if (path.startsWith("/api/staff/")) return json(route, { ok: true });

    // Anything else: succeed blandly. Never let a request escape
    // to the real server.
    return json(route, { ok: true });
  });
}
