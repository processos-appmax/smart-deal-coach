-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: inbox_metrics
-- Adds metrics tracking columns to meta_inbox_conversations
-- and creates meta_inbox_metrics_daily for aggregated daily stats
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add metrics columns to meta_inbox_conversations
ALTER TABLE public.meta_inbox_conversations
  ADD COLUMN IF NOT EXISTS total_messages_in integer DEFAULT 0;

ALTER TABLE public.meta_inbox_conversations
  ADD COLUMN IF NOT EXISTS total_messages_out integer DEFAULT 0;

ALTER TABLE public.meta_inbox_conversations
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

ALTER TABLE public.meta_inbox_conversations
  ADD COLUMN IF NOT EXISTS first_response_ms bigint;

ALTER TABLE public.meta_inbox_conversations
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE public.meta_inbox_conversations
  ADD COLUMN IF NOT EXISTS participants_out text[] DEFAULT '{}';

ALTER TABLE public.meta_inbox_conversations
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2. Create meta_inbox_metrics_daily table
CREATE TABLE IF NOT EXISTS public.meta_inbox_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.meta_inbox_accounts(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL,
  date date NOT NULL,
  messages_in integer DEFAULT 0,
  messages_out integer DEFAULT 0,
  conversations_opened integer DEFAULT 0,
  conversations_resolved integer DEFAULT 0,
  avg_first_response_ms bigint,
  max_first_response_ms bigint,
  min_first_response_ms bigint,
  unique_contacts integer DEFAULT 0,
  templates_sent integer DEFAULT 0,
  media_sent integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id, date)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_meta_metrics_daily_account_date
  ON public.meta_inbox_metrics_daily(account_id, date);

CREATE INDEX IF NOT EXISTS idx_meta_conv_account_created
  ON public.meta_inbox_conversations(account_id, created_at);

-- 4. RLS
ALTER TABLE public.meta_inbox_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_inbox_metrics_daily_all"
  ON public.meta_inbox_metrics_daily
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Updated_at trigger (reuse existing function)
CREATE TRIGGER update_meta_inbox_metrics_daily_updated_at
  BEFORE UPDATE ON public.meta_inbox_metrics_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_meta_inbox_updated_at();

-- 6. Function to increment daily metrics
CREATE OR REPLACE FUNCTION public.update_inbox_metric(
  p_account_id uuid,
  p_empresa_id uuid,
  p_date date,
  p_field text,
  p_increment integer DEFAULT 1
) RETURNS void AS $$
BEGIN
  INSERT INTO public.meta_inbox_metrics_daily (account_id, empresa_id, date)
  VALUES (p_account_id, p_empresa_id, p_date)
  ON CONFLICT (account_id, date) DO NOTHING;

  EXECUTE format(
    'UPDATE public.meta_inbox_metrics_daily SET %I = COALESCE(%I, 0) + $1, updated_at = now() WHERE account_id = $2 AND date = $3',
    p_field, p_field
  )
  USING p_increment, p_account_id, p_date;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger: auto-increment conversation metrics on message insert
CREATE OR REPLACE FUNCTION public.inbox_message_metrics_trigger()
RETURNS trigger AS $$
DECLARE
  v_conv_id uuid;
  v_account_id uuid;
  v_empresa_id uuid;
  v_first_inbound timestamptz;
BEGIN
  v_conv_id := NEW.conversation_id;
  v_account_id := NEW.account_id;
  v_empresa_id := NEW.empresa_id;

  IF NEW.from_me THEN
    -- Outbound message
    UPDATE public.meta_inbox_conversations
    SET total_messages_out = COALESCE(total_messages_out, 0) + 1,
        participants_out = CASE
          WHEN NOT (participants_out @> ARRAY[NEW.from_phone])
          THEN array_append(COALESCE(participants_out, '{}'), NEW.from_phone)
          ELSE participants_out END
    WHERE id = v_conv_id;

    -- Track first response time (first outbound after first inbound)
    UPDATE public.meta_inbox_conversations
    SET first_response_at = NEW.timestamp,
        first_response_ms = EXTRACT(EPOCH FROM (NEW.timestamp - last_inbound_ts)) * 1000
    WHERE id = v_conv_id
      AND first_response_at IS NULL
      AND last_inbound_ts IS NOT NULL;

    -- Daily metric
    PERFORM public.update_inbox_metric(v_account_id, v_empresa_id, (NEW.timestamp AT TIME ZONE 'America/Sao_Paulo')::date, 'messages_out');

    -- Track media/template sends
    IF NEW.msg_type IN ('image', 'video', 'audio', 'document') THEN
      PERFORM public.update_inbox_metric(v_account_id, v_empresa_id, (NEW.timestamp AT TIME ZONE 'America/Sao_Paulo')::date, 'media_sent');
    END IF;
    IF NEW.msg_type = 'template' THEN
      PERFORM public.update_inbox_metric(v_account_id, v_empresa_id, (NEW.timestamp AT TIME ZONE 'America/Sao_Paulo')::date, 'templates_sent');
    END IF;
  ELSE
    -- Inbound message
    UPDATE public.meta_inbox_conversations
    SET total_messages_in = COALESCE(total_messages_in, 0) + 1
    WHERE id = v_conv_id;

    -- Daily metric
    PERFORM public.update_inbox_metric(v_account_id, v_empresa_id, (NEW.timestamp AT TIME ZONE 'America/Sao_Paulo')::date, 'messages_in');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inbox_message_metrics ON public.meta_inbox_messages;
CREATE TRIGGER trg_inbox_message_metrics
  AFTER INSERT ON public.meta_inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.inbox_message_metrics_trigger();

-- 8. Trigger: track conversations opened per day
CREATE OR REPLACE FUNCTION public.inbox_conversation_opened_trigger()
RETURNS trigger AS $$
BEGIN
  PERFORM public.update_inbox_metric(NEW.account_id, NEW.empresa_id, (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'conversations_opened');
  PERFORM public.update_inbox_metric(NEW.account_id, NEW.empresa_id, (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'unique_contacts');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inbox_conversation_opened ON public.meta_inbox_conversations;
CREATE TRIGGER trg_inbox_conversation_opened
  AFTER INSERT ON public.meta_inbox_conversations
  FOR EACH ROW EXECUTE FUNCTION public.inbox_conversation_opened_trigger();
