-- Etapa 1.0d (parte 2) · Regras de acesso: tentativas de burlar entre barbearias e papéis
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- Barbearia 2 com dono, serviço e barbeiro próprios
insert into public.barbershops (id, name, slug, status) values
  ('00000000-0000-0000-0000-000000000002', 'Barbearia Dois', 'barbearia-dois', 'active');
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000006', 'dono2@barberbrain.test', '{"barbershop_slug": "barbearia-dois"}');
update public.barbershop_members set role = 'admin'
  where user_id = 'a0000000-0000-0000-0000-000000000006' and barbershop_id = '00000000-0000-0000-0000-000000000002';
insert into public.services (id, name, category, price, barbershop_id) values
  ('c0000000-0000-0000-0000-000000000099', 'Corte da Dois', 'Cabelo', 99, '00000000-0000-0000-0000-000000000002');

-- Pedido pendente do cliente 1 (Carlos) com João
insert into public.orders (id, barbershop_id, customer_id, barber_id, status, scheduled_at, total_price) values
  ('f0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000001', 'pending', now() + interval '2 days', 50);

-- Arquivo da logo enviado pelo dono 1
insert into storage.objects (id, bucket_id, name, owner_id) values
  ('70000000-0000-0000-0000-000000000001', 'barbershop', 'logo-dono1.png', 'a0000000-0000-0000-0000-000000000001');

set local role authenticated;

-- ===================== Dono da barbearia 2 =====================
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000006", "role": "authenticated"}';

select is((select count(*)::int from public.services where barbershop_id = '00000000-0000-0000-0000-000000000001'),
  0, 'dono 2 não vê serviços da barbearia 1');
select is((select count(*)::int from public.orders where barbershop_id = '00000000-0000-0000-0000-000000000001'),
  0, 'dono 2 não vê a agenda da barbearia 1');
select is((select count(*)::int from public.profiles where user_id = 'a0000000-0000-0000-0000-000000000004'),
  0, 'dono 2 não vê clientes da barbearia 1');
select is_empty(
  $$update public.services set price = 1 where id = 'c0000000-0000-0000-0000-000000000001' returning 1$$,
  'dono 2 não altera preço da barbearia 1');
select is((select count(*)::int from public.services where id = 'c0000000-0000-0000-0000-000000000099'),
  1, 'dono 2 vê os próprios serviços');
select throws_like(
  $$insert into public.services (name, category, price, barbershop_id)
    values ('Invasão', 'Cabelo', 1, '00000000-0000-0000-0000-000000000001')$$,
  '%row-level security%', 'dono 2 não cria serviço na barbearia 1');
select throws_like(
  $$select public.reject_subscription_request(gen_random_uuid())$$,
  '%administrador da barbearia%', 'RPC de assinatura exige ser admin da barbearia');
-- (o Supabase não deixa apagar arquivos por SQL; a regra de alterar e apagar é a mesma)
select is_empty(
  $$update storage.objects set name = 'trocada.png' where id = '70000000-0000-0000-0000-000000000001' returning 1$$,
  'dono 2 não altera a logo da barbearia 1');
select throws_like(
  $$insert into public.user_roles (user_id, role) values ('a0000000-0000-0000-0000-000000000004', 'admin')$$,
  '%row-level security%', 'admin não dá papel de admin para ninguém');

-- ===================== Cliente Carlos (barbearia 1) =====================
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

select throws_like(
  $$update public.orders set status = 'completed' where id = 'f0000000-0000-0000-0000-000000000010'$$,
  '%só pode cancelar%', 'cliente não marca o próprio pedido como concluído (C-04)');
select throws_like(
  $$update public.orders set total_price = 0, status = 'cancelled' where id = 'f0000000-0000-0000-0000-000000000010'$$,
  '%só pode alterar o status%', 'cliente não muda o preço do pedido (C-04)');
select lives_ok(
  $$update public.orders set status = 'cancelled' where id = 'f0000000-0000-0000-0000-000000000010'$$,
  'cliente cancela o próprio agendamento pendente');
