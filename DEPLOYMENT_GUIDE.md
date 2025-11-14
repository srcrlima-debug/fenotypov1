# 🚀 Guia Completo de Deploy

## Visão Geral

Este projeto React + Vite está configurado para deploy na plataforma Lovable, que oferece:
- ✅ Deploy automático com um clique
- ✅ Backend Supabase integrado
- ✅ SSL/HTTPS automático
- ✅ CDN global
- ✅ Domínios customizados
- ✅ Rollback instantâneo

## 📋 Pré-Deploy Checklist

### 1. Verificações de Segurança

- [x] RLS habilitado em todas as tabelas
- [x] Políticas de acesso implementadas
- [x] Validações de input no frontend
- [x] Proteção contra votos duplicados
- [x] Rate limiting básico
- [x] Sanitização de dados

Ver `SECURITY_CHECKLIST.md` para detalhes completos.

### 2. Verificações de Performance

- [x] Imagens otimizadas (todas em `public/images/`)
- [x] Lazy loading de componentes pesados
- [x] Code splitting automático (Vite)
- [x] Minificação habilitada
- [x] Tree-shaking configurado

### 3. Verificações de Funcionalidade

- [ ] Teste completo de registro e login
- [ ] Teste de criação de sessão (admin)
- [ ] Teste de participação em sessão (usuário)
- [ ] Teste de controle em tempo real
- [ ] Teste de visualização de resultados
- [ ] Teste de exportação de dados
- [ ] Teste em diferentes navegadores:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] Teste em dispositivos móveis
- [ ] Teste de responsividade

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente

As variáveis são **gerenciadas automaticamente** pelo Lovable Cloud:

```env
# Configuradas automaticamente - NÃO EDITAR
VITE_SUPABASE_URL=https://fjpyakzjtcsvqbxagdpe.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=fjpyakzjtcsvqbxagdpe
```

⚠️ **IMPORTANTE**: 
- NÃO commite o arquivo `.env` no Git (já está no `.gitignore`)
- NÃO edite o `.env` manualmente
- As variáveis são atualizadas automaticamente pelo Lovable

### Variáveis Customizadas (se necessário)

Se precisar adicionar variáveis customizadas:

1. Prefixe com `VITE_` para exposição ao frontend
2. Adicione no painel do Lovable Cloud > Settings > Environment Variables
3. Acesse via `import.meta.env.VITE_SUA_VARIAVEL`

Exemplo:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## 📦 Deploy na Lovable Platform

### Método 1: Deploy via Interface Web (Recomendado)

1. **Acesse o Projeto**
   ```
   https://lovable.dev/projects/66d73911-bb56-424b-8239-cd2a42e32860
   ```

2. **Clique em "Publish"**
   - Desktop: Canto superior direito
   - Mobile: Canto inferior direito (modo Preview)

3. **Configure o Subdomínio**
   ```
   Exemplo: fenotipos-app.lovable.app
   ```

4. **Revise as Mudanças**
   - Veja lista de arquivos alterados
   - Confirme que tudo está correto

5. **Clique em "Update"**
   - Frontend: Requer clique em "Update"
   - Backend: Deploy automático

6. **Aguarde o Deploy**
   - Build geralmente leva 1-2 minutos
   - Você receberá notificação quando concluído

7. **Acesse sua Aplicação**
   ```
   https://seu-subdominio.lovable.app
   ```

### Método 2: Deploy via Git Push

Se você conectou GitHub:

```bash
# Commit suas mudanças
git add .
git commit -m "Descrição das mudanças"

# Push para o branch principal
git push origin main
```

O deploy será **automático** após o push.

## 🌐 Configuração de Domínio Customizado

### Pré-requisitos
- Plano pago do Lovable (Pro ou Business)
- Acesso ao DNS do seu domínio

### Passo a Passo

1. **Acesse Configurações**
   - Project > Settings > Domains

2. **Clique em "Connect Domain"**

3. **Escolha o Tipo**
   - **Root Domain**: `meusite.com`
   - **Subdomain**: `app.meusite.com`

4. **Configure DNS**
   
   **Para Root Domain:**
   ```
   Tipo: A
   Nome: @
   Valor: [IP fornecido pelo Lovable]
   TTL: 3600
   ```

   **Para Subdomain:**
   ```
   Tipo: CNAME
   Nome: app
   Valor: [hostname fornecido pelo Lovable]
   TTL: 3600
   ```

5. **Verificação**
   - Lovable verifica automaticamente
   - Pode levar até 48h para propagação completa
   - Use `dig seu-dominio.com` para verificar

6. **SSL/HTTPS**
   - Certificado SSL configurado automaticamente
   - Redirecionamento HTTP → HTTPS habilitado

### Providers DNS Comuns

**GoDaddy:**
1. Acesse "DNS Management"
2. Adicione registro A ou CNAME
3. Salve as alterações

**Cloudflare:**
1. Acesse "DNS"
2. Clique em "Add record"
3. Desabilite proxy (nuvem cinza) para CNAME

**Registro.br:**
1. Acesse "Servidores DNS"
2. Configure zona DNS
3. Adicione registro apropriado

## 🔄 CI/CD e Deploys Automáticos

### Branch Strategy

```
main (produção)
├── develop (desenvolvimento)
└── feature/* (features)
```

**Configuração recomendada:**
- `main` → Deploy automático para produção
- `develop` → Preview deployments
- `feature/*` → Pull request previews

### Rollback

Se algo der errado:

1. **Acesse o Histórico**
   - Project > Settings > Deployments

2. **Selecione Versão Anterior**
   - Clique em "Restore" na versão desejada

3. **Confirme Rollback**
   - Aplicação volta ao estado anterior

