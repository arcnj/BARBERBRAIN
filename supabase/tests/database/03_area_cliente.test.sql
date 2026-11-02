-- Etapa 1.0c · área do cliente por barbearia
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into public.barbershops (id, name, slug, status) values
  ('00000000-0000-0000-0000-000000000002', 'Barbearia Dois', 'barbearia-dois', 'active');
insert into public.barbers (name, barbershop_id) values ('Barbeiro da Dois', '00000000-0000-0000-0000-000000000002');

select has_column('public', 'barbers_public', 'barbershop_id', 'barbers_public expõe a barbearia');
select is(
  (select count(*)::int from public.barbers_public where barbershop_id = '00000000-0000-0000-0000-000000000002'),
  1, 'filtro por barbearia devolve só a equipe dela');

select * from finish();
rollback;
