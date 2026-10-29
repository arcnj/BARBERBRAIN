# Diagnóstico do BarberBrain — Fase 1

> Data: 2026-10-29 · Base analisada: `main` @ `db4db62` · Nenhum arquivo de código foi alterado nesta fase.
>
> Convenção de evidência: `arquivo:linha`. Migrations são citadas pelo prefixo de data
> (ex.: `mig 20251223021242:167` = `supabase/migrations/20251223021242_*.sql`, linha 167).

---

## 0. Resumo executivo

O app funciona e o build passa, mas a **segurança está quase toda na interface**, não no banco.
O banco confia no navegador para quase tudo: preço, status do pedido, comissão e quem pode o quê.
Qualquer pessoa com o app aberto e o console do navegador consegue contornar as regras que a tela impõe.

| Severidade | Qtde | Destaques |
|---|---|---|
| **Crítico** | 5 | Barbeiro tem poder de admin no banco · cliente altera o próprio pedido (status, preço) · barbeiro lança a própria comissão · disponibilidade de horários não enxerga a agenda (overbooking) · não existe isolamento entre barbearias |
| **Alto** | 13 | Premiação de meta duplicada · bucket `barbershop` gravável por clientes · e-mail e telefone dos barbeiros expostos · cupom de aniversário reutilizável · barbeiro excluído continua com acesso · uso de assinatura provavelmente nunca é registrado · edge functions frágeis · dependência do Lovable para WhatsApp |
| **Médio** | 17 | Duplicação de regra de negócio · componentes gigantes · `useEffect` buscando dados · TypeScript frouxo · bundle de 3 MB · datas em UTC |
| **Baixo** | 11 | Código morto · dependências sem uso · resquícios do Lovable |

**Ferramentas**: `npm run build` ✅ (com aviso de chunk de 2,99 MB) · `npm run lint` ❌ (26 erros, 15 avisos) ·
`tsc --noEmit` ✅ (porque `strict` está desligado; com `--strict` dá 98 erros) · `npm audit` 30 vulnerabilidades (1 crítica, 20 altas).

---

## 1. Mapa do aplicativo

### 1.1 Rotas (`src/App.tsx:23-31`)

| Rota | Página | Quem acessa | Proteção |
|---|---|---|---|
| `/` | `pages/Landing.tsx` | público | — |
| `/auth` | `pages/Auth.tsx` | público (login, cadastro, MFA) | redireciona por papel (`Auth.tsx:57-81`) |
| `/dashboard` | `pages/Dashboard.tsx` | admin, barber | só no cliente, via `useEffect` (`Dashboard.tsx:28-36`) |
| `/cliente` | `pages/CustomerDashboard.tsx` | customer | só no cliente (`CustomerDashboard.tsx:222-229`) |
| `/cliente/produtos` | `pages/CustomerProducts.tsx` | customer | só no cliente |
| `*` | `pages/NotFound.tsx` | — | — |

`pages/Index.tsx` existe mas **não está em nenhuma rota** (código morto, ver B-01).

O `/dashboard` não tem sub-rotas: as abas são um `useState("hoje")` com um `switch` (`Dashboard.tsx:26,41-74`).
Atualizar a página sempre volta para "Hoje", e não dá para criar link direto para uma aba.

### 1.2 Perfis de usuário

Os papéis vêm do enum `app_role` = `admin | barber | customer` (`mig 20251223021242:2`), guardado em `user_roles`.

| Perfil | Como nasce | O que vê na UI (`components/layout/Navigation.tsx:11-31`) |
|---|---|---|
| **Dono (admin)** | manualmente no banco (não há fluxo no app) | 13 abas: Hoje, Agenda, Clientes, Aniversariantes, Assinaturas, Barbeiros, Metas, Serviços, Produtos, Estoque, Promoções, Satisfação, Analista + Configurações pelo menu |
| **Barbeiro** | admin cria o registro em `barbers` e depois o login pela edge function `create-barber-user` | 3 abas: Hoje, Agenda, Metas |
| **Cliente** | auto-cadastro em `/auth`; o trigger `handle_new_user` cria `profiles` + papel `customer` (`mig 20251223021242:212-236`) | Agendar, Meus agendamentos, Produtos, Promoções, Minha assinatura, pesquisa de satisfação |

> A restrição "barbeiro só vê 3 abas" existe **apenas na UI**. No banco, o barbeiro tem quase os mesmos poderes do admin (ver C-01).

### 1.3 Módulos funcionais e fluxo de dados

Todos os módulos seguem o mesmo padrão: **o componente chama `supabase.from(...)` direto**, às vezes dentro de `useQuery` e às vezes em `useEffect` + `useState`, e calcula a regra de negócio no navegador.
Não existe camada de serviço nem de API.

