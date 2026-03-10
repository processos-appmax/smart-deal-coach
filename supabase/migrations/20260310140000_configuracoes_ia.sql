-- Tabela para armazenar critérios e prompts de avaliação por IA (por empresa e módulo)
CREATE TABLE IF NOT EXISTS saas.configuracoes_ia (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES saas.empresas(id) ON DELETE CASCADE,
  modulo_codigo text NOT NULL, -- 'whatsapp' ou 'meetings'
  criterios jsonb DEFAULT '[]'::jsonb,
  prompt_sistema text DEFAULT '',
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE(empresa_id, modulo_codigo)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON saas.configuracoes_ia TO anon, authenticated;
