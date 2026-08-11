// ============================================================
// Deterministic demo data for the Clips N'Cutz demo recorder.
//
// The salon's only Supabase project holds LIVE production data,
// and this machine has no Docker for a local instance — so instead
// of seeding a database, the entire /api/* layer is answered from
// these fixtures at the Playwright network-mock level. Nothing the
// recorder does can touch the real database or send a WhatsApp.
// ============================================================

function uuid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

export function lagosToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

/** ISO timestamp for `HH:MM` Lagos time on today's date. */
export function todayAt(hhmm: string): string {
  return `${lagosToday()}T${hhmm}:00+01:00`;
}

export function daysFrom(base: string, n: number): string {
  const d = new Date(base + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Users ────────────────────────────────────────────────────
export const MANAGER = {
  id: uuid(1),
  name: "Okolo Cajetan",
  phone: "08062510256",
  role: "manager" as const,
};

export const OWNER = {
  id: uuid(2),
  name: "Okolo Cajetan",
  phone: "08062510257",
  role: "owner" as const,
};

export const STAFF_DEMO = {
  id: uuid(10),
  name: "Tunde Bello",
  phone: "08031234501",
  role: "staff" as const,
};

type StaffRow = {
  id: string;
  name: string;
  phone: string;
  role: "staff";
  is_active: boolean;
  must_change_pin: boolean;
  sunday_grace: boolean;
  off_days: number[];
  created_at: string;
  serviceIds: string[];
  categories: string[];
};

const staffBase: Array<[string, string, string[], number[], boolean]> = [
  // [name, phone, categories, off_days, sunday_grace]
  ["Tunde Bello", "08031234501", ["Men's Haircut", "Men's Hair"], [1], false],
  ["Ngozi Okonkwo", "08031234502", ["Women's Natural Hair", "Wigs"], [2], true],
  ["Kemi Adeyemi", "08031234503", ["Wigs", "Pedi & Mani"], [3], false],
  ["Segun Olatunji", "08031234504", ["Men's Haircut", "Locs"], [4], false],
  ["Halima Ibrahim", "08031234505", ["Women's Natural Hair"], [1], false],
  ["Chinedu Eze", "08031234506", ["Locs", "Men's Hair"], [2], false],
  ["Bisi Akande", "08031234507", ["Pedi & Mani"], [5], false],
];

// ── Services ─────────────────────────────────────────────────
export type ServiceFx = {
  id: string;
  name: string;
  price_ngn: number;
  material_cost_ngn: number;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

const serviceBase: Array<[string, number, string]> = [
  ["Barbing", 3500, "Men's Haircut"],
  ["Barb & Dye", 6000, "Men's Haircut"],
  ["Washing", 4000, "Men's Hair"],
  ["Stitch Braids", 15000, "Men's Hair"],
  ["Twist with Extension", 25000, "Men's Hair"],
  ["Treatment", 4000, "Women's Natural Hair"],
  ["Medium Braids", 40000, "Women's Natural Hair"],
  ["Ponytail", 25000, "Women's Natural Hair"],
  ["Medium Ghana Weave", 30000, "Women's Natural Hair"],
  ["Installation Straight Hair", 20000, "Wigs"],
  ["Curly Wig Revamp", 15000, "Wigs"],
  ["Styling", 5000, "Locs"],
  ["Relocking Short Hair", 25000, "Locs"],
  ["Pedicure", 15000, "Pedi & Mani"],
  ["Manicure", 7000, "Pedi & Mani"],
  ["Colored Gel Polish", 6000, "Pedi & Mani"],
];

export const SERVICES: ServiceFx[] = serviceBase.map(([name, price, category], i) => ({
  id: uuid(100 + i),
  name,
  price_ngn: price,
  material_cost_ngn: 0,
  category,
  sort_order: i + 1,
  is_active: true,
  created_at: "2026-01-05T09:00:00+01:00",
}));

export function serviceByName(name: string): ServiceFx {
  const s = SERVICES.find((x) => x.name === name);
  if (!s) throw new Error(`no service fixture named ${name}`);
  return s;
}

const svcIdsFor = (categories: string[]) =>
  SERVICES.filter((s) => categories.includes(s.category)).map((s) => s.id);

export const STAFF: StaffRow[] = staffBase.map(([name, phone, categories, offDays, grace], i) => ({
  id: uuid(10 + i),
  name,
  phone,
  role: "staff",
  is_active: i !== 6 ? true : false, // Bisi shown as Inactive to demo the toggle
  must_change_pin: false,
  sunday_grace: grace,
  off_days: offDays,
  created_at: "2026-02-01T09:00:00+01:00",
  serviceIds: svcIdsFor(categories),
  categories,
}));

// ── Clients ──────────────────────────────────────────────────
const firstNames = [
  "Adaobi", "Tunde", "Funke", "Chinedu", "Aisha", "Bayo", "Ngozi", "Femi",
  "Halima", "Kemi", "Olumide", "Yetunde", "Ifeoma", "Segun", "Bisi", "Tochi",
  "Amaka", "Dapo", "Zainab", "Emeka", "Chiamaka", "Lekan", "Nneka", "Uche", "Sade",
];
const lastNames = [
  "Okafor", "Adesina", "Eze", "Bello", "Adekunle", "Okonkwo", "Adesanya",
  "Ibrahim", "Adeyemi", "Coker", "Lawal", "Nwosu", "Olatunji", "Akande",
  "Madu", "Ogunleye", "Yusuf", "Obi", "Balogun", "Chukwu",
];

export type ClientFx = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const NOTES: Array<string | null> = [
  null, "Prefers Saturday mornings", null, "Sensitive scalp — mild relaxer only",
  null, null, "Always books with Ngozi", null, "Pays by transfer", null,
];

export const CLIENTS: ClientFx[] = Array.from({ length: 50 }, (_, i) => {
  const name = `${firstNames[i % firstNames.length]} ${lastNames[(i * 7 + 3) % lastNames.length]}`;
  const created = daysFrom(lagosToday(), -(i * 5 + 3));
  return {
    id: uuid(500 + i),
    name,
    phone: `080${String(21000000 + i * 137).padStart(8, "0")}`,
    notes: NOTES[i % NOTES.length] ?? null,
    created_at: `${created}T11:30:00+01:00`,
    updated_at: `${created}T11:30:00+01:00`,
  };
});

export const CLIENTS_TOTAL = 214; // "Showing 1–50 of 214"

// ── Manager: Today ───────────────────────────────────────────
export function managerToday() {
  const mk = (
    id: number,
    client: string,
    staffName: string,
    servicesNames: string[],
    total: number,
    tip: number,
    time: string,
    payment: string,
  ) => ({
    id: uuid(700 + id),
    total_ngn: total,
    tip_ngn: tip,
    created_at: todayAt(time),
    payment_method: payment,
    clients: { name: client },
    users: { name: staffName },
    visit_services: servicesNames.map((n) => ({ services: { name: n } })),
  });

  return {
    date: lagosToday(),
    isToday: true,
    visitCount: 6,
    appointmentCount: 4,
    visits: [
      mk(6, "Amaka Eze", "Ngozi Okonkwo", ["Medium Braids"], 40000, 2000, "13:05", "transfer"),
      mk(5, "Bayo Adekunle", "Tunde Bello", ["Barbing"], 3500, 0, "12:40", "cash"),
      mk(4, "Zainab Yusuf", "Kemi Adeyemi", ["Installation Straight Hair"], 20000, 1000, "11:55", "pos"),
      mk(3, "Emeka Obi", "Segun Olatunji", ["Barb & Dye"], 6000, 0, "11:10", "cash"),
      mk(2, "Sade Balogun", "Kemi Adeyemi", ["Pedicure", "Colored Gel Polish"], 21000, 0, "10:20", "transfer"),
      mk(1, "Tochi Madu", "Chinedu Eze", ["Relocking Short Hair"], 25000, 1500, "09:35", "cash"),
    ],
    appointments: [
      { id: uuid(801), scheduled_at: todayAt("15:00"), status: "confirmed", clients: { name: "Ifeoma Nwosu" } },
      { id: uuid(802), scheduled_at: todayAt("16:00"), status: "confirmed", clients: { name: "Dapo Ogunleye" } },
      { id: uuid(803), scheduled_at: todayAt("17:00"), status: "pending", clients: { name: "Yetunde Lawal" } },
      { id: uuid(804), scheduled_at: todayAt("10:00"), status: "completed", clients: { name: "Tochi Madu" } },
    ],
    attendance: { onTime: 5, late: 1, absent: 0, lateStaff: ["Chinedu Eze"], absentStaff: [] },
    pendingCheckins: [],
  };
}

export function managerTips() {
  return {
    breakdown: [
      { staffId: uuid(11), staffName: "Ngozi Okonkwo", tips: 2000 },
      { staffId: uuid(15), staffName: "Chinedu Eze", tips: 1500 },
      { staffId: uuid(12), staffName: "Kemi Adeyemi", tips: 1000 },
    ],
    totalTips: 4500,
  };
}

// ── Manager: Appointments ────────────────────────────────────
export function appointmentRows(filter: string) {
  const mk = (
    id: number,
    client: string,
    phone: string,
    when: string,
    status: string,
    servicesNames: string[],
  ) => ({
    id: uuid(820 + id),
    scheduled_at: when,
    status,
    source: "online",
    clients: { id: uuid(900 + id), name: client, phone },
    appointment_services: servicesNames.map((n) => {
      const s = serviceByName(n);
      return { service_id: s.id, services: { name: s.name, price_ngn: s.price_ngn } };
    }),
    users: null,
  });

  const today = [
    mk(1, "Ifeoma Nwosu", "08021456790", todayAt("15:00"), "confirmed", ["Medium Ghana Weave"]),
    mk(2, "Dapo Ogunleye", "08021873245", todayAt("16:00"), "confirmed", ["Barbing"]),
    mk(3, "Yetunde Lawal", "08021339812", todayAt("17:00"), "pending", ["Pedicure", "Manicure"]),
    mk(4, "Tochi Madu", "08021998341", todayAt("10:00"), "completed", ["Relocking Short Hair"]),
  ];
  const upcoming = [
    mk(5, "Chiamaka Chukwu", "08021554821", `${daysFrom(lagosToday(), 1)}T10:00:00+01:00`, "confirmed", ["Ponytail"]),
    mk(6, "Lekan Balogun", "08021667432", `${daysFrom(lagosToday(), 1)}T14:00:00+01:00`, "pending", ["Barb & Dye"]),
    mk(7, "Nneka Obi", "08021776203", `${daysFrom(lagosToday(), 2)}T11:00:00+01:00`, "confirmed", ["Curly Wig Revamp"]),
    mk(8, "Uche Madu", "08021881190", `${daysFrom(lagosToday(), 3)}T12:00:00+01:00`, "pending", ["Stitch Braids"]),
  ];

  if (filter === "today") return today;
  if (filter === "upcoming") return upcoming;
  return [...today, ...upcoming];
}

// ── Owner ────────────────────────────────────────────────────
export function ownerSummary() {
  return {
    today: { revenue: 115500, tips: 4500, visits: 6, byPayment: { cash: 34500, transfer: 61000, pos: 20000 } },
    yesterday: { revenue: 89000, tips: 3000, visits: 5, byPayment: { cash: 41000, transfer: 30000, pos: 18000 } },
    week: { revenue: 612500, tips: 21500, visits: 38, byPayment: { cash: 251000, transfer: 240500, pos: 121000 } },
    month: { revenue: 2418000, tips: 74000, visits: 149, byPayment: { cash: 980000, transfer: 921000, pos: 517000 } },
    netProfit: { today: 74850, week: 401300, month: 1571600 },
  };
}

export function ownerChart(days: number) {
  const today = lagosToday();
  const weekly = [92000, 74500, 81000, 55000, 118000, 96500, 115500];
  const points = Array.from({ length: days }, (_, i) => {
    const date = daysFrom(today, -(days - 1 - i));
    const revenue =
      days === 7
        ? weekly[i]
        : 45000 + ((i * 9301 + 49297) % 90000) - ((i % 7 === 3) ? 20000 : 0);
    const label = new Date(date + "T12:00:00Z").toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
    });
    return { date, label, revenue: Math.max(18000, Math.round(revenue / 500) * 500) };
  });
  return { points };
}

export function ownerLapsed(days = 30) {
  const count = days >= 90 ? 2 : days >= 60 ? 4 : 7;
  return {
    lapsed: CLIENTS.slice(20, 20 + count).map((c, i) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      last_visit: daysFrom(lagosToday(), -(days + 11 + i * 6)),
    })),
  };
}