| Módulo | Arquivos principais | Tabelas | Fluxo |
|---|---|---|---|
| **Agendamento (cliente)** | `customer/AppointmentScheduler.tsx` (1.005 l.), `pages/CustomerDashboard.tsx` (975 l.) | services, service_combos, combo_services, barbers_public, orders, order_items, order_products, birthday_coupons, barbershop_settings | `useEffect` carrega catálogo → horários gerados no cliente (9h–19h fixos) → `insert` em orders, depois order_items, depois order_products, sem transação → tenta atualizar combo e cupom |
| **Agenda (equipe)** | `dashboard/AgendaTab.tsx` (1.113 l.), `TodayAppointments.tsx`, `AvailableTimeSlots.tsx` | orders, profiles, services, barbers, user_roles | `useQuery` por dia → mudar status → ao concluir, dispara no cliente: uso de assinatura + comissões + metas |
| **Hoje** | `dashboard/TodayTab.tsx` | orders, barbers, profiles, user_roles | `useQuery` + agregação no cliente |
| **Clientes / CRM** | `dashboard/ClientsTab.tsx` | user_roles, profiles, orders | baixa **todos** os clientes e pedidos e segmenta no cliente (VIP, em risco etc.); exporta PDF/Excel |
| **Aniversariantes** | `dashboard/BirthdaySection.tsx`, `BirthdaysTab.tsx` | birthday_settings, birthday_coupons, profiles, user_roles | `useQuery`; cupons criados pelo cliente web |
| **Assinaturas** | `dashboard/SubscriptionsTab.tsx` + `subscriptions/*` (10 arquivos), `hooks/useSubscription*.ts` (6), `customer/MySubscription*.tsx` | subscription_plans, customer_subscriptions, subscription_cycles, subscription_usages, subscription_payments, subscription_requests, subscription_plan_services, subscription_reminders, subscription_reminder_settings | **O módulo mais bem estruturado**: hooks com `useQuery`/`useMutation` e RPCs `SECURITY DEFINER` para pagamento, aprovação e estorno. O registro de uso, porém, roda no cliente |
| **Barbeiros** | `dashboard/BarbersTab.tsx` (1.114 l.) | barbers, storage `barbers`, edge functions | CRUD direto + `fetch` manual para as edge functions |
| **Metas e comissões** | `dashboard/GoalsTab.tsx`, `goals/*` (6), `hooks/useGoalProgress.ts`, `hooks/useCommissions.ts` | barber_goals, barber_commission_settings, barber_financial_records, orders, order_items | progresso recalculado **no navegador**, gravando valores financeiros a partir do cliente |
| **Serviços e combos** | `dashboard/ServicesTab.tsx` (910 l.) | services, service_combos, combo_services | CRUD em `useEffect` |
| **Produtos / Estoque** | `ProductsTab.tsx`, `StockTab.tsx`, `pages/CustomerProducts.tsx` | products, stock_movements, storage `products` | estoque recalculado no cliente (lê, soma, grava) |
| **Promoções** | `PromotionsTab.tsx` (832 l.) | promotions, promotion_items, storage `promotion-banners` | CRUD + N+1 nos itens |
| **Satisfação** | `SatisfactionTab.tsx`, `customer/SatisfactionPopup.tsx` | satisfaction_settings, satisfaction_questions, satisfaction_responses | popup após o último pedido concluído |
| **Analista** | `AnalystTab.tsx` (1.052 l.) | orders, order_items, services, barbers | 5+ consultas grandes e toda a agregação em JS; o "analista" são regras fixas, sem IA |
| **Configurações** | `SettingsTab.tsx`, `layout/ProfileDialog.tsx`, `auth/MFA*.tsx` | barbershop_settings, storage `barbershop`/`avatars` | horário de funcionamento, WhatsApp, logo, MFA |
| **Auth** | `hooks/useAuth.tsx`, `pages/Auth.tsx` | auth, user_roles | contexto React com `user`, `role` e `mfa` |

---

## 2. Mapa do banco (a partir das 39 migrations)

### 2.1 Modelo

**Não existe entidade "barbearia" nem `barbershop_id` em nenhuma tabela.** O schema é *single-tenant*: um projeto Supabase = uma barbearia.
As tabelas de configuração (`barbershop_settings`, `birthday_settings`, `satisfaction_settings`, `subscription_reminder_settings`) são "linha única".

```
auth.users ─1:1─ profiles (user_id)            ─1:N─ user_roles
     │                 │
     │                 ├─1:N─ birthday_coupons (profile_id)
     │                 └─1:N─ customer_subscriptions (customer_id → profiles.user_id)
     │                                 ├─1:N─ subscription_cycles ─1:N─ subscription_usages
     │                                 ├─1:N─ subscription_payments
     │                                 ├─1:N─ subscription_reminders
     │                                 └─ subscription_requests
     │                 subscription_plans ─1:N─ subscription_plan_services ─N:1─ services
     │
     └─1:N─ orders (customer_id → auth.users e profiles.user_id)
               ├─ barber_id / preferred_barber_id → barbers
               ├─1:N─ order_items ─N:1─ services
               ├─1:N─ order_products ─N:1─ products ─1:N─ stock_movements
               └─1:1─ satisfaction_responses
barbers (user_id → auth.users, opcional)
   ├─1:N─ barber_goals (service_id opcional, service_category texto)
   ├─1:1─ barber_commission_settings
   └─1:N─ barber_financial_records (reference_id = order ou goal, sem FK)
services ─N:N─ service_combos (combo_services)
promotions ─1:N─ promotion_items (produto XOR serviço)
```

### 2.2 Tabelas (31) e views (3)

| Tabela | Criada em | Observações |
|---|---|---|
| profiles | 20251223021242 | FK `user_id → auth.users` (impede cliente "walk-in" sem conta, ver A-08) |
| user_roles | 20251223021242 | UNIQUE(user_id, role); o app assume um papel por usuário |
| barbers | 20251223021242 | `email`, `phone` sensíveis |
| services | 20251223021242 | `category` (texto) + `categories text[]` (20260216234146); as duas colunas coexistem |
| orders | 20251223021242 | sem `ON DELETE` em barber_id; sem restrição contra sobreposição de horário |
| order_items | 20251223021242 | `price` informado pelo cliente |
| promotions, promotion_items | 20251223025214 / 20251224020828 | |
| products | 20251223215129 | `cost_price` (sensível) desde 20260106040032 |
| order_products | 20251223222302 | `price` informado pelo cliente |
| service_combos, combo_services | 20251224012616 | `current_redemptions` incrementado pelo cliente |
| birthday_coupons, birthday_settings | 20260102221204 | |
| satisfaction_settings / _questions / _responses | 20260103010653 | UNIQUE(order_id) nas respostas |
| barbershop_settings | 20260106012735 | 21 colunas de horário (`monday_open` …) |
| stock_movements | 20260106040032 | |
| barber_goals, barber_commission_settings, barber_financial_records | 20260128030503 | sem UNIQUE em (reference_id, record_type) |
| subscription_plans, customer_subscriptions, subscription_payments, subscription_reminders, subscription_reminder_settings, job_locks | 20260909003032 | |
| cron_tokens | 20260909003349 | RLS sem políticas = só service role ✅ |
| subscription_cycles, subscription_usages | 20260909021139 | índice UNIQUE **parcial** em usages (ver A-07) |
| subscription_requests | 20260909024325 | |
| subscription_plan_services | 20260909030458 | `GRANT SELECT TO anon` |
| **Views**: barbers_public, products_public, barbershop_settings_public | 20260123175931 / 20260123180742 | `security_invoker = on`, então respeitam o RLS da tabela base e **não escondem nada** de quem já tem SELECT na tabela |

