# CLAUDE.md — Clips N'Cutz Salon CRM

## Built By
LVD Labs (Legacy Vision Dynamics Ltd)
AI systems and automation agency · Abuja, Nigeria · Working globally
Founder: Raphael Okolo
Website: lvdlabs.io
Email: hello@lvdlabs.io

## What This Project Is
A salon management CRM for Clips N'Cutz Unisex Salon, Lagos Nigeria.
Client: Okolo Cajetan (owner and manager).
Built as a free case study — goal is a paid template sold to
other Nigerian salons through LVD Labs.

## How I Work
I am not a developer. I work entirely through Claude Code prompts.
- Always explain what you are doing and why, in plain language
- Never assume I know developer terms without explaining them
- After each major step, tell me exactly what to do next
- One feature at a time — never jump ahead

## Tech Stack
- Framework:  Next.js 15, App Router, TypeScript strict mode
- Styling:    Tailwind CSS — mobile-first always
- Database:   Supabase (Postgres)
- Auth:       Custom — phone number + 4-digit PIN, no email
- WhatsApp:   Twilio WhatsApp API
                Sandbox number during dev: whatsapp:+14155238886
                Salon's live number after approval: +2348062510256
- Hosting:    Vercel (primary)
- Timezone:   Africa/Lagos (WAT, UTC+1)
- Currency:   Nigerian Naira (NGN, ₦) — integers only, no decimals

## Role System — Critical
Three roles. Same URL. Completely different dashboard per role.

  owner   → Okolo Cajetan: financial view (revenue, commission, reports)
            read-only — cannot manage operations

  manager → Okolo Cajetan: full operational control (bookings,
            service log, clients) — cannot see commission calculations

  staff   → their own data only (appointments, services, earnings)
            cannot see other staff or any revenue figures

Session: JSON in localStorage, expires after 8 hours.
On expiry: redirect to /login and ask for PIN again.

## Database — Key Relationships
  visits           → one completed salon visit (walk-in or booked)
  visit_services   → many services performed within one visit
  appointments     → pre-booked slots (become a visit when completed)
  clients          → every person who has visited the salon
  follow_ups       → WhatsApp messages scheduled 7 days after a visit
  whatsapp_messages → log of every message sent via Twilio

Commission: always exactly 30% of service price. Hardcoded.

## Walk-in Flow
Cajetan taps Walk-in → enters name + phone + service(s)
→ system creates client record + visit + visit_services instantly
No appointment needed. Must complete in under 30 seconds.

## Staff Management (manager dashboard — Team section)
Cajetan manages all staff accounts from a Team section.

  ADDING STAFF
  Cajetan enters: name, phone number, initial 4-digit PIN
  → creates a new row in users table with role = 'staff'
  → staff can log in immediately with that PIN
  → staff should change their PIN on first login

  REMOVING STAFF
  NEVER delete a staff record — historical commission and
  service data must be preserved.
  Cajetan toggles is_active = false.
  Inactive staff: cannot log in, hidden from all dropdowns,
  but all their historical data remains intact for reports.
  UI shows a simple Active / Inactive toggle per staff member.

  MANAGER PIN RESET
  If a staff member forgets their PIN, Cajetan can reset it
  from the Team section — without knowing the current PIN.
  Cajetan enters a new PIN for that staff member → system
  overwrites the pin_hash in the users table.

## PIN Change — Self Service (all roles)
Every user (owner, manager, staff) can change their own PIN
from within their dashboard — no manager needed.

  Flow:
  1. User taps Change PIN (in profile/settings section)
  2. Enters their CURRENT PIN (verification step — required)
  3. Enters new 4-digit PIN
  4. Confirms new PIN (must match)
  5. System verifies current PIN against stored hash
  6. If correct → hashes new PIN → updates pin_hash in database
  7. If wrong → shows error → user tries again

  Key distinction:
  Self-service change → requires current PIN (security)
  Manager reset       → no current PIN needed (for forgotten PINs)

  API route: POST /api/auth/change-pin

## Initial Staff Setup
Before launch, create migration file 003_seed_users.sql to
insert Cajetan and all 7 staff members at once.
Required from client before this file can be written:
  - Full name of each staff member
  - Phone number of each staff member
  - Starting PIN for each (they will change it themselves)

## WhatsApp Messages
  Booking confirmation  → immediately on appointment creation
  Reminder 24h before   → day before scheduled appointment
  Reminder 2h before    → morning of appointment
  Follow-up             → 7 days after a completed visit:
    "Hi [name], hope you loved your [service].
     Ready for your next appointment? Book here 👇 [link]"

## Client Details
  Business:   Clips N'Cutz Unisex Salon
  Type:       Unisex hair salon (Beauty Lounge)
  Owner:      Okolo Cajetan (owner and primary daily user of the system)
  Staff:      7 people, all paid 30% commission per service
  WhatsApp:   +2348062510256
  Instagram:  @_clipsncutz
  Location:   Lagos, Nigeria

## Services and Prices (NGN)
  Barbing              3,500
  Barb & Dye           6,000
  Hair Washing         4,000
  Revamping            7,000
  Braids              10,000
  Pedicure & Manicure 20,000
  Stitches            12,000
  Tint                15,000
  Facials             40,000
  Dread               60,000

## Design Rules
  - Mobile-first — staff use phones between clients
  - Simple enough for non-technical staff (Cajetan sets the bar)
  - Dark, professional design
  - Brand colors: extracted from the Clips N'Cutz logo file
    DO NOT invent colors. Read the logo file first, extract the
    exact palette, and use those colors throughout the entire UI.
  - Plain English — no tech or salon jargon

## What Not to Build in MVP
  - Social media management
  - Payroll or tax calculations
  - Inventory management
  - Payment processing integration
  - Loyalty points system
  - Multi-branch support

## File Structure
  app/                  → Next.js pages and layouts
  app/api/              → API routes
  components/           → shared UI components
  lib/supabase/         → client.ts (browser) and server.ts (server)
  lib/twilio.ts         → Twilio WhatsApp helper
  lib/auth.ts           → PIN hashing and session helpers
  supabase/migrations/  → SQL files — run in Supabase SQL editor
  types/database.ts     → TypeScript types for all database tables

## How to Run
  npm run dev           → local development on localhost:3000
  Push to GitHub        → Vercel auto-deploys

## Attribution
  All code and systems built by LVD Labs · lvdlabs.io
  © 2026 Legacy Vision Dynamics Ltd
