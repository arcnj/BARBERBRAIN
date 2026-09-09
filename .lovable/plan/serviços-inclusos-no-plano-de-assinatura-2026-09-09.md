# Serviços inclusos no plano de assinatura

Hoje o plano só tem um número de "cortes por mês", sem dizer quais serviços estão inclusos. A ideia é cadastrar os serviços de cada plano (ex: Corte 4x, Barba 2x) e avisar o cliente quando ele escolher algo fora disso — sem impedir o agendamento, deixando claro que é pago à parte.

## Como vai funcionar

### 1. Cadastro do plano (Assinaturas > Planos)
- No formulário do plano, uma lista dos seus serviços (agrupados por categoria) para marcar o que está incluso.
- Para cada serviço marcado, um campo de quantidade por mês (vazio = ilimitado dentro do plano).
- Exemplo: plano "Corte 4x" → Corte de cabelo: 4 por mês.
- O card do plano passa a mostrar os serviços inclusos e suas quantidades.
- Planos já existentes continuam funcionando: sem serviços marcados, vale o limite geral de atendimentos por mês que já existe hoje.

### 2. Cliente agendando
- Ao escolher os serviços, aparece um resumo:
  - Coberto pela assinatura: nome do serviço + "incluso (2 de 4 usados)".
  - Fora da assinatura: nome do serviço + valor, com aviso "Este serviço não está incluso no seu plano — o pagamento é à parte".
  - Serviço incluso, mas com a quantidade do mês esgotada: mesmo aviso de pagamento à parte.
- Total a pagar à parte aparece somado.
- O agendamento continua permitido (nada é bloqueado por causa disso).

### 3. Barbeiro / atendimento
- No card do atendimento de um assinante, além do selo atual, uma linha por serviço: "Assinatura" ou "A cobrar R$ X".
- Total a receber destacado quando houver serviços à parte.

### 4. Contagem de uso
- Só consome a assinatura o serviço incluso e dentro da quantidade do mês.
- Serviço fora do plano ou acima da quantidade não consome cota — fica registrado como pago à parte.

## Detalhes técnicos

**Banco**
- Nova tabela `subscription_plan_services`: `plan_id`, `service_id`, `monthly_limit` (nullable = ilimitado), timestamps, unique (`plan_id`, `service_id`).
- GRANTs: `select` para `anon`/`authenticated` (cliente precisa ver o que o plano cobre), escrita só para admin via RLS (`has_role(auth.uid(),'admin')`), `all` para `service_role`.
- `subscription_usages` já tem `service_id` e `cycle_id`; nenhuma alteração de schema necessária. Adicionar coluna `covered boolean not null default true` para separar uso coberto de serviço pago à parte registrado no ciclo.

**Frontend**
- `PlansManager.tsx`: seleção de serviços + quantidade por serviço; salvar/atualizar as linhas do plano junto com o plano.
- Novo hook `useSubscriptionCoverage.ts`: dado o cliente e a lista de serviços escolhidos, retorna por serviço `{ covered, limit, used, price }` usando o ciclo vigente e `subscription_usages`.
- `AppointmentScheduler.tsx` / `NewOrderDialog.tsx`: usar o hook para o resumo coberto/à parte; remover o bloqueio quando o limite estoura (passa a ser aviso de pagamento à parte); manter bloqueio apenas quando a assinatura está sem ciclo vigente/vencida.
- `useSubscriptionUsage.ts`: ao concluir o atendimento, marcar `covered` por serviço conforme cobertura e quantidade restante, respeitando a chave anti-duplicidade existente.
- `TodayAppointments.tsx` e `AgendaTab.tsx`: exibir por serviço "Assinatura" / "A cobrar" e o total a receber.
- `MySubscriptionTab.tsx` e cards de planos disponíveis: listar os serviços inclusos e o consumo de cada um no ciclo.
