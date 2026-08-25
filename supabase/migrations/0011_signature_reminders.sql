-- ============================================================================
-- 0011 — Daily signature reminders (pg_cron → POST /api/reminders)
-- ----------------------------------------------------------------------------
-- Runs every day at 08:00 UTC. Calls the app's /api/reminders endpoint,
-- which nudges signers whose requests have been pending > 3 days:
-- in-app notification always, plus email when RESEND is configured.
--
-- ⚠️ BEFORE RUNNING, replace:
--     https://YOUR-APP-URL   → your deployed app URL (e.g. https://celeste.app)
--     YOUR_WEBHOOK_SECRET    → the WEBHOOK_SECRET value from .env.local
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'signature-reminders-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url    := 'https://YOUR-APP-URL/api/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'YOUR_WEBHOOK_SECRET'
    ),
    body   := jsonb_build_object('days', 3)
  ) as request_id;
  $$
);

-- Inspect / manage later:
--   select * from cron.job;
--   select cron.unschedule('signature-reminders-daily');
