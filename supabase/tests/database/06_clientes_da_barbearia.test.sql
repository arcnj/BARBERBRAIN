-- Lista de clientes da equipe: quem cria conta pelo link aparece na barbearia certa
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.barbershops (id, name, slug, status) values
  ('00000000-0000-0000-0000-000000000002', 'Barbearia Dois', 'barbearia-dois', 'active');
-- cliente novo pelo link da barbearia 1 e outro pelo link da barbearia 2
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000007', 'novo1@barberbrain.test', '{"barbershop_slug": "minha-barbearia"}'),
  ('a0000000-0000-0000-0000-000000000008', 'novo2@barberbrain.test', '{"barbershop_slug": "barbearia-dois"}');

set local role authenticated;

-- dono da barbearia 1
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select ok(exists (
  select 1 from public.barbershop_members
  where user_id = 'a0000000-0000-0000-0000-000000000007' and role = 'customer'
    and barbershop_id = '00000000-0000-0000-0000-000000000001'),
  'cliente que criou conta pelo link aparece para o dono');
select is((select count(*)::int from public.barbershop_members
           where user_id = 'a0000000-0000-0000-0000-000000000008'),
  0, 'dono não vê cliente de outra barbearia');
select is((select count(*)::int from public.profiles where user_id = 'a0000000-0000-0000-0000-000000000007'),
  1, 'dono vê o perfil do cliente novo');

-- barbeiro João
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select ok((select count(*) from public.barbershop_members
           where barbershop_id = '00000000-0000-0000-0000-000000000001' and role = 'customer') >= 3,
  'barbeiro vê os clientes da barbearia');

-- cliente não vê a lista de membros
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select is((select count(*)::int from public.barbershop_members
           where user_id <> 'a0000000-0000-0000-0000-000000000004'),
  0, 'cliente não vê os outros clientes');
reset role;

select * from finish();
rollback;
