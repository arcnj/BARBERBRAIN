# Configuração do ambiente (Supabase próprio + Vercel)

Passo a passo para colocar o BarberBrain no **seu** Supabase e no link da Vercel.
Faça uma vez. Os passos marcados com 👤 são seus (precisam da sua conta); o resto é automático.

## 1. 👤 Criar o projeto no Supabase
1. Entre em <https://supabase.com> → **Start your project** (login com o GitHub).
2. **New project**:
   - Name: `barberbrain`
   - Database Password: clique em **Generate**, **copie e guarde** (vai ser usada no passo 3)
   - Region: **South America (São Paulo)**
   - Plano: **Free** serve para testes (o projeto pausa após ~1 semana sem uso; é só reativar no painel). Para produção, Pro.
3. Espere o projeto ficar pronto (1–2 min).

## 2. 👤 Anotar 4 informações
| O que | Onde no painel do Supabase |
|---|---|
| **Reference ID** (ex.: `abcdefghijklmnop`) | Project Settings → General |
| **Project URL** (`https://<reference-id>.supabase.co`) | Project Settings → Data API (ou botão **Connect**) |
| **anon / publishable key** | Project Settings → API Keys |
| **Access Token** | Ícone do seu perfil → Account Preferences → **Access Tokens** → Generate new token |

A anon/publishable key é pública (vai no site). O **Access Token** e a **senha do banco** são secretos: só vão para o GitHub (passo 3), nunca para o código nem para o chat.

## 3. 👤 Cadastrar os segredos no GitHub
GitHub → repositório `arcnj/BARBERBRAIN` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Nome | Valor |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | o Access Token |
| `SUPABASE_DB_PASSWORD` | a senha do banco do passo 1 |
| `SUPABASE_PROJECT_ID` | o Reference ID |

## 4. Criar o banco (automático)
Quando o código desta etapa entrar no `main`, o GitHub Actions roda o workflow **Supabase (deploy)**, que:
- aplica as 39 migrations (todas as tabelas, regras de acesso e funções);
- publica as 3 edge functions.

Acompanhe em GitHub → **Actions**. Depois disso o workflow também pode ser rodado manualmente (**Run workflow**).

## 5. 👤 Apontar a Vercel para o banco novo
Vercel → projeto `barberbrain` → **Settings** → **Environment Variables** → edite as 3 variáveis:
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` = anon/publishable key
- `VITE_SUPABASE_PROJECT_ID` = Reference ID

Depois: **Deployments** → no último deploy, menu **⋯** → **Redeploy**.

## 6. 👤 Ajustes de login no Supabase
Painel do Supabase → **Authentication**:
1. **URL Configuration**
   - Site URL: `https://barberbrain.vercel.app`
   - Redirect URLs: adicione `https://barberbrain.vercel.app/**` e `https://barberbrain-*.vercel.app/**` (links de prévia)
2. **Sign In / Providers → Email**: para testar sem depender de e-mail, **desligue "Confirm email"**. O envio de e-mail embutido do Supabase tem limite baixo por hora; para produção, configure um SMTP (ex.: Resend) e religue.
3. **Login com Google** (botão já existe na tela): só funciona depois de configurar o provedor Google (Authentication → Sign In / Providers → Google, com Client ID/Secret do Google Cloud). Até lá o botão mostra erro. Pode ficar para depois.

## 7. 👤 Virar administrador
Hoje o app não tem tela para criar o primeiro admin (isso muda na Etapa 1.0, com o cadastro da barbearia).
1. No link da Vercel, **crie uma conta** normalmente.
2. Supabase → **SQL Editor** → rode (trocando o e-mail):
   ```sql
   update public.user_roles
   set role = 'admin'
   where user_id = (select id from auth.users where email = 'seu@email.com');
   ```
3. Saia e entre de novo: você cai no painel do dono.

## Desenvolvimento local (opcional)
Com Docker instalado:
```bash
npm run db:start   # Supabase local com migrations + seed (logins em supabase/seed.sql, senha123)
npm run dev        # usa o .env; para o banco local, use a URL e a anon key que o db:start imprimir
```
