-- 1. Remover constraint antiga primeiro
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_genero_check;

-- 2. Atualizar valores existentes para o novo formato
UPDATE public.profiles 
SET genero = CASE 
  WHEN genero = 'Masculino' THEN 'Homem cisgênero'
  WHEN genero = 'Feminino' THEN 'Mulher cisgênero'
  WHEN genero = 'Prefiro não informar' THEN 'Prefiro não responder'
  ELSE genero
END
WHERE genero IN ('Masculino', 'Feminino', 'Prefiro não informar');

-- 3. Adicionar nova constraint com valores detalhados
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_genero_check 
CHECK (genero = ANY (ARRAY[
  'Mulher cisgênero'::text,
  'Mulher transexual/transgênero'::text,
  'Não binário'::text,
  'Homem cisgênero'::text,
  'Homem transexual/transgênero'::text,
  'Outro'::text,
  'Prefiro não responder'::text
]));