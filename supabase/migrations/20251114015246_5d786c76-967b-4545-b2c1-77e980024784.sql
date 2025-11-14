-- 1. Adicionar constraint único para evitar voto duplicado (user_id + session_id)
ALTER TABLE public.avaliacoes
ADD CONSTRAINT unique_user_session_vote UNIQUE (user_id, session_id, foto_id);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_session_id ON public.avaliacoes(session_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_user_id ON public.avaliacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON public.sessions(created_by);

-- 3. Adicionar função para verificar se usuário é criador da sessão
CREATE OR REPLACE FUNCTION public.is_session_creator(_user_id uuid, _session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE id = _session_id
      AND created_by = _user_id
  )
$$;

-- 4. Adicionar função para verificar se sessão está ativa
CREATE OR REPLACE FUNCTION public.is_session_active(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE id = _session_id
      AND session_status IN ('waiting', 'active')
  )
$$;

-- 5. Atualizar política de inserção de avaliações para verificar se sessão está ativa
DROP POLICY IF EXISTS "Users can insert their own avaliacoes" ON public.avaliacoes;

CREATE POLICY "Users can insert their own avaliacoes" ON public.avaliacoes
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND public.is_session_active(session_id)
);

-- 6. Adicionar política para criadores de sessão visualizarem todas avaliações de suas sessões
CREATE POLICY "Session creators can view all avaliacoes of their sessions" ON public.avaliacoes
FOR SELECT 
USING (
  public.is_session_creator(auth.uid(), session_id)
);