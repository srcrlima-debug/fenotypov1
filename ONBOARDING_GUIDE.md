# Guia do Sistema de Onboarding

## Visão Geral

O FENOTYPO agora conta com um sistema de onboarding interativo que guia novos usuários pelas principais funcionalidades da plataforma através de tooltips animados e destacamentos visuais.

## Componentes

### 1. OnboardingTutorial
Componente principal que gerencia todo o fluxo do tutorial.

**Localização**: `src/components/OnboardingTutorial.tsx`

**Características**:
- ✨ Tooltips animados com posicionamento inteligente
- 🎯 Destaque visual nos elementos importantes
- 📊 Barra de progresso em tempo real
- ⚡ Navegação fluida entre steps
- 💾 Salvamento automático do progresso no localStorage
- 📱 Design responsivo

### 2. TutorialBadge
Badge flutuante para reiniciar o tutorial a qualquer momento.

**Localização**: `src/components/TutorialBadge.tsx`

### 3. useOnboarding Hook
Hook customizado para gerenciar o estado do onboarding.

**Localização**: `src/hooks/useOnboarding.ts`

## Como Funciona

### Fluxo Automático
1. Quando um usuário acessa a página inicial pela primeira vez, o tutorial inicia automaticamente após 1 segundo
2. O sistema verifica no localStorage se o usuário já completou o tutorial
3. Se já completou, o tutorial não é exibido novamente
4. O usuário pode pular o tutorial a qualquer momento

### Steps do Tutorial

O tutorial é dividido em 5 etapas principais:

1. **Boas-vindas** 🎉
   - Apresentação inicial do sistema
   - Explicação sobre como pular o tutorial

2. **Como Funciona** 📚
   - Destaca o botão "Como Funciona"
   - Explica o processo de avaliação

3. **Área do Administrador** 🔐
   - Apresenta a área de login para professores
   - Explica as funcionalidades administrativas

4. **Recursos Principais** ✨
   - Destaca os principais recursos do sistema
   - 30 casos, navegação sequencial, certificado

5. **Conclusão** 🎊
   - Mensagem final de preparação
   - Incentivo para começar a usar o sistema

## Personalizando Steps

Para adicionar ou modificar steps do tutorial, edite o array `tutorialSteps` em `OnboardingTutorial.tsx`:

```typescript
const tutorialSteps: TutorialStep[] = [
  {
    id: "step-id",                    // ID único do step
    title: "Título do Step",          // Título exibido no tooltip
    description: "Descrição...",      // Descrição detalhada
    target: "[data-tour='elemento']", // Seletor CSS do elemento alvo
    position: "bottom",               // Posição do tooltip (top, bottom, left, right)
    highlight: true,                  // Se deve destacar o elemento (opcional)
  },
  // ... mais steps
];
```

## Adicionando Elementos ao Tour

Para adicionar um novo elemento ao tour, adicione o atributo `data-tour` ao elemento:

```tsx
<Button data-tour="meu-elemento">
  Clique Aqui
</Button>
```

Em seguida, crie um novo step no array `tutorialSteps` referenciando esse elemento:

```typescript
{
  id: "meu-step",
  title: "Meu Novo Step",
  description: "Descrição do que este botão faz",
  target: "[data-tour='meu-elemento']",
  position: "bottom",
  highlight: true,
}
```

## Controle Manual

### Reiniciar Tutorial

Os usuários podem reiniciar o tutorial de duas formas:

1. **Botão no Footer da Home**:
   - Clique em "Reiniciar Tutorial" no rodapé da página inicial

2. **Via Código**:
```typescript
// Limpar o estado de conclusão
localStorage.removeItem("fenotypo-tutorial-completed");

// Recarregar a página
window.location.reload();
```

### Hook useOnboarding

Use o hook para controle programático:

```typescript
import { useOnboarding } from "@/hooks/useOnboarding";

function MyComponent() {
  const {
    hasSeenTutorial,      // Boolean: usuário já viu o tutorial?
    shouldShowTutorial,   // Boolean: deve mostrar o tutorial?
    markTutorialComplete, // Function: marcar como completo
    resetTutorial,        // Function: resetar tutorial
  } = useOnboarding();

  return (
    <div>
      {!hasSeenTutorial && <p>Primeira visita!</p>}
      <button onClick={resetTutorial}>Ver tutorial novamente</button>
    </div>
  );
}
```

## Animações e Estilo

### Classes CSS Disponíveis

O sistema usa várias animações definidas em `src/index.css`:

- `.animate-fade-slide-up` - Fade com deslizamento para cima
- `.animate-fade-slide-in` - Fade com deslizamento lateral
- `.animate-scale-in` - Zoom suave
- `.animate-float-gentle` - Flutuação suave contínua
- `.tutorial-highlight` - Destaque com borda animada

### Personalizar Estilo

Para personalizar o estilo dos tooltips, edite os estilos em `OnboardingTutorial.tsx`:

```tsx
<Card className="w-[90vw] max-w-md shadow-2xl border-primary/20">
  {/* Seu conteúdo customizado */}
</Card>
```

## Boas Práticas

### 1. Mantenha Steps Curtos
- Máximo de 2-3 linhas de descrição por step
- Use emojis para tornar mais visual
- Seja direto e objetivo

### 2. Ordem Lógica
- Siga o fluxo natural de uso do sistema
- Comece com o mais importante
- Termine com uma mensagem motivadora

### 3. Elementos Destacados
- Use `highlight: true` apenas para elementos importantes
- Evite destacar muitos elementos ao mesmo tempo
- Certifique-se que o elemento está visível na tela

### 4. Posicionamento
- Escolha a posição do tooltip baseada no layout
- Teste em diferentes resoluções de tela
- O sistema ajusta automaticamente se sair da tela

### 5. Performance
- O tutorial só carrega quando necessário
- Usa localStorage para evitar execuções desnecessárias
- Animações otimizadas com CSS

## Solução de Problemas

### Tutorial não aparece
1. Verifique se `localStorage.getItem("fenotypo-tutorial-completed")` não está definido
2. Limpe o localStorage: `localStorage.removeItem("fenotypo-tutorial-completed")`
3. Recarregue a página

### Elemento não é destacado
1. Verifique se o atributo `data-tour` está correto
2. Confirme que o seletor no step está correto
3. Verifique se o elemento está visível na tela

### Tooltip fora da posição
1. O sistema ajusta automaticamente
2. Tente mudar a propriedade `position` do step
3. Verifique se há espaço suficiente na tela

### Animações não funcionam
1. Verifique se as classes CSS estão definidas em `index.css`
2. Confirme que Tailwind está processando corretamente
3. Limpe o cache do navegador

## Métricas e Analytics

O sistema registra automaticamente:
- ✅ Conclusão do tutorial
- ⏭️ Steps pulados
- 🔄 Reinicializações

Dados salvos no localStorage:
- `fenotypo-tutorial-completed`: "true" quando concluído

## Roadmap Futuro

Melhorias planejadas:
- [ ] Analytics mais detalhados (tempo por step)
- [ ] Tutorial contextual por página
- [ ] Modo "ajuda inline" permanente
- [ ] Vídeos tutoriais integrados
- [ ] Gamificação (badges por conclusão)
- [ ] Tutorial para área administrativa
- [ ] Tour para novos recursos (changelogs)

## Suporte

Para dúvidas ou sugestões sobre o sistema de onboarding:
1. Verifique este guia primeiro
2. Consulte os comentários no código
3. Entre em contato com a equipe de desenvolvimento
