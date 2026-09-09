# Evolução do módulo Assinaturas: pagamento manual, ciclos e utilizações

Analisei o que já existe hoje: as abas **Assinantes / Planos / Envios / Configuração**, os planos com preço, benefícios e limite mensal de cortes, os assinantes com vencimento, o botão de renovar (que hoje só empurra a data +1 mês) e os pagamentos gravados em uma tabela simples. Nada disso será recriado — o plano só complementa.

Duas coisas que confirmei e você precisa saber:
- O consumo de cortes hoje é **calculado por contagem de agendamentos** no período, não por registro de utilização. Vou trocar por registros reais, mantendo a tela do cliente igual.
- **Não existe separação por barbearia no banco** deste projeto: hoje ele funciona como uma única barbearia (não há nenhum campo de barbearia em nenhuma tabela). Portanto não há como "revisar o isolamento entre barbearias" — não existe multi-barbearia ainda. Vou apenas revisar as permissões (admin gerencia, barbeiro vê, cliente vê só o que é dele) e deixar as novas tabelas prontas para receber a divisão por barbearia quando esse recurso for criado. Se quiser multi-barbearia de verdade, é um projeto próprio e eu preparo um plano separado.

## 1. Ciclos da assinatura

Cada assinatura passa a ter ciclos com início, fim e situação. Os benefícios pertencem ao ciclo, nunca à virada do mês. As assinaturas que já existem recebem automaticamente um ciclo atual com as datas que já estão cadastradas, sem perder nada.

Novo ciclo só nasce de um pagamento confirmado.

## 2. Nova aba "Renovações"

Entra entre Planos e Envios, sem mexer nas outras.

Cartões no topo: **Ativos**, **Pagamentos pendentes**, **Vencidos**, **Renovações nos próximos 7 dias**, **Recebido no mês**.

Tabela: Cliente · Plano · Valor · Vencimento · Forma de pagamento · Status · Ações.

Selos: verde PAGO/ATIVO, amarelo PENDENTE, vermelho VENCIDO, cinza CANCELADO.

Filtros: Todos · Pendentes · Vencidos · Pagos · Vencem em breve, mais busca por nome do cliente.

## 3. Confirmar pagamento

Botão **Confirmar pagamento** abre um modal com cliente, plano, valor previsto, valor recebido (editável), data do pagamento, forma de pagamento (Pix, crédito, débito, dinheiro, transferência, outro) e observação opcional.

Antes de confirmar, o modal mostra em destaque a frase: "Este pagamento iniciará um novo ciclo de 12/09/2026 até 12/10/2026."

Regra de pagamento atrasado (a inicial): **o novo ciclo começa na data da confirmação do pagamento**. Quem paga em dia mantém a data de vencimento como início do novo ciclo.

Ao confirmar, tudo acontece de uma vez: registra o pagamento, marca como confirmado, guarda quem confirmou e quando, fecha o ciclo anterior, cria o novo ciclo, atualiza o próximo vencimento, reativa a assinatura e libera os benefícios. Se o botão for clicado duas vezes, o segundo clique não gera outro pagamento nem outro ciclo.

## 4. Assinatura vencida

Passada a data de vencimento sem pagamento confirmado, a assinatura aparece como **VENCIDO** com o aviso "Pagamento pendente desde 08/09/2026" e o botão de confirmar pagamento. Nada é apagado: cliente, assinatura, ciclos e histórico permanecem. Só não há benefícios novos até a renovação.

## 5. Controle de utilização por registro

Ao concluir um atendimento, o sistema verifica se o cliente tem assinatura ativa, se há ciclo vigente, se o serviço faz parte do plano e se ainda há utilização disponível. Cada utilização gera um registro próprio com cliente, serviço, profissional, atendimento relacionado, ciclo, plano e data — não só um contador.

Planos ilimitados continuam sem bloqueio e mostram "7 utilizações neste ciclo · Plano ilimitado" em vez de "7/∞".