// ── Staff view ───────────────────────────────────────────────
export function staffToday() {
  return {
    todayEarnings: 8550,
    todayCommission: 7050,
    todayTips: 1500,
    todayServices: 3,
    services: [
      {
        commission_ngn: 4500,
        price_ngn: 15000,
        material_cost_ngn: 0,
        created_at: todayAt("12:20"),
        services: { name: "Stitch Braids" },
        visits: { visit_date: lagosToday(), clients: { name: "Femi Adesanya" } },
      },
      {
        commission_ngn: 1050,
        price_ngn: 3500,
        material_cost_ngn: 0,
        created_at: todayAt("10:45"),
        services: { name: "Barbing" },
        visits: { visit_date: lagosToday(), clients: { name: "Bayo Adekunle" } },
      },
      {
        commission_ngn: 1500,
        price_ngn: 5000,
        material_cost_ngn: 0,
        created_at: todayAt("09:15"),
        services: { name: "Washing" },
        visits: { visit_date: lagosToday(), clients: { name: "Olumide Coker" } },
      },
    ],
    appointments: [
      { id: uuid(950), scheduled_at: todayAt("15:30"), status: "confirmed", clients: { name: "Dapo Ogunleye" } },
      { id: uuid(951), scheduled_at: todayAt("17:00"), status: "pending", clients: { name: "Lekan Balogun" } },
    ],
    todayPenalty: 0,
    todayAttStatus: "on_time",
    todayCheckedInAt: "08:42",
    checkinStatus: "confirmed",
    bankMissing: false,
  };
}

