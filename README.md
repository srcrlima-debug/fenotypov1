# Sistema de Avaliação de Fenótipos

Sistema completo para avaliação de fenótipos com sessões de treinamento em tempo real, dashboard administrativo e análise de resultados.

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (via Lovable Cloud)
- **Autenticação**: Supabase Auth
- **Banco de Dados**: PostgreSQL (Supabase)
- **Deploy**: Lovable Platform

## 📋 Funcionalidades

### Para Administradores
- ✅ Criação e gerenciamento de sessões de treinamento
- ✅ Dashboard em tempo real com estatísticas
- ✅ Controle de fluxo de fotos durante sessões
- ✅ Visualização de resultados e relatórios
- ✅ Exportação de dados (CSV/PDF)

### Para Usuários
- ✅ Registro e autenticação segura
- ✅ Participação em sessões de treinamento
- ✅ Avaliação de fotos com timer
- ✅ Visualização de resultados individuais
- ✅ Interface responsiva e intuitiva

## 🔒 Segurança Implementada

- ✅ Row Level Security (RLS) no banco de dados
- ✅ Políticas de acesso por função (admin/usuário)
- ✅ Proteção contra votos duplicados
- ✅ Validação de sessões ativas
- ✅ Sanitização de inputs
- ✅ Rate limiting básico
- ✅ Proteção CSRF via Supabase

Ver `SECURITY_CHECKLIST.md` para detalhes completos.

## 🛠️ Configuração Local

### Pré-requisitos
- Node.js 18+ e npm
- Conta Lovable (para acesso ao backend)

### Instalação

```bash
# Clone o repositório
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O projeto estará disponível em `http://localhost:8080`

### Variáveis de Ambiente

As variáveis de ambiente são gerenciadas automaticamente pelo Lovable Cloud:

```env
VITE_SUPABASE_URL=<auto-configurado>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configurado>
VITE_SUPABASE_PROJECT_ID=<auto-configurado>
```

⚠️ **Importante**: Não edite o arquivo `.env` manualmente. Ele é atualizado automaticamente pela integração Lovable Cloud.

## 📦 Deploy para Produção

### Via Lovable Platform (Recomendado)

1. **Acesse seu projeto** em [Lovable](https://lovable.dev/projects/66d73911-bb56-424b-8239-cd2a42e32860)

2. **Clique em "Publish"** (canto superior direito no desktop, inferior direito no mobile)

3. **Configure as opções de deploy**:
   - Escolha um subdomínio personalizado (ex: `meu-app.lovable.app`)
   - Ou conecte um domínio customizado (requer plano pago)

4. **Clique em "Update"** para publicar as mudanças

5. **Acesse sua aplicação** no domínio configurado

### Configuração de Domínio Customizado

Se você possui um domínio próprio:

1. Navegue para **Project > Settings > Domains**
2. Clique em **"Connect Domain"**
3. Siga as instruções para configurar os registros DNS
4. Aguarde a propagação (pode levar até 48h)

Mais detalhes: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain)

### Otimizações de Produção

O Vite já configura automaticamente:
- ✅ Minificação de JavaScript e CSS
- ✅ Tree-shaking de código não utilizado
- ✅ Code splitting automático
- ✅ Otimização de assets
- ✅ Compression (gzip/brotli)

As imagens em `public/images/` são servidas otimizadas automaticamente.

## 📚 Guia de Uso

### 1. Primeiro Acesso (Admin)

O **primeiro usuário** a se registrar no sistema automaticamente recebe privilégios de administrador:

1. Acesse a página de **Registro**
2. Preencha os dados e crie sua conta
3. Você será redirecionado automaticamente como admin
4. Acesse o **Dashboard Administrativo** pelo menu

### 2. Criar Sessão de Treinamento (Admin)

1. No **Dashboard**, clique em **"Nova Sessão"**
2. Configure:
   - **Nome da Sessão**: Ex: "Treinamento Turma A"
   - **Número de Fotos**: Quantas fotos serão exibidas (máx: 30)
   - **Tempo por Foto**: Segundos para cada avaliação
3. Clique em **"Criar Sessão"**
4. Compartilhe o link da sessão com os participantes

### 3. Participar de uma Sessão (Usuário)

1. Acesse o link da sessão compartilhado
2. Faça login ou registre-se
3. Aguarde o administrador iniciar a sessão
4. Quando iniciada, avalie cada foto que aparecer:
   - ✅ **SIM** - Fenótipo adequado
   - ❌ **NÃO** - Fenótipo inadequado
5. Após todas as fotos, veja seus resultados

### 4. Controlar Sessão em Tempo Real (Admin)

Durante uma sessão ativa:

1. Acesse o **Controle de Sessão** no dashboard
2. Veja estatísticas em tempo real:
   - Participantes online
   - Votos coletados
   - Progresso da sessão
3. Controles disponíveis:
   - **▶️ Iniciar Sessão**: Começa o treinamento
   - **⏭️ Próxima Foto**: Avança para próxima imagem
   - **🔄 Reiniciar Foto**: Recomeça a foto atual (apaga votos)
   - **📊 Mostrar Resultados**: Finaliza e exibe resultados

