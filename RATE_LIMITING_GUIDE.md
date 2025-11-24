# 🛡️ Guia de Rate Limiting Server-Side

## Visão Geral

Sistema de rate limiting server-side implementado para prevenir abuso de API e ataques DDoS. O sistema rastreia requisições por `user_id` (se autenticado) e `IP address` (se não autenticado).

## Componentes

### 1. Tabela de Banco de Dados: `rate_limit_log`

Armazena logs de requisições para rastreamento e controle.

**Campos:**
- `id` (uuid): Identificador único
- `user_id` (uuid, nullable): ID do usuário autenticado
- `ip_address` (text): Endereço IP do cliente
- `endpoint` (text): Nome do endpoint sendo acessado
- `request_count` (integer): Número de requisições na janela atual
- `window_start` (timestamptz): Início da janela de tempo
- `created_at` / `updated_at`: Timestamps de auditoria

**Índices para Performance:**
- `idx_rate_limit_user_endpoint`: user_id + endpoint + window_start
- `idx_rate_limit_ip_endpoint`: ip_address + endpoint + window_start
- `idx_rate_limit_window_start`: window_start

**RLS Policies:**
- Admins podem visualizar todos os logs
- Sistema pode inserir/atualizar logs (via Edge Function com service role)

### 2. Edge Function: `check-rate-limit`

Valida se uma requisição deve ser permitida baseado nos limites configurados.

**Endpoint:** `/functions/v1/check-rate-limit`

**Método:** POST

**Request Body:**
```json
{
  "endpoint": "submit-avaliacao",
  "maxRequests": 30,
  "windowMinutes": 1
}
```

**Response Success (200):**
```json
{
  "allowed": true,
  "remaining": 25,
  "resetAt": "2025-11-24T15:30:00.000Z"
}
```

**Response Rate Limited (429):**
```json
{
  "allowed": false,
  "remaining": 0,
  "resetAt": "2025-11-24T15:30:00.000Z",
  "message": "Rate limit exceeded. Max 30 requests per 1 minute(s). Try again after ..."
}
```

### 3. Helper Frontend: `rateLimiter.ts`

Funções utilitárias para facilitar uso do rate limiting no frontend.

## Como Usar

### Método 1: Verificação Manual

```typescript
import { checkRateLimit } from "@/lib/rateLimiter";
import { useToast } from "@/hooks/use-toast";

const handleSubmit = async () => {
  const { toast } = useToast();
  
  // Verificar rate limit
  const rateLimitResult = await checkRateLimit({
    endpoint: 'my-critical-operation',
    maxRequests: 10,
    windowMinutes: 1,
  });

  if (!rateLimitResult.allowed) {
    toast({
      title: "Muitas requisições",
      description: rateLimitResult.message,
      variant: "destructive",
    });
    return;
  }

  // Prosseguir com a operação
  await performOperation();
};
```

### Método 2: Wrapper Automático

```typescript
import { withRateLimit } from "@/lib/rateLimiter";

const handleSubmit = async () => {
  const result = await withRateLimit(
    {
      endpoint: 'my-operation',
      maxRequests: 5,
      windowMinutes: 1,
    },
    async () => {
      // Sua operação aqui
      return await performOperation();
    }
  );

  if (result === null) {
    // Rate limit bloqueou
    toast.error("Muitas requisições. Aguarde um momento.");
    return;
  }

  // Operação executada com sucesso
  console.log('Result:', result);
};
```

## Endpoints Protegidos

### 1. Submissão de Avaliações (`submit-avaliacao`)

**Arquivo:** `src/pages/SessionTraining.tsx`

**Limites:** 30 requisições por minuto (uma por foto)

**Razão:** Previne spam de avaliações e garante uma avaliação por foto

### 2. Submissão de Feedback (`submit-feedback`)

**Arquivo:** `src/pages/SessionFeedback.tsx`

**Limites:** 5 requisições por minuto

**Razão:** Previne envio múltiplo de feedback acidental ou malicioso

## Configurações Recomendadas

| Tipo de Operação | maxRequests | windowMinutes | Uso |
|------------------|-------------|---------------|-----|
| Votação/Avaliação | 30-50 | 1 | Alta frequência, operações rápidas |
| Feedback/Formulário | 5-10 | 1 | Operações menos frequentes |
| Login/Auth | 5 | 5 | Prevenir brute force |
| Criação de Recursos | 10 | 5 | Operações moderadas |
| Busca/Query | 100 | 1 | Alto volume, mas controlado |

