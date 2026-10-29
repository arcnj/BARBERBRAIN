# Arquitetura alvo do BarberBrain

> Objetivo: a mesma stack e as mesmas funcionalidades, com código organizado por **feature**,
> **regra de negócio crítica no banco** (RPCs e RLS) e **UI sem acesso direto ao Supabase**.

Stack (inalterada): React 18 · Vite · TypeScript · Tailwind · shadcn/ui · React Router 6 · TanStack Query 5 · Supabase (Postgres, Auth, Storage, Edge Functions). Testes: **Vitest** + Testing Library (a adicionar).

---

## 1. Princípios

1. **O banco é a fonte da verdade e da segurança.** O RLS define quem lê e quem escreve. Operações que mexem com dinheiro, status ou mais de uma tabela viram **RPC `SECURITY DEFINER`** transacional, como o módulo de assinaturas já faz (`confirm_subscription_payment`).
2. **A UI não conhece o Supabase.** Componentes chamam hooks da feature (`useAppointments()`, `useCreateAppointment()`). Só a camada `api/` de cada feature importa `supabase`.
3. **Regra de negócio pura é testável.** Cálculos (slots, cobertura de assinatura, comissão, segmentação de clientes) ficam em funções puras em `domain/`, sem React nem Supabase, com testes unitários.
4. **Tipos gerados.** `src/integrations/supabase/types.ts` é gerado pela CLI. Nada de `interface Service {...}` escrita à mão: usar `Tables<'services'>` e derivar.
5. **Feature isolada.** Uma feature só importa de outra pelo `index.ts` público dela. O que é compartilhado vai para `src/shared`.
6. **Componentes pequenos.** Uma tela compõe componentes menores. Referência: ~250 linhas por arquivo; acima de 400 é sinal para dividir.

---

## 2. Estrutura de pastas

```
src/
├── app/                         # composição da aplicação
│   ├── App.tsx                  # providers
│   ├── router.tsx               # rotas (lazy por página)
│   ├── providers/               # QueryProvider, AuthProvider, ThemeProvider
│   └── guards/                  # <RequireAuth>, <RequireRole role="admin">
│
├── features/
│   ├── auth/                    # login, cadastro, MFA, sessão, papel
│   ├── agenda/                  # agenda da equipe, hoje, status, conclusão de atendimento
│   ├── agendamento/             # fluxo do cliente: escolher serviço/barbeiro/horário
│   ├── disponibilidade/         # cálculo de horários livres (domain + RPC)
│   ├── barbeiros/               # CRUD, login do barbeiro, avatar
│   ├── clientes/                # CRM, segmentação, exportação, aniversariantes
│   ├── servicos/                # serviços e combos
│   ├── produtos/                # catálogo, vitrine do cliente
│   ├── estoque/                 # movimentações
│   ├── promocoes/               # promoções e cupons
│   ├── financeiro/              # comissões, extrato do barbeiro, faturamento
│   ├── metas/                   # metas e premiações
│   ├── assinaturas/             # planos, ciclos, uso, pagamentos, pedidos, lembretes
│   ├── satisfacao/              # pesquisa, perguntas, respostas
│   ├── analista/                # indicadores e sugestões
│   ├── configuracoes/           # dados da barbearia, horário de funcionamento, perfil
│   └── plataforma/              # página de vendas, cadastro da barbearia, cobrança do BarberBrain
│
├── shared/
│   ├── ui/                      # shadcn (antigo components/ui), só os usados
│   ├── components/              # Header, Navigation, EmptyState, ErrorBoundary, PeriodFilter
│   ├── lib/                     # cn, money.ts, dates.ts (fuso America/Sao_Paulo), whatsapp.ts, phone.ts
│   ├── hooks/                   # useMobile, useDebounce
│   └── types/                   # helpers de tipos (Row<T>, Insert<T>)
│
├── integrations/supabase/
│   ├── client.ts
│   └── types.ts                 # GERADO: não editar
│
└── test/                        # setup do Vitest, factories, mocks do supabase
```

### Anatomia de uma feature

