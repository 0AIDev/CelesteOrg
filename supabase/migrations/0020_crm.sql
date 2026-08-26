-- ============================================================================
-- MIGRATION 0020 — Startup CRM & User Feedback Pipeline
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  email        text,
  company      text,
  role         text,
  status       text NOT NULL DEFAULT 'lead'
               CHECK (status IN ('lead', 'beta_tester', 'customer', 'churned')),
  source       text DEFAULT 'manual',        -- 'signup', 'invite', 'webhook', 'manual'
  notes        text,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_status   ON public.crm_contacts (status);
CREATE INDEX IF NOT EXISTS idx_crm_company  ON public.crm_contacts (company);
CREATE INDEX IF NOT EXISTS idx_crm_email    ON public.crm_contacts (email);

CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  rating       int CHECK (rating >= 1 AND rating <= 5),
  category     text DEFAULT 'general'
               CHECK (category IN ('general', 'bug', 'feature_request', 'nps', 'onboarding', 'pricing')),
  content      text NOT NULL,
  source       text DEFAULT 'manual',        -- 'in_app', 'email', 'survey', 'call'
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_contact ON public.customer_feedback (contact_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating  ON public.customer_feedback (rating);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_select" ON public.crm_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crm_update" ON public.crm_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_delete" ON public.crm_contacts FOR DELETE TO authenticated USING (public.is_admin_or_founder());

CREATE POLICY "feedback_select" ON public.customer_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedback_insert" ON public.customer_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "feedback_update" ON public.customer_feedback FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "feedback_delete" ON public.customer_feedback FOR DELETE TO authenticated USING (public.is_admin_or_founder());
