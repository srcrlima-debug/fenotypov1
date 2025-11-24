# Sistema de Audit Logging

## Visão Geral

O Sistema de Audit Logging registra todas as ações administrativas críticas realizadas na plataforma, fornecendo uma trilha de auditoria completa para fins de segurança, conformidade e análise.

## Componentes

### 1. Banco de Dados

**Tabela: `audit_logs`**

Armazena todos os registros de auditoria com as seguintes informações:

- `id`: Identificador único do log
- `user_id`: ID do usuário que realizou a ação
- `action`: Tipo de ação realizada (ex: create_session, delete_training)
- `resource_type`: Tipo de recurso afetado (session, training, training_participant)
- `resource_id`: ID do recurso específico
- `details`: Informações adicionais em formato JSON
- `ip_address`: Endereço IP do usuário
- `user_agent`: Navegador/dispositivo usado
- `created_at`: Timestamp da ação

**Índices para Performance:**
- `idx_audit_logs_user_id`: Busca por usuário
- `idx_audit_logs_resource`: Busca por tipo e ID de recurso
- `idx_audit_logs_created_at`: Busca por data (ordenada)
- `idx_audit_logs_action`: Busca por tipo de ação

### 2. Edge Function

**Função: `audit-log`**

Responsável por receber e processar requisições de logging de auditoria.

**Segurança:**
- Requer autenticação JWT
- Valida permissões de admin
- Extrai automaticamente IP e User Agent

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/audit-log`

### 3. Cliente Frontend

**Biblioteca: `src/lib/auditLogger.ts`**

Fornece funções helper para facilitar o logging de ações:

```typescript
// Log genérico
await logAuditAction({
  action: 'create_session',
  resourceType: 'session',
  resourceId: sessionId,
  details: { session_name: 'Turma A' }
});

// Helper para sessões
await logSessionAction('start_session', sessionId, {
  session_name: 'Turma A'
});

// Helper para treinamentos
await logTrainingAction('delete_training', trainingId, {
  training_name: 'Treinamento 2024'
});
```

## Ações Registradas

### Ações de Sessão
- `create_session`: Criação de nova sessão
- `update_session`: Atualização de sessão
- `delete_session`: Exclusão de sessão
- `start_session`: Início de sessão ao vivo
- `next_photo`: Avanço para próxima foto
- `restart_photo`: Reinício de foto atual
- `show_results`: Exibição de resultados

### Ações de Treinamento
- `create_training`: Criação de novo treinamento
- `update_training`: Atualização de treinamento
- `delete_training`: Exclusão de treinamento
- `add_training_participant`: Adição de participante
- `remove_training_participant`: Remoção de participante

## Integração nas Páginas Admin

### AdminTrainingSessions.tsx

```typescript
// Ao criar sessão
const { data: newSessionData } = await supabase.from('sessions').insert({...}).select().single();
await logSessionAction('create_session', newSessionData.id, {
  session_name: newSession.nome,
  training_id: trainingId,
});

// Ao deletar sessão
await supabase.from('sessions').delete().eq('id', sessionId);
await logSessionAction('delete_session', sessionId, {
  training_id: trainingId,
});
```

### AdminLiveControl.tsx

```typescript
// Ao iniciar sessão
await supabase.rpc("start_session", { session_id_param: sessionId });
await logSessionAction('start_session', sessionId, {
  session_name: session?.nome,
});

// Ao avançar foto
await supabase.rpc("next_photo", { session_id_param: sessionId });
await logSessionAction('next_photo', sessionId, {
  from_photo: session.current_photo,
  to_photo: session.current_photo + 1,
});
```

## Políticas de Segurança (RLS)

### Visualização de Logs
- Apenas administradores podem visualizar logs de auditoria
- Implementado via policy: `Admins can view all audit logs`

### Inserção de Logs
- Apenas o Service Role pode inserir logs (via Edge Function)
- Implementado via policy: `Service role can insert audit logs`

## Visualização de Logs (Futuro)

Para visualizar os logs de auditoria, os administradores podem acessar a interface administrativa onde podem:

1. Filtrar por:
   - Tipo de ação
   - Tipo de recurso
   - Usuário
   - Data/período

2. Exportar logs em formato CSV para análise externa

3. Ver detalhes completos de cada ação incluindo:
   - Quem realizou
   - Quando realizou
   - De onde (IP/dispositivo)
   - Detalhes específicos da ação

## Consultas Úteis

### Listar últimas 100 ações
```sql
SELECT 
  al.*,
  p.email as user_email
FROM audit_logs al
LEFT JOIN profiles p ON p.user_id = al.user_id
ORDER BY al.created_at DESC
LIMIT 100;
```

### Ações de um usuário específico
```sql
SELECT * FROM audit_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### Ações em um recurso específico
```sql
SELECT * FROM audit_logs
WHERE resource_type = 'session'
  AND resource_id = 'session-uuid'
ORDER BY created_at DESC;
```

### Estatísticas de ações
```sql
SELECT 
  action,
  COUNT(*) as total,
  COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY action
ORDER BY total DESC;
```

## Manutenção

### Limpeza de Logs Antigos

Para manter a performance, considere criar uma rotina de limpeza periódica:

```sql
-- Deletar logs com mais de 1 ano
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

Ou arquivar em uma tabela separada para histórico de longo prazo.

## Conformidade e Privacidade

- Os logs de auditoria contêm dados sensíveis e devem ser protegidos
- Acesso restrito apenas a administradores autorizados
- IPs e User Agents são coletados para fins de segurança
- Considere políticas de retenção de acordo com requisitos legais
- Em caso de GDPR/LGPD, implemente mecanismos de anonimização quando necessário