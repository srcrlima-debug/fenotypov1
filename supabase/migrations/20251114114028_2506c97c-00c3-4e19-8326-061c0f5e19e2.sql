-- Add new demographic fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pertencimento_racial text,
ADD COLUMN IF NOT EXISTS regiao text,
ADD COLUMN IF NOT EXISTS experiencia_bancas text;

-- Update genero column to allow more detailed options (keeping as text for flexibility)
COMMENT ON COLUMN public.profiles.genero IS 'Opções: Mulher cisgênero, Mulher transexual/transgênero, Não binário, Homem cisgênero, Homem transexual/transgênero, Prefiro não responder, Outro';
COMMENT ON COLUMN public.profiles.pertencimento_racial IS 'Opções: Preto, Parda, Indígena, Branco, Amarelo, Outro, Prefiro não responder';
COMMENT ON COLUMN public.profiles.regiao IS 'Região do Brasil: Norte, Nordeste, Centro-Oeste, Sudeste, Sul';
COMMENT ON COLUMN public.profiles.experiencia_bancas IS 'Opções: É minha primeira formação, Já participo de Bancas de heteroidentificação';