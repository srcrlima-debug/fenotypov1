-- Adicionar campo para identificar votos do administrador
ALTER TABLE public.avaliacoes 
ADD COLUMN is_admin_vote BOOLEAN NOT NULL DEFAULT false;

-- Criar índice para buscas mais rápidas
CREATE INDEX idx_avaliacoes_admin_vote ON public.avaliacoes(session_id, is_admin_vote);