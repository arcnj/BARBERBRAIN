-- Etapa 1.5 · Agendamento no servidor: horários, preço, combo, cupom e estoque
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Expediente fixo para o teste: todos os dias das 09h às 18h
update public.barbershop_settings set
  monday_open = '09:00', monday_close = '18:00', monday_closed = false,
  tuesday_open = '09:00', tuesday_close = '18:00', tuesday_closed = false,
  wednesday_open = '09:00', wednesday_close = '18:00', wednesday_closed = false,
  thursday_open = '09:00', thursday_close = '18:00', thursday_closed = false,
  friday_open = '09:00', friday_close = '18:00', friday_closed = false,
  saturday_open = '09:00', saturday_close = '18:00', saturday_closed = false,
  sunday_open = '09:00', sunday_close = '18:00', sunday_closed = true
where barbershop_id = '00000000-0000-0000-0000-000000000001';

-- Dia de teste: a próxima segunda-feira daqui a pelo menos 7 dias
create temp table dia as
select (current_date + 7 + ((8 - extract(isodow from current_date + 7)::int) % 7))::date as d;
grant select on dia to authenticated;

-- Produto com 2 unidades e cupom de aniversário de 10% para o cliente Carlos
insert into public.products (id, barbershop_id, name, price, stock_quantity, active) values
  ('70000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Pomada', 40, 2, true);
insert into public.birthday_coupons (id, barbershop_id, profile_id, discount_percentage, valid_from, valid_until, year)
select '71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', p.id, 10,
       current_date - 1, current_date + 60, extract(year from current_date)::int
from public.profiles p where p.user_id = 'a0000000-0000-0000-0000-000000000004';

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

-- ---------------- horários ----------------
select is(
  (select count(*)::int from public.get_available_slots('00000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001', (select d from dia), array['c0000000-0000-0000-0000-000000000001']::uuid[])),
  18, 'expediente 09h–18h com corte de 30 min: 18 horários');
select is(
  (select max(slot_time) from public.get_available_slots('00000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001', (select d from dia),
     array['c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004']::uuid[])),
  '16:30', 'corte + pigmentação (75 min) termina antes de fechar: último horário 16:30');
select is(
  (select count(*)::int from public.get_available_slots('00000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001', (select d from dia) - 1, array['c0000000-0000-0000-0000-000000000001']::uuid[])),
  0, 'domingo fechado: nenhum horário');

-- ---------------- preço calculado no servidor ----------------
select lives_ok($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    ((select d from dia) + time '10:00') at time zone 'America/Sao_Paulo',
    array['c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002']::uuid[],
    '[{"product_id": "70000000-0000-0000-0000-000000000010", "quantity": 2}]'::jsonb)
$$, 'cliente agenda corte + barba + 2 pomadas');
select is(
  (select total_price from public.orders
   where customer_id = 'a0000000-0000-0000-0000-000000000004'
     and scheduled_at = ((select d from dia) + time '10:00') at time zone 'America/Sao_Paulo'),
  165.00::numeric, 'total = 50 + 35 + 2×40, calculado pelo catálogo');
select is(
  (select status::text from public.orders
   where customer_id = 'a0000000-0000-0000-0000-000000000004'
     and scheduled_at = ((select d from dia) + time '10:00') at time zone 'America/Sao_Paulo'),
  'pending', 'agendamento do cliente entra como pendente');
select is(
  (select quantity from public.order_products op join public.orders o on o.id = op.order_id
   where o.scheduled_at = ((select d from dia) + time '10:00') at time zone 'America/Sao_Paulo'),
  2, 'quantidade de produtos gravada');

-- ---------------- horário ocupado ----------------
select is(
  (select available from public.get_available_slots('00000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001', (select d from dia), array['c0000000-0000-0000-0000-000000000001']::uuid[])
   where slot_time = '10:30'),
  false, 'corte + barba (60 min) ocupa também 10:30');
select throws_like($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    ((select d from dia) + time '10:30') at time zone 'America/Sao_Paulo',
    array['c0000000-0000-0000-0000-000000000003']::uuid[])
$$, '%acabou de ser reservado%', 'não marca dois clientes no mesmo horário (C-04)');
select is(
  (select available from public.get_available_slots('00000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000002', (select d from dia), array['c0000000-0000-0000-0000-000000000001']::uuid[])
   where slot_time = '10:00'),
  true, 'outro barbeiro continua livre às 10:00');

