-- Etapa 1.6 · Barbeiro desativado perde o acesso na hora (A-05)
--
-- "Excluir barbeiro" vira "Desativar" (decisão do dono). Antes, apagar ou desativar o
-- cadastro deixava o usuário com o papel de barbeiro na barbearia: ele continuava vendo
-- clientes, catálogo e assinaturas. Agora o papel acompanha o cadastro:
--   desativado (ou apagado) → vira cliente da barbearia (sem acesso ao painel);
--   reativado               → volta a ser barbeiro.
-- O histórico (atendimentos, comissões, metas) continua ligado ao cadastro.

create or replace function private.sync_barber_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  v_shop uuid := case when tg_op = 'DELETE' then old.barbershop_id else new.barbershop_id end;
  v_active boolean := tg_op <> 'DELETE' and coalesce(new.active, false);
begin
  if v_user is null then
    return coalesce(new, old);
  end if;

  -- o dono nunca perde o papel de admin por desativar o próprio cadastro de profissional
  update public.barbershop_members
  set role = case when v_active then 'barber'::public.app_role else 'customer'::public.app_role end
  where user_id = v_user and barbershop_id = v_shop and role <> 'admin';

  -- papel global (usado pela tela para escolher o painel): barbeiro só se ainda for
  -- barbeiro em alguma barbearia
  update public.user_roles
  set role = case
    when exists (select 1 from public.barbershop_members
                 where user_id = v_user and role = 'barber') then 'barber'::public.app_role
    else 'customer'::public.app_role
  end
  where user_id = v_user and role in ('barber', 'customer');

  return coalesce(new, old);
end;
$$;

create trigger sync_barber_access
  after update of active, user_id on public.barbers
  for each row
  when (old.active is distinct from new.active or old.user_id is distinct from new.user_id)
  execute function private.sync_barber_access();

create trigger sync_barber_access_on_delete
  after delete on public.barbers
  for each row execute function private.sync_barber_access();

revoke all on function private.sync_barber_access() from public, anon, authenticated;

-- Barbeiros que já foram apagados ou desativados antes desta etapa: corrige o acesso.
-- (só quem tem papel de barbeiro numa barbearia sem nenhum cadastro ativo nela)
update public.barbershop_members m
set role = 'customer'
where m.role = 'barber'
  and not exists (
    select 1 from public.barbers b
    where b.user_id = m.user_id and b.barbershop_id = m.barbershop_id and b.active
  );

update public.user_roles r
set role = 'customer'
where r.role = 'barber'
  and not exists (select 1 from public.barbershop_members m where m.user_id = r.user_id and m.role = 'barber');

-- O espelho user_roles → barbershop_members (usado pelas edge functions) nunca rebaixa
-- um admin de barbearia.
create or replace function public.sync_member_role_from_user_roles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    return new;
  end if;
  update public.barbershop_members set role = new.role
  where user_id = new.user_id and role <> 'admin';
  return new;
end;
$$;
