# CLAUDE.md: guia do BarberBrain

SaaS de gestão de barbearias (agenda, clientes, assinaturas, metas e comissões, estoque, promoções, satisfação, analista).
Gerado originalmente pelo Lovable; **o Lovable não é mais usado**. Todo o desenvolvimento acontece neste repositório.

Documentos de referência (leia antes de mudar algo):
- `docs/DIAGNOSTICO.md`: problemas conhecidos por severidade (IDs C-xx, A-xx, M-xx, B-xx)
- `docs/ARQUITETURA.md`: estrutura alvo e padrões
- `docs/PLANO.md`: etapas da reconstrução (seguir a ordem)

## Stack (não trocar)

React 18 · Vite 5 · TypeScript · Tailwind · shadcn/ui · React Router 6 · TanStack Query 5 · Supabase (Postgres + RLS, Auth, Storage, Edge Functions em Deno). Testes: Vitest + Testing Library; pgTAP para o banco.

## Comandos

```bash
npm install            # dependências
npm run dev            # dev server em http://localhost:8080
npm run build          # build de produção (precisa passar antes de cada commit)
npm run lint           # ESLint (precisa passar antes de cada commit)
npm run typecheck      # tsc --noEmit
npm test               # Vitest (testes em src/**/*.test.ts ao lado do código)
npm run test:watch     # Vitest em modo watch

# Supabase (a partir da etapa 0.3)
supabase start                         # banco local
supabase migration new <descricao>     # nova migration
supabase db reset                      # recria o banco local com migrations + seed
supabase test db                       # testes pgTAP (RLS/RPC)
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

Variáveis de ambiente (`.env`, nunca commitar; modelo em `.env.example`):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
**Nunca** coloque a service role key em variável `VITE_*` nem no front.

## Estrutura atual (legado, em migração)

```
src/
  App.tsx                    rotas: / /auth /dashboard /cliente /cliente/produtos
  pages/                     Landing, Auth, Dashboard (abas por useState), CustomerDashboard, CustomerProducts
  components/dashboard/      uma aba por arquivo (vários com 900–1.100 linhas)
  components/customer/       fluxo do cliente (AppointmentScheduler etc.)
  components/ui/             shadcn
  hooks/                     useAuth + hooks de assinaturas, metas, comissões
  integrations/supabase/     client.ts e types.ts (gerado)
supabase/
  migrations/                39 migrations (hoje single-tenant; vira multi-tenant na Etapa 1.0)
  functions/                 create-barber-user, reset-barber-password, send-subscription-reminders
