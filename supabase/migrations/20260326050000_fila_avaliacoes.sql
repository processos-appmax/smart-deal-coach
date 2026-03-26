-- Queue for automatic evaluation of meetings with new transcriptions
CREATE TABLE IF NOT EXISTS saas.fila_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES saas.empresas(id) ON DELETE CASCADE,
  reuniao_id UUID NOT NULL REFERENCES saas.reunioes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluida', 'erro')),
  tentativas INTEGER DEFAULT 0,
  erro TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  processado_em TIMESTAMPTZ,
  UNIQUE (reuniao_id, status)
);

CREATE INDEX IF NOT EXISTS idx_fila_avaliacoes_status ON saas.fila_avaliacoes(status, criado_em);

ALTER TABLE saas.fila_avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fila_avaliacoes_all" ON saas.fila_avaliacoes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON saas.fila_avaliacoes TO authenticated, anon, service_role;

-- Trigger: auto-enqueue when transcription arrives
CREATE OR REPLACE FUNCTION saas.enfileirar_avaliacao()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.transcricao IS NOT NULL AND LENGTH(NEW.transcricao) > 50)
     AND (OLD.transcricao IS NULL OR OLD.transcricao != NEW.transcricao)
     AND NEW.status = 'concluida'
  THEN
    INSERT INTO saas.fila_avaliacoes (empresa_id, reuniao_id, status)
    VALUES (NEW.empresa_id, NEW.id, 'pendente')
    ON CONFLICT (reuniao_id, status) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enfileirar_avaliacao ON saas.reunioes;
CREATE TRIGGER trg_enfileirar_avaliacao
  AFTER UPDATE OF transcricao ON saas.reunioes
  FOR EACH ROW EXECUTE FUNCTION saas.enfileirar_avaliacao();
