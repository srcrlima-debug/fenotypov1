-- Remove a view sessions_public que não está em uso e expõe dados publicamente
DROP VIEW IF EXISTS public.sessions_public CASCADE;