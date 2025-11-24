# Sistema de Controle de Visibilidade de Badges

## Visão Geral

O Sistema de Controle de Visibilidade de Badges previne spoilers ao ocultar badges específicos até que uma sessão seja completamente concluída. Isso garante que os participantes não vejam informações sobre recompensas futuras que possam influenciar seu comportamento durante o treinamento.

## Funcionamento

### 1. Estrutura do Banco de Dados

A tabela `user_badges` foi estendida com a coluna:

```sql
visible_after_completion BOOLEAN NOT NULL DEFAULT false
```

**Valores:**
- `false` (padrão): Badge é visível imediatamente após ser conquistado
- `true`: Badge só é visível após a sessão ser completamente concluída

### 2. Lógica de Exibição

O componente `BadgeDisplay` foi atualizado para filtrar badges com base no status de conclusão:

```typescript
export function BadgeDisplay({ 
  badges, 
  variant = 'compact', 
  sessionCompleted = true 
}: BadgeDisplayProps) {
  // Filtra badges baseado em regras de visibilidade
  const visibleBadges = badges.filter(badge => {
    // Se badge requer conclusão e sessão não está completa, oculta
    if (badge.visible_after_completion && !sessionCompleted) {
      return false;
    }
    return true;
  });

  if (visibleBadges.length === 0) return null;
  // ... renderiza apenas badges visíveis
}
```

## Uso nos Componentes

### Exemplo 1: Durante a Sessão

```typescript
// Em SessionTraining.tsx ou similar
<BadgeDisplay 
  badges={userBadges}
  sessionCompleted={false}  // Sessão ainda em andamento
  variant="compact"
/>
```

Resultado: Apenas badges com `visible_after_completion = false` são exibidos.

### Exemplo 2: Após Conclusão

```typescript
// Em Results.tsx ou SessionFeedback.tsx
<BadgeDisplay 
  badges={userBadges}
  sessionCompleted={true}  // Sessão concluída
  variant="detailed"
/>
```

Resultado: TODOS os badges são exibidos, incluindo os que requeriam conclusão.

## Configuração de Badges

### Badge Imediato (Visível Durante a Sessão)

```sql
INSERT INTO user_badges (
  user_id, 
  badge_id, 
  session_id,
  visible_after_completion
) VALUES (
  'user-uuid',
  'badge-uuid',
  'session-uuid',
  false  -- Visível imediatamente
);
```

**Casos de Uso:**
- Badge de "Primeira Avaliação"
- Badge de "Participação"
- Badge de "Rapidez na Resposta"

### Badge Pós-Conclusão (Oculto Durante a Sessão)

```sql
INSERT INTO user_badges (
  user_id, 
  badge_id, 
  session_id,
  visible_after_completion
) VALUES (
  'user-uuid',
  'badge-uuid',
  'session-uuid',
  true  -- Só visível após conclusão
);
```

**Casos de Uso:**
- Badge de "Mestre das Avaliações" (requer todas as 30 fotos)
- Badge de "Feedback Completo" (incentiva feedback no final)
- Badge de "Consistência" (baseado em padrões gerais)

## Benefícios

### 1. Previne Viés de Gamificação

Ao ocultar certos badges durante a sessão, evita-se que participantes:
- Modifiquem seu comportamento para conquistar badges
- Foquem em recompensas ao invés da tarefa real
- Sejam influenciados por informações sobre critérios de avaliação

### 2. Mantém Surpresa e Engajamento

- Participantes descobrem novas conquistas ao final
- Aumenta a satisfação ao receber badges inesperados
- Cria momento de "revelação" no feedback final

### 3. Flexibilidade na Estratégia

Administradores podem decidir para cada badge:
- Quais devem motivar durante a sessão
- Quais devem ser surpresas no final
- Como balancear transparência e prevenção de viés

## Atualização de Badges Existentes

Para atualizar badges já criados:

```sql
-- Tornar badge visível apenas após conclusão
UPDATE user_badges
SET visible_after_completion = true
WHERE badge_id = 'badge-especifico-uuid';

-- Tornar badge visível imediatamente
UPDATE user_badges
SET visible_after_completion = false
WHERE badge_id = 'badge-especifico-uuid';
```

## Interface do BadgeDisplay

### Props

```typescript
interface BadgeDisplayProps {
  badges: UserBadge[];           // Array de badges do usuário
  variant?: 'compact' | 'detailed'; // Estilo de exibição
  sessionCompleted?: boolean;    // Status de conclusão (default: true)
}

interface UserBadge {
  badge_id: string;
  badge_nome: string;
  badge_descricao: string;
  badge_icone: string;
  earned_at: string;
  visible_after_completion?: boolean; // Nova propriedade
}
```

### Variantes de Exibição

**Compact (Compacto)**
- Ícone + Nome do badge
- Tooltip com descrição e data
- Ideal para header ou sidebar

**Detailed (Detalhado)**
- Card com ícone, nome, descrição e data
- Layout em grid
- Ideal para páginas de perfil ou resultados

## Boas Práticas

1. **Defina Visibilidade no Momento da Criação**
   - Decida ao criar badge definitions se deve ser oculto ou não
   - Mantenha consistência na estratégia

2. **Sempre Passe sessionCompleted Corretamente**
   - Durante sessão ativa: `sessionCompleted={false}`
   - Em páginas de resultado/feedback: `sessionCompleted={true}`
   - Default é `true` para compatibilidade

3. **Comunique aos Participantes**
   - Informe que haverá badges surpresa ao final
   - Não revele critérios específicos que possam causar viés
   - Mantenha foco na tarefa principal

4. **Monitore e Ajuste**
   - Analise se ocultar certos badges afeta comportamento
   - Ajuste estratégia com base em feedback
   - Teste diferentes configurações

## Exemplos de Consultas

### Listar badges visíveis de um usuário durante sessão ativa

```sql
SELECT ub.*, bd.*
FROM user_badges ub
JOIN badge_definitions bd ON bd.id = ub.badge_id
WHERE ub.user_id = 'user-uuid'
  AND ub.session_id = 'session-uuid'
  AND ub.visible_after_completion = false;
```

### Listar todos os badges (para exibição pós-conclusão)

```sql
SELECT ub.*, bd.*
FROM user_badges ub
JOIN badge_definitions bd ON bd.id = ub.badge_id
WHERE ub.user_id = 'user-uuid'
  AND ub.session_id = 'session-uuid';
```

### Estatísticas de badges ocultos vs visíveis

```sql
SELECT 
  visible_after_completion,
  COUNT(*) as total_badges,
  COUNT(DISTINCT badge_id) as unique_badges
FROM user_badges
GROUP BY visible_after_completion;
```

## Troubleshooting

### Badges não aparecem após conclusão

Verifique se `sessionCompleted` está sendo passado como `true`:

```typescript
<BadgeDisplay 
  badges={badges}
  sessionCompleted={true}  // Certifique-se de passar true
/>
```

### Todos os badges aparecem durante sessão

Verifique se `visible_after_completion` está configurado corretamente no banco:

```sql
SELECT badge_id, visible_after_completion
FROM user_badges
WHERE user_id = 'user-uuid';
```

### Badge foi conquistado mas não aparece

Verifique:
1. RLS policies permitem leitura
2. Query inclui o campo `visible_after_completion`
3. Lógica de filtragem está correta no componente