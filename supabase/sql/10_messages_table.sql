-- Chat messages between therapist and parent/guardian
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,        -- "{therapistId}_{guardianId}_{patientId}"
  sender_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id      uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  content         text NOT NULL CHECK (length(trim(content)) > 0),
  created_at      timestamptz DEFAULT now(),
  read_at         timestamptz
);

CREATE INDEX IF NOT EXISTS messages_conv_idx      ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_receiver_idx  ON public.messages (receiver_id, read_at);

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they sent or received
DROP POLICY IF EXISTS "messages: participants read" ON public.messages;
CREATE POLICY "messages: participants read"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can only send messages as themselves
DROP POLICY IF EXISTS "messages: sender insert" ON public.messages;
CREATE POLICY "messages: sender insert"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can mark their own received messages as read
DROP POLICY IF EXISTS "messages: mark read" ON public.messages;
CREATE POLICY "messages: mark read"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Admin full access
DROP POLICY IF EXISTS "messages: admin all" ON public.messages;
CREATE POLICY "messages: admin all"
  ON public.messages FOR ALL
  USING (public.get_my_role() = 'admin');
