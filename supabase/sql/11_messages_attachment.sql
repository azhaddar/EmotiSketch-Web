-- Add attachment column to messages for mentioning drawings/graphs/results
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment jsonb;
