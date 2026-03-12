CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS meet_conferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'reports_meet',
  conference_key text NOT NULL UNIQUE,
  meeting_code text NULL,
  organizer_email text NULL,
  participants jsonb NULL,
  title text NULL,
  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  status text NOT NULL DEFAULT 'NEW',
  transcript_source_file_id text NULL,
  transcript_copied_file_id text NULL,
  attempts integer NOT NULL DEFAULT 0,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_meet_conferences_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meet_conferences_updated_at ON meet_conferences;

CREATE TRIGGER trg_meet_conferences_updated_at
BEFORE UPDATE ON meet_conferences
FOR EACH ROW
EXECUTE FUNCTION set_meet_conferences_updated_at();

CREATE INDEX IF NOT EXISTS idx_meet_conferences_status ON meet_conferences(status);
CREATE INDEX IF NOT EXISTS idx_meet_conferences_started_at ON meet_conferences(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meet_conferences_organizer_email ON meet_conferences(organizer_email);