```
features/agenda/
├── index.ts                 # API pública: exporta páginas, hooks e tipos usados por fora
├── api/
│   ├── agenda.api.ts        # funções async que falam com o Supabase (única camada que importa `supabase`)
│   └── keys.ts              # query keys: agendaKeys.day(date, barberId)
├── hooks/
│   ├── useDayAppointments.ts      # useQuery
│   ├── useUpdateAppointmentStatus.ts  # useMutation + invalidações
│   └── useCompleteAppointment.ts  # useMutation → rpc('complete_appointment')
├── domain/
│   ├── appointment-status.ts      # labels, cores, transições permitidas
│   └── appointment-status.test.ts
├── components/
│   ├── AgendaPage.tsx             # tela (compõe os demais)
│   ├── DayTimeline.tsx
│   ├── AppointmentCard.tsx
│   ├── AppointmentDetailsSheet.tsx
│   └── NewAppointmentDialog.tsx
└── types.ts                       # tipos derivados de Tables<'orders'>
```

### Fluxo de dados

```
Componente ──usa──▶ hook (useQuery/useMutation) ──chama──▶ api/*.api.ts ──▶ supabase (RLS / RPC)
     ▲                         │
     └──── dados tipados ◀─────┘          domain/*.ts ◀── funções puras usadas por hooks e componentes
```

- **Leitura**: `useQuery({ queryKey: agendaKeys.day(...), queryFn: () => agendaApi.listDay(...) })`.
- **Escrita**: `useMutation({ mutationFn: agendaApi.complete, onSuccess: () => qc.invalidateQueries({ queryKey: agendaKeys.all }) })`.
- **Nunca**: `useEffect(() => { supabase.from(...).then(setState) }, [])`.

---

## 3. Camada de dados

### 3.1 `api/` (acesso ao Supabase)

```ts
// features/servicos/api/servicos.api.ts
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Service = Tables<"services">;

export async function listActiveServices(): Promise<Service[]> {
  const { data, error } = await supabase.from("services").select("*").eq("active", true).order("name");
  if (error) throw error;
  return data;
}

export async function createService(input: TablesInsert<"services">) {
  const { data, error } = await supabase.from("services").insert(input).select().single();
  if (error) throw error;
  return data;
}
```

Regras:
- Sempre `if (error) throw error`. Erro silencioso é proibido.
- `select` explícito de colunas em telas de cliente (nunca `*` em tabela com coluna sensível).
- Listas grandes: paginar (`range`) ou agregar no banco (view/RPC). Nunca `.in()` com centenas de IDs.

### 3.2 `keys.ts` (query keys)

```ts
export const servicosKeys = {
  all: ["servicos"] as const,
  active: () => [...servicosKeys.all, "active"] as const,
  detail: (id: string) => [...servicosKeys.all, "detail", id] as const,
};
```

### 3.3 Hooks

- `useXxx` para query e `useCreateXxx`/`useUpdateXxx`/`useDeleteXxx` para mutation.
- O hook decide as invalidações; o componente não chama `invalidateQueries`.
- Defaults globais no `QueryClient`: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false` nas telas de cadastro.

### 3.4 RPCs (regra crítica no banco)

| RPC | Substitui | Feature |
|---|---|---|
| `get_available_slots(p_barber_id, p_date, p_duration_min)` → `(slot_start timestamptz)[]` | cálculo em `AppointmentScheduler` e `AvailableTimeSlots` | disponibilidade |
| `create_appointment(p_barber_id, p_starts_at, p_service_ids, p_combo_id, p_product_ids, p_coupon_id, p_notes)` → `orders` | 5 inserts e updates do cliente | agendamento |
| `update_appointment_status(p_order_id, p_status)` | updates diretos | agenda |
| `complete_appointment(p_order_id)` | status, uso, comissões e metas no cliente | agenda / financeiro / metas / assinaturas |
| `get_client_metrics(p_from, p_to)` | agregação em `ClientsTab` | clientes |
| `get_analyst_summary(p_from, p_to)` | 5 consultas e agregação em `AnalystTab` | analista |
| `deactivate_barber` (edge function, precisa de auth admin) | delete em `BarbersTab` | barbeiros |

As funções puras de `domain/` (ex.: `generateSlots`, `evaluateCoverage`, `computeCommission`) continuam existindo no front para **pré-visualização** e são testadas com os mesmos casos que validam a RPC.

---

## 4. Rotas alvo

```
/                         Landing                  público
/auth                     Login, cadastro, MFA     público
/cliente                  Agendar                  customer
/cliente/agendamentos     Meus agendamentos        customer
/cliente/produtos         Produtos                 customer
/cliente/assinatura       Minha assinatura         customer
/painel                   Hoje                     admin, barber
/painel/agenda            Agenda                   admin, barber
/painel/metas             Metas                    admin, barber
/painel/clientes          Clientes                 admin
/painel/aniversariantes   …                        admin
/painel/assinaturas       …                        admin
/painel/barbeiros         …                        admin
/painel/servicos          …                        admin
/painel/produtos          …                        admin
/painel/estoque           …                        admin
/painel/promocoes         …                        admin
/painel/satisfacao        …                        admin
/painel/analista          …                        admin
/painel/configuracoes     …                        admin
```

- Cada página com `React.lazy`, o que tira `exceljs`, `jspdf` e `recharts` do bundle inicial.
- `/dashboard` → redireciona para `/painel` (compatibilidade de links salvos).
- Guards declarativos: `<RequireRole roles={["admin"]}>`. Eles **complementam** o RLS e não o substituem.
- Navegação (`Navigation`) gerada a partir da mesma tabela de rotas e papéis.

---

## 5. Tipos

- Gerar após cada migration: `npm run db:types` → `supabase gen types typescript --local > src/integrations/supabase/types.ts`.
- Derivar tipos de domínio: `type Order = Tables<'orders'>`; joins: `type OrderWithItems = Order & { order_items: ... }`, ou usar `QueryData<typeof query>` do supabase-js.
- **Endurecer o TypeScript aos poucos**: `strictNullChecks` primeiro, depois `noImplicitAny` e por fim `strict`. Usar `// @ts-expect-error` com TODO só como ponte temporária, nunca `any`.
- Enums do banco (`order_status`, `app_role`, `goal_type`) importados de `Enums<'order_status'>`.

