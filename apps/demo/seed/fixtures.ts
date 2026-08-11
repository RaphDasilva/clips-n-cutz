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

export function ownerLapsed() {
  return {
    lapsed: CLIENTS.slice(20, 27).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      last_visit: daysFrom(lagosToday(), -41),
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

export function staffBank() {
  return {
    bank_name: "GTBank",
    bank_account_number: "0123456789",
    bank_account_name: "Tunde Bello",
  };
}
