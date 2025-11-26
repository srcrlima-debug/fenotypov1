
-- Adicionar comentários na tabela audit_logs
COMMENT ON TABLE public.audit_logs IS 'Registro de auditoria de ações administrativas no sistema. Logs são imutáveis e apenas admins podem visualizar.';

COMMENT ON COLUMN public.audit_logs.user_id IS 'Usuário que executou a ação';
COMMENT ON COLUMN public.audit_logs.action IS 'Tipo de ação executada (ex: create_session, delete_training)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Tipo de recurso afetado (ex: session, training)';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'ID do recurso afetado';
COMMENT ON COLUMN public.audit_logs.details IS 'Detalhes adicionais da ação em formato JSON';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'Endereço IP de onde a ação foi executada';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'User agent do navegador/cliente que executou a ação';

-- Adicionar políticas explícitas de UPDATE e DELETE (sempre negam acesso)
-- Logs de auditoria são imutáveis por design
CREATE POLICY "Audit logs are immutable - no updates allowed"
  ON public.audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs are immutable - no deletes allowed"
  ON public.audit_logs
  FOR DELETE
  USING (false);
