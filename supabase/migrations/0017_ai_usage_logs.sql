-- ============================================================================
-- MIGRATION 0017 — AI Compute & Token Cost Tracker
-- Granular per-call logging with cost estimation for every AI request.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name         text NOT NULL,                -- 'gpt-4o-mini', 'claude-3.5-sonnet', 'llama-3.3-70b', …
  provider           text NOT NULL DEFAULT 'other', -- 'openai', 'anthropic', 'groq', 'nvidia', 'other'
  prompt_tokens      int NOT NULL DEFAULT 0,
  completion_tokens  int NOT NULL DEFAULT 0,
  total_tokens       int GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,  -- per-call cost in USD
  latency_ms         int DEFAULT 0,
  status             text DEFAULT 'ok' CHECK (status IN ('ok', 'error', 'timeout', 'rate_limited')),
  user_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_type       text DEFAULT 'chat',           -- 'chat', 'embedding', 'function_call', 'summary'
  metadata           jsonb DEFAULT '{}',            -- arbitrary extra data
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Indexes for dashboard queries (current month, by model, by user)
CREATE INDEX IF NOT EXISTS idx_ai_logs_created     ON public.ai_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_model       ON public.ai_usage_logs (model_name);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user        ON public.ai_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_cost        ON public.ai_usage_logs (estimated_cost_usd);
CREATE INDEX IF NOT EXISTS idx_ai_logs_provider    ON public.ai_usage_logs (provider);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Any authenticated member can read the logs (internal transparency).
CREATE POLICY "ai_logs_select"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (true);

-- Service role or authenticated users can insert (the app logs its own calls).
CREATE POLICY "ai_logs_insert"
  ON public.ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can delete (audit trail protection).
CREATE POLICY "ai_logs_delete_admin"
  ON public.ai_usage_logs FOR DELETE
  TO authenticated
  USING (public.is_admin_or_founder());

-- ============================================================================
-- REALTIME (optional — enables live cost updates on the dashboard)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ai_usage_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_usage_logs;
  END IF;
END $$;

-- ============================================================================
-- MATERIALIZED VIEW — monthly aggregates (refreshed by the app or cron)
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.ai_usage_monthly AS
SELECT
  date_trunc('day', created_at)::date AS day,
  model_name,
  provider,
  count(*)                            AS call_count,
  sum(prompt_tokens)                  AS total_prompt_tokens,
  sum(completion_tokens)              AS total_completion_tokens,
  sum(total_tokens)                   AS total_tokens,
  sum(estimated_cost_usd)             AS total_cost_usd,
  avg(latency_ms)::int                AS avg_latency_ms
FROM public.ai_usage_logs
WHERE created_at >= date_trunc('month', now())
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_usage_monthly_pk
  ON public.ai_usage_monthly (day, model_name, provider);
