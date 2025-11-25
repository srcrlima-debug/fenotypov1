-- Habilitar RLS nas tabelas de backup criadas
ALTER TABLE sessions_pre_migration_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE rls_policy_backup ENABLE ROW LEVEL SECURITY;

-- Policies: apenas admins podem acessar backups
CREATE POLICY "Admins can view backup tables"
ON sessions_pre_migration_backup FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view policy backups"
ON rls_policy_backup FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));