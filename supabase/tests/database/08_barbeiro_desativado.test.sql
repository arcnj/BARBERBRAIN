-- Etapa 1.6 · Barbeiro desativado perde o acesso na hora
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Dono desativa o João (b...1, usuário a...2)
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';
update public.barbers set active = false where id = 'b0000000-0000-0000-0000-000000000001';
reset role;

select is(
  (select role::text from public.barbershop_members
   where user_id = 'a0000000-0000-0000-0000-000000000002' and barbershop_id = '00000000-0000-0000-0000-000000000001'),
  'customer', 'desativado: deixa de ser barbeiro da barbearia');
select is(
  (select role::text from public.user_roles where user_id = 'a0000000-0000-0000-0000-000000000002'),
  'customer', 'desativado: a tela deixa de abrir o painel de barbeiro');

-- O João (ainda logado) não vê mais clientes, agenda nem financeiro
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.profiles where user_id <> 'a0000000-0000-0000-0000-000000000002'),
  0, 'desativado não vê clientes');
select is((select count(*)::int from public.orders where barber_id = 'b0000000-0000-0000-0000-000000000001'),
  0, 'desativado não vê a agenda');
select is((select count(*)::int from public.customer_subscriptions),
  0, 'desativado não vê assinaturas');

-- Reativado: volta a ser barbeiro
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';
update public.barbers set active = true where id = 'b0000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select role::text from public.barbershop_members
   where user_id = 'a0000000-0000-0000-0000-000000000002' and barbershop_id = '00000000-0000-0000-0000-000000000001'),
  'barber', 'reativado: volta a ser barbeiro');

-- Apagar o cadastro também tira o acesso (Pedro, sem atendimentos que impeçam)
delete from public.subscription_usages where barber_id = 'b0000000-0000-0000-0000-000000000002';
delete from public.order_items where order_id in (select id from public.orders where barber_id = 'b0000000-0000-0000-0000-000000000002' or preferred_barber_id = 'b0000000-0000-0000-0000-000000000002');
delete from public.orders where barber_id = 'b0000000-0000-0000-0000-000000000002' or preferred_barber_id = 'b0000000-0000-0000-0000-000000000002';
delete from public.barber_commission_settings where barber_id = 'b0000000-0000-0000-0000-000000000002';
delete from public.barbers where id = 'b0000000-0000-0000-0000-000000000002';
select is(
  (select role::text from public.barbershop_members where user_id = 'a0000000-0000-0000-0000-000000000003'),
  'customer', 'cadastro apagado: perde o papel de barbeiro');

-- O dono com cadastro de profissional desativado continua admin
insert into public.barbers (id, barbershop_id, user_id, name, active) values
  ('b0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'Dono Barbeiro', true);
update public.barbers set active = false where id = 'b0000000-0000-0000-0000-000000000009';
select is(
  (select role::text from public.barbershop_members where user_id = 'a0000000-0000-0000-0000-000000000001'),
  'admin', 'dono continua admin ao desativar o próprio cadastro de profissional');

select * from finish();
rollback;
