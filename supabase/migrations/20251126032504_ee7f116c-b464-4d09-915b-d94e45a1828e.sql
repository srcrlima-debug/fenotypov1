-- Criar política RLS pública para permitir que qualquer pessoa visualize sessões
-- Isso é necessário para validar links de acesso à sessão antes do login
CREATE POLICY "Public can view sessions for access validation" 
ON public.sessions 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Verificar e garantir que a política de INSERT para admins está correta
-- Esta política permite que apenas administradores criem sessões
DROP POLICY IF EXISTS "Admins can create sessions" ON public.sessions;

CREATE POLICY "Admins can create sessions" 
ON public.sessions 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);