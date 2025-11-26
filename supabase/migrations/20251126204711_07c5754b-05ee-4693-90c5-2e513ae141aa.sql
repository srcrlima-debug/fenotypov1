
-- Criar função para criar training e session em transação atômica
CREATE OR REPLACE FUNCTION public.create_session_with_training(
  p_nome text,
  p_data date,
  p_descricao text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_training_id uuid;
  v_session_id uuid;
BEGIN
  -- Inserir training
  INSERT INTO public.trainings (
    nome,
    data,
    descricao,
    created_by,
    status
  ) VALUES (
    p_nome,
    p_data,
    p_descricao,
    p_user_id,
    'active'
  )
  RETURNING id INTO v_training_id;

  -- Inserir session associada ao training
  INSERT INTO public.sessions (
    nome,
    data,
    descricao,
    training_id,
    created_by,
    session_status
  ) VALUES (
    p_nome,
    p_data,
    p_descricao,
    v_training_id,
    p_user_id,
    'waiting'
  )
  RETURNING id INTO v_session_id;

  -- Retornar IDs em formato JSON
  RETURN jsonb_build_object(
    'training_id', v_training_id,
    'session_id', v_session_id
  );
END;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.create_session_with_training(text, date, text, uuid) IS 
'Cria um training e uma session associada em transação atômica. Se qualquer operação falhar, faz rollback automático.';
