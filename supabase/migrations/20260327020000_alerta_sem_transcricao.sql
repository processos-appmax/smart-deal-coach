-- Alert owner + supervisor when meeting concludes without transcription

CREATE OR REPLACE FUNCTION saas.alertar_reuniao_sem_transcricao()
RETURNS TRIGGER AS $$
DECLARE
  v_vendedor_id UUID;
  v_supervisor_id UUID;
  v_titulo TEXT;
BEGIN
  -- Only trigger when status changes to 'concluida' and transcricao is null/empty
  IF NEW.status = 'concluida'
     AND (NEW.transcricao IS NULL OR LENGTH(TRIM(NEW.transcricao)) < 10)
     AND (OLD.status IS NULL OR OLD.status != 'concluida')
  THEN
    v_vendedor_id := NEW.vendedor_id;
    v_titulo := COALESCE(NEW.titulo, 'Reunião sem título');

    -- Alert the owner (vendedor)
    IF v_vendedor_id IS NOT NULL THEN
      INSERT INTO saas.notificacoes (empresa_id, usuario_id, tipo, titulo, descricao, link, status)
      VALUES (
        NEW.empresa_id,
        v_vendedor_id,
        'reuniao',
        'Reunião sem transcrição',
        'A reunião "' || v_titulo || '" foi concluída mas não possui transcrição. Verifique se a gravação do Google Meet está habilitada.',
        '/meetings',
        'nao_lida'
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Find and alert the supervisor of the owner's team
    IF v_vendedor_id IS NOT NULL THEN
      SELECT t.supervisor_id INTO v_supervisor_id
      FROM saas.usuarios u
      JOIN saas.times t ON t.id = u.time_id
      WHERE u.id = v_vendedor_id
      LIMIT 1;

      IF v_supervisor_id IS NOT NULL AND v_supervisor_id != v_vendedor_id THEN
        INSERT INTO saas.notificacoes (empresa_id, usuario_id, tipo, titulo, descricao, link, status)
        VALUES (
          NEW.empresa_id,
          v_supervisor_id,
          'reuniao',
          'Reunião sem transcrição',
          'A reunião "' || v_titulo || '" do vendedor foi concluída sem transcrição.',
          '/meetings',
          'nao_lida'
        ) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_alertar_sem_transcricao ON saas.reunioes;
CREATE TRIGGER trg_alertar_sem_transcricao
  AFTER INSERT OR UPDATE OF status ON saas.reunioes
  FOR EACH ROW EXECUTE FUNCTION saas.alertar_reuniao_sem_transcricao();
