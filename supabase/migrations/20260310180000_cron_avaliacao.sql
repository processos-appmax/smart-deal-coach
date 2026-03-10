-- Agendar avaliação automática de desempenho todo dia à meia-noite (UTC-3 = 03:00 UTC)
-- Usa pg_cron + pg_net para invocar a Edge Function evaluate-cron

-- Habilitar extensões necessárias
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Agendar cron para 03:00 UTC (meia-noite BRT)
select cron.schedule(
  'avaliar-desempenho-diario',
  '0 3 * * *',  -- Todo dia às 03:00 UTC
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/evaluate-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
