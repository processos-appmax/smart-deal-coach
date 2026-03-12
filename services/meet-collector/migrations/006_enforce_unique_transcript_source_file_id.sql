-- Keep only one conference linked to each transcript_source_file_id.
-- For duplicates, keep the most recently updated row and reset the others to NEW.
WITH ranked AS (
  SELECT
    id,
    conference_key,
    transcript_source_file_id,
    ROW_NUMBER() OVER (
      PARTITION BY transcript_source_file_id
      ORDER BY updated_at DESC, created_at DESC, conference_key DESC
    ) AS rn
  FROM appmax.meet_conferences
  WHERE transcript_source_file_id IS NOT NULL
)
UPDATE appmax.meet_conferences mc
SET
  status = 'NEW',
  transcript_source_file_id = NULL,
  transcript_copied_file_id = NULL,
  attempts = mc.attempts + 1,
  error = 'transcrição desvinculada automaticamente: duplicidade de source_file_id',
  updated_at = now()
FROM ranked r
WHERE mc.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_meet_conferences_transcript_source_file_id
  ON appmax.meet_conferences(transcript_source_file_id)
  WHERE transcript_source_file_id IS NOT NULL;
