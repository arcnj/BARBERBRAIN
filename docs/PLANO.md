# Plano de reconstrução do BarberBrain

> Regras gerais (detalhadas no `CLAUDE.md`): uma etapa por vez, cada uma em branch própria
> (`etapa-<n>-<slug>`), commits pequenos, build e lint verdes antes de cada commit, nenhuma
> funcionalidade removida sem aprovação, nenhuma mudança destrutiva no banco sem aprovação explícita.
>
> Cada etapa deixa o app **funcionando e publicável**. Referências como C-01 e A-07 apontam para `docs/DIAGNOSTICO.md`.

## Visão geral

| Fase | Etapas | Objetivo |
|---|---|---|
| **0. Fundação** | 0.1 – 0.3 | Portão de qualidade (lint, testes, CI) e **controle do banco** |
| **1. Multi-tenant + segurança** | 1.0 – 1.9 | Isolar as barbearias, fechar as brechas de RLS, mover a regra crítica para o banco e permitir que a barbearia assine sozinha |
| **2. Base do front** | 2.1 – 2.3 | Utilitários compartilhados, roteamento e estrutura `features/` |
| **3. Migração por feature** | 3.1 – 3.12 | Uma feature por etapa, da mais simples para a mais complexa |
| **4. Acabamento** | 4.1 – 4.4 | TypeScript estrito, limpeza, performance e resquícios do Lovable |

**Decisões tomadas (2026-10-29)**
- ✅ **Multi-tenant**: cada barbearia assinante tem seu espaço isolado num único banco (`barbershop_id` + RLS). Ver Etapa 1.0 e `ARQUITETURA.md` §10.
- ✅ **Barbeiro (não admin)**: vê a agenda e os clientes, muda o status dos próprios atendimentos e vê as próprias metas e o extrato. Nada de catálogo, preços ou configurações.
- ✅ **Cadastro self-service**: o dono da barbearia assina sozinho pela página de vendas, cria o próprio acesso e vira o **admin** da barbearia dele; depois cadastra os barbeiros. Ver Etapas 1.0f e 1.9.
- ✅ **Banco**: Supabase numa conta **do dono** (Postgres gerenciado na nuvem + Auth + Storage + Edge Functions). Com multi-tenant, um único projeto atende todas as barbearias.

- ✅ **Barbeiro vê só a própria agenda** (e os clientes da barbearia).
- ✅ **Cliente em várias barbearias**: permitido (mesmo e-mail, vínculo por barbearia, seletor de barbearia no app do cliente).
- ✅ **Sem dados reais**: o projeto não está no ar. A Etapa 0.3 segue o caminho "começar do zero" num Supabase próprio, sem migração de dados.
- ✅ **Inadimplência**: tolerância → só leitura → bloqueio (prazos sugeridos na Etapa 1.9).
- ✅ **Preços**: Básico R$ 119,90/mês com 5 barbeiros incluídos e R$ 20/mês por barbeiro adicional; Pro R$ 250,00/mês com barbeiros ilimitados. A distribuição de funções entre os planos está em `ARQUITETURA.md` §11 (**proposta aguardando confirmação**).
- ✅ **Link para testar**: front publicado na Vercel ligada ao GitHub (um link por PR e um link fixo do `main`) + Supabase próprio de staging. Ver Etapa 0.2.

**Ainda em aberto**: provedor de pagamento (recomendação: Asaas, ver Etapa 1.9) e confirmação da distribuição de funções por plano.

---

## FASE 0: Fundação

### Etapa 0.1 · Portão de qualidade
**O que muda**
- Corrigir os 26 erros de lint (mecânicos: `any` → tipo correto ou `unknown`, `let` → `const`, interfaces vazias → `type`, `require` → `import` no tailwind). Os 15 avisos ficam para as etapas das features.
- Instalar Vitest + Testing Library + jsdom; scripts `test`, `test:watch` e `typecheck` (`tsc --noEmit`).
- Primeiro teste: smoke de uma função pura existente (`evaluateCoverage` em `useSubscriptionCoverage.ts`).
- GitHub Actions: `npm ci && npm run lint && npm run typecheck && npm test && npm run build` em PR.
- `npm audit fix` (sem `--force`) para fechar as vulnerabilidades com correção compatível (A-13).

