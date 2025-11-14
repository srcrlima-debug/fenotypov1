-- Drop the overly permissive public SELECT policies
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Participants can view session status" ON public.sessions;

-- Create a new policy for authenticated users to view sessions
CREATE POLICY "Authenticated users can view sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (true);

-- Create a view that excludes the created_by field for public access
CREATE OR REPLACE VIEW public.sessions_public AS
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

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.sessions_public TO authenticated;