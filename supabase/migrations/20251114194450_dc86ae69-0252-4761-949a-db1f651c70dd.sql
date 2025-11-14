-- Habilitar realtime para a tabela profiles
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;