**Riscos**: o `audit fix` pode subir versões menores de `react-router`, `jspdf` e `dompurify`. Mitigação: testar manualmente a exportação de PDF e Excel de Clientes e a navegação.
**Validar**: lint com 0 erros; CI verde; exportar PDF e Excel em Clientes; fluxo de login e agendamento manual.

### Etapa 0.2 · Higiene de configuração
**O que muda**
- `.env` no `.gitignore` e criação de `.env.example` com as 3 variáveis (sem valores reais). Tirar o `.env` do controle de versão com `git rm --cached` (o arquivo local continua existindo).
- Documentar onde configurar as variáveis no host do front.
- Corrigir `index.html` (título, descrição e OG do BarberBrain, `lang="pt-BR"`).

**Riscos**: quem clonar o repo precisa criar o `.env` a partir do exemplo (documentado no CLAUDE.md). A chave publishable continua no histórico do git, o que é aceitável porque ela é pública por natureza. Se ainda assim quiser, dá para rotacioná-la no painel.
**Validar**: `git status` não mostra `.env`; build local com `.env` criado do exemplo.

### Etapa 0.3 · Controle do banco (bloqueia a Fase 1)
**Caminho A: Supabase próprio**
- `supabase init`/`link`, `supabase migration list`, `supabase db diff --linked` para capturar o que está em produção e não está no repo (cron, ajustes manuais). Isso vira uma migration de "baseline".
- `supabase/seed.sql` com dados fictícios; `supabase start` funcionando localmente.
- Script `db:types` gerando `types.ts` e conferindo que não há diff com o atual.

**Caminho B: Lovable Cloud** → migração para um projeto seu (passo a passo em DIAGNOSTICO §6):
- Novo projeto (sa-east-1), schema via migrations, exportação e importação de dados **preservando UUIDs**, usuários de auth (dump via suporte ou recriação com e-mail de redefinição), storage com reescrita de URLs, edge functions, secrets e front apontando para o novo projeto.
- Ensaio completo num projeto de staging antes da virada; checklist de corte.

**Riscos**: (B) perda de senhas dos usuários se o dump de `auth` não for obtido; URLs de imagens quebradas. Mitigação: ensaio em staging e conferência de contagem de linhas por tabela.
**Validar**: login de admin, barbeiro e cliente no ambiente novo; contagem de linhas igual à origem; imagens carregando; agendar, concluir e ver em Clientes.

---

## FASE 1: Multi-tenant e segurança (prioridade máxima)

> Todas as etapas desta fase são **migrations aditivas ou de política** (sem DROP de tabela ou coluna).
> Cada etapa vem com testes pgTAP em `supabase/tests/` provando o que passou a ser bloqueado.
> Ordem pensada para **não quebrar a UI**: quando uma política fecha um caminho que o front usa,
> a mesma etapa troca o front para o caminho novo.

### Etapa 1.0 · Multi-tenant (isolamento entre barbearias, C-05)
Vem antes das demais porque todas as políticas da Fase 1 passam a ser escritas com o filtro de barbearia. Fazer as políticas antes e o tenant depois significaria reescrevê-las duas vezes. Dividida em sub-etapas, cada uma com o app funcionando:

