-- Etapa 1.0a · estrutura multi-tenant (roda com `supabase test db`, sobre migrations + seed)
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- 1. barbearia nº 1 recebe os dados existentes
select is(
  (select slug from public.barbershops where id = '00000000-0000-0000-0000-000000000001'),
  'minha-barbearia', 'barbearia nº 1 existe');

-- 2. toda tabela de negócio tem barbershop_id NOT NULL
select is(
  (select coalesce(string_agg(t.table_name, ', '), '')
     from information_schema.tables t
    where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and t.table_name not in ('profiles', 'user_roles', 'cron_tokens', 'job_locks',
                               'barbershops', 'barbershop_members', 'platform_admins')
      and not exists (
        select 1 from information_schema.columns c
         where c.table_schema = 'public' and c.table_name = t.table_name
           and c.column_name = 'barbershop_id' and c.is_nullable = 'NO')),
  '', 'nenhuma tabela de negócio sem barbershop_id NOT NULL');

-- 3. todos os dados do seed ficaram na barbearia nº 1
select is((select count(*)::int from public.orders where barbershop_id <> '00000000-0000-0000-0000-000000000001'),
  0, 'pedidos existentes na barbearia nº 1');

-- 4. cada usuário com papel virou membro com o mesmo papel
select is(
  (select count(*)::int from public.user_roles ur
    left join public.barbershop_members m
      on m.user_id = ur.user_id and m.barbershop_id = '00000000-0000-0000-0000-000000000001' and m.role = ur.role
    where m.id is null),
  0, 'user_roles espelhado em barbershop_members');

-- segunda barbearia para os testes de isolamento
insert into public.barbershops (id, name, slug) values
  ('00000000-0000-0000-0000-000000000002', 'Barbearia Dois', 'barbearia-dois');

-- 5. registro filho herda a barbearia do pai, mesmo se vier outra
insert into public.order_items (order_id, service_id, price, barbershop_id)
values ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 10,
        '00000000-0000-0000-0000-000000000002');
select is(
  (select barbershop_id from public.order_items where price = 10 and order_id = 'f0000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-000000000001'::uuid, 'order_items herda barbershop_id do pedido');

-- 6. sem pai e sem barbearia implícita, o insert falha
select throws_like(
  $$insert into public.services (name, category, price) values ('Sem barbearia', 'X', 1)$$,
  '%barbershop_id obrigatório%', 'insert sem barbearia é recusado quando existem 2 barbearias');

-- 7. usuário com uma única barbearia: ela é a implícita
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is(public.current_barbershop_id(), '00000000-0000-0000-0000-000000000001'::uuid,
  'barbeiro João: barbearia implícita = nº 1');

-- 8 e 9. papéis por barbearia
select ok(public.has_shop_role('00000000-0000-0000-0000-000000000001', 'barber'), 'João é barbeiro na nº 1');
select ok(not public.is_member('00000000-0000-0000-0000-000000000002'), 'João não é membro da nº 2');

-- 10. cadastro pelo link entra na barbearia do slug
reset request.jwt.claims;
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000099', 'authenticated',
        'authenticated', 'novo@barberbrain.test',
        '{"full_name": "Novo Cliente", "barbershop_slug": "barbearia-dois"}', now(), now());
select is(
  (select barbershop_id from public.barbershop_members where user_id = 'a0000000-0000-0000-0000-000000000099'),
  '00000000-0000-0000-0000-000000000002'::uuid, 'cadastro com slug entra na barbearia do link');

-- 11. mudança de papel em user_roles reflete no vínculo (transição)
update public.user_roles set role = 'barber' where user_id = 'a0000000-0000-0000-0000-000000000099';
select is(
  (select role::text from public.barbershop_members where user_id = 'a0000000-0000-0000-0000-000000000099'),
  'barber', 'papel sincronizado de user_roles');

-- 12. configurações: uma linha por barbearia
select throws_like(
  $$insert into public.barbershop_settings (barbershop_id, name) values ('00000000-0000-0000-0000-000000000001', 'dup')$$,
  '%barbershop_settings_barbershop_unique%', 'barbershop_settings única por barbearia');

select * from finish();
rollback;