**Todas as 31 tabelas têm RLS habilitado.** O problema não é RLS ausente, e sim **políticas permissivas demais** (seção 2.5).

### 2.3 Funções

| Função | Tipo | Uso | Avaliação |
|---|---|---|---|
| `has_role(uuid, app_role)` | SQL, SECURITY DEFINER | base de todas as políticas | ok; executável por `anon` (permite descobrir o papel de um UUID conhecido, baixo risco) |
| `get_user_role(uuid)` | SQL, SECURITY DEFINER | não usada pelo front | `LIMIT 1` sem `ORDER BY`; resultado indefinido se houver 2 papéis |
| `handle_new_user()` | trigger em auth.users | cria profile + papel `customer` | ok (não aceita papel vindo do metadata ✅) |
| `update_updated_at_column()` | trigger | updated_at | ok |
| `confirm_subscription_payment(...)` | plpgsql, SECURITY DEFINER | pagamento → novo ciclo | ✅ checa admin, usa advisory lock, idempotente |
| `reverse_subscription_usage(...)` | SECURITY DEFINER | estorno | ✅ checa admin |
| `approve_subscription_request(...)` / `reject_subscription_request(...)` | SECURITY DEFINER | pedidos de assinatura | ✅ checa admin, lock |

O módulo de assinaturas é o **modelo a seguir**: regra crítica no banco, transacional e com autorização explícita. O resto do app deveria convergir para esse padrão.

### 2.4 Triggers

`on_auth_user_created` (criado 2×: 20251223021242 e 20251224045423 com `CREATE OR REPLACE`) e `update_*_updated_at` em 14 tabelas.
**Não há** trigger para baixa de estoque, recálculo de metas ou comissão. Tudo isso é feito pelo navegador.

### 2.5 Matriz RLS: políticas permissivas demais

Legenda: **A** admin · **B** barber · **C** customer · **anon** não logado.

| Tabela | Política problemática | Evidência | Efeito |
|---|---|---|---|
| **barbers** | `FOR ALL` para B ou A | mig 20251223021242:144 | qualquer barbeiro cria, edita, desativa ou apaga **qualquer** barbeiro, inclusive trocando `user_id` |
| **barbers** | SELECT para todo autenticado | mig 20260123175931:20 | cliente lê e-mail e telefone de todos os barbeiros; a view `barbers_public` fica inútil |
| **services** | `FOR ALL` B ou A | mig 20251223021242:154 | barbeiro altera preços e serviços |
| **orders** | C: UPDATE com `WITH CHECK (customer_id = auth.uid())` | mig 20251223034736:5 | cliente muda `status` para `completed`, `total_price`, `barber_id`, `scheduled_at` |
| **orders** | C: INSERT só checa `customer_id` | mig 20251223021242:163 | cliente cria pedido já `completed` e com qualquer preço |
| **orders** | B: UPDATE em qualquer pedido | mig 20251223021242:175 | barbeiro mexe em pedido de outro barbeiro |
| **order_items / order_products** | C: INSERT em pedido próprio com `price` livre | mig 20251223021242:190, 20251223222302 | preço definido pelo cliente |
| **profiles** | B vê todos | mig 20251223021242:126 | barbeiro vê nome, telefone, e-mail e nascimento de todos os clientes (aceitável numa barbearia só; revisar) |
| **products** | SELECT autenticado inclui `cost_price` | mig 20260123175931:57 | cliente vê o custo dos produtos |
| **products / promotions / service_combos / combo_services / promotion_items / birthday_coupons / birthday_settings / barbershop_settings** | `FOR ALL` B ou A | mig 20251223215129, 20251223025214, 20251224012616, 20251224020828, 20260102221204, 20260106012735 | barbeiro tem poder de admin no catálogo, promoções, cupons e configurações (inclusive o WhatsApp da barbearia) |
| **barber_financial_records** | B: INSERT e UPDATE nos próprios registros, sem limite de valor | mig 20260128033343:2,12 | **barbeiro lança ou edita a própria comissão e premiação** |
| **stock_movements** | B: SELECT/UPDATE/DELETE quando `created_by IS NULL` | mig 20260123180742:53-78 | movimentos sem autor ficam editáveis por qualquer barbeiro |
| **satisfaction_responses** | C: INSERT só checa `customer_id` | mig 20260103010653:71 | cliente responde por **pedido de outro** (e o UNIQUE(order_id) bloqueia a resposta legítima) e escolhe o `barber_id` avaliado |
| **subscription_usages** | B: INSERT sem vínculo com pedido ou cliente | mig 20260909021139:76 | barbeiro grava uso para qualquer cliente e ciclo |
| **storage `barbershop`** | INSERT/UPDATE/DELETE para qualquer `authenticated` | mig 20260106025524:7,21,27 | **qualquer cliente** troca ou apaga o logo e os arquivos da barbearia |
| **storage `barbers` / `products` / `promotion-banners`** | B ou A em qualquer objeto | mig 20251223231206, 20251223215129, 20251229221132 | barbeiro apaga arquivos alheios (baixo) |
| **subscription_plan_services** | SELECT para anon | mig 20260909030458:14 | baixo; o catálogo de planos é público |

