-- Item 3: Criar tabela para rate limiting server-side
-- Rastreia requisições por user_id e IP para prevenir abuso de API

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance de queries de rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint 
ON public.rate_limit_log(user_id, endpoint, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint 
ON public.rate_limit_log(ip_address, endpoint, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start 
ON public.rate_limit_log(window_start);

-- RLS policies para rate_limit_log
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os logs de rate limit
CREATE POLICY "Admins can view all rate limit logs"
ON public.rate_limit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Sistema pode inserir logs (via Edge Function com service role)
CREATE POLICY "System can insert rate limit logs"
ON public.rate_limit_log
FOR INSERT
WITH CHECK (true);

-- Sistema pode atualizar logs (via Edge Function com service role)
CREATE POLICY "System can update rate limit logs"
ON public.rate_limit_log
FOR UPDATE
USING (true);

-- Função para limpar logs antigos (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_log
  WHERE window_start < now() - interval '24 hours';
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_rate_limit_log_updated_at
BEFORE UPDATE ON public.rate_limit_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();