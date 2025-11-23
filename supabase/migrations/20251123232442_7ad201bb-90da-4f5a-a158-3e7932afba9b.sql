-- Create feedback table for training sessions
CREATE TABLE public.training_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  experiencia_geral TEXT,
  clareza_instrucoes INTEGER CHECK (clareza_instrucoes >= 1 AND clareza_instrucoes <= 5),
  tempo_adequado INTEGER CHECK (tempo_adequado >= 1 AND tempo_adequado <= 5),
  interface_qualidade INTEGER CHECK (interface_qualidade >= 1 AND interface_qualidade <= 5),
  sugestoes TEXT,
  recomendaria BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.training_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
ON public.training_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.training_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own feedback
CREATE POLICY "Users can update their own feedback"
ON public.training_feedback
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.training_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_training_feedback_session ON public.training_feedback(session_id);
CREATE INDEX idx_training_feedback_user ON public.training_feedback(user_id);

-- Add comment
COMMENT ON TABLE public.training_feedback IS 'Stores participant feedback for training sessions';
