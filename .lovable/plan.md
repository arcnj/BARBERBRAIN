# Assinaturas com aviso automático de renovação no WhatsApp

Hoje o sistema não tem nada de assinatura (verificado: nenhuma tabela, tela ou função sobre isso). O plano cria o módulo completo e o lembrete automático 3 dias antes do vencimento.

## 1. Planos de assinatura (admin)

Nova aba **Assinaturas** no painel, com duas partes.

**Planos**: nome (ex. "Corte ilimitado"), valor mensal, descrição, serviços/benefícios inclusos, ativo/inativo.

**Assinantes**: vincular um cliente a um plano, com:
- data de início e data de vencimento (renovação)
- status: ativa, vencida, cancelada
- botão **Renovar** (empurra o vencimento +1 mês e registra o pagamento)
- botão **Cancelar**
- histórico de renovações/pagamentos por assinante

Lista com filtros: vencendo em 7 dias, vencidas, ativas. Cartões no topo: assinantes ativos, receita recorrente mensal, vencendo esta semana.

## 2. Aviso automático no WhatsApp (3 dias antes)

Uma rotina roda uma vez por dia (de manhã), pega as assinaturas que vencem em 3 dias e envia a mensagem sozinha, sem ninguém clicar.

Mensagem (editável nas configurações, com variáveis nome/plano/data/valor):

> Oi {nome}! Sua assinatura {plano} vence em {data}. Renove para continuar aproveitando seus atendimentos. Qualquer dúvida, chama aqui!

Regras de segurança do envio:
- cada assinatura recebe **um único aviso por ciclo** (registro em banco evita mensagem repetida)
- lote limitado por execução e trava para não rodar duas vezes ao mesmo tempo
- registro de cada envio com status (enviado / falhou / motivo), visível em uma sub-aba **Envios** para o admin conferir
- se o provedor bloquear ou faltar saldo, a rotina pausa sozinha e mostra o aviso no painel, em vez de tentar sem parar
- cliente sem telefone é marcado como "sem contato" na lista, para envio manual

## 3. O que você precisa providenciar (importante)

Para o WhatsApp enviar **sozinho**, é obrigatório usar a API oficial do WhatsApp Business. Vou usar a Twilio, que já está disponível como integração aqui. Do seu lado é preciso:
1. conta na Twilio com um número/remetente de WhatsApp aprovado;
2. um modelo de mensagem aprovado pelo WhatsApp (mensagens iniciadas pela empresa só podem sair por modelo aprovado);
3. conectar a Twilio no projeto (eu abro a tela de conexão na hora da implementação).

Enquanto o remetente/modelo não estiver aprovado, o sistema já fica pronto e mostra os vencimentos com botão de envio manual em 1 clique, e passa a enviar automático assim que a aprovação sair. Custo por mensagem é cobrado pela Twilio/WhatsApp.

## Detalhes técnicos

Banco (Lovable Cloud, com RLS + GRANTs em todas as tabelas novas):
- `subscription_plans` (name, price, description, benefits, active)
- `customer_subscriptions` (customer_id → profiles.user_id, plan_id, start_date, current_period_end, status, auto_reminder bool)
- `subscription_payments` (subscription_id, amount, paid_at, method)
- `subscription_reminders` (subscription_id, period_end, channel, status, provider_message_id, error, sent_at; UNIQUE (subscription_id, period_end, channel) para idempotência)
- `subscription_reminder_settings` (message_template, days_before default 3, send_hour, enabled, paused_reason)
- `job_locks` (lease com expiração) para single-flight

Políticas: admin gerencia tudo; barbeiro lê; cliente lê apenas a própria assinatura.

Backend:
- Edge function `send-subscription-reminders`: valida chamada, adquire lease, seleciona no máximo N assinaturas com `current_period_end = hoje + 3` e sem registro em `subscription_reminders`, envia via gateway Twilio (`/2010-04-01/Accounts/{sid}/Messages.json`, `whatsapp:` prefix, template aprovado), grava resultado por item, propaga status/corpo de erro do provedor.
- `pg_cron` + `pg_net` chamando a função 1x/dia às 12:00 UTC (09:00 Cuiabá). Cadência diária = atraso máximo de 1 dia, suficiente para um aviso de 3 dias e sem custo recorrente relevante.
- Status de renovação derivado das datas na consulta (sem cron para virar status).

Frontend:
- `src/components/dashboard/SubscriptionsTab.tsx` + subcomponentes (PlansManager, SubscribersList, RemindersLog, ReminderSettings)
- nova aba em `src/components/layout/Navigation.tsx` / `src/pages/Dashboard.tsx`
- botão WhatsApp manual reutilizando `WhatsAppButton` existente
- cartão "Assinatura" no painel do cliente (`CustomerDashboard`) com vencimento e aviso de renovação
