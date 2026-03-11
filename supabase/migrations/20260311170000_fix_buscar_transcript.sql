-- Fix buscar_transcript_file to also return transcript_text
-- so pullTranscriptions() can actually read the transcript content.

CREATE OR REPLACE FUNCTION saas.buscar_transcript_file(p_conference_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = saas, appmax
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'transcript_source_file_id', mc.transcript_source_file_id,
    'transcript_copied_file_id', mc.transcript_copied_file_id,
    'transcript_text', mc.transcript_text,
    'status', mc.status
  )
  INTO v_result
  FROM appmax.meet_conferences mc
  WHERE mc.conference_key = p_conference_key
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION saas.buscar_transcript_file(text) TO authenticated;