---

## 6. Convenções de nomes

| Item | Convenção | Exemplo |
|---|---|---|
| Pasta de feature | português, minúsculas, kebab | `features/assinaturas` |
| Componente | PascalCase, arquivo = componente | `AppointmentCard.tsx` |
| Página | `XxxPage.tsx` | `AgendaPage.tsx` |
| Hook | `useXxx.ts` (camelCase) | `useCompleteAppointment.ts` |
| API | `<feature>.api.ts`, funções verbo+substantivo | `listDayAppointments`, `createService` |
| Domain | `kebab-case.ts` + `.test.ts` ao lado | `slots.ts`, `slots.test.ts` |
| Query keys | `<feature>Keys` | `agendaKeys.day(date)` |
| Identificadores no código | inglês (casam com o banco: `orders`, `barbers`) | `barberId`, `scheduledAt` |
| Textos de UI | português | "Agendamento criado!" |
| Migrations | `supabase migration new <descricao_snake>` | `20261101120000_fix_rls_orders.sql` |
| Funções SQL | snake_case, verbo primeiro | `create_appointment` |
| Políticas RLS | `"<papel> <ação> <escopo>"` | `"customer insert own pending orders"` |
| Branch | `etapa-<n>-<slug>` | `etapa-1-rls-pedidos` |
| Commit | Conventional Commits em português | `fix(rls): impedir cliente de alterar status do pedido` |

---

## 7. Utilitários compartilhados (eliminam a duplicação mapeada em M-07)

| Arquivo | Conteúdo |
|---|---|
| `shared/lib/money.ts` | `formatBRL(n)`, `toCents`/`fromCents` (somas sem erro de ponto flutuante) |
| `shared/lib/dates.ts` | `todayInSaoPaulo()`, `startOfDayTZ`, `toDateKey(date)` (corrige M-06), `formatDateBR` |
| `shared/lib/whatsapp.ts` | `buildWhatsAppUrl(phone, message)`, `normalizeBRPhone` |
| `features/configuracoes/hooks/useBarbershopSettings.ts` | uma única leitura das configurações, com cache |
| `features/agenda/domain/appointment-status.ts` | labels, cores e transições de status |

---

## 8. Testes

- **Vitest** + `@testing-library/react` + `jsdom`.
- Prioridade (regras do CLAUDE.md):
  1. `disponibilidade/domain/slots.ts`: horário de funcionamento, dia fechado, sobreposição com duração somada, horário passado, fuso.
  2. `agendamento/domain/pricing.ts`: subtotal, combo, cupom % e valor, produtos.
  3. `assinaturas/domain/coverage.ts`: limite geral, limite por serviço, serviço fora do plano, ciclo vencido.
  4. `financeiro/domain/commission.ts` e `metas/domain/goal-progress.ts`.
- **Testes de banco** (RLS e RPC): `supabase test db` com pgTAP em `supabase/tests/`, cobrindo: cliente não altera status; cliente não vê pedido alheio; barbeiro não insere registro financeiro; `create_appointment` recusa horário ocupado.
- Os mocks do Supabase ficam em `src/test/supabase-mock.ts`. Testes de `domain/` não precisam de mock.

