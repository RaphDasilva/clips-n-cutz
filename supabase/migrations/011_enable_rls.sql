-- ============================================================
-- 011_enable_rls.sql
-- Clips N'Cutz Salon CRM — Lock down database with RLS
-- Built by LVD Labs · lvdlabs.io
-- ============================================================
-- Enables Row Level Security on every public table.
--
-- The Next.js API routes use the Supabase service_role key
-- (server-side only) which BYPASSES RLS — so all app
-- functionality keeps working. The anon key, which is exposed
-- in browser code by design, will no longer be able to read or
-- modify any data directly.
--
-- No policies are added: with RLS enabled and no policy in
-- place, anon access is denied by default. This is exactly
-- what we want — the only path to data is through our own
-- authenticated API routes.
-- ============================================================

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_requests     ENABLE ROW LEVEL SECURITY;
