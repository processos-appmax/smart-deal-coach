CREATE SCHEMA IF NOT EXISTS appmax;

CREATE TABLE IF NOT EXISTS appmax.run_conference_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_key text NULL,
  status_code integer NOT NULL,
  ok boolean NOT NULL DEFAULT false,
  duplicated boolean NULL,
  error text NULL,
  request_ip text NULL,
  user_agent text NULL,
  request_query jsonb NULL,
  request_body jsonb NULL,
  response_payload jsonb NULL,
  duration_ms integer NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_run_conference_logs_created_at
  ON appmax.run_conference_api_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_run_conference_logs_conference_key
  ON appmax.run_conference_api_logs(conference_key, created_at DESC);
