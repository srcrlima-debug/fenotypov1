-- Atualizar perfis existentes para inferir região a partir do estado
-- Norte
UPDATE public.profiles
SET regiao = 'Norte'
WHERE estado IN ('AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO')
  AND (regiao IS NULL OR regiao = '');

-- Nordeste
UPDATE public.profiles
SET regiao = 'Nordeste'
WHERE estado IN ('AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE')
  AND (regiao IS NULL OR regiao = '');

-- Centro-Oeste
UPDATE public.profiles
SET regiao = 'Centro-Oeste'
WHERE estado IN ('DF', 'GO', 'MT', 'MS')
  AND (regiao IS NULL OR regiao = '');

-- Sudeste
UPDATE public.profiles
SET regiao = 'Sudeste'
WHERE estado IN ('ES', 'MG', 'RJ', 'SP')
  AND (regiao IS NULL OR regiao = '');

-- Sul
UPDATE public.profiles
SET regiao = 'Sul'
WHERE estado IN ('PR', 'RS', 'SC')
  AND (regiao IS NULL OR regiao = '');