export function staffNextPayout() {
  const monday = (() => {
    const d = new Date(lagosToday() + "T12:00:00Z");
    const dow = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
    return d.toISOString().slice(0, 10);
  })();
  const sunday = daysFrom(monday, 6);
  return {
    weekStart: monday,
    weekEnd: sunday,
    pending: {
      commission_ngn: 46350,
      tips_ngn: 6500,
      penalty_ngn: 0,
      manual_penalty_ngn: 0,
      advance_ngn: 0,
      total_ngn: 52850,
      alreadyPaid: null,
    },
    advances: [],
    manualPenalties: [],
    history: [
      { week_start: daysFrom(monday, -7), week_end: daysFrom(monday, -1), total_ngn: 48200, paid_at: `${daysFrom(monday, -1)}T19:30:00+01:00`, paid_amount_ngn: 48200 },
      { week_start: daysFrom(monday, -14), week_end: daysFrom(monday, -8), total_ngn: 51750, paid_at: `${daysFrom(monday, -8)}T19:10:00+01:00`, paid_amount_ngn: 51750 },
      { week_start: daysFrom(monday, -21), week_end: daysFrom(monday, -15), total_ngn: 39900, paid_at: `${daysFrom(monday, -15)}T19:45:00+01:00`, paid_amount_ngn: 39900 },
    ],
  };
}