**Tabelas corretamente restritas:** user_roles (só admin gerencia), cron_tokens e job_locks (só service role), subscription_* (admin gerencia, cliente vê só o seu), birthday_coupons (cliente vê só os seus), barber_goals e commission_settings (barbeiro só lê os seus).

---

## 3. Edge functions

| | `create-barber-user` | `reset-barber-password` | `send-subscription-reminders` |
|---|---|---|---|
| `verify_jwt` | **false** (`supabase/config.toml:3`); valida manualmente | padrão (true) | padrão (true), mas aceita `x-cron-secret` |
| Autenticação | `auth.getUser(token)` ✅ | `auth.getUser(token)` ✅ | token de cron **ou** JWT de admin ✅ |
| Autorização | `user_roles...single()` (`:41-45`): **falha** se o admin tiver 2 papéis (resultado `null` → 403). Deveria usar `has_role` | idem (`:41-45`) | `rpc('has_role')` ✅ |
| Validação de entrada | só presença (`:56`); sem tipo, formato de e-mail ou força de senha | `length >= 6` (`:63`) | n/a |
| Uso da service role | necessário (cria usuário), mas **erros de papel e de vínculo são engolidos** (`:88-101`): responde sucesso mesmo se o usuário continuar `customer`; sobrescreve o `user_id` de um barbeiro já vinculado | **redefine a senha de QUALQUER usuário** (`:71`): não confere se `userId` é de um barbeiro. Um admin (ou um token de admin roubado) assume a conta de qualquer cliente ou de outro admin | service role para tudo; ok para job |
| CORS | `*` | `*` | `*` |
| Outros | — | — | **depende do gateway do Lovable** (`:7`, `:135`, `:187`: `connector-gateway.lovable.dev` + `LOVABLE_API_KEY`), o que **para de funcionar ao sair do Lovable**. Lock não atômico (lê e depois grava, `:90-101`). Comparação do token não é de tempo constante (`:56`). Data-alvo calculada em UTC (`:104`). O **agendamento do cron não está versionado** (não há `cron.schedule` nas migrations). Devolve `String(err)` para o chamador (`:267`) |

Ver A-06 e A-09.

---

## 4. Achados por severidade

### 🔴 CRÍTICO

#### C-01 · Barbeiro tem poderes de administrador no banco
- **Evidência**: políticas `FOR ALL ... has_role(barber) OR has_role(admin)` em barbers, services, products, promotions, combos, cupons e configurações (tabela 2.5). A UI esconde as abas (`Navigation.tsx:27-31`), mas isso não protege nada: qualquer barbeiro logado pode chamar a API REST com o próprio token.
- **Impacto**: um barbeiro (ou ex-barbeiro, ver A-05) altera preços, apaga colegas, troca o WhatsApp da barbearia, cria cupons de 100% e vê todos os clientes.
- **Correção**: reescrever as políticas separando A de B; barbeiro só lê o catálogo e só atualiza os **próprios** pedidos.

#### C-02 · Cliente controla status e preço dos próprios pedidos
- **Evidência**: `mig 20251223034736:5-8` (UPDATE com `WITH CHECK` só em `customer_id`); `mig 20251223021242:163` (INSERT livre); preço calculado no navegador (`AppointmentScheduler.tsx:403,416,432,447`); produtos e **preços vindos da URL** `?selected=` (`CustomerDashboard.tsx:322-337`).
- **Impacto**: um cliente marca o próprio pedido como `completed`. Isso dispara a pesquisa de satisfação, conta como visita em CRM e metas e consome assinatura. Ele também paga R$ 0 ou desmarca o pedido de outra forma.
- **Correção**: o cliente só pode inserir `status='pending'` e só pode atualizar para `cancelled`. O preço deve ser calculado no banco (RPC `create_appointment` lendo `services.price`, combos, cupom e promoções). Parar de passar preço pela URL.

#### C-03 · Barbeiro lança a própria comissão e premiação
- **Evidência**: `mig 20260128033343:2-19` (INSERT e UPDATE em `barber_financial_records` onde `barber_id` é o do próprio barbeiro, sem limite). O cálculo acontece no navegador (`hooks/useCommissions.ts:21-90`, `useGoalProgress.ts:193-204`).
- **Impacto**: fraude financeira direta. `amount` é qualquer número ≥ 0.
- **Correção**: remover INSERT e UPDATE de barbeiro; comissão e premiação passam a ser geradas por função `SECURITY DEFINER` ou trigger na conclusão do pedido, com UNIQUE(reference_id, record_type).

#### C-04 · Disponibilidade de horários não enxerga a agenda (overbooking)
- **Evidência**: `AppointmentScheduler.tsx:217-237` consulta `orders` do dia **como cliente**, mas o RLS só devolve os pedidos **do próprio cliente** (`mig 20251223021242:159`). Para qualquer outro cliente, todos os horários aparecem livres. Além disso:
  - horário fixo de 9h às 19h (`:89-91`), ignorando `barbershop_settings` (dias fechados, sábado até 14h). A agenda interna usa as configurações (`AvailableTimeSlots.tsx:61-133`), então as duas telas divergem;
  - duração considera só o 1º serviço do pedido (`:264`);
  - nenhuma verificação no servidor (sem constraint ou RPC), então dois clientes simultâneos reservam o mesmo horário.
- **Impacto**: dois clientes no mesmo horário com o mesmo barbeiro, e agendamento em dia fechado. Isso afeta a função principal do produto.
- **Correção**: RPC `get_available_slots(barber_id, date, duration)` `SECURITY DEFINER` que devolve só horários (sem dados pessoais), lendo o horário de funcionamento. Na criação, a RPC `create_appointment` revalida com lock ou exclusion constraint. Testes unitários do cálculo de slots.

