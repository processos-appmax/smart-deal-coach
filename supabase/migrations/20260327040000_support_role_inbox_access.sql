-- Add 'suporte' role to enum
ALTER TYPE saas.papel_usuario ADD VALUE IF NOT EXISTS 'suporte';

-- User ↔ Meta inbox account access control
CREATE TABLE IF NOT EXISTS public.meta_inbox_user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.meta_inbox_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, account_id)
);

ALTER TABLE public.meta_inbox_user_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meta_inbox_user_access_all" ON public.meta_inbox_user_access FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_meta_user_access_user ON public.meta_inbox_user_access(usuario_id);
