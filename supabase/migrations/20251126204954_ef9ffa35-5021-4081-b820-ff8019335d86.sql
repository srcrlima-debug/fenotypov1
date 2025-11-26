
-- Criar função para validar se o tempo da foto ainda está válido
CREATE OR REPLACE FUNCTION public.is_photo_time_valid(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photo_start_time timestamptz;
  v_photo_duration integer;
  v_elapsed_seconds numeric;
BEGIN
  -- Buscar photo_start_time e photo_duration da sessão
  SELECT photo_start_time, photo_duration
  INTO v_photo_start_time, v_photo_duration
  FROM public.sessions
  WHERE id = p_session_id;

  -- Se sessão não existe ou photo_start_time é null, retorna false
  IF v_photo_start_time IS NULL OR v_photo_duration IS NULL THEN
    RETURN false;
  END IF;

  -- Calcular segundos decorridos desde photo_start_time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_photo_start_time));

  -- Retornar true se ainda dentro do tempo, false se expirou
  RETURN v_elapsed_seconds <= v_photo_duration;
END;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.is_photo_time_valid(uuid) IS 
'Valida se o tempo da foto atual ainda está válido para votação. Compara o tempo decorrido desde photo_start_time com photo_duration.';

-- Atualizar RLS policy para incluir validação de tempo
DROP POLICY IF EXISTS "Users can insert avaliacoes" ON public.avaliacoes;

CREATE POLICY "Users can insert avaliacoes"
ON public.avaliacoes
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) 
  AND is_session_active(session_id) 
  AND is_photo_time_valid(session_id)
  AND ((training_id IS NULL) OR is_training_participant(auth.uid(), training_id))
);