### 5. Visualizar Resultados

**Admin:**
- Veja resultados consolidados de todos os participantes
- Exporte relatórios em CSV ou PDF
- Analise desempenho individual e por foto

**Usuário:**
- Veja seu próprio desempenho
- Compare com a média da turma
- Identifique pontos de melhoria

### 6. Upload de Fotos

As fotos devem estar em `public/images/` com a nomenclatura:
- `foto-1.jpg`, `foto-2.jpg`, ..., `foto-30.jpg`

Para adicionar novas fotos:
1. Coloque os arquivos em `public/images/`
2. Mantenha o padrão de nome: `foto-X.jpg`
3. Atualize `src/data/images.ts` se necessário

## 🔧 Manutenção

### Backup do Banco de Dados

1. Acesse o **Lovable Cloud** (botão no projeto)
2. Navegue para **Database > Tables**
3. Selecione a tabela desejada
4. Clique em **Export** para baixar os dados

Tabelas principais:
- `profiles` - Perfis de usuários
- `user_roles` - Funções e permissões
- `sessions` - Sessões de treinamento
- `avaliacoes` - Avaliações realizadas

### Monitoramento

Para verificar logs e performance:

1. Acesse o painel do Lovable Cloud
2. Verifique:
   - **Auth Logs**: Tentativas de login
   - **Database Logs**: Consultas e erros
   - **Function Logs**: Logs de edge functions (se houver)

### Gerenciamento de Usuários

**Adicionar novos admins:**

1. Acesse o Lovable Cloud > Database
2. Abra a tabela `user_roles`
3. Adicione um registro:
   - `user_id`: UUID do usuário
   - `role`: `admin`

**Remover usuários:**

1. Identifique o `user_id` na tabela `profiles`
2. Delete registros relacionados em `avaliacoes`
3. Delete o perfil em `profiles`
4. Delete a autenticação no Lovable Cloud > Auth

## 🐛 Troubleshooting

### Usuários não conseguem votar

- ✅ Verifique se a sessão está **ativa** (status = 'active')
- ✅ Confirme que o usuário está autenticado
- ✅ Verifique se o tempo da foto não expirou

### Dashboard não carrega

- ✅ Verifique se o usuário tem role `admin`
- ✅ Confirme conexão com o banco de dados
- ✅ Verifique logs no console do navegador

### Imagens não aparecem

- ✅ Confirme que as imagens estão em `public/images/`
- ✅ Verifique nomenclatura: `foto-X.jpg`
- ✅ Limpe o cache do navegador

### Erros de autenticação

- ✅ Verifique se o email está confirmado
- ✅ Confirme que as variáveis de ambiente estão corretas
- ✅ Limpe localStorage e tente novamente

## 📊 Estrutura do Banco de Dados

```
profiles
├── id (uuid, PK)
├── user_id (uuid, FK -> auth.users)
├── nome
├── email
└── created_at

user_roles
├── user_id (uuid, FK -> auth.users)
└── role (enum: 'admin' | 'user')

sessions
├── id (uuid, PK)
├── session_code (text, unique)
├── session_name (text)
├── created_by (uuid, FK -> profiles.user_id)
├── total_photos (integer)
├── timer_seconds (integer)
├── current_photo (integer)
├── session_status (enum)
├── photo_start_time (timestamp)
└── created_at

avaliacoes
├── id (uuid, PK)
├── user_id (uuid, FK -> profiles.user_id)
├── session_id (uuid, FK -> sessions.id)
├── foto_id (integer)
├── sim_nao (boolean)
└── created_at
└── UNIQUE(user_id, session_id, foto_id)
```

## 🔐 RLS Policies

Todas as tabelas possuem Row Level Security (RLS) habilitado:

- **profiles**: Usuários veem apenas seu próprio perfil
- **user_roles**: Apenas admins podem modificar roles
- **sessions**: Admins veem todas, usuários veem públicas
- **avaliacoes**: Usuários inserem próprias, admins veem todas

## 🆘 Suporte

- **Documentação Lovable**: [docs.lovable.dev](https://docs.lovable.dev/)
- **Comunidade Discord**: [Discord Lovable](https://discord.com/channels/1119885301872070706/1280461670979993613)
- **Tutorial em Vídeo**: [YouTube Playlist](https://www.youtube.com/watch?v=9KHLTZaJcR8&list=PLbVHz4urQBZkJiAWdG8HWoJTdgEysigIO)

## 📄 Licença

Este projeto foi desenvolvido na plataforma Lovable.

## 🔄 Atualizações

Para atualizar o projeto em produção:

1. Faça as alterações necessárias no código
2. Teste localmente com `npm run dev`
3. Clique em **"Publish"** no Lovable
4. Clique em **"Update"** para publicar as mudanças

As mudanças de **backend** (banco de dados, edge functions) são aplicadas automaticamente.
As mudanças de **frontend** requerem clique em "Update" no diálogo de publicação.

---

**URL do Projeto**: https://lovable.dev/projects/66d73911-bb56-424b-8239-cd2a42e32860

Desenvolvido com ❤️ usando [Lovable](https://lovable.dev)
