-- Fix Security Definer View issue by recreating sessions_public with security_invoker
-- This ensures the view uses the querying user's RLS policies from the underlying sessions table

DROP VIEW IF EXISTS public.sessions_public;

CREATE VIEW public.sessions_public 
WITH (security_invoker = true) 
AS 
SELECT 
  id,
  nome,
  data,
  session_status,
  current_photo,
  photo_start_time,
  photo_duration,
  created_at,
  updated_at
FROM public.sessions;