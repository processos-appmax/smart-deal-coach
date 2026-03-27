CREATE TABLE IF NOT EXISTS public.meta_bulk_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.meta_inbox_accounts(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT,
  fallback_template TEXT,
  total_rows INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  fallback_sent_count INTEGER DEFAULT 0,
  rows_detail JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meta_bulk_send_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meta_bulk_send_logs_all" ON public.meta_bulk_send_logs FOR ALL USING (true) WITH CHECK (true);