// ── Manager: Attendance ──────────────────────────────────────
export function managerAttendance(date: string) {
  // Weekday-robust: whoever is actually working on the recording day
  // gets the records, so the scene always shows a pending check-in,
  // several on-time staff and exactly one late arrival with a penalty.
  const isToday = date === lagosToday();
  const dow = new Date(date + "T12:00:00").getDay();
  const active = STAFF.filter((s) => s.is_active);
  const working = active.filter((s) => !s.off_days.includes(dow));
  const pendingStaff = isToday && working.length > 1 ? working[working.length - 1] : undefined;
  const lateStaff = working.find((s) => s !== pendingStaff);
  const onTimeTimes = ["08:36", "08:41", "08:55", "09:02", "08:47"];
  let t = 0;
  const staff = active.map((s) => {
    let record: { checked_in_at: string; status: string; penalty_ngn: number } | null = null;
    if (!s.off_days.includes(dow) && s !== pendingStaff) {
      record =
        s === lateStaff
          ? { checked_in_at: "11:22", status: "late", penalty_ngn: 2000 }
          : { checked_in_at: onTimeTimes[t++ % onTimeTimes.length], status: "on_time", penalty_ngn: 0 };
    }
    return {
      id: s.id,
      name: s.name,
      sunday_grace: s.sunday_grace,
      off_days: s.off_days,
      record,
    };
  });
  const pending = pendingStaff
    ? [
        {
          staff_id: pendingStaff.id,
          name: pendingStaff.name,
          sunday_grace: pendingStaff.sunday_grace,
          off_days: pendingStaff.off_days,
          requested_at: todayAt("08:58"),
        },
      ]
    : [];
  return { staff, pending };
}

