ALTER TABLE meet_conferences
ADD COLUMN IF NOT EXISTS call_interna boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_meet_conferences_call_interna
ON meet_conferences(call_interna);

