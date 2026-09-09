# Pedido de assinatura com aprovação interna

Hoje o botão "Quero assinar" só abre o WhatsApp: nada fica registrado no painel (verificado — o cliente não tem permissão para criar assinatura, quem cria é você na aba Assinantes). O plano mantém o WhatsApp e passa a registrar o pedido para você aprovar ou recusar.

## Como vai funcionar

**Para o cliente**
- Ao clicar em "Quero assinar" (ou "Renovar pelo WhatsApp"), além de abrir a conversa no WhatsApp, o pedido fica registrado.
- Na tela dele aparece um aviso: "Pedido enviado — aguardando confirmação da barbearia". Enquanto isso ele não consegue enviar o mesmo pedido de novo.
- Se você recusar, o pedido simplesmente desaparece e ele pode pedir novamente. Nenhuma mensagem de recusa é mostrada.

**Para você (painel Assinaturas)**
- Nova aba **Pedidos**, com um contador no topo quando houver pedidos aguardando.
- Cada pedido mostra: nome do cliente, telefone (com botão WhatsApp), plano escolhido, valor do plano, se é assinatura nova ou renovação, e quando foi solicitado.
- Botão **Aprovar**: abre a tela de pagamento já preenchida com o valor do plano, onde você informa valor recebido, forma (Pix, dinheiro, cartão, transferência) e data. Ao confirmar, a assinatura nasce ativa com o ciclo iniciado (ou é renovada, se for renovação) e o valor pago fica registrado no histórico e no "Recebido no mês".
- Botão **Recusar**: encerra o pedido sem criar nada.
- Depois de aprovado, o pedido sai da lista de pendentes e o valor pago aparece no cartão do pedido e no histórico do assinante.

## Detalhes técnicos

Banco (nova tabela, sem duplicar o que existe):
- `subscription_requests`: `customer_id`, `plan_id`, `subscription_id` (nulo em pedido novo, preenchido em renovação), `kind` (`new` | `renewal`), `status` (`pending` | `approved` | `rejected`), `payment_id`, `decided_by`, `decided_at`, timestamps.
- GRANTs para `authenticated` e `service_role`; RLS: cliente cria e lê apenas os próprios pedidos e só com `status = 'pending'` na criação; admin gerencia tudo; barbeiro lê.
- Índice único parcial garantindo **um único pedido pendente por cliente**, evitando duplicidade em clique repetido.
- Reaproveita `confirm_subscription_payment` para o pagamento/ciclo. Para pedido do tipo `new`, a aprovação cria a assinatura (`customer_subscriptions` + ciclo inicial) e depois chama a função central; para `renewal`, chama direto a função na assinatura existente. Tudo dentro de uma nova função `approve_subscription_request(request_id, amount, paid_at, method, notes)` (SECURITY DEFINER, checando `has_role(auth.uid(),'admin')`), que também grava `payment_id`/`decided_*` e marca o pedido como aprovado — idempotente para clique duplo.
- `reject_subscription_request(request_id)` apenas muda o status para `rejected`.

Frontend:
- `src/components/customer/MySubscriptionTab.tsx`: os botões passam a criar o pedido antes de abrir o WhatsApp; novo estado visual "aguardando confirmação"; hook `useSubscriptionRequest` (consulta do próprio pedido pendente + criação).
- `src/components/dashboard/subscriptions/RequestsTab.tsx` (novo) + entrada na aba `SubscriptionsTab.tsx`, com badge de contagem de pendentes.
- `ConfirmPaymentDialog` ganha modo "aprovação de pedido" (mesmo formulário, chamando `approve_subscription_request`), preservando o uso atual em Assinantes/Renovações.
- Invalidação das consultas existentes (`subscriptions-overview`, `my-subscription`, `subscription-received-month`) para os números atualizarem na hora.
