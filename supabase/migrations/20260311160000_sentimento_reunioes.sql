-- Add 'sentimento' column to reunioes for relationship level tracking
-- Values: Positivo, Neutro, Negativo, Preocupado, Frustrado

ALTER TABLE saas.reunioes
  ADD COLUMN IF NOT EXISTS sentimento text;

-- Optional: add a CHECK constraint for valid values
ALTER TABLE saas.reunioes
  ADD CONSTRAINT reunioes_sentimento_check
  CHECK (sentimento IS NULL OR sentimento IN ('Positivo', 'Neutro', 'Negativo', 'Preocupado', 'Frustrado'));

-- Index for filtering by sentiment
CREATE INDEX IF NOT EXISTS idx_reunioes_sentimento ON saas.reunioes (sentimento) WHERE sentimento IS NOT NULL;
