-- Create badge_definitions table to store available badges
CREATE TABLE public.badge_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text NOT NULL,
  icone text NOT NULL,
  criterio text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_badges table to track which users earned which badges
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badge_definitions
CREATE POLICY "Everyone can view badge definitions"
ON public.badge_definitions
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage badge definitions"
ON public.badge_definitions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all user badges"
ON public.user_badges
FOR SELECT
USING (true);

CREATE POLICY "System can insert badges"
ON public.user_badges
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all badges"
ON public.user_badges
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default badge definitions
INSERT INTO public.badge_definitions (nome, descricao, icone, criterio) VALUES
  ('Feedback Detalhado', 'Escreveu uma experiência detalhada com mais de 200 caracteres', 'FileText', 'experiencia_geral_200'),
  ('Crítico Construtivo', 'Forneceu sugestões detalhadas com mais de 300 caracteres', 'Lightbulb', 'sugestoes_300'),
  ('Avaliador Completo', 'Preencheu todas as avaliações e comentários', 'CheckCircle', 'completo'),
  ('Feedbacker Ativo', 'Deixou feedback em 3 ou mais sessões', 'Award', 'feedback_3_sessions'),
  ('Primeiro Feedback', 'Seu primeiro feedback enviado!', 'Star', 'primeiro_feedback');

-- Create function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(_user_id uuid, _session_id uuid, _feedback_data jsonb)
RETURNS TABLE(badge_id uuid, badge_nome text, badge_descricao text, badge_icone text, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_record RECORD;
  user_badge_exists boolean;
  feedback_count integer;
  experiencia_length integer;
  sugestoes_length integer;
  is_complete boolean;
BEGIN
  -- Extract data from jsonb
  experiencia_length := COALESCE(length(_feedback_data->>'experiencia_geral'), 0);
  sugestoes_length := COALESCE(length(_feedback_data->>'sugestoes'), 0);
  is_complete := (
    (_feedback_data->>'rating') IS NOT NULL AND
    (_feedback_data->>'clareza_instrucoes') IS NOT NULL AND
    (_feedback_data->>'tempo_adequado') IS NOT NULL AND
    (_feedback_data->>'interface_qualidade') IS NOT NULL AND
    experiencia_length > 50 AND
    sugestoes_length > 50
  );
  
  -- Count user's total feedbacks
  SELECT COUNT(*) INTO feedback_count
  FROM public.training_feedback
  WHERE user_id = _user_id;
  
  -- Check each badge criterion
  FOR badge_record IN SELECT * FROM public.badge_definitions LOOP
    user_badge_exists := EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = _user_id AND badge_id = badge_record.id
    );
    
    -- Check if user deserves this badge
    IF (
      (badge_record.criterio = 'experiencia_geral_200' AND experiencia_length >= 200) OR
      (badge_record.criterio = 'sugestoes_300' AND sugestoes_length >= 300) OR
      (badge_record.criterio = 'completo' AND is_complete) OR
      (badge_record.criterio = 'feedback_3_sessions' AND feedback_count >= 3) OR
      (badge_record.criterio = 'primeiro_feedback' AND feedback_count = 1)
    ) THEN
      -- Award badge if not already awarded
      IF NOT user_badge_exists THEN
        INSERT INTO public.user_badges (user_id, badge_id, session_id)
        VALUES (_user_id, badge_record.id, _session_id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
      
      -- Return badge info
      RETURN QUERY SELECT 
        badge_record.id,
        badge_record.nome,
        badge_record.descricao,
        badge_record.icone,
        NOT user_badge_exists;
    END IF;
  END LOOP;
END;
$$;