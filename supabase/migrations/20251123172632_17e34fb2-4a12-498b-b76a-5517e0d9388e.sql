-- Update the is_session_active function to also allow 'showing_results' status
-- This prevents race condition errors when users vote right as results are being shown
CREATE OR REPLACE FUNCTION public.is_session_active(_session_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE id = _session_id
      AND session_status IN ('waiting', 'active', 'showing_results')
  )
$function$;