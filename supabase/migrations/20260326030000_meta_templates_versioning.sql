-- Template versioning: friendly display_name + version number
ALTER TABLE public.meta_inbox_templates
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_meta_tmpl_display ON public.meta_inbox_templates(account_id, display_name, is_active);
