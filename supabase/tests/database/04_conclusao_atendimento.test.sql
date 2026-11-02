-- Etapa 1.0d (parte 1) · efeitos da conclusão de atendimento calculados no banco
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Seed: pedido f...1 do cliente 1 com João (b...1), corte R$ 50, confirmado, hoje.
-- João: comissão de serviço 50%.

-- meta de 1 corte no mês do pedido, com premiação de R$ 100
insert into public.barber_goals (id, barber_id, goal_type, target_value, reward_value, month, year)
select '90000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'cuts', 1, 100,
       extract(month from (scheduled_at at time zone 'America/Sao_Paulo'))::int,
       extract(year from (scheduled_at at time zone 'America/Sao_Paulo'))::int
from public.orders where id = 'f0000000-0000-0000-0000-000000000001';

-- assinatura ativa do cliente 1 com ciclo vigente (plano cobre 4 cortes)
insert into public.customer_subscriptions (id, customer_id, plan_id, current_period_end)
values ('91000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000001', current_date + 20);
insert into public.subscription_cycles (subscription_id, plan_id, customer_id, period_start, period_end, status)
values ('91000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000004', current_date - 10, current_date + 20, 'current');

-- conclui o atendimento
update public.orders set status = 'completed' where id = 'f0000000-0000-0000-0000-000000000001';

select is(
  (select amount from public.barber_financial_records
    where reference_id = 'f0000000-0000-0000-0000-000000000001' and record_type = 'service_commission'),
  25.00::numeric, 'comissão de serviço = 50% de R$ 50, calculada no banco');

select is(
  (select barbershop_id from public.barber_financial_records
    where reference_id = 'f0000000-0000-0000-0000-000000000001' and record_type = 'service_commission'),
  '00000000-0000-0000-0000-000000000001'::uuid, 'comissão na barbearia do pedido');

select is(
  (select status::text from public.barber_goals where id = '90000000-0000-0000-0000-000000000001'),
  'completed', 'meta de 1 corte concluída');

select is(
  (select count(*)::int from public.barber_financial_records
    where reference_id = '90000000-0000-0000-0000-000000000001' and record_type = 'goal_reward'),
  1, 'premiação da meta lançada');

select is(
  (select count(*)::int from public.subscription_usages
    where order_id = 'f0000000-0000-0000-0000-000000000001' and covered),
  1, 'uso da assinatura registrado e coberto pelo plano');

-- reabrir e concluir de novo não duplica nada
update public.orders set status = 'confirmed' where id = 'f0000000-0000-0000-0000-000000000001';
update public.orders set status = 'completed' where id = 'f0000000-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.barber_financial_records
    where reference_id = 'f0000000-0000-0000-0000-000000000001'),
  1, 'concluir de novo não duplica a comissão');
select is(
  (select count(*)::int from public.subscription_usages where order_id = 'f0000000-0000-0000-0000-000000000001'),
  1, 'concluir de novo não duplica o uso da assinatura');

-- outro atendimento concluído no mês não paga a premiação de novo (A-01)
insert into public.orders (id, customer_id, barber_id, status, scheduled_at, total_price)
select 'f0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005',
       'b0000000-0000-0000-0000-000000000001', 'confirmed', scheduled_at + interval '1 hour', 35
from public.orders where id = 'f0000000-0000-0000-0000-000000000001';
insert into public.order_items (order_id, service_id, price)
values ('f0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000002', 35);
update public.orders set status = 'completed' where id = 'f0000000-0000-0000-0000-000000000009';

select is(
  (select count(*)::int from public.barber_financial_records
    where reference_id = '90000000-0000-0000-0000-000000000001' and record_type = 'goal_reward'),
  1, 'premiação continua única');

-- tela de metas: o próprio barbeiro pode recalcular; outro barbeiro não
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select lives_ok(
  $$select * from public.recalculate_barber_goals('b0000000-0000-0000-0000-000000000001', 1, 2026)$$,
  'barbeiro recalcula as próprias metas');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select throws_like(
  $$select * from public.recalculate_barber_goals('b0000000-0000-0000-0000-000000000001', 1, 2026)$$,
  '%Sem permissão%', 'outro barbeiro não recalcula metas alheias');

-- funções internas não são chamáveis pela API
select throws_like(
  $$select private.register_order_commissions('f0000000-0000-0000-0000-000000000001')$$,
  '%permission denied%', 'funções internas (schema private) não são acessíveis');
reset role;

select * from finish();
rollback;
