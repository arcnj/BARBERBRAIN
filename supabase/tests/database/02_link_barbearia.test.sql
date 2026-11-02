-- Etapa 1.0b · link da barbearia
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- segunda barbearia com serviço e barbeiro próprios
insert into public.barbershops (id, name, slug, status) values
  ('00000000-0000-0000-0000-000000000002', 'Barbearia Dois', 'barbearia-dois', 'active');
insert into public.services (name, category, price, barbershop_id)
values ('Corte da Dois', 'Cabelo', 99, '00000000-0000-0000-0000-000000000002');
insert into public.barbers (name, barbershop_id) values ('Barbeiro da Dois', '00000000-0000-0000-0000-000000000002');

-- 1-3. página pública mostra só a barbearia do slug
select is(public.get_barbershop_public('minha-barbearia') ->> 'name', 'Barbearia de Teste', 'nome vem das configurações');
select ok(
  not (public.get_barbershop_public('minha-barbearia') -> 'services') @> '[{"name": "Corte da Dois"}]',
  'serviço da outra barbearia não aparece');
select is(jsonb_array_length(public.get_barbershop_public('barbearia-dois') -> 'barbers'), 1,
  'barbeiros só da barbearia do link');

-- 4. sem dados sensíveis
select ok(
  not (public.get_barbershop_public('minha-barbearia') -> 'barbers' -> 0) ?| array['email', 'phone', 'user_id'],
  'barbeiro sem e-mail, telefone ou user_id');

-- 5. slug inexistente
select is(public.get_barbershop_public('nao-existe'), null, 'slug inexistente devolve null');

-- 6. anônimo pode ver a página
set local role anon;
select is(public.get_barbershop_public('barbearia-dois') ->> 'slug', 'barbearia-dois', 'anon acessa a página do link');
reset role;

-- 7-8. cliente entra na barbearia pelo link (idempotente)
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select is(public.join_barbershop('barbearia-dois'), '00000000-0000-0000-0000-000000000002'::uuid, 'join devolve a barbearia');
select lives_ok($$select public.join_barbershop('barbearia-dois')$$, 'join repetido não falha');
reset role;
select is(
  (select role::text from public.barbershop_members
    where user_id = 'a0000000-0000-0000-0000-000000000004' and barbershop_id = '00000000-0000-0000-0000-000000000002'),
  'customer', 'virou cliente da barbearia dois');

-- 10. admin não altera o status da barbearia
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select throws_like(
  $$update public.barbershops set status = 'active' where id = '00000000-0000-0000-0000-000000000001'$$,
  '%permission denied%', 'admin não muda o status (cobrança)');
reset role;

select * from finish();
rollback;