#### C-05 · Não existe isolamento entre barbearias (single-tenant)
- **Evidência**: nenhuma tabela tem `barbershop_id`; as configurações são de linha única com ID fixo (`mig 20260106012735:12-14`). O PRD (`README.md`) descreve um "SaaS B2B para 1-20 unidades".
- **Impacto**: se hoje existe **um projeto Supabase por barbearia**, o isolamento é físico e está ok. Se o plano é atender várias barbearias **no mesmo banco**, todo cliente e todo barbeiro de uma barbearia veria os dados das outras. Isso não existe hoje e exigiria refazer o schema e todas as políticas.
- **Decisão do dono (2026-10-29)**: cada barbearia assinante tem o próprio espaço, e uma barbearia nunca vê os dados de outra. Adotado: **multi-tenant num único banco**, com `barbershop_id` em todas as tabelas e isolamento por RLS. O desenho está em `docs/ARQUITETURA.md` §10 e a implementação na Fase 1 do `docs/PLANO.md` (Etapa 1.0).

### 🟠 ALTO

#### A-01 · Premiação de meta é paga várias vezes
- **Evidência**: quando um **barbeiro** conclui um pedido, `useGoalProgress.ts:178-188` tenta `update` em `barber_goals`. O barbeiro só tem SELECT (`mig 20260128030503`), então o RLS ignora a escrita **sem erro**, e o status continua `active`. Em seguida, `:193-204` insere `goal_reward` (permitido pela política de C-03). A cada novo atendimento depois de atingir a meta, uma nova premiação é lançada. A mesma lógica está duplicada em `GoalsTab.tsx:218-260`.
- **Correção**: igual à de C-03 (servidor), mais UNIQUE(reference_id, record_type).

#### A-02 · Qualquer cliente logado altera os arquivos da barbearia
- **Evidência**: `mig 20260106025524:7-32`: bucket `barbershop` com INSERT/UPDATE/DELETE para `authenticated`.
- **Correção**: restringir a admin.

#### A-03 · Dados sensíveis expostos a clientes
- **Evidência**: e-mail e telefone dos barbeiros (`mig 20260123175931:20-23`) e `cost_price` dos produtos (`:57-60`). As views `*_public` não ajudam porque são `security_invoker`.
- **Correção**: cliente e anon leem só pelas views, com as views como `security_definer` ou com as colunas sensíveis revogadas via `REVOKE SELECT (col)`.

#### A-04 · Cupom de aniversário reutilizável e contador de combo nunca muda
- **Evidência**: `AppointmentScheduler.tsx:458-476`. O cliente tenta `update` em `service_combos` e `birthday_coupons`, mas não tem permissão. O RLS ignora sem erro, então o cupom continua `used=false` e `current_redemptions` não sobe (o limite do combo nunca é atingido). Mesmo que funcionasse, `current_redemptions + 1` lido no cliente é uma condição de corrida.
- **Correção**: dentro da RPC `create_appointment` (C-02).

#### A-05 · Barbeiro "excluído" continua com acesso
- **Evidência**: `BarbersTab.tsx:302-338` apaga só a linha em `barbers`. O usuário de auth e o papel `barber` permanecem, e com eles todos os poderes de C-01. A "confirmação de senha do admin" faz `signInWithPassword` no navegador (`:308`), o que é teatro de segurança e ainda renova a sessão.
- **Correção**: edge function `deactivate-barber` (remove o papel e bane ou exclui o usuário). Preferir desativar (`active=false`) a apagar, porque pedidos antigos referenciam o barbeiro sem `ON DELETE`.

#### A-06 · Edge functions de usuário frágeis
- `reset-barber-password` redefine a senha de **qualquer** usuário (`index.ts:54-73`).
- `create-barber-user` engole erros de papel e de vínculo e responde sucesso (`:83-101`); autorização com `.single()` (`:41-45`); `verify_jwt=false`.
- Senhas geradas com `Math.random` (`BarbersTab.tsx:356-363`).
- **Correção**: validar com zod, usar `has_role`, conferir se o alvo é barbeiro, falhar de forma atômica (desfazer a criação do usuário se o papel falhar) e gerar senha com `crypto.getRandomValues`.

#### A-07 · Uso de assinatura provavelmente nunca é registrado *(confirmar no banco)*
- **Evidência**: `useSubscriptionUsage.ts:102-107` faz `upsert(..., { onConflict: "cycle_id,order_id,service_id" })`, mas o único índice compatível é **parcial** (`mig 20260909021139:59-61`, `WHERE order_id IS NOT NULL AND service_id IS NOT NULL`). O Postgres não infere índice parcial em `ON CONFLICT (cols)` sem o predicado, e responde erro 42P10. O erro é engolido em `AgendaTab.tsx:321-330` ("assinatura é complementar").
- **Impacto**: o limite de visitas do plano não é aplicado e o relatório de uso fica vazio.
- **Validação**: `select count(*) from subscription_usages;` em produção. Se for 0 com assinantes ativos, está confirmado.
- **Correção**: registrar o uso no servidor, na conclusão do pedido, com `ON CONFLICT ... WHERE ...` ou com UNIQUE não parcial.

#### A-08 · Cadastro de cliente avulso (walk-in) na agenda não funciona
- **Evidência**: `AgendaTab.tsx:369-401` insere `profiles` com `user_id = crypto.randomUUID()`. Isso viola a FK `profiles.user_id → auth.users` (`mig 20251223021242:10`) e o RLS de INSERT (só o próprio usuário, `:122`). O insert em `user_roles` também é bloqueado para barbeiro.
- **Pergunta**: esse fluxo é usado? Ele pede uma decisão de modelo (cliente sem conta = tabela `customers` separada, ou criação de usuário via edge function).

#### A-09 · Lembretes de WhatsApp dependem do Lovable
- **Evidência**: `send-subscription-reminders/index.ts:7,135,187`. O cron que chama a função não está nas migrations.
- **Correção**: chamar a API do Twilio diretamente (Account SID + Auth Token como secrets do Supabase) e versionar o `cron.schedule` numa migration.

