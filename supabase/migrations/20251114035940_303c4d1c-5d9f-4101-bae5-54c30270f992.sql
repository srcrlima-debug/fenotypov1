-- Add admin authorization checks to session control functions

CREATE OR REPLACE FUNCTION public.start_session(session_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Add admin check
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE public.sessions
  SET 
    current_photo = 1,
    photo_start_time = now(),
    session_status = 'active'
  WHERE id = session_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_photo(session_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Add admin check
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE public.sessions
  SET 
    current_photo = current_photo + 1,
    photo_start_time = now(),
    session_status = 'active'
  WHERE id = session_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.show_results(session_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Add admin check
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE public.sessions
  SET session_status = 'showing_results'
  WHERE id = session_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.restart_current_photo(session_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_photo_id integer;
BEGIN
  -- Add admin check
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  -- Get current photo
  SELECT current_photo INTO current_photo_id
  FROM public.sessions
  WHERE id = session_id_param;

  -- Delete all responses for current photo
  DELETE FROM public.avaliacoes
  WHERE session_id = session_id_param
    AND foto_id = current_photo_id;

  -- Reset photo start time and set status to active
  UPDATE public.sessions
  SET 
    photo_start_time = now(),
    session_status = 'active'
  WHERE id = session_id_param;
END;
$$;