// ── Manager: Advances + Penalties ────────────────────────────
export type AdvanceFx = {
  id: string;
  staff_id: string;
  amount_ngn: number;
  reason: string | null;
  given_at: string;
  status: "outstanding" | "deducted" | "forgiven";
  deducted_at: string | null;
  deducted_payout_id: string | null;
  users: { name: string };
};

export function seedAdvances(): AdvanceFx[] {
  const today = lagosToday();
  return [
    {
      id: uuid(1300),
      staff_id: STAFF[2].id,
      amount_ngn: 5000,
      reason: "School fees",
      given_at: daysFrom(today, -2),
      status: "outstanding",
      deducted_at: null,
      deducted_payout_id: null,
      users: { name: STAFF[2].name },
    },
    {
      id: uuid(1301),
      staff_id: STAFF[0].id,
      amount_ngn: 8000,
      reason: "Emergency",
      given_at: daysFrom(today, -9),
      status: "deducted",
      deducted_at: daysFrom(today, -8),
      deducted_payout_id: uuid(1401),
      users: { name: STAFF[0].name },
    },
    {
      id: uuid(1302),
      staff_id: STAFF[5].id,
      amount_ngn: 3000,
      reason: null,
      given_at: daysFrom(today, -16),
      status: "deducted",
      deducted_at: daysFrom(today, -15),
      deducted_payout_id: uuid(1402),
      users: { name: STAFF[5].name },
    },
  ];
}

export type PenaltyFx = {
  id: string;
  staff_id: string;
  amount_ngn: number;
  reason: string;
  given_at: string;
  status: "active" | "reversed";
  reversed_at: string | null;
  users: { name: string };
};

export function seedPenalties(): PenaltyFx[] {
  const today = lagosToday();
  return [
    {
      id: uuid(1350),
      staff_id: STAFF[3].id,
      amount_ngn: 1000,
      reason: "Phone use during work",
      given_at: daysFrom(today, -1),
      status: "active",
      reversed_at: null,
      users: { name: STAFF[3].name },
    },
    {
      id: uuid(1351),
      staff_id: STAFF[5].id,
      amount_ngn: 2000,
      reason: "Late opening",
      given_at: daysFrom(today, -10),
      status: "reversed",
      reversed_at: daysFrom(today, -9),
      users: { name: STAFF[5].name },
    },
  ];
}

// ── Owner: Expenses ──────────────────────────────────────────
export type ExpenseFx = {
  id: string;
  date: string;
  category: string;
  amount_ngn: number;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  users: { name: string };
};

