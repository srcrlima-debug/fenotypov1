-- ============================================
-- ETAPA 0: BACKUP E ANÁLISE DE IMPACTO
-- ============================================

-- 0.1 - Criar backup de sessões órfãs
CREATE TABLE IF NOT EXISTS sessions_pre_migration_backup AS 
SELECT 
  *,
  NOW() as backup_timestamp,
  'pre_orphan_migration' as backup_reason
FROM sessions 
WHERE training_id IS NULL;

-- 0.2 - Backup de RLS policies
CREATE TABLE IF NOT EXISTS rls_policy_backup AS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check,
  NOW() as backup_timestamp
FROM pg_policies 
WHERE tablename = 'sessions' 
  AND policyname LIKE '%view%';

-- 0.3 - Análise de impacto
DO $$
DECLARE
  v_orphan_count INT;
  v_admin_count INT;
  v_oldest_date TIMESTAMPTZ;
  v_newest_date TIMESTAMPTZ;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(DISTINCT created_by),
    MIN(created_at),
    MAX(created_at)
  INTO v_orphan_count, v_admin_count, v_oldest_date, v_newest_date
  FROM sessions 
  WHERE training_id IS NULL;
  
  RAISE NOTICE '=== ANÁLISE DE IMPACTO ===';
  RAISE NOTICE 'Sessões órfãs: %', v_orphan_count;
  RAISE NOTICE 'Admins afetados: %', v_admin_count;
  RAISE NOTICE 'Sessão mais antiga: %', v_oldest_date;
  RAISE NOTICE 'Sessão mais recente: %', v_newest_date;
END $$;

-- ============================================
-- ETAPA 1: MIGRAÇÃO AUTOMÁTICA COMPLETA
-- ============================================

DO $$
DECLARE
  v_training_id UUID;
  v_admin_id UUID;
  v_affected_sessions INT;
BEGIN
  -- 1.1 - Buscar admin que criou a sessão órfã
  SELECT created_by INTO v_admin_id
  FROM sessions 
  WHERE training_id IS NULL 
  LIMIT 1;

  -- 1.2 - Fallback: buscar primeiro admin do sistema
  IF v_admin_id IS NULL THEN
    SELECT user_id INTO v_admin_id
    FROM user_roles 
    WHERE role = 'admin'::app_role 
    LIMIT 1;
  END IF;

  -- Validar que temos um admin
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum admin encontrado no sistema';
  END IF;

  -- 1.3 - Criar treinamento padrão
  INSERT INTO trainings (nome, data, descricao, status, created_by)
  VALUES (
    'Sessões Migradas Automaticamente', 
    CURRENT_DATE,
    'Treinamento criado automaticamente durante migração do sistema. Sessões antigas sem vínculo foram agrupadas aqui para manter compatibilidade.',
    'active',
    v_admin_id
  )
  RETURNING id INTO v_training_id;

  -- 1.4 - Migrar TODAS as sessões órfãs
  UPDATE sessions 
  SET 
    training_id = v_training_id,
    updated_at = NOW()
  WHERE training_id IS NULL;

  GET DIAGNOSTICS v_affected_sessions = ROW_COUNT;

  -- 1.5 - Log detalhado
  RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA ===';
  RAISE NOTICE 'Treinamento criado: %', v_training_id;
  RAISE NOTICE 'Sessões migradas: %', v_affected_sessions;
  RAISE NOTICE 'Admin responsável: %', v_admin_id;

  -- 1.6 - Validação imediata
  IF EXISTS (SELECT 1 FROM sessions WHERE training_id IS NULL) THEN
    RAISE EXCEPTION 'FALHA CRÍTICA: Ainda existem sessões órfãs após migração!';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro durante migração: %', SQLERRM;
END $$;

-- ============================================
-- ETAPA 2: RLS SEGURA + CONSTRAINT PREVENTIVO
-- ============================================

-- 2.1 - Dropar policy insegura
DROP POLICY IF EXISTS "Users can view trainings they participate in" ON sessions;

-- 2.2 - Criar policy segura
CREATE POLICY "Users can view sessions (secure)"
ON sessions FOR SELECT
USING (
  -- Admin pode ver tudo
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Participante do treinamento
  is_training_participant(auth.uid(), training_id)
  OR 
  -- APENAS criador pode ver órfãs (caso apareçam)
  (training_id IS NULL AND created_by = auth.uid())
);

-- 2.3 - Constraint preventivo (NÃO PERMITIR NOVAS ÓRFÃS)
ALTER TABLE sessions 
DROP CONSTRAINT IF EXISTS sessions_must_have_training;

ALTER TABLE sessions 
ADD CONSTRAINT sessions_must_have_training 
CHECK (training_id IS NOT NULL)
NOT VALID;

-- 2.4 - Validar constraint
ALTER TABLE sessions 
VALIDATE CONSTRAINT sessions_must_have_training;

-- 2.5 - Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sessions_training_id 
ON sessions(training_id) 
WHERE training_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_created_by 
ON sessions(created_by);

-- ============================================
-- ETAPA 4: VALIDAÇÃO PÓS-MIGRAÇÃO
-- ============================================

-- 4.1 - Verificar zero sessões órfãs
DO $$
DECLARE
  v_orfas INT;
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_orfas FROM sessions WHERE training_id IS NULL;
  SELECT COUNT(*) INTO v_total FROM sessions;

  IF v_orfas > 0 THEN
    RAISE EXCEPTION '❌ FALHA: Ainda existem % sessões órfãs de um total de %', v_orfas, v_total;
  ELSE
    RAISE NOTICE '✅ SUCESSO: Zero sessões órfãs (total: %)', v_total;
  END IF;
END $$;

-- 4.2 - Verificar integridade referencial
DO $$
DECLARE
  v_invalid INT;
BEGIN
  SELECT COUNT(*) INTO v_invalid
  FROM sessions s
  LEFT JOIN trainings t ON s.training_id = t.id
  WHERE s.training_id IS NOT NULL AND t.id IS NULL;

  IF v_invalid > 0 THEN
    RAISE EXCEPTION '❌ FALHA: % sessões com training_id inválido', v_invalid;
  ELSE
    RAISE NOTICE '✅ SUCESSO: Integridade referencial OK';
  END IF;
END $$;

-- 4.3 - Testar constraint (deve falhar)
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT user_id INTO v_admin_id FROM user_roles WHERE role = 'admin' LIMIT 1;
  
  BEGIN
    INSERT INTO sessions (nome, data, created_by, training_id)
    VALUES ('TESTE CONSTRAINT', CURRENT_DATE, v_admin_id, NULL);
    
    RAISE EXCEPTION '❌ FALHA: Constraint não está funcionando!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✅ SUCESSO: Constraint funcionando - sessões órfãs bloqueadas';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%FALHA%' THEN
        RAISE;
      ELSE
        RAISE NOTICE '✅ SUCESSO: Constraint OK';
      END IF;
  END;
END $$;