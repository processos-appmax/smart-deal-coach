-- Fix buscar_transcript_file to return transcript_text and meeting_code.

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
    'meeting_code', mc.meeting_code,
    'status', mc.status
  )
  INTO v_result
  FROM appmax.meet_conferences mc
  WHERE mc.conference_key = p_conference_key
  ORDER BY (mc.transcript_text IS NOT NULL AND mc.transcript_text != '') DESC,
           mc.id DESC
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION saas.buscar_transcript_file(text) TO authenticated;

-- Remove the non-appmax participant filter so ALL external meetings are imported.
-- The only filter should be call_interna = false.
CREATE OR REPLACE FUNCTION saas.sincronizar_reunioes(p_empresa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = saas, appmax
AS $$
DECLARE
  v_inserted int := 0;
  v_updated  int := 0;
  v_rec      record;
BEGIN
  FOR v_rec IN
    SELECT
      mc.id                  AS mc_id,
      mc.conference_key,
      mc.meeting_code,
      mc.organizer_email,
      mc.participants,
      mc.title,
      mc.started_at,
      mc.ended_at,
      mc.status              AS mc_status,
      mc.transcript_source_file_id,
      mc.transcript_copied_file_id,
      mc.call_interna
    FROM appmax.meet_conferences mc
    WHERE mc.call_interna = false
  LOOP
    DECLARE
      v_vendedor_id uuid;
      v_duracao     int;
      v_participantes jsonb;
      v_titulo      text;
      v_cliente_email text;
      v_cliente_nome  text;
      v_status      saas.status_reuniao;
      v_existing_id uuid;
    BEGIN
      SELECT u.id INTO v_vendedor_id
      FROM saas.usuarios u
      WHERE u.empresa_id = p_empresa_id
        AND lower(u.email) = lower(v_rec.organizer_email)
      LIMIT 1;

      v_duracao := COALESCE(
        EXTRACT(EPOCH FROM (v_rec.ended_at - v_rec.started_at))::int / 60,
        0
      );

      v_titulo := COALESCE(
        NULLIF(TRIM(v_rec.title), ''),
        'Reunião ' || to_char(v_rec.started_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI')
      );

      IF v_rec.participants IS NOT NULL AND jsonb_typeof(v_rec.participants) = 'array' THEN
        SELECT jsonb_agg(
          CASE
            WHEN jsonb_typeof(elem) = 'string'
            THEN jsonb_build_object('email', elem #>> '{}')
            ELSE elem
          END
        )
        INTO v_participantes
        FROM jsonb_array_elements(v_rec.participants) AS elem;
      ELSE
        v_participantes := '[]'::jsonb;
      END IF;

      SELECT p->>'email' INTO v_cliente_email
      FROM jsonb_array_elements(v_participantes) p
      WHERE (p->>'email') NOT LIKE '%@appmax.com.br'
      LIMIT 1;

      v_cliente_nome := COALESCE(
        (SELECT p->>'name' FROM jsonb_array_elements(v_participantes) p WHERE p->>'email' = v_cliente_email LIMIT 1),
        split_part(COALESCE(v_cliente_email, ''), '@', 1)
      );

      v_status := 'concluida';
      IF v_rec.ended_at IS NULL THEN
        v_status := 'agendada';
      END IF;

      SELECT r.id INTO v_existing_id
      FROM saas.reunioes r
      WHERE r.empresa_id = p_empresa_id
        AND r.google_event_id = v_rec.conference_key;

      IF v_existing_id IS NULL THEN
        INSERT INTO saas.reunioes (
          empresa_id, vendedor_id, titulo, data_reuniao, duracao_minutos,
          cliente_nome, cliente_email, link_meet, status,
          google_event_id, participantes
        ) VALUES (
          p_empresa_id, v_vendedor_id, v_titulo, v_rec.started_at, v_duracao,
          v_cliente_nome, v_cliente_email,
          CASE WHEN v_rec.meeting_code IS NOT NULL
            THEN 'https://meet.google.com/' || v_rec.meeting_code
            ELSE NULL
          END,
          v_status,
          v_rec.conference_key, v_participantes
        );
        v_inserted := v_inserted + 1;
      ELSE
        UPDATE saas.reunioes
        SET duracao_minutos = v_duracao,
            participantes  = v_participantes,
            status         = v_status,
            cliente_nome   = COALESCE(saas.reunioes.cliente_nome, v_cliente_nome),
            cliente_email  = COALESCE(saas.reunioes.cliente_email, v_cliente_email)
        WHERE id = v_existing_id;
        v_updated := v_updated + 1;
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION saas.sincronizar_reunioes(uuid) TO authenticated;