- **1.0a · Estrutura** (aditiva): tabelas `barbershops`, `barbershop_members (barbershop_id, user_id, role)` e `platform_admins`; funções `is_member(shop)`, `has_shop_role(shop, role)` e `current_barber_id(shop)`. Criação da barbearia nº 1 para os dados atuais.
- **1.0b · Colunas**: `barbershop_id` (nullable) em todas as tabelas de negócio e **preenchimento com a barbearia nº 1**. ⚠️ Isso é um UPDATE em massa e precisa da sua aprovação, embora não apague nada. Depois: `NOT NULL`, índices e FKs compostas (garantem que um item de pedido não aponte para um pedido de outra barbearia). As tabelas de configuração passam a ter uma linha por barbearia.
- **1.0c · Membros**: copiar `user_roles` para `barbershop_members` da barbearia nº 1. `user_roles` **continua existindo** até a Fase 4 (removê-la exigirá aprovação).
- **1.0d · Políticas**: reescrever o RLS de todas as tabelas com `is_member(barbershop_id)` + papel, já com as regras de barbeiro aprovadas (absorve a Etapa 1.3). Storage com caminho `<barbershop_id>/...`.
- **1.0e · Front e edge functions**: contexto da barbearia atual (`BarbershopProvider`), cadastro de cliente pelo link da barbearia (`/b/<slug>`), `barbershop_id` em todos os inserts, edge functions validando "admin desta barbearia".
- **1.0f · Cadastro da barbearia (self-service)**: o dono se cadastra sozinho pela página de vendas (`/assinar`) informando nome, e-mail, senha, nome da barbearia e endereço do link (`slug`). A RPC `create_barbershop` cria, numa transação, a barbearia (status `trial`), o vínculo dele como **admin** e as configurações padrão. Ele entra direto no painel. A cobrança vem na Etapa 1.9.

**Riscos**: é a maior mudança do plano. Uma tabela esquecida sem `barbershop_id` vaza dados. Mitigação: **teste pgTAP automático que percorre todas as tabelas de `public`** e falha se alguma não tiver `barbershop_id` + RLS, mais testes com dois tenants (usuário da barbearia A não lê, não grava e não apaga nada da B).
**Validar**: duas barbearias de teste com dados; logins de admin, barbeiro e cliente de cada uma; nenhuma tela mostra dado da outra; a barbearia nº 1 continua funcionando exatamente como antes.

### Etapa 1.1 · Brechas isoladas (sem impacto no fluxo)
**O que muda** (migration `fix_rls_isolated`):
- Bucket `barbershop`: INSERT/UPDATE/DELETE só admin (A-02).
- `satisfaction_responses`: INSERT exige que `order_id` seja um pedido **do próprio cliente**, concluído, e que `barber_id` seja o barbeiro do pedido (M-01).
- `stock_movements`: remover a exceção `created_by IS NULL` para barbeiros (M-03).
- `subscription_usages`: INSERT de barbeiro exige pedido do próprio barbeiro (M-02); o caminho definitivo vem na 1.4.
- Storage `barbers`, `products` e `promotion-banners`: escrita só admin.

**Riscos**: se algum barbeiro hoje sobe imagens ou movimenta estoque pela API, perde a permissão. Pela UI isso já não acontece, porque essas abas são só do admin.
**Validar**: pgTAP (cliente não grava no bucket; cliente não responde por pedido alheio); manual: admin troca o logo; cliente responde a pesquisa normalmente.

### Etapa 1.2 · Dados sensíveis (A-03)
**O que muda**
- Clientes e anon leem barbeiros e produtos **só pelas views** `barbers_public` / `products_public`, recriadas sem `security_invoker` e com apenas as colunas públicas.
- Remover as políticas "Authenticated users can view active barbers/products" para o papel customer (staff mantém o acesso).
- Front: `SatisfactionPopup.tsx:69` e as leituras de produtos em `CustomerDashboard.tsx:281` e `CustomerProducts.tsx:96` passam a usar as views.

**Riscos**: alguma tela de cliente que lia `barbers` ou `products` direto e não foi mapeada. Mitigação: `grep` completo e teste manual de todas as telas do cliente.
**Validar**: pgTAP (cliente recebe erro ao pedir `barbers.email` e `products.cost_price`); telas do cliente iguais às de antes.

### Etapa 1.3 · Separar barbeiro de admin (C-01)
> Implementada junto com a Etapa 1.0d. Mantida aqui como especificação.

