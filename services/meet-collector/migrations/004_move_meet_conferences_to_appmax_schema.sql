CREATE SCHEMA IF NOT EXISTS appmax;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'meet_conferences'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'appmax'
      AND table_name = 'meet_conferences'
  ) THEN
    ALTER TABLE public.meet_conferences SET SCHEMA appmax;
  END IF;
END;
$$;