#### A-10 · Operações de várias etapas sem transação
- **Criação de pedido**: orders, depois items, depois products, depois combo, depois cupom (`AppointmentScheduler.tsx:410-476`). Uma falha no meio deixa um pedido órfão.
- **Conclusão de atendimento**: status, uso, comissões e metas, cada etapa uma chamada do navegador (`AgendaTab.tsx:306-350`, `TodayAppointments.tsx:171-195`). Fechar a aba no meio deixa tudo inconsistente.
- **Correção**: RPCs `create_appointment` e `complete_appointment`.

#### A-11 · Consultas que quebram com volume (resultado errado silencioso)
- O PostgREST devolve no máximo 1.000 linhas por padrão, e nenhuma consulta pagina (só 18 usam `limit`/`range`). Telas afetadas: Clientes (`ClientsTab.tsx:62-80`), Analista (`AnalystTab.tsx:63-140`), Hoje (`TodayTab.tsx:44-121`), Aniversários (`BirthdaySection.tsx:107-117`).
- `.in("user_id", customerIds)` com **todos** os IDs de clientes (`ClientsTab.tsx:74,80`) vai estourar o limite de tamanho de URL com algumas centenas de clientes.
- **Correção**: views ou RPCs de agregação no banco (`get_client_metrics`, `get_analyst_summary`) e paginação.

#### A-12 · MFA aplicado só na interface
- **Evidência**: `useAuth.tsx:190-195` decide no cliente. Nenhuma política exige `aal2` (`auth.jwt()->>'aal'`).
- **Impacto**: uma senha vazada de admin dá acesso total pela API, mesmo com MFA "ativo".
- **Correção** (opcional, decidir com você): exigir `aal2` nas políticas de admin para quem tem fator verificado.

#### A-13 · Dependências com vulnerabilidades conhecidas
- `npm audit`: 30 vulnerabilidades (1 crítica em `jspdf <=4.2.0`, usado na exportação de PDF de clientes; altas em `react-router`/`@remix-run/router`, `dompurify`, `glob`, `brace-expansion`). Todas com `npm audit fix` disponível, sem breaking change aparente.

### 🟡 MÉDIO

| ID | Problema | Evidência |
|---|---|---|
| M-01 | Pesquisa de satisfação aceita pedido alheio e qualquer barbeiro | `mig 20260103010653:71-73`; `SatisfactionPopup.tsx` |
| M-02 | Barbeiro grava uso de assinatura para qualquer cliente | `mig 20260909021139:76-78` |
| M-03 | Estoque recalculado no navegador (ler, somar, gravar: corrida). **A venda de produto não baixa o estoque** (nenhum código cria movimento `sale`; perguntar se é intencional) | `StockTab.tsx:182-216`; `grep "sale"` só em rótulos `StockTab.tsx:296,309` |
| M-04 | "Trocar senha" pede a senha atual, mas **não a verifica** | `Header.tsx:127-155` (`currentPassword` nunca é usado) |
| M-05 | Corrida no `AuthProvider`: `loading=false` antes de o `role` chegar. `Dashboard` mostra a tela vazia (`return null`) e redireciona errado por um instante. O papel é buscado 2× (listener + getSession) | `useAuth.tsx:100-141`; `Dashboard.tsx:84-86` |
| M-06 | Datas "de hoje" em UTC (`toISOString().slice(0,10)`): no Brasil, depois das 21h o app acha que já é amanhã (cupom, cota, cobertura) | `CustomerDashboard.tsx:372`, `useSubscriptionQuota.ts:77`, `useSubscriptionCoverage.ts:75`, `useSubscriptionUsage.ts:42` |
| M-07 | **Regra de negócio duplicada**: (1) progresso de metas em `GoalsTab.tsx:114-215` e `useGoalProgress.ts:45-160`; (2) conclusão de atendimento em `AgendaTab.tsx:306-350` e `TodayAppointments.tsx:101-196`; (3) geração de horários em `AppointmentScheduler.tsx:207-289` e `AvailableTimeSlots.tsx:24-160`; (4) leitura de `barbershop_settings` em 4 arquivos (`AppointmentScheduler.tsx:130`, `CustomerDashboard.tsx:210`, `AvailableTimeSlots.tsx:65`, `SettingsTab.tsx:90`); (5) link de WhatsApp montado em 6 lugares (`grep wa.me`); (6) formatação de moeda com `toFixed(2)` em 88 ocorrências e 22 arquivos; (7) `profiles` consultado 2× em seguida em `CustomerDashboard.tsx:342,363` | — |
| M-08 | **Componentes gigantes** (UI + regra + banco): `BarbersTab` 1.114 l., `AgendaTab` 1.113, `AnalystTab` 1.052, `AppointmentScheduler` 1.005, `CustomerDashboard` 975, `ServicesTab` 910, `PromotionsTab` 832, `StockTab` 690, `SuggestionsTab` 615, `GoalsTab` 594, `BirthdaySection` 557, `SatisfactionTab` 549, `CustomerProducts` 546, `ClientsTab` 518 | `wc -l` |
| M-09 | **Busca de dados em `useEffect` + `useState`** (sem cache, sem cancelamento, deps faltando): `CustomerDashboard.tsx:389-398`, `AppointmentScheduler.tsx:122-146`, `CustomerProducts.tsx`, `ServicesTab`, `ProductsTab`, `PromotionsTab`, `StockTab`, `BarbersTab`, `SettingsTab`, `NewOrderDialog`; 7 avisos `exhaustive-deps` no lint | lint |
| M-10 | **Consultas N+1 e loops sequenciais**: combos (`AppointmentScheduler.tsx:171-187`), itens de promoção (`PromotionsTab.tsx:104-115`), metas uma a uma no `mount` (`GoalsTab.tsx:298-317`, `useGoalProgress.ts:247-250`), finalização em lote (`TodayAppointments.tsx:183-194`), barbeiro buscado à parte (`SatisfactionPopup.tsx:68-75`) | — |
| M-11 | **Bundle único de 2,99 MB (856 kB gzip)**. Sem `React.lazy` por rota ou aba; `exceljs`, `jspdf`, `html2canvas` e `recharts` entram no carregamento inicial, inclusive na Landing | `npm run build` |
| M-12 | **TypeScript frouxo**: `strict:false`, `strictNullChecks:false`, `noImplicitAny:false` (`tsconfig.app.json:18-22`, `tsconfig.json:12-17`); 98 erros com `--strict`; 17 `any` explícitos; interfaces manuais (`interface Service {...}` em vários arquivos) duplicando `integrations/supabase/types.ts`; casts como `as unknown as {...}` (`useSubscriptionUsage.ts:46`) | `tsc --strict` |
| M-13 | **Lint quebrado** (26 erros) impede usar o lint como portão de qualidade; `no-unused-vars` desligado (`eslint.config.js:23`) | seção 5 |
| M-14 | "Mais vendidos" do cliente usa `order_products`, que o RLS filtra para os pedidos do próprio cliente; o ranking reflete só as compras dele | `CustomerDashboard.tsx:289-313`, `CustomerProducts.tsx:105` |
| M-15 | `.env` versionado e não ignorado (`.gitignore` não lista `.env`). Hoje só há a chave *publishable* (pública por natureza), mas o padrão convida a commitar a service role no futuro | `.env`, `.gitignore` |
| M-16 | `send-subscription-reminders`: lock não atômico, comparação de segredo não constante, data-alvo em UTC, erro interno devolvido ao chamador | seção 3 |
| M-17 | A página de vendas anuncia os planos Básico (R$ 99,90) e Pro (R$ 199,90) com 7 dias grátis, mas todos os botões "Assinar" levam a `/auth`, que cria uma conta de **cliente**. Não existe cobrança da plataforma, e a diferença entre os planos não é aplicada em lugar nenhum | `Landing.tsx:152-186,301-371` |