**Permissões do barbeiro** (✅ aprovadas em 2026-10-29; sempre dentro da própria barbearia):
- **Lê**: catálogo (serviços, combos, produtos), agenda de todos (para a recepção), perfis de clientes, próprias metas e próprio extrato.
- **Escreve**: pedidos e itens **em que é o barbeiro** (criar, mudar status), avatar próprio.
- **Não escreve**: barbeiros, serviços, produtos, promoções, cupons, configurações e registros financeiros.

**O que muda**
- Trocar as políticas `FOR ALL (barber OR admin)` por `FOR ALL (admin)` mais `FOR SELECT (barber)` onde for leitura.
- `orders` UPDATE por barbeiro: `barber_id` ou `preferred_barber_id` = barbeiro do usuário (ou admin).

**Riscos**: algum fluxo da Agenda ou do Hoje usado por barbeiro que escreve em tabela de admin. Mitigação: mapear os writes das 3 abas do barbeiro antes; teste manual logado como barbeiro.
**Validar**: pgTAP por tabela (barbeiro não faz UPDATE em `services`, não faz DELETE em `barbers`); barbeiro consegue criar e concluir os próprios atendimentos.

### Etapa 1.4 · Conclusão de atendimento no servidor (C-03, A-01, A-07, A-10)
**O que muda**
- Migration: RPC `complete_appointment(p_order_id)` `SECURITY DEFINER`, em uma transação: valida papel e dono; muda o status; registra o uso da assinatura (com `ON CONFLICT` correto); grava as comissões; recalcula as metas do mês e grava a premiação uma única vez.
- `UNIQUE (reference_id, record_type)` em `barber_financial_records`. **Antes**: consulta de duplicatas já existentes (A-01). **Se houver duplicatas, eu paro e mostro a lista: apagar ou ajustar registros financeiros exige sua aprovação.**
- Front: `AgendaTab` e `TodayAppointments` passam a chamar a RPC (some a duplicação M-07 item 2).
- Remover INSERT/UPDATE de barbeiro em `barber_financial_records` e INSERT de barbeiro em `subscription_usages`.
- Testes: pgTAP da RPC (idempotência, premiação única, uso coberto e não coberto) e Vitest das funções puras de comissão e progresso.

**Riscos**: diferença entre o cálculo antigo (cliente) e o novo (servidor). Mitigação: rodar os dois em paralelo em staging e comparar com pedidos reais. Duplicatas existentes bloqueiam a constraint.
**Validar**: concluir um atendimento como barbeiro e como admin; conferir 1 registro de comissão por pedido; bater a meta e conferir 1 premiação; assinante com uso registrado.

### Etapa 1.5 · Agendamento e disponibilidade no servidor (C-02, C-04, A-04)
**O que muda**
- RPC `get_available_slots(barber_id, date, duration)`: usa `barbershop_settings` (dia fechado, horários) e os pedidos ativos do barbeiro; devolve **só horários**, sem dados de outros clientes.
- RPC `create_appointment(...)`: recalcula o preço a partir de `services`, combos, cupom e produtos; revalida o horário com `pg_advisory_xact_lock(barber, dia)`; insere pedido, itens e produtos; incrementa o combo; marca o cupom. Tudo atômico.
- Função pura `domain/slots.ts` + testes Vitest (horário de funcionamento, dia fechado, sobreposição com **duração somada de todos os serviços**, horário passado, fuso America/Sao_Paulo).
- Front: `AppointmentScheduler` e `AvailableTimeSlots` usam as RPCs (some a duplicação M-07 item 3); `CustomerDashboard` para de aceitar preço pela URL (passa só os IDs dos produtos).
- RLS de `orders`: cliente **sem INSERT direto** (só via RPC) e UPDATE só para `status='cancelled'` (trigger impede mudar as outras colunas). `order_items`/`order_products`: sem INSERT direto do cliente.

