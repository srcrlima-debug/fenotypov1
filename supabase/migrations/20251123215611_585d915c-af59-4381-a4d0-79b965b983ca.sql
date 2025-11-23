-- Create trainings table
CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  descricao TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived'))
);

-- Enable RLS on trainings
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

-- Create training_participants table
CREATE TABLE public.training_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  genero TEXT NOT NULL,
  faixa_etaria TEXT NOT NULL,
  estado TEXT NOT NULL,
  pertencimento_racial TEXT,
  regiao TEXT,
  experiencia_bancas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(training_id, user_id)
);

-- Enable RLS on training_participants
ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;

-- Add training_id to sessions
ALTER TABLE public.sessions ADD COLUMN training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE;

-- Add training_id to avaliacoes
ALTER TABLE public.avaliacoes ADD COLUMN training_id UUID REFERENCES public.trainings(id) ON DELETE CASCADE;

-- Create function to check if user is participant of a training
CREATE OR REPLACE FUNCTION public.is_training_participant(_user_id UUID, _training_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.training_participants
    WHERE user_id = _user_id
      AND training_id = _training_id
  )
$$;

-- RLS Policies for trainings
CREATE POLICY "Admins can manage all trainings"
ON public.trainings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view trainings they participate in"
ON public.trainings
FOR SELECT
USING (is_training_participant(auth.uid(), id));

-- RLS Policies for training_participants
CREATE POLICY "Admins can manage all training participants"
ON public.training_participants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own participation"
ON public.training_participants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can register for active trainings"
ON public.training_participants
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.trainings
    WHERE id = training_id AND status = 'active'
  )
);

-- Update sessions RLS to consider training_id
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON public.sessions;

CREATE POLICY "Users can view sessions of trainings they participate in"
ON public.sessions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_training_participant(auth.uid(), training_id)
);

-- Update avaliacoes RLS to consider training_id
DROP POLICY IF EXISTS "Users can insert their own avaliacoes" ON public.avaliacoes;

CREATE POLICY "Users can insert avaliacoes in trainings they participate in"
ON public.avaliacoes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND is_session_active(session_id)
  AND is_training_participant(auth.uid(), training_id)
);

-- Trigger for trainings updated_at
CREATE TRIGGER update_trainings_updated_at
BEFORE UPDATE ON public.trainings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();