export function seedExpenses(): ExpenseFx[] {
  const today = lagosToday();
  const mk = (
    n: number,
    daysAgo: number,
    category: string,
    amount: number,
    vendor: string | null,
    notes: string | null,
  ): ExpenseFx => ({
    id: uuid(1500 + n),
    date: daysFrom(today, -daysAgo),
    category,
    amount_ngn: amount,
    vendor,
    notes,
    created_at: `${daysFrom(today, -daysAgo)}T18:30:00+01:00`,
    users: { name: MANAGER.name },
  });
  return [
    mk(1, 0, "Products", 24500, "Lagos Beauty Supplies", "Relaxers and dye restock"),
    mk(2, 1, "Electricity", 15000, "Ikeja Electric", null),
    mk(3, 3, "Water", 4000, null, null),
    mk(4, 5, "Products", 18000, "Lagos Beauty Supplies", "Braiding hair bundles"),
    mk(5, 6, "Maintenance", 7500, null, "Clipper servicing"),
    mk(6, 8, "Transport", 3000, null, null),
    mk(7, 9, "Marketing", 10000, "Instagram Ads", null),
  ];
}

export function expensesResponse(items: ExpenseFx[]) {
  const byCat = new Map<string, number>();
  let total = 0;
  for (const e of items) {
    total += e.amount_ngn;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount_ngn);
  }
  const byCategory = [...byCat.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { items: [...items].sort((a, b) => (a.date < b.date ? 1 : -1)), byCategory, total };
}

// ── Owner: Payouts ───────────────────────────────────────────
export function currentWeek(): { start: string; end: string } {
  const d = new Date(lagosToday() + "T12:00:00Z");
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  const start = d.toISOString().slice(0, 10);
  return { start, end: daysFrom(start, 6) };
}

const BANKS = ["GTBank", "Access Bank", "Zenith Bank", "UBA", "First Bank", "Kuda"];

export function payoutRows() {
  const base = [
    // [commission, tips, attendance penalty, manual penalty, advance]
    [46350, 6500, 0, 0, 0], // Tunde
    [58200, 4000, 0, 0, 0], // Ngozi
    [39900, 2500, 0, 0, 5000], // Kemi — advance deducted
    [31050, 0, 0, 1000, 0], // Segun — manual penalty
    [27300, 1500, 0, 0, 0], // Halima
    [33450, 2000, 2000, 0, 0], // Chinedu — late penalty
  ];
  return STAFF.filter((s) => s.is_active).map((s, i) => {
    const [commission, tips, penalty, manual, advance] = base[i] ?? base[0];
    const total = commission + tips - penalty - manual - advance;
    return {
      staffId: s.id,
      staffName: s.name,
      bank: {
        bankName: BANKS[i % BANKS.length],
        accountNumber: String(112233440 + i * 1111),
        accountName: s.name,
      },
      commission_ngn: commission,
      tips_ngn: tips,
      penalty_ngn: penalty,
      manual_penalty_ngn: manual,
      advance_ngn: advance,
      total_ngn: total,
      status: "pending" as "pending" | "paid",
      paid_at: null as string | null,
      paid_amount_ngn: null as number | null,
      notes: null as string | null,
      payoutId: null as string | null,
    };
  });
}

export function payoutsResponse(rows: ReturnType<typeof payoutRows>) {
  const week = currentWeek();
  const totalCommission = rows.reduce((s, r) => s + r.commission_ngn, 0);
  const totalTips = rows.reduce((s, r) => s + r.tips_ngn, 0);
  const totalPenalty = rows.reduce((s, r) => s + r.penalty_ngn + r.manual_penalty_ngn, 0);
  const totalPayout = rows.reduce((s, r) => s + r.total_ngn, 0);
  return {
    weekStart: week.start,
    weekEnd: week.end,
    rows,
    summary: {
      totalCommission,
      totalTips,
      totalPenalty,
      totalPayout,
      pendingCount: rows.filter((r) => r.status === "pending").length,
      paidCount: rows.filter((r) => r.status === "paid").length,
    },
  };
}

