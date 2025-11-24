-- Item 2: Adicionar CHECK constraints para validar tamanho de texto
-- Isso previne ataques de DoS e overflow no banco de dados

-- 1. Validar tamanho do campo experiencia_geral (max 500 caracteres)
ALTER TABLE public.training_feedback
ADD CONSTRAINT experiencia_geral_length 
CHECK (experiencia_geral IS NULL OR length(experiencia_geral) <= 500);

-- 2. Validar tamanho do campo sugestoes (max 1000 caracteres)
ALTER TABLE public.training_feedback
ADD CONSTRAINT sugestoes_length 
CHECK (sugestoes IS NULL OR length(sugestoes) <= 1000);

-- 3. Validar tamanho do campo experiencia_bancas no profiles (max 500 caracteres)
ALTER TABLE public.profiles
ADD CONSTRAINT experiencia_bancas_length 
CHECK (experiencia_bancas IS NULL OR length(experiencia_bancas) <= 500);

-- 4. Validar tamanho da descrição de badges (max 500 caracteres)
ALTER TABLE public.badge_definitions
ADD CONSTRAINT descricao_length 
CHECK (length(descricao) <= 500);

-- 5. Validar tamanho do nome da badge (max 100 caracteres)
ALTER TABLE public.badge_definitions
ADD CONSTRAINT nome_length 
CHECK (length(nome) <= 100);

-- 6. Validar tamanho do critério (max 100 caracteres)
ALTER TABLE public.badge_definitions
ADD CONSTRAINT criterio_length 
CHECK (length(criterio) <= 100);

-- 7. Validar tamanho do ícone (max 50 caracteres - geralmente emoji ou código curto)
ALTER TABLE public.badge_definitions
ADD CONSTRAINT icone_length 
CHECK (length(icone) <= 50);

-- 8. Validar tamanho do nome de sessão (max 200 caracteres)
ALTER TABLE public.sessions
ADD CONSTRAINT nome_session_length 
CHECK (length(nome) <= 200);

-- 9. Validar tamanho do nome de treinamento (max 200 caracteres)
ALTER TABLE public.trainings
ADD CONSTRAINT nome_training_length 
CHECK (length(nome) <= 200);

-- 10. Validar tamanho da descrição de treinamento (max 1000 caracteres)
ALTER TABLE public.trainings
ADD CONSTRAINT descricao_training_length 
CHECK (descricao IS NULL OR length(descricao) <= 1000);

-- 11. Validar campos de texto em profiles (estado, genero, faixa_etaria, etc)
ALTER TABLE public.profiles
ADD CONSTRAINT email_length CHECK (length(email) <= 255);

ALTER TABLE public.profiles
ADD CONSTRAINT estado_length CHECK (length(estado) <= 100);

ALTER TABLE public.profiles
ADD CONSTRAINT genero_length CHECK (length(genero) <= 50);

ALTER TABLE public.profiles
ADD CONSTRAINT faixa_etaria_length CHECK (length(faixa_etaria) <= 50);

ALTER TABLE public.profiles
ADD CONSTRAINT pertencimento_racial_length CHECK (pertencimento_racial IS NULL OR length(pertencimento_racial) <= 100);

ALTER TABLE public.profiles
ADD CONSTRAINT regiao_length CHECK (regiao IS NULL OR length(regiao) <= 100);