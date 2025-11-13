-- Function to restart current photo (delete responses and reset timer)
CREATE OR REPLACE FUNCTION public.restart_current_photo(session_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_photo_id integer;
BEGIN
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