// ── Owner: Reports + Commission ──────────────────────────────
export function ownerReport() {
  const staffRows = [
    ["Ngozi Okonkwo", 41, 662000, 198600, 21500],
    ["Kemi Adeyemi", 38, 541000, 162300, 14000],
    ["Tunde Bello", 52, 448000, 134400, 12500],
    ["Chinedu Eze", 29, 391000, 117300, 11000],
    ["Segun Olatunji", 33, 236000, 70800, 9000],
    ["Halima Ibrahim", 21, 140000, 42000, 6000],
  ] as const;
  const byStaff = staffRows.map(([name, services, revenue, commission, tips]) => ({
    name,
    services,
    revenue,
    commission,
    tips,
    totalPayout: commission + tips,
  }));
  const byService = [
    { name: "Medium Braids", count: 14, revenue: 560000 },
    { name: "Medium Ghana Weave", count: 12, revenue: 360000 },
    { name: "Relocking Short Hair", count: 13, revenue: 325000 },
    { name: "Installation Straight Hair", count: 15, revenue: 300000 },
    { name: "Twist with Extension", count: 9, revenue: 225000 },
    { name: "Barbing", count: 58, revenue: 203000 },
    { name: "Pedicure", count: 12, revenue: 180000 },
    { name: "Stitch Braids", count: 11, revenue: 165000 },
    { name: "Barb & Dye", count: 16, revenue: 96000 },
    { name: "Washing", count: 6, revenue: 24000 },
  ];
  const totalRevenue = 2418000;
  const totalCommission = 725400;
  const totalTips = 74000;
  const totalExpenses = 82000;
  const totalPenalty = 5000;
  const visits = managerToday().visits.map((v, i) => ({
    id: v.id,
    visit_date: daysFrom(lagosToday(), -(i % 4)),
    total_ngn: v.total_ngn,
    tip_ngn: v.tip_ngn,
    payment_method: v.payment_method,
    clients: { name: v.clients.name, phone: `0802${String(1456790 + i * 3121)}` },
    users: { name: v.users.name },
  }));
  return {
    summary: {
      totalRevenue,
      totalCommission,
      totalTips,
      totalPayout: totalCommission + totalTips - totalPenalty,
      totalProductSales: 0,
      totalExpenses,
      totalPenalty,
      totalCashVariance: -3500,
      netProfit: totalRevenue - totalCommission - totalExpenses + totalPenalty - 3500,
      totalVisits: 149,
      totalServices: 214,
      ownerProfit: totalRevenue - totalCommission,
    },
    byPayment: { cash: 980000, transfer: 921000, pos: 517000 },
    byService,
    byStaff,
    visits,
  };
}

export function ownerCommission() {
  const r = ownerReport();
  return {
    breakdown: r.byStaff.map((s, i) => ({
      staffId: STAFF[i]?.id ?? uuid(1600 + i),
      staffName: s.name,
      servicesCount: s.services,
      totalValue: s.revenue,
      totalCommission: s.commission,
      tips: s.tips,
      totalPayout: s.totalPayout,
    })),
    totalRevenue: r.summary.totalRevenue,
    totalCommission: r.summary.totalCommission,
    totalTips: r.summary.totalTips,
    totalPayout: r.summary.totalCommission + r.summary.totalTips,
    totalServices: r.summary.totalServices,
  };
}

// ── Owner: Reconciliations ───────────────────────────────────
export function ownerReconciliations() {
  const today = lagosToday();
  const mk = (
    n: number,
    daysAgo: number,
    expected: number,
    actual: number,
    notes: string | null,
  ) => ({
    id: uuid(1700 + n),
    date: daysFrom(today, -daysAgo),
    expected_ngn: expected,
    actual_ngn: actual,
    variance_ngn: actual - expected,
    notes,
    recorded_at: `${daysFrom(today, -daysAgo)}T19:45:00+01:00`,
    users: { name: MANAGER.name },
  });
  const items = [
    mk(1, 1, 41000, 41000, null),
    mk(2, 2, 34500, 33000, "₦1,500 short — checking with staff"),
    mk(3, 3, 52000, 52000, null),
    mk(4, 4, 28000, 28500, "Client overpaid, returning change tomorrow"),
    mk(5, 5, 61000, 61000, null),
    mk(6, 6, 45500, 43500, "POS settlement delay"),
    mk(7, 7, 38000, 38000, null),
    mk(8, 8, 47000, 47000, null),
    mk(9, 9, 29500, 29500, null),
    mk(10, 10, 55000, 55000, null),
  ];
  const totalVariance = items.reduce((s, r) => s + r.variance_ngn, 0);
  const shortDays = items.filter((r) => r.variance_ngn < 0).length;
  return { items, totalVariance, shortDays };
}

