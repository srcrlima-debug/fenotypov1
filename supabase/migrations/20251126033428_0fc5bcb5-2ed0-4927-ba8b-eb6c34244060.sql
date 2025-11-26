-- Create session_access_logs table for audit trail
CREATE TABLE public.session_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  training_id uuid,
  user_id uuid,
  access_type text NOT NULL,
  status text NOT NULL,
  error_message text,
  error_code text,
  url_params jsonb,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_access_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert access logs (for tracking anonymous access attempts)
CREATE POLICY "Anyone can insert access logs" 
ON public.session_access_logs
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Admins can view all access logs
CREATE POLICY "Admins can view access logs" 
ON public.session_access_logs
FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better query performance
CREATE INDEX idx_session_access_logs_session_id ON public.session_access_logs(session_id);
CREATE INDEX idx_session_access_logs_created_at ON public.session_access_logs(created_at DESC);
CREATE INDEX idx_session_access_logs_status ON public.session_access_logs(status);