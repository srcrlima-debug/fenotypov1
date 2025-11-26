-- Permitir que qualquer pessoa veja treinamentos ativos (necessário para página de cadastro/login)
CREATE POLICY "Anyone can view active trainings" 
ON public.trainings 
FOR SELECT 
USING (status = 'active');