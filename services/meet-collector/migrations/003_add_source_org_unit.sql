ALTER TABLE meet_conferences
ADD COLUMN IF NOT EXISTS source_org_unit text NULL;

CREATE INDEX IF NOT EXISTS idx_meet_conferences_source_org_unit
ON meet_conferences(source_org_unit);