-- ---------------- regras de horário ----------------
select throws_like($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    now() - interval '1 hour', array['c0000000-0000-0000-0000-000000000001']::uuid[])
$$, '%já passou%', 'não agenda no passado');
select throws_like($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    ((select d from dia) + time '17:45') at time zone 'America/Sao_Paulo', array['c0000000-0000-0000-0000-000000000001']::uuid[])
$$, '%não atende neste horário%', 'não agenda serviço que passa do fechamento');

-- ---------------- estoque ----------------
select throws_like($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    ((select d from dia) + time '14:00') at time zone 'America/Sao_Paulo', array['c0000000-0000-0000-0000-000000000001']::uuid[],
    '[{"product_id": "70000000-0000-0000-0000-000000000010", "quantity": 3}]'::jsonb)
$$, '%Só temos 2 unidade(s)%', 'não passa do estoque');

-- ---------------- combo ----------------
select lives_ok($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    ((select d from dia) + time '14:00') at time zone 'America/Sao_Paulo',
    array['c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002']::uuid[],
    '[]'::jsonb, 'd0000000-0000-0000-0000-000000000001')
$$, 'agenda com combo');
select is(
  (select total_price from public.orders where combo_id = 'd0000000-0000-0000-0000-000000000001'),
  75.00::numeric, 'combo cobra o preço promocional');
select is(
  (select sum(oi.price) from public.order_items oi join public.orders o on o.id = oi.order_id
   where o.combo_id = 'd0000000-0000-0000-0000-000000000001'),
  75.00::numeric, 'itens do combo somam o preço promocional (comissão sobre o que foi pago)');
select throws_like($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    ((select d from dia) + time '16:00') at time zone 'America/Sao_Paulo',
    array['c0000000-0000-0000-0000-000000000001']::uuid[], '[]'::jsonb, 'd0000000-0000-0000-0000-000000000001')
$$, '%não correspondem ao combo%', 'combo só com os serviços do combo');

-- ---------------- cupom de aniversário ----------------
select lives_ok($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
    ((select d from dia) + time '11:00') at time zone 'America/Sao_Paulo',
    array['c0000000-0000-0000-0000-000000000001']::uuid[], '[]'::jsonb, null, true)
$$, 'agenda com cupom de aniversário');
select is(
  (select total_price from public.orders where birthday_coupon_id = '71000000-0000-0000-0000-000000000001'),
  45.00::numeric, 'cupom de 10% aplicado pelo servidor');
select throws_like($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
    ((select d from dia) + time '15:00') at time zone 'America/Sao_Paulo',
    array['c0000000-0000-0000-0000-000000000001']::uuid[], '[]'::jsonb, null, true)
$$, '%cupom de aniversário não está mais disponível%', 'cupom vale uma vez só (A-04)');

-- ---------------- não dá para burlar pela tabela ----------------
select throws_like($$
  insert into public.orders (barbershop_id, customer_id, status, scheduled_at, total_price)
  values ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'pending', now() + interval '1 day', 0)
$$, '%row-level security%', 'cliente não grava pedido direto na tabela (preço zero)');
select throws_like($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    ((select d from dia) + time '16:00') at time zone 'America/Sao_Paulo',
    array['c0000000-0000-0000-0000-000000000001']::uuid[], '[]'::jsonb, null, false, null,
    'a0000000-0000-0000-0000-000000000005')
$$, '%só pode agendar para você mesmo%', 'cliente não agenda em nome de outro cliente');

-- ---------------- equipe ----------------
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select lives_ok($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    ((select d from dia) + time '19:30') at time zone 'America/Sao_Paulo',
    array['c0000000-0000-0000-0000-000000000001']::uuid[], '[]'::jsonb, null, false, 'encaixe',
    'a0000000-0000-0000-0000-000000000005')
$$, 'barbeiro encaixa cliente fora do expediente na própria agenda');
select is(
  (select status::text from public.orders where notes = 'encaixe'),
  'confirmed', 'agendamento da equipe já entra confirmado');
select throws_like($$
  select public.create_appointment('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
    ((select d from dia) + time '12:00') at time zone 'America/Sao_Paulo',
    array['c0000000-0000-0000-0000-000000000001']::uuid[], '[]'::jsonb, null, false, null,
    'a0000000-0000-0000-0000-000000000005')
$$, '%própria agenda%', 'barbeiro não agenda na agenda de outro barbeiro');

reset role;
select * from finish();
rollback;
