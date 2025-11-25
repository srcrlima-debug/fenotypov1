-- Add descricao field to sessions table
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS descricao text;