### 🟢 BAIXO

| ID | Problema | Evidência |
|---|---|---|
| B-01 | **Código possivelmente morto** (perguntar antes de remover): `pages/Index.tsx` (fora das rotas); `BusinessTab.tsx` e `SuggestionsTab.tsx` (só usados pelo Index); `customer/NewOrderDialog.tsx`; `components/NavLink.tsx`; `hooks/useMFA.ts`; `ui/suggestion-card.tsx`; 22 componentes shadcn sem uso (accordion, aspect-ratio, breadcrumb, carousel, chart, collapsible, command, context-menu, drawer, form, hover-card, input-otp, menubar, navigation-menu, pagination, radio-group, resizable, sidebar, slider, toggle-group, alert) | busca de imports |
| B-02 | **Dependências sem uso no app**: `react-resizable-panels`, `vaul`, `cmdk`, `input-otp`, `react-day-picker`*, `react-hook-form`, `@hookform/resolvers`, `@radix-ui/react-{menubar,navigation-menu,context-menu,hover-card,aspect-ratio,toggle-group,slider,radio-group,accordion,collapsible}` (*`react-day-picker` é usado por `ui/calendar.tsx`, que é usado; manter) | `package.json` |
| B-03 | Resquícios do Lovable: `index.html` com título "Lovable App" e OG do Lovable; plugin `lovable-tagger` (`vite.config.ts:4,12`); `previewAuthStorage.ts` (ponte de sessão para o editor do Lovable); pasta `.lovable/` | — |
| B-04 | `react-helmet` sem manutenção (trocar por `react-helmet-async`); `@types/react-helmet` em `dependencies` | `package.json` |
| B-05 | Duas bibliotecas de toast em uso (`ui/toaster` do shadcn e `sonner`) | `App.tsx:1-2,20-21` |
| B-06 | Abas do dashboard sem URL (atualizar a página perde o contexto) | `Dashboard.tsx:26` |
| B-07 | Horário de funcionamento em 21 colunas (`monday_open` …); mapeamento repetido 7× em `SettingsTab.tsx:105-142` | — |
| B-08 | `has_role` executável por anon; `get_user_role` não determinístico e sem uso | §2.3 |
| B-09 | Dois lockfiles (`bun.lockb` e `package-lock.json`) | raiz |
| B-10 | Sem Error Boundary; erros só em `console.error` | — |
| B-11 | `QueryClient` sem defaults (`staleTime 0`, refetch no foco); polling de 60 s no Header para todo usuário (`Header.tsx:120`) | `App.tsx:14` |

---

## 5. Resultado de `npm install`, `npm run build` e `npm run lint`

### npm install
OK. 506 pacotes. **30 vulnerabilidades (9 moderadas, 20 altas, 1 crítica)**. Avisos de pacotes depreciados (`glob@7`, `fstream`) vindos de `exceljs`.

### npm run build
OK em ~20 s.
```
dist/assets/index-CSGzUgdX.js   2,988.97 kB │ gzip: 856.12 kB
(!) Some chunks are larger than 500 kB after minification.
Browserslist: caniuse-lite is 16 months old.
```

### npm run lint: ❌ 41 problemas (26 erros, 15 avisos)
| Regra | Qtde | Arquivos |
|---|---|---|
| `@typescript-eslint/no-explicit-any` (erro) | 19 | MFAEnroll:102, MFASettings:76, MFAVerify:83, SatisfactionPopup:34,150, BarbersTab:411,472, BusinessTab:186, GoalsTab:210, SatisfactionTab:34,137, ServicesTab:271(×2), TodayTab:406, GoalForm:54(×2),58, Header:151, ProfileDialog:109, useGoalProgress:152 |
| `prefer-const` (erro) | 3 | ClientsTab:253, GoalsTab:98, previewAuthStorage:38 |
| `no-empty-object-type` (erro) | 2 | ui/command:24, ui/textarea:5 |
| `no-require-imports` (erro) | 1 | tailwind.config.ts:102 |
| `react-hooks/exhaustive-deps` (aviso) | 7 | MFAEnroll:26, AppointmentScheduler:125,146, NewOrderDialog:68, GoalsTab:308, RequestsTab:25, CustomerDashboard:398 |
| `react-refresh/only-export-components` (aviso) | 8 | ui/badge, button, form, navigation-menu, sidebar, sonner, toggle; useAuth |