select is((select count(*)::int from public.orders where id = 'f0000000-0000-0000-0000-000000000002'),
  0, 'cliente não vê pedido de outro cliente');
select throws_like(
  $$insert into public.orders (barbershop_id, customer_id, status, scheduled_at, total_price)
    values ('00000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'pending', now(), 10)$$,
  '%não participa desta barbearia%', 'cliente não agenda em barbearia da qual não participa');
select throws_like(
  $$insert into public.orders (barbershop_id, customer_id, status, scheduled_at, total_price)
    values ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'completed', now(), 0)$$,
  '%row-level security%', 'cliente não cria pedido já concluído');
insert into public.orders (id, barbershop_id, customer_id, status, scheduled_at, total_price) values
  ('f0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000004', 'pending', now() + interval '3 days', 50);
select throws_like(
  $$insert into public.order_items (order_id, service_id, price)
    values ('f0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000099', 1)$$,
  '%não pertence a esta barbearia%', 'cliente não usa serviço de outra barbearia no pedido');
select throws_like(
  $$insert into public.subscription_usages (subscription_id, cycle_id, customer_id, service_id, covered)
    values (gen_random_uuid(), gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', null, true)$$,
  '%', 'cliente não registra uso de assinatura');
select is((select count(*)::int from public.services where id = 'c0000000-0000-0000-0000-000000000099'),
  0, 'cliente não vê o catálogo de outra barbearia');

-- ===================== Barbeiro João (barbearia 1) =====================
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

select is_empty(
  $$update public.services set price = 1 where id = 'c0000000-0000-0000-0000-000000000001' returning 1$$,
  'barbeiro não altera preço (C-01)');
select throws_like(
  $$insert into public.barber_financial_records (barber_id, record_type, amount, description, month, year)
    values ('b0000000-0000-0000-0000-000000000001', 'service_commission', 9999, 'x', 1, 2026)$$,
  '%row-level security%', 'barbeiro não lança comissão para si (C-02)');
select is((select count(*)::int from public.orders where id = 'f0000000-0000-0000-0000-000000000002'),
  0, 'barbeiro não vê a agenda de outro barbeiro');
select ok((select count(*) from public.orders where id = 'f0000000-0000-0000-0000-000000000001') = 1,
  'barbeiro vê a própria agenda');
select is_empty(
  $$update public.orders set status = 'cancelled' where id = 'f0000000-0000-0000-0000-000000000002' returning 1$$,
  'barbeiro não mexe em atendimento de outro barbeiro');
select throws_like(
  $$update public.orders set total_price = 1 where id = 'f0000000-0000-0000-0000-000000000001'$$,
  '%só pode alterar o status%', 'barbeiro não muda o preço do atendimento');
select lives_ok(
  $$update public.orders set status = 'completed' where id = 'f0000000-0000-0000-0000-000000000001'$$,
  'barbeiro conclui o próprio atendimento');
select is((select count(*)::int from public.profiles where user_id = 'a0000000-0000-0000-0000-000000000004'),
  1, 'barbeiro vê os clientes da barbearia');
select throws_like(
  $$update public.barbers set active = false where id = 'b0000000-0000-0000-0000-000000000001'$$,
  '%nome, telefone e foto%', 'barbeiro não muda campos travados do próprio cadastro');
select lives_ok(
  $$update public.barbers set name = 'João B.' where id = 'b0000000-0000-0000-0000-000000000001'$$,
  'barbeiro edita o próprio nome');
select throws_like(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('barbershop', 'x.png', 'a0000000-0000-0000-0000-000000000002')$$,
  '%row-level security%', 'barbeiro não envia imagens da barbearia');

-- ===================== Visitante anônimo =====================
reset role;
set local role anon;
select is((select count(*)::int from public.services), 0, 'anônimo não lê tabelas (só a página do link via RPC)');
reset role;

select * from finish();
rollback;
