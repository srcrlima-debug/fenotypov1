-- Habilitar realtime para a tabela avaliacoes
ALTER TABLE public.avaliacoes REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime (se ainda não estiver)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'avaliacoes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.avaliacoes;
    END IF;
END $$;