---

## 9. Banco: organização

- Migrations novas **sempre** pela CLI (`supabase migration new`), revisadas no PR.
- `supabase/seed.sql` com dados de desenvolvimento (1 admin, 2 barbeiros, 3 clientes, serviços e planos).
- `supabase/tests/*.sql` com pgTAP para RLS e RPCs.
- Desenvolvimento local com `supabase start`; nada de testar migration direto em produção.
- `cron.schedule` do lembrete versionado numa migration.

---

## 10. Multi-tenant: uma barbearia nunca vê a outra

Decisão do dono (2026-10-29): cada barbearia assinante tem seu espaço isolado. Modelo adotado: **um único banco**, com `barbershop_id` em todas as tabelas e isolamento garantido pelo **RLS**. É o modelo padrão de SaaS: um projeto só para manter, migrations aplicadas uma vez e custo que não se multiplica por cliente.

### Tabelas novas
```
barbershops          (id, name, slug UNIQUE, status: active|suspended, created_at)
barbershop_members   (barbershop_id, user_id, role: admin|barber|customer, UNIQUE(barbershop_id, user_id))
platform_admins      (user_id)   -- você, dono da plataforma: suporte e visão geral (não cria barbearias)
```
- `barbershop_members` substitui `user_roles`: o papel passa a ser **por barbearia**. `user_roles` fica até a Fase 4.
- Todas as tabelas de negócio ganham `barbershop_id uuid NOT NULL REFERENCES barbershops`, com índice. Tabelas filhas (`order_items`, `order_products`, `subscription_usages`…) também carregam a coluna, com FK composta `(barbershop_id, order_id)` para impedir referência cruzada.
- As tabelas de configuração (`barbershop_settings`, `birthday_settings`, `satisfaction_settings`, `subscription_reminder_settings`) passam a ter **uma linha por barbearia** (`UNIQUE(barbershop_id)`).
- `profiles` continua global (é a pessoa); o vínculo com a barbearia é o `barbershop_members`.

### Funções de apoio (SECURITY DEFINER, STABLE)
```sql
is_member(p_shop uuid) → boolean
has_shop_role(p_shop uuid, p_role app_role) → boolean
current_barber_id(p_shop uuid) → uuid   -- barbers.id do usuário naquela barbearia
```

### Padrão de política
```sql
-- staff lê, só admin escreve (ex.: services)
create policy "member select services" on services for select
  using (is_member(barbershop_id));
create policy "admin all services" on services for all
  using (has_shop_role(barbershop_id, 'admin'))
  with check (has_shop_role(barbershop_id, 'admin'));

-- barbeiro só altera os próprios atendimentos
create policy "barber update own orders" on orders for update
  using (has_shop_role(barbershop_id, 'barber') and barber_id = current_barber_id(barbershop_id))
  with check (has_shop_role(barbershop_id, 'barber') and barber_id = current_barber_id(barbershop_id));
```
Toda RPC `SECURITY DEFINER` recebe ou deduz o `barbershop_id` e verifica `has_shop_role` **antes** de qualquer leitura ou escrita.

### Papéis dentro de uma barbearia
| Papel | Pode |
|---|---|
| admin (dono) | tudo na própria barbearia |
| barber | ver a agenda e os clientes; mudar o status dos próprios atendimentos; ver as próprias metas e o extrato. Nada de catálogo, preços ou configurações |
| customer | agendar, cancelar os próprios agendamentos, ver produtos, promoções e a própria assinatura, responder pesquisa |

### Storage
Caminho dos arquivos: `<barbershop_id>/<pasta>/<arquivo>`. As políticas checam `(storage.foldername(name))[1]::uuid` com `is_member` / `has_shop_role`.

### Front
- `BarbershopProvider` mantém a barbearia atual (vinda da URL `/b/<slug>` para clientes e do vínculo para a equipe; seletor se o usuário pertencer a mais de uma).
- A camada `api/` sempre envia `barbershop_id` nos inserts e filtra por ele nas leituras. O RLS garante o isolamento mesmo que o front erre.
- Cadastro de cliente pelo link da barbearia: cria o usuário e o `barbershop_members(role='customer')` daquela barbearia.

### Testes de isolamento (obrigatórios)
- pgTAP que percorre `information_schema.tables` do schema `public` e falha se alguma tabela de negócio não tiver `barbershop_id`, RLS habilitado e políticas.
- Cenário com duas barbearias: para cada papel da barbearia A, tentar SELECT/INSERT/UPDATE/DELETE em dados da B, e tudo deve falhar ou voltar vazio.