### tsc
`tsc -p tsconfig.app.json --noEmit` → 0 erros (com `strict:false`). Com `--strict` → **98 erros**.

---

## 6. Backend: Supabase próprio ou Lovable Cloud?

### Evidências
| Indício | Aponta para |
|---|---|
| `send-subscription-reminders` usa `LOVABLE_API_KEY` e `connector-gateway.lovable.dev/twilio` (conectores do Lovable só existem no **Lovable Cloud**) | Lovable Cloud |
| `client.ts` e `previewAuthStorage.ts` marcados "automatically generated" e com variáveis `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID` (nomes do Lovable Cloud) | Lovable Cloud |
| Migrations nomeadas `<timestamp>_<uuid>.sql` e `.lovable/plan/*.md` | gerado pelo Lovable (vale para os dois casos) |
| Projeto `daxylowysfvzpglnxahj` em `supabase.co` | os dois casos rodam em Supabase |

**Conclusão provável: Lovable Cloud.** Para confirmar em 1 minuto: entre em <https://supabase.com/dashboard> com a sua conta. Se o projeto `daxylowysfvzpglnxahj` **aparecer** na sua organização, o Supabase é seu. Se não aparecer e você só acessa o banco pelo painel "Cloud" do Lovable, é Lovable Cloud.

### O que muda em cada caso

**Se for Supabase próprio (projeto na sua conta):**
1. Instalar a CLI e `supabase link --project-ref daxylowysfvzpglnxahj`.
2. `supabase migration list`: conferir se o histórico remoto bate com as 39 migrations locais (o Lovable às vezes aplica SQL fora de arquivos).
3. `supabase db diff` para capturar o que está no banco e não está no repo (por exemplo, o `cron.schedule` do lembrete).
4. Gerar os tipos com `supabase gen types typescript --linked > src/integrations/supabase/types.ts`.
5. Trocar o gateway do Lovable pelo Twilio direto e configurar os secrets com `supabase secrets set`.
6. Pronto: controle total (backups, logs, SQL editor, branches).

**Se for Lovable Cloud (projeto na organização do Lovable):**
Você **não** tem acesso de dono ao projeto (sem connection string direta, sem `supabase link`, sem backups próprios). Para ter controle total é preciso **migrar** para um projeto seu:
1. Criar um projeto Supabase na sua conta (região `sa-east-1`).
2. Aplicar o schema: `supabase db push` com as migrations do repo, mais as correções da Etapa 1.
3. **Dados**: exportar pelo painel do Lovable Cloud (exportação de tabelas/CSV) ou pedir ao suporte do Lovable um dump do Postgres. Importar na ordem das FKs.
4. **Usuários (auth)**: o ponto mais delicado. Sem acesso ao schema `auth` não dá para levar os hashes de senha. Opções: (a) pedir ao suporte do Lovable o dump de `auth.users`; (b) recriar os usuários via Admin API e mandar e-mail de "defina sua senha"; (c) migrar os IDs preservando os UUIDs, o que é obrigatório porque `orders.customer_id` e `profiles.user_id` dependem deles.
5. **Storage**: baixar e reenviar os buckets `avatars`, `barbers`, `products`, `promotion-banners` e `barbershop`, e reescrever as URLs públicas gravadas nas tabelas (`avatar_url`, `image_url`, `logo_url`).
6. Edge functions: `supabase functions deploy`; secrets do Twilio; agendar o cron com `pg_cron` numa migration.
7. Trocar `.env` (URL e chave) e publicar o front (Vercel, Netlify ou Cloudflare Pages).
8. Janela de corte: congelar escrita, migrar, apontar o front, validar.

A migração é a **Etapa 0** do plano: as correções de segurança precisam rodar contra um banco que você controla e no qual consegue testar (local, via `supabase start`).

---

## 7. Perguntas para você (antes de mexer)

**Respondidas (2026-10-29):**
- ✅ **Multi-tenant** (C-05): cada barbearia tem seu espaço isolado no mesmo banco.
- ✅ **Cadastro self-service**: o dono da barbearia assina sozinho pelo site, cria o próprio acesso e é o admin da barbearia dele.
- ✅ **Barbeiro** (não admin): vê a agenda e os clientes, muda o status **dos próprios** atendimentos e vê as próprias metas e o extrato. Nada de catálogo, preços ou configurações.

**Em aberto:**
1. **Backend**: o projeto `daxylowysfvzpglnxahj` aparece no seu painel do Supabase? Há dados reais em produção que precisam ser preservados?
2. **Agenda do barbeiro**: ele vê os horários de todos os barbeiros da barbearia ou só os dele?
3. **Cliente em várias barbearias**: a mesma pessoa (mesmo e-mail) pode ser cliente de duas barbearias diferentes?
4. **Walk-in** (A-08): cadastrar cliente sem conta pela agenda é um fluxo usado? Hoje ele falha.
5. **Estoque** (M-03): a venda de produto num atendimento deveria baixar o estoque automaticamente?
6. **Código morto** (B-01): `Index.tsx`, `BusinessTab`, `SuggestionsTab`, `NewOrderDialog` e `useMFA` podem ser removidos, ou algum deles deveria estar em uso?
7. **MFA obrigatório no banco** (A-12): exigir `aal2` para admin quando o MFA estiver ativo?