**Riscos**: é o fluxo principal do cliente. Mitigação: feature flag simples (variável de ambiente) para voltar ao caminho antigo durante 1 semana; teste manual completo; testes de concorrência na RPC (dois agendamentos simultâneos no mesmo horário → 1 falha).
**Validar**: cliente B não vê como livre o horário reservado pelo cliente A; domingo fechado não mostra horários; sábado termina às 14h; preço gravado = preço do catálogo; cupom não pode ser usado 2×; combo respeita `max_redemptions`.

### Etapa 1.6 · Edge functions de usuários (A-05, A-06)
**O que muda**
- `create-barber-user`: validação com zod, `has_role`, desfaz o usuário criado se o papel ou o vínculo falharem, recusa barbeiro já vinculado, `verify_jwt = true`.
- `reset-barber-password`: confere se o alvo tem papel `barber`.
- Nova `deactivate-barber`: remove o papel, bane o usuário (`ban_duration`) e marca `barbers.active=false`. O botão "Excluir" passa a desativar; excluir de fato só sem histórico, e **com a sua aprovação** da regra.
- Remover a "verificação de senha" por `signInWithPassword` no cliente; senha gerada com `crypto.getRandomValues`; chamadas via `supabase.functions.invoke`.

**Riscos**: mudança no comportamento do botão "Excluir" (vira "Desativar"). **Precisa da sua confirmação.**
**Validar**: criar login de barbeiro; redefinir senha; tentar redefinir a senha de um cliente (403); desativar barbeiro e confirmar que o login dele não acessa mais nada.

### Etapa 1.7 · Lembretes sem Lovable (A-09, M-16)
**O que muda**: chamada direta à API do Twilio (secrets `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`); lock atômico (`INSERT ... ON CONFLICT ... WHERE locked_until < now()`); comparação de segredo em tempo constante; data-alvo em America/Sao_Paulo; migration com `cron.schedule` e `pg_net`.
**Riscos**: custo e template do Twilio (o template aprovado precisa existir na conta). Mitigação: modo "dry-run" que só registra em `subscription_reminders`.
**Validar**: disparo manual pelo admin em staging; registro `sent` com `provider_message_id`.

### Etapa 1.8 · (Opcional) MFA exigido no banco (A-12)
**O que muda**: políticas de admin exigem `aal2` quando o usuário tem fator verificado.
**Riscos**: admin sem acesso se perder o autenticador. Precisa de um procedimento de recuperação. **Só com a sua aprovação.**

### Etapa 1.9 · Cobrança da plataforma (a barbearia paga o BarberBrain)
Funcionalidade nova pedida pelo dono (2026-10-29): a barbearia assina sozinha pelo site.
**O que muda**
- Tabelas `platform_plans` (Básico R$ 119,90 com 5 barbeiros incluídos + R$ 20 por adicional; Pro R$ 250,00 ilimitado), `barbershop_billing` (plano, status, fim do período, IDs do provedor) e `billing_events` (eventos do webhook, para idempotência). Nomes distintos de `subscription_*`, que continuam sendo as assinaturas **dos clientes da barbearia**.
- Edge function `create-checkout`: gera o checkout do provedor de pagamento para o admin da barbearia.
- Edge function `billing-webhook`: valida a assinatura do provedor, grava o evento uma única vez e atualiza `barbershops.status` (`trial` → `active` → `past_due` → `suspended` / `cancelled`).
- Teste grátis de 7 dias com as funções do Pro, depois cobrança recorrente no plano escolhido.
- **Preço variável do Básico**: `valor = 119,90 + 20 × max(0, barbeiros_ativos − 5)`. Ao cadastrar o 6º barbeiro em diante, o admin vê a confirmação "isto adiciona R$ 20,00/mês" e o valor da assinatura no provedor é atualizado para a **próxima** fatura (sem cobrança proporcional). Desativar barbeiro reduz a próxima fatura. Função pura `domain/pricing.ts` com testes. A partir de 12 barbeiros o Pro fica mais barato (R$ 259,90 × R$ 250,00); a tela sugere a troca.
- Contagem: barbeiros com `active = true` na barbearia (o dono conta se também estiver cadastrado como barbeiro).
- Inadimplência (✅ aprovado): pagamento vencido → **7 dias de tolerância** com aviso no painel → **só leitura** (vê tudo, não cria nem altera; clientes não conseguem agendar) → **bloqueio** após 30 dias. Ao pagar, reativa na hora. Os prazos são configuráveis.
- Diferença entre os planos aplicada **no banco** (`barbershop_has_feature(shop, 'produtos')` nas políticas e RPCs) e na UI (abas bloqueadas com convite para o Pro), conforme `ARQUITETURA.md` §11.
- **Provedor recomendado: Asaas** (motivos no resumo da sessão e em `ARQUITETURA.md` §11).
- Página de vendas: os botões "Assinar" levam a `/assinar` (hoje levam ao cadastro de **cliente**, M-17); tela "Minha assinatura do BarberBrain" no painel do admin (trocar plano, cartão, cancelar).