## Monitoramento

### Visualizar Logs de Rate Limit (Admin)

```sql
-- Últimos 100 eventos de rate limit
SELECT 
  id,
  user_id,
  ip_address,
  endpoint,
  request_count,
  window_start,
  created_at
FROM rate_limit_log
ORDER BY created_at DESC
LIMIT 100;
```

### IPs/Usuários Mais Ativos

```sql
-- Usuários com mais requisições
SELECT 
  user_id,
  endpoint,
  SUM(request_count) as total_requests
FROM rate_limit_log
WHERE window_start > now() - interval '1 hour'
GROUP BY user_id, endpoint
ORDER BY total_requests DESC
LIMIT 20;

-- IPs com mais requisições
SELECT 
  ip_address,
  endpoint,
  SUM(request_count) as total_requests
FROM rate_limit_log
WHERE window_start > now() - interval '1 hour'
  AND user_id IS NULL
GROUP BY ip_address, endpoint
ORDER BY total_requests DESC
LIMIT 20;
```

### Eventos de Rate Limit Excedido

Para identificar quando rate limits foram excedidos, você pode verificar os logs da Edge Function no dashboard.

## Limpeza de Logs Antigos

A função `cleanup_old_rate_limit_logs()` remove logs com mais de 24 horas.

**Executar manualmente:**
```sql
SELECT cleanup_old_rate_limit_logs();
```

**Agendar limpeza automática (recomendado):**

Criar um cron job no Supabase (Dashboard → Database → Cron):

```sql
-- Executar diariamente às 3:00 AM
SELECT cron.schedule('cleanup-rate-limits', '0 3 * * *', 
  'SELECT cleanup_old_rate_limit_logs();'
);
```

## Considerações de Segurança

### ✅ Implementado

1. **Duplo Rastreamento**: user_id (autenticado) e IP (não autenticado)
2. **Bypass RLS**: Edge Function usa service role para evitar bypass de rate limiting
3. **Fail-Open**: Em caso de erro na verificação, permite a requisição mas loga o erro
4. **Validação Server-Side**: Impossível de burlar via client-side
5. **Logs Detalhados**: Rastreamento completo para auditoria

### ⚠️ Limitações Conhecidas

1. **Proxies/VPNs**: Múltiplos usuários atrás do mesmo IP compartilham limite
2. **IP Spoofing**: Não implementado verificação de IP em camada de rede
3. **Distributed Attacks**: Rate limiting por IP não previne DDoS distribuído

### 🔧 Melhorias Futuras

1. **Implementar CAPTCHA**: Para endpoints com alto rate limiting
2. **Blacklist de IPs**: Bloquear IPs que excedem limites consistentemente
3. **Rate Limiting Adaptativo**: Ajustar limites baseado em comportamento
4. **Alertas Automáticos**: Notificar admins sobre atividade suspeita
5. **Dashboard de Monitoramento**: Visualização em tempo real de rate limits

## Troubleshooting

### Problema: "Rate limit exceeded" mas não deveria

**Possíveis causas:**
1. Requisições duplicadas sendo enviadas
2. Múltiplos usuários atrás do mesmo IP
3. Janela de tempo não expirou ainda

**Solução:**
```typescript
// Adicionar debounce nas ações do usuário
import { debounce } from 'lodash';

const debouncedSubmit = debounce(handleSubmit, 1000, { 
  leading: true, 
  trailing: false 
});
```

### Problema: Rate limiting não está funcionando

**Verificações:**
1. Edge Function deployada corretamente
2. Supabase service role configurada
3. Tabela `rate_limit_log` existe
4. RLS policies estão corretas

**Debug:**
```typescript
// Habilitar logs detalhados
const result = await checkRateLimit(options);
console.log('Rate limit result:', result);
```

### Problema: Performance degradada

**Soluções:**
1. Verificar índices no banco
2. Executar `cleanup_old_rate_limit_logs()` manualmente
3. Aumentar janela de tempo (reduzir granularidade)
4. Considerar cache em memória para endpoints de alto volume

## Referências

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

---

**Última Atualização**: 2025-11-24  
**Versão**: 1.0  
**Status**: ✅ Implementado e Testado