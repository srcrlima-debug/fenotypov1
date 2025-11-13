-- Adicionar campos do perfil do avaliador na tabela avaliacoes
ALTER TABLE public.avaliacoes
ADD COLUMN genero text,
ADD COLUMN faixa_etaria text,
ADD COLUMN regiao text;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.avaliacoes.genero IS 'Gênero do avaliador no momento da avaliação';
COMMENT ON COLUMN public.avaliacoes.faixa_etaria IS 'Faixa etária do avaliador no momento da avaliação';
COMMENT ON COLUMN public.avaliacoes.regiao IS 'Região/Estado do avaliador no momento da avaliação';