**Riscos**: dinheiro e acesso. Webhook duplicado ou fora de ordem; barbearia bloqueada por engano. Mitigação: idempotência por ID do evento, ambiente de testes do provedor (sandbox), tolerância de alguns dias antes de suspender e testes pgTAP do bloqueio.
**Validar**: no sandbox, assinar → trial → pagamento aprovado → `active`; pagamento recusado → `past_due` → `suspended` após a tolerância; reativar pagando; webhook repetido não duplica nada.

---

## FASE 2: Base do front

### Etapa 2.1 · Utilitários compartilhados
**O que muda**: `shared/lib/money.ts`, `dates.ts` (fuso de SP, corrige M-06), `whatsapp.ts`; hook `useBarbershopSettings`; `QueryClient` com defaults; `ErrorBoundary`. Substituição mecânica das duplicatas (M-07 itens 4 a 6). Testes unitários dos utilitários.
**Riscos**: mudança sutil de formatação (ex.: "R$ 10,00" com espaço não separável). Mitigação: testes de snapshot das funções.
**Validar**: valores e datas iguais nas telas principais; cupom e cota corretos depois das 21h.

### Etapa 2.2 · Roteamento e guards
**O que muda**: `app/router.tsx` com rotas por aba (`/painel/agenda` …), `React.lazy` por página, `<RequireRole>`, `/dashboard` → `/painel`; a navegação lê a tabela de rotas; correção da corrida do `AuthProvider` (M-05: `loading` só termina com o `role` carregado).
**Riscos**: links e favoritos antigos. Mitigação: redirecionamentos.
**Validar**: atualizar a página mantém a aba; barbeiro digitando `/painel/servicos` cai em "sem acesso"; bundle inicial bem menor (meta: < 600 kB).

### Etapa 2.3 · Esqueleto `features/` e `shared/ui`
**O que muda**: mover `components/ui` → `shared/ui` e `layout` → `shared/components`, com alias e sem mudança de código; criar as pastas das features com `index.ts`. Tudo por movimentação de arquivos e imports.
**Riscos**: imports quebrados (o build pega).
**Validar**: build, lint e testes verdes; navegação completa.

---

## FASE 3: Migração por feature

Cada etapa segue o mesmo roteiro:
1. Criar `api/`, `keys.ts`, `hooks/`, `domain/` (com testes) e `types.ts` derivados de `types.ts` gerado.
2. Quebrar o componente gigante em `components/` menores sem mudar o visual.
3. Trocar `useEffect` + `useState` por `useQuery`/`useMutation`.
4. Remover o acesso direto ao Supabase dos componentes.
5. Validar manualmente a tela inteira (checklist da feature no PR).

