-- 16_activity_logs.sql
-- Admin audit trail: records key actions across the system.

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   text        NOT NULL DEFAULT '',
  action       text        NOT NULL,
  entity_type  text        NOT NULL,
  entity_id    text,
  entity_label text,
  meta         jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast admin feed queries
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_actor_idx      ON public.activity_logs (actor_id);
CREATE INDEX IF NOT EXISTS activity_logs_action_idx     ON public.activity_logs (action);

-- RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "admin_read_activity_logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Any authenticated user can insert their own log rows
CREATE POLICY "authenticated_insert_activity_logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