O bloqueio de agendamento do cliente passa a usar o ciclo e as utilizações registradas (hoje ele conta agendamentos do mês).

## 6. Estorno de utilização

O admin pode **estornar utilização**. O registro não é apagado: fica com situação ESTORNADO, guardando quem estornou, quando e o motivo, e a utilização volta ao saldo disponível do ciclo.

## 7. Aba Assinantes melhorada

Colunas: Cliente · Plano · Utilização (2/3) · Próximo vencimento · Pagamento · Status · Ações.

Ações: Ver assinatura · Confirmar pagamento · Histórico · Pausar · Cancelar.

## 8. Detalhes da assinatura

Painel com plano, status, valor, próximo vencimento, ciclo atual e barra de progresso dos benefícios ("2 de 3 utilizados · 1 disponível"), com os botões Registrar pagamento, Histórico e Cancelar assinatura.

## 9. Histórico (linha do tempo)

Uma linha do tempo única por assinante juntando pagamentos confirmados, utilizações, estornos, renovações pendentes e novos ciclos iniciados, do mais recente ao mais antigo. Nada de histórico é apagado em nenhum momento.

## Detalhes técnicos

Banco (migrations, reaproveitando as tabelas atuais):
- `subscription_cycles` (subscription_id, plan_id, period_start, period_end, status, payment_id, created_at) + índice único parcial garantindo um único ciclo `current` por assinatura.
- `subscription_usages` (subscription_id, cycle_id, order_id, service_id, barber_id, customer_id, used_at, status `active|reversed`, reversed_by, reversed_at, reversal_reason) + índice único em (cycle_id, order_id, service_id) para evitar dupla baixa.
- `subscription_payments`: novas colunas `status` (`confirmed` por padrão), `payment_method`, `confirmed_by`, `confirmed_at`, `cycle_id`, `expected_amount`. Coluna `method` atual preservada.
- `customer_subscriptions`: `status` passa a aceitar `paused`; nada removido; `current_period_end` continua a fonte do vencimento.
- Backfill: um ciclo `current` por assinatura existente usando `start_date`/`current_period_end`, e pagamentos existentes marcados como confirmados.
- Todas as tabelas novas com GRANTs + RLS: admin gerencia tudo, barbeiro lê, cliente lê apenas o que é dele. Colunas de tenant futuro previstas no desenho, sem criar cópia de clientes/barbeiros/serviços/agendamentos.

Função central de negócio no banco, `confirm_subscription_payment(p_subscription_id, p_amount, p_paid_at, p_method, p_notes)`, SECURITY DEFINER e restrita a admin, executando em uma transação: `pg_advisory_xact_lock` na assinatura → checagem de duplicidade (pagamento já confirmado para o mesmo ciclo/data) → insere pagamento → fecha ciclo anterior → cria novo ciclo → atualiza `current_period_end` e status → devolve o novo ciclo. A política de data de início do ciclo fica isolada em um bloco próprio para permitir outra política depois. Um webhook de gateway futuro chamará a mesma função, sem passar pela interface.

Frontend:
- `src/components/dashboard/subscriptions/RenewalsTab.tsx`, `ConfirmPaymentDialog.tsx`, `SubscriptionDetailsSheet.tsx`, `SubscriptionTimeline.tsx`, `UsageBar.tsx`.
- nova aba em `SubscriptionsTab.tsx`; `SubscribersList.tsx` evoluída (colunas, ações, busca) reaproveitando `StatCard`, `Badge`, `Dialog` e `WhatsAppButton` atuais.
- `src/hooks/useSubscriptionCycle.ts` (ciclo vigente + saldo por registros) e `useSubscriptionQuota.ts` reescrito sobre ciclo/utilizações mantendo a mesma interface para `AppointmentScheduler` e `MySubscriptionTab`.
- `TodayAppointments.tsx`: ao concluir atendimento, grava a utilização junto do fluxo de comissões/metas já existente, sem alterar aquele comportamento.
- Identidade visual, tokens e componentes atuais preservados.
