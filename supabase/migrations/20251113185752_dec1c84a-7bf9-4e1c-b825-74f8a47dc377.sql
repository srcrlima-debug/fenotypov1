-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (NEVER store roles on profiles table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view sessions (to allow users to access via shared link)
CREATE POLICY "Anyone can view sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can create sessions
CREATE POLICY "Admins can create sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can update/delete sessions
CREATE POLICY "Admins can update sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create avaliacoes table
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  foto_id INTEGER NOT NULL,
  resposta TEXT NOT NULL CHECK (resposta IN ('DEFERIDO', 'INDEFERIDO', 'NÃO_RESPONDIDO')),
  tempo_gasto INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own avaliacoes
CREATE POLICY "Users can view their own avaliacoes"
ON public.avaliacoes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own avaliacoes
CREATE POLICY "Users can insert their own avaliacoes"
ON public.avaliacoes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all avaliacoes
CREATE POLICY "Admins can view all avaliacoes"
ON public.avaliacoes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for better performance
CREATE INDEX idx_avaliacoes_session_user ON public.avaliacoes(session_id, user_id);
CREATE INDEX idx_avaliacoes_session ON public.avaliacoes(session_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Create trigger for automatic timestamp updates on sessions
CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();