| Etapa | Feature | Arquivos de origem | Pontos de atenção |
|---|---|---|---|
| 3.1 | configuracoes | SettingsTab (461), ProfileDialog, MFA* | horário em 21 colunas: manter o schema, mapear em `domain/business-hours.ts` |
| 3.2 | servicos | ServicesTab (910) | combos com N+1 → 1 query com join |
| 3.3 | produtos + estoque | ProductsTab (495), StockTab (690), CustomerProducts (546) | movimento de estoque via RPC atômica; **perguntar** sobre baixa automática na venda (M-03) |
| 3.4 | promocoes | PromotionsTab (832) | N+1 dos itens |
| 3.5 | barbeiros | BarbersTab (1.114) | já usa as edge functions da 1.6 |
| 3.6 | satisfacao | SatisfactionTab (549), SatisfactionPopup (319) | — |
| 3.7 | clientes (+ aniversariantes) | ClientsTab (518), BirthdaySection (557), BirthdaysTab | métricas por RPC `get_client_metrics` (A-11); exportação PDF/Excel com `import()` dinâmico |
| 3.8 | metas + financeiro | GoalsTab (594), goals/* , useGoalProgress, useCommissions | remove a duplicação M-07 item 1; leitura apenas (o cálculo já está no servidor desde a 1.4) |
| 3.9 | assinaturas | subscriptions/*, useSubscription*.ts, MySubscription* | já bem organizado: mover para `features/assinaturas`, extrair `domain/coverage.ts` e testes |
| 3.10 | agenda (+ hoje) | AgendaTab (1.113), TodayAppointments (405), TodayTab (440), AvailableTimeSlots | walk-in (A-08) depende da sua decisão |
| 3.11 | agendamento (cliente) | AppointmentScheduler (1.005), CustomerDashboard (975) | dividir em passos (Serviços → Barbeiro → Data/Hora → Resumo) |
| 3.12 | analista | AnalystTab (1.052) | agregação por RPC `get_analyst_summary`; recharts lazy |

**Riscos comuns**: regressão visual ou de comportamento ao quebrar o componente. Mitigação: um PR por feature, checklist manual e testes nas regras extraídas.

---

## FASE 4: Acabamento

| Etapa | O que muda | Risco | Validar |
|---|---|---|---|
| 4.1 TypeScript estrito | `strictNullChecks` → `noImplicitAny` → `strict`, feature por feature | baixo (só tipos) | `tsc` verde com `strict: true` |
| 4.2 Limpeza | remover o código morto **aprovado por você** (B-01), dependências sem uso (B-02), `lovable-tagger`, `previewAuthStorage`, `.lovable/`, um único sistema de toast, `react-helmet-async`, um lockfile só | remover algo usado | build, lint e testes; `grep` de cada item antes |
| 4.3 Performance | `manualChunks` (vendor, charts, export); `staleTime` por domínio; remover o polling de 60 s do Header (ou trocar por Realtime) | baixo | relatório do build; Lighthouse da Landing |
| 4.4 Documentação | atualizar CLAUDE.md, ARQUITETURA.md e um README de produto | — | revisão |

---

## Aprovações explícitas que este plano vai pedir

| Momento | O que |
|---|---|
| Antes da 0.3 | ~~Caminho A ou B~~ ✅ Supabase próprio, começando do zero (sem dados reais) |
| 1.0b | Preencher `barbershop_id` dos dados existentes com a barbearia nº 1 (UPDATE em massa) |
| 1.0d | ~~Agenda do barbeiro; cliente em mais de uma barbearia~~ ✅ só a própria; permitido |
| 1.3 | ~~Permissões finais do barbeiro~~ ✅ aprovado |
| 1.9 | Provedor de pagamento (recomendado: Asaas); confirmar a distribuição de funções por plano. ~~Inadimplência~~ ✅ |
| 1.4 | Tratamento de registros financeiros duplicados já existentes (se houver) |
| 1.6 | "Excluir barbeiro" passa a ser "Desativar" |
| 1.8 | Exigir MFA no banco |
| 3.3 | Baixa automática de estoque na venda |
| 3.10 | Modelo do cliente walk-in |
| 4.2 | Lista final de código morto a remover |