### Onboarding e cobrança (a barbearia assina sozinha)

```
Página de vendas (/) ──"Assinar"──▶ /assinar (dados do dono + barbearia + slug)
   └─▶ RPC create_barbershop  → barbershops(status='trial') + barbershop_members(role='admin') + configurações padrão
   └─▶ painel /painel (7 dias de teste)
   └─▶ "Assinar agora" ─▶ edge fn create-checkout ─▶ checkout do provedor
                                         provedor ──webhook──▶ edge fn billing-webhook
                                                                 └─▶ billing_events (idempotência)
                                                                 └─▶ barbershop_billing + barbershops.status
Dono (admin) ─▶ cadastra barbeiros (create-barber-user, escopo da barbearia dele)
Clientes     ─▶ se cadastram pelo link /b/<slug> da barbearia
```

Status da barbearia: `trial → active → past_due → suspended | cancelled`. A função `is_member()` só considera barbearias com acesso liberado, com este efeito: `past_due` (até 7 dias) = acesso normal com aviso; `read_only` = só SELECT para a equipe e nenhum agendamento novo; `suspended` (após 30 dias) = sem acesso, só a tela de pagamento.

Dois tipos de "assinatura", que nunca se misturam:
| | Quem paga | Para quem | Tabelas | Feature |
|---|---|---|---|---|
| Assinatura da plataforma | barbearia | BarberBrain | `platform_plans`, `barbershop_billing`, `billing_events` | `plataforma` |
| Assinatura de clientes | cliente da barbearia | barbearia | `subscription_*` (já existentes) | `assinaturas` |

---

## 11. Planos da plataforma (Básico × Pro)

| | **Básico** | **Pro** |
|---|---|---|
| Preço | R$ 119,90/mês | R$ 250,00/mês |
| Barbeiros | 5 incluídos + **R$ 20,00/mês por barbeiro adicional** | **ilimitados** |

**Distribuição de funções**. *Proposta aguardando confirmação do dono.* Critério: o Básico **opera** a barbearia; o Pro faz a barbearia **crescer e reter clientes**.

| Função | Básico | Pro |
|---|:-:|:-:|
| Hoje (visão do dia) | ✓ | ✓ |
| Agenda da equipe + agendamento online pelo cliente (link `/b/<slug>`) | ✓ | ✓ |
| Clientes: cadastro e histórico | ✓ | ✓ |
| Barbeiros: cadastro e login | ✓ (5 + adicionais) | ✓ ilimitado |
| Serviços e combos | ✓ | ✓ |
| Comissões e extrato do barbeiro | ✓ | ✓ |
| Configurações (horários, WhatsApp manual, logo) | ✓ | ✓ |
| Metas com premiação | — | ✓ |
| Clientes: segmentação (VIP, em risco, perdidos) e exportação PDF/Excel | — | ✓ |
| Produtos, estoque e venda de produto no agendamento | — | ✓ |
| Promoções | — | ✓ |
| Aniversariantes e cupons automáticos | — | ✓ |
| Clube de assinatura para os clientes da barbearia | — | ✓ |
| Pesquisa de satisfação | — | ✓ |
| Analista (indicadores e sugestões) | — | ✓ |
| Lembretes automáticos por WhatsApp | — | ✓ |

Regras técnicas:
- Tabela `platform_plan_features (plan_id, feature)` e função `barbershop_has_feature(shop, feature)`, usadas nas **políticas e RPCs** (a UI só esconde; quem bloqueia é o banco).
- Rebaixar de Pro para Básico **não apaga dados**: as funções do Pro ficam inacessíveis até voltar ao Pro.
- O trial de 7 dias libera as funções do Pro.
- Preço do Básico calculado por função pura `features/plataforma/domain/pricing.ts`, com testes (0, 5, 6 e 12 barbeiros; troca de plano).

**Provedor de pagamento: Asaas (recomendado).** Assinatura recorrente com Pix, boleto e cartão; API para alterar o valor da assinatura (necessária para o adicional por barbeiro); webhooks; sandbox gratuito. Alternativas: Mercado Pago (recorrência forte só no cartão) e Stripe (excelente em cartão e cobrança por assento, mas Pix e boleto recorrentes são o ponto fraco no Brasil). A integração fica isolada em `supabase/functions/_shared/billing/` para permitir trocar de provedor.
