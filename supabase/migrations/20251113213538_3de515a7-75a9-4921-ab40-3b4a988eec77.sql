-- Add real-time control fields to sessions table
ALTER TABLE public.sessions
ADD COLUMN current_photo integer DEFAULT 1,
ADD COLUMN session_status text DEFAULT 'waiting' CHECK (session_status IN ('waiting', 'active', 'showing_results', 'completed')),
ADD COLUMN photo_start_time timestamp with time zone,
ADD COLUMN photo_duration integer DEFAULT 60;

-- Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- Enable realtime for avaliacoes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.avaliacoes;

-- Add policy for participants to view session status
CREATE POLICY "Participants can view session status"
ON public.sessions
FOR SELECT
USING (true);

-- Add policy for admins to update session status
CREATE POLICY "Admins can update session status"
ON public.sessions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to move to next photo
CREATE OR REPLACE FUNCTION public.next_photo(session_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sessions
  SET 
    current_photo = current_photo + 1,
    photo_start_time = now(),
    session_status = 'active'
  WHERE id = session_id_param;
END;
$$;

-- Function to start session
CREATE OR REPLACE FUNCTION public.start_session(session_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sessions
  SET 
    current_photo = 1,
    photo_start_time = now(),
    session_status = 'active'
  WHERE id = session_id_param;
END;
$$;

-- Function to show results
CREATE OR REPLACE FUNCTION public.show_results(session_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sessions
  SET session_status = 'showing_results'
  WHERE id = session_id_param;
END;
$$;