## 📊 Monitoramento Pós-Deploy

### 1. Health Check Inicial

Após deploy, verifique:

```bash
# Status da aplicação
curl -I https://seu-dominio.lovable.app

# Esperado: HTTP/2 200
```

**Checklist:**
- [ ] Homepage carrega corretamente
- [ ] Login funciona
- [ ] Registro funciona
- [ ] Dashboard carrega para admin
- [ ] Sessões podem ser criadas
- [ ] Participação em sessões funciona
- [ ] Imagens carregam corretamente

### 2. Monitoramento de Performance

**Lovable Analytics** (incluído):
- Pageviews
- Tempo de carregamento
- Taxa de rejeição
- Usuários ativos

Acesse em: Project > Analytics

**Ferramentas Externas Recomendadas:**
- Google Analytics 4
- Vercel Speed Insights
- Sentry (errors)
- LogRocket (session replay)

### 3. Logs e Debugging

**Frontend Logs:**
```bash
# Console do navegador
# Abra DevTools (F12) > Console
```

**Backend Logs:**
1. Acesse Lovable Cloud
2. Navegue para:
   - Auth Logs (autenticação)
   - Database Logs (queries)
   - Function Logs (edge functions)

**Filtrar Erros:**
```sql
-- No painel de logs
SELECT * FROM logs 
WHERE level = 'error' 
ORDER BY timestamp DESC 
LIMIT 100;
```

### 4. Monitoramento de Banco de Dados

**Queries Lentas:**
1. Lovable Cloud > Database > Performance
2. Identifique queries com > 1s
3. Adicione índices se necessário

**Tamanho do Banco:**
1. Lovable Cloud > Database > Usage
2. Monitore crescimento
3. Planeje backups regulares

## 🔐 Segurança em Produção

### Headers de Segurança

Lovable configura automaticamente:
```
✅ Content-Security-Policy
✅ X-Frame-Options: DENY
✅ X-Content-Type-Options: nosniff
✅ Referrer-Policy: strict-origin-when-cross-origin
✅ Permissions-Policy
```

### Autenticação Supabase

**Configurações Recomendadas:**

1. **Acesse Lovable Cloud > Auth > Settings**

2. **Email Settings:**
   - ✅ Enable email confirmation
   - ✅ Secure email change
   - ⚠️ Disable password recovery via email (use reset link)

3. **Password Policy:**
   - Mínimo: 8 caracteres
   - Requer: letras + números
   - Não permitir senhas comuns

4. **Rate Limiting:**
   - Login: 5 tentativas / 5 min
   - Signup: 3 tentativas / hora
   - Password reset: 2 tentativas / hora

### Backup e Disaster Recovery

**Backup Automático:**
1. Lovable Cloud > Database > Backups
2. Configure:
   - Frequência: Diária
   - Retenção: 7 dias (Free) / 30 dias (Pro)
   - Horário: Madrugada (menor tráfego)

**Backup Manual:**
```bash
# Via Lovable Cloud UI
1. Database > Tables
2. Selecione tabela
3. Export > CSV / JSON
```

**Teste de Restore:**
- Faça teste mensal de restauração
- Valide integridade dos dados
- Documente tempo de restore

## 📱 Otimizações Específicas

### Mobile

Já implementado:
- ✅ Viewport meta tag
- ✅ Touch-friendly buttons (min 44x44px)
- ✅ Responsive breakpoints
- ✅ Mobile-first CSS

### SEO

Configure:
- [ ] Google Search Console
- [ ] Sitemap.xml
- [ ] Robots.txt
- [ ] Open Graph tags
- [ ] Twitter Cards

### Performance

**Lighthouse Targets:**
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90

**Medir:**
```bash
npx lighthouse https://seu-dominio.lovable.app --view
```

## 🐛 Troubleshooting de Deploy

### Build Falha

**Erro: "Module not found"**
```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

**Erro: "Out of memory"**
```bash
# Aumente memória do Node (se self-hosting)
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### Deploy Lento

**Causas comuns:**
- Muitos arquivos grandes
- Imagens não otimizadas
- Dependencies desnecessárias

**Soluções:**
```bash
# Analise bundle size
npm run build
npx vite-bundle-visualizer

# Otimize imagens
npx @squoosh/cli --webp public/images/*.jpg
```

### CORS Errors

Se tiver CORS após deploy:

1. Verifique domínio nas configurações Supabase
2. Confirme que `VITE_SUPABASE_URL` está correta
3. Limpe cache do navegador

### SSL/HTTPS Issues

**Certificado não confia:**
- Aguarde até 30 min após DNS propagar
- Limpe cache SSL do navegador
- Verifique configuração DNS

## 📞 Suporte

### Lovable Support
- Email: support@lovable.dev
- Discord: [discord.gg/lovable](https://discord.com/channels/1119885301872070706)
- Docs: [docs.lovable.dev](https://docs.lovable.dev)

### Status Page
Monitor status dos serviços:
- [status.lovable.dev](https://status.lovable.dev)

## ✅ Post-Deploy Checklist

Após cada deploy, verifique:

- [ ] Aplicação carrega sem erros
- [ ] Autenticação funciona
- [ ] CRUD de sessões funciona
- [ ] Real-time updates funcionam
- [ ] Exportação de dados funciona
- [ ] Responsivo em mobile
- [ ] Performance aceitável (Lighthouse)
- [ ] Sem erros no console
- [ ] SSL/HTTPS ativo
- [ ] Backup rodando
- [ ] Monitoramento ativo
- [ ] Documentação atualizada

---

**Última atualização**: 2025-11-14
**Projeto**: https://lovable.dev/projects/66d73911-bb56-424b-8239-cd2a42e32860
