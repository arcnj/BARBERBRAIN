# Assinatura visível para o cliente e aviso de assinante para o barbeiro

Hoje o cliente só vê um cartão discreto quando já tem assinatura ativa, e o barbeiro não tem nenhuma indicação de que o cliente atendido é assinante. As permissões do banco já permitem que o cliente veja a própria assinatura e que o barbeiro veja as assinaturas — não é preciso mexer no banco.

## 1. Cliente: aba "Assinatura"

Nova aba no painel do cliente, ao lado de Agendar / Meus pedidos / Cancelados:

- **Minha assinatura**: nome do plano, valor mensal, benefícios inclusos, validade, dias restantes e selo de situação (Ativa / Renove já / Vencida).
- **Histórico de pagamentos**: data e valor de cada renovação registrada pela barbearia.
- **Botão "Falar com a barbearia"** no WhatsApp para renovar ou tirar dúvidas (usa o número já configurado nas configurações).
- **Se não tem assinatura**: mostra os planos ativos da barbearia (nome, valor, benefícios) com o mesmo botão de WhatsApp para pedir adesão. A adesão continua sendo registrada pelo administrador.

O cartão de resumo atual continua aparecendo no topo, agora com atalho para a nova aba.

## 2. Barbeiro: aviso de cliente assinante

- Selo dourado **"Assinante · {plano}"** ao lado do nome do cliente nos atendimentos de hoje e na Agenda.
- Se a assinatura estiver vencida ou vencendo em até 3 dias, o selo muda para **"Assinatura vence em X dias"** em amarelo, para o barbeiro lembrar o cliente na hora do atendimento.
- Na tela de detalhes/confirmação do atendimento, uma linha com plano, validade e benefícios inclusos.

## Detalhes técnicos

- Novo hook `src/hooks/useSubscriptionStatus.ts`: busca em lote as assinaturas ativas por `customer_id` (React Query, `staleTime` alinhado ao padrão da Agenda) e devolve um mapa `customer_id -> { plano, current_period_end, status, dias }`.
- Novo componente `src/components/ui/subscriber-badge.tsx` para o selo, usado por `TodayAppointments.tsx` e `AgendaTab.tsx`.
- Novo `src/components/customer/MySubscriptionTab.tsx` (assinatura + pagamentos + planos disponíveis), adicionado como `TabsTrigger`/`TabsContent` em `src/pages/CustomerDashboard.tsx`.
- `MySubscriptionCard.tsx` ganha um callback para trocar a aba ativa.
- Sem migração: políticas existentes já cobrem leitura do cliente (própria) e do barbeiro (todas).