```

## Estrutura alvo (ver docs/ARQUITETURA.md)

```
src/app/            router, providers, guards
src/features/<f>/   api/ (único lugar que importa supabase) · hooks/ · domain/ (puro + testes) · components/ · index.ts
src/shared/         ui (shadcn) · components · lib (money, dates, whatsapp) · hooks
```
Features: auth, agenda, agendamento, disponibilidade, barbeiros, clientes, servicos, produtos, estoque, promocoes, financeiro, metas, assinaturas (dos clientes da barbearia), satisfacao, analista, configuracoes, plataforma (página de vendas, cadastro da barbearia e cobrança do BarberBrain).

## Convenções

- **Componentes não chamam `supabase` diretamente.** Usam hooks da feature; só `features/*/api/*.api.ts` importa o client.
- **Busca de dados só com TanStack Query** (`useQuery`/`useMutation`). Proibido `useEffect` + `useState` para buscar dados.
- **Regra crítica no banco**: preço, status de pedido, disponibilidade, comissão, metas e uso de assinatura são calculados ou validados em RPC `SECURITY DEFINER` e protegidos por RLS. A UI pode pré-visualizar com funções de `domain/`, mas nunca é a fonte da verdade. Modelo: `confirm_subscription_payment`.
- **RLS é a segurança.** Esconder uma aba na UI não protege nada. Toda tabela nova tem RLS e políticas separadas por papel (`admin`, `barber`, `customer`).
- **Multi-tenant**: cada barbearia é isolada (`docs/ARQUITETURA.md` §10). Toda tabela de negócio tem `barbershop_id NOT NULL` e toda política e RPC filtra por `is_member` / `has_shop_role`. Tabela nova sem isso é bug de segurança. Mudanças de RLS vêm com teste de isolamento entre duas barbearias.
- **Modelo de negócio**: a barbearia assina sozinha pela página de vendas; quem assina vira o **admin** da barbearia e cadastra os barbeiros; os clientes se cadastram pelo link da barbearia. Não confundir a cobrança da plataforma (`plataforma`) com as assinaturas de clientes (`assinaturas`).
- **Barbeiro (não admin)**: vê a agenda e os clientes, muda o status dos próprios atendimentos e vê as próprias metas e o extrato. Nada de catálogo, preços ou configurações.
- **Tipos gerados**: usar `Tables<'x'>`, `TablesInsert<'x'>` e `Enums<'x'>` de `integrations/supabase/types.ts`. Não escrever interfaces que repetem colunas. Sem `any` (use `unknown` + narrowing).
- Sempre `if (error) throw error` depois de chamadas ao Supabase; nada de erro engolido em silêncio.
- Datas "de hoje" e de calendário no fuso `America/Sao_Paulo` (via `shared/lib/dates.ts`), nunca `toISOString().slice(0,10)`.
- Moeda via `formatBRL` (`shared/lib/money.ts`).
- Nomes: código em inglês (casa com o banco), textos de UI em português, pastas de feature em português. Componentes `PascalCase.tsx`, hooks `useXxx.ts`, domain `kebab-case.ts` com `.test.ts` ao lado.
- Componentes com ~250 linhas no máximo como referência; acima de 400, dividir.
- Migrations sempre pela CLI, uma por mudança lógica, com nome descritivo; políticas nomeadas `"<papel> <ação> <escopo>"`.

## Regras de trabalho (obrigatórias)

1. **Uma etapa do `docs/PLANO.md` por vez**, em branch própria (`etapa-<n>-<slug>`), com **commits pequenos** (Conventional Commits em português, ex.: `fix(rls): ...`, `refactor(agenda): ...`).
2. **`npm run lint`, `npm run typecheck`, `npm test` e `npm run build` precisam passar antes de cada commit.** O CI (`.github/workflows/ci.yml`) roda os mesmos passos em todo PR.
3. **Nenhuma funcionalidade pode sumir.** Se algo parecer bug ou código morto, **perguntar ao dono antes de remover ou mudar o comportamento.**
4. **Nada de mudança destrutiva no banco** (DROP de tabela, coluna, função ou política sem substituta; ALTER de coluna com dados; DELETE ou UPDATE em massa de dados) **sem aprovação explícita do dono.** Migrations aditivas são o padrão.
5. **Escrever testes para a regra de negócio crítica**: agendamento (preço, cupom, combo), disponibilidade de horários e assinaturas (cobertura, ciclos, uso). Mudanças de RLS e RPC vêm com teste pgTAP.
6. Ao terminar uma etapa: resumir o que mudou, os riscos e como foi validado, e **esperar aprovação** antes da próxima.
7. Não commitar `.env`, chaves ou dumps de dados.

## Armadilhas conhecidas

- O RLS do Supabase **ignora em silêncio** UPDATE/DELETE sem permissão (0 linhas, sem erro). Confira linhas afetadas (`.select()` após o update) em fluxos críticos.
- PostgREST devolve no máximo 1.000 linhas por padrão: pagine ou agregue no banco.
- `upsert` com `onConflict` não funciona com índice UNIQUE parcial.
- Views com `security_invoker = on` **não** escondem colunas de quem já tem SELECT na tabela base.
- Usuário de barbeiro nasce `customer` (trigger) e vira `barber` pela edge function `create-barber-user`.