// ── Owner: Deletions audit ───────────────────────────────────
export function seedDeletions() {
  const today = lagosToday();
  return [
    {
      id: uuid(1800),
      original_visit_id: uuid(1900),
      client_name: "Femi Adesanya",
      client_phone: "08021998877",
      staff_name: "Tunde Bello",
      visit_date: daysFrom(today, -1),
      total_ngn: 3500,
      tip_ngn: 0,
      payment_method: "cash",
      service_names: ["Barbing"],
      reason: "duplicate",
      reason_note: "Logged twice by mistake — same client, same cut.",
      deleted_at: `${daysFrom(today, -1)}T18:05:00+01:00`,
      acknowledged_at: null as string | null,
      users: { name: MANAGER.name },
    },
    {
      id: uuid(1801),
      original_visit_id: uuid(1901),
      client_name: "Sade Balogun",
      client_phone: "08021443322",
      staff_name: "Kemi Adeyemi",
      visit_date: daysFrom(today, -6),
      total_ngn: 21000,
      tip_ngn: 0,
      payment_method: "transfer",
      service_names: ["Pedicure", "Colored Gel Polish"],
      reason: "wrong_amount",
      reason_note: null,
      deleted_at: `${daysFrom(today, -6)}T19:20:00+01:00`,
      acknowledged_at: `${daysFrom(today, -5)}T09:00:00+01:00`,
      users: { name: MANAGER.name },
    },
  ];
}

// ── Staff: history ───────────────────────────────────────────
export function staffHistory() {
  const today = lagosToday();
  const mk = (serviceName: string, clientName: string, price: number) => ({
    serviceName,
    clientName,
    earnings: Math.round(price * 0.3),
    price,
    materialCost: 0,
  });
  const grouped = [
    {
      date: today,
      entries: [
        mk("Stitch Braids", "Femi Adesanya", 15000),
        mk("Barbing", "Bayo Adekunle", 3500),
        mk("Washing", "Olumide Coker", 4000),
      ],
      tip: 1500,
      dayEarnings: Math.round((15000 + 3500 + 4000) * 0.3) + 1500,
    },
    {
      date: daysFrom(today, -1),
      entries: [
        mk("Barbing", "Emeka Obi", 3500),
        mk("Barb & Dye", "Lekan Balogun", 6000),
        mk("Twist with Extension", "Tochi Madu", 25000),
      ],
      tip: 2000,
      dayEarnings: Math.round((3500 + 6000 + 25000) * 0.3) + 2000,
    },
    {
      date: daysFrom(today, -2),
      entries: [mk("Barbing", "Dapo Ogunleye", 3500), mk("Stitch Braids", "Uche Madu", 15000)],
      tip: 1000,
      dayEarnings: Math.round((3500 + 15000) * 0.3) + 1000,
    },
    {
      date: daysFrom(today, -3),
      entries: [
        mk("Barbing", "Chinedu Eze", 3500),
        mk("Barbing", "Bayo Adekunle", 3500),
        mk("Washing", "Zainab Yusuf", 4000),
      ],
      tip: 2000,
      dayEarnings: Math.round((3500 + 3500 + 4000) * 0.3) + 2000,
    },
  ];
  const totalCommission = grouped.reduce(
    (s, g) => s + g.entries.reduce((x, e) => x + e.earnings, 0),
    0,
  );
  const totalTips = grouped.reduce((s, g) => s + g.tip, 0);
  return {
    totalEarnings: totalCommission + totalTips,
    totalCommission,
    totalTips,
    totalServices: grouped.reduce((s, g) => s + g.entries.length, 0),
    grouped,
  };
}

export function staffBank() {
  return {
    bank_name: "GTBank",
    bank_account_number: "0123456789",
    bank_account_name: "Tunde Bello",
  };
}
