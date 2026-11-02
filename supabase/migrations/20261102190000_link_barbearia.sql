-- Etapa 1.0b · Link da barbearia (/b/<slug>)
--
-- get_barbershop_public: dados públicos de uma barbearia pelo slug (página do link).
-- join_barbershop: o usuário logado vira cliente da barbearia do link.
-- O admin só altera o slug da própria barbearia (o nome vem das Configurações e o
-- status é da cobrança).

-- O nome da barbearia é editado em Configurações (barbershop_settings.name); mantém
-- barbershops.name igual, que é a fonte usada pelo link e pelo painel.
create or replace function public.sync_barbershop_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if nullif(trim(new.name), '') is not null then
    update public.barbershops set name = trim(new.name)
    where id = new.barbershop_id and name is distinct from trim(new.name);
  end if;
  return new;
end;
$$;

create trigger sync_barbershop_name
  after insert or update of name on public.barbershop_settings
  for each row execute function public.sync_barbershop_name();

update public.barbershops b set name = trim(s.name)
from public.barbershop_settings s
where s.barbershop_id = b.id and nullif(trim(s.name), '') is not null and b.name <> trim(s.name);

-- Página pública: só o que o cliente precisa para escolher e agendar. Sem telefone,
-- e-mail ou dados internos (custo, comissão etc.).
create or replace function public.get_barbershop_public(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'slug', b.slug,
    'logo_url', s.logo_url,
    'address', s.address,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', sv.id, 'name', sv.name, 'description', sv.description,
               'category', sv.category, 'price', sv.price, 'duration_minutes', sv.duration_minutes)
             order by sv.category, sv.name)
      from public.services sv
      where sv.barbershop_id = b.id and sv.active = true), '[]'::jsonb),
    'barbers', coalesce((
      select jsonb_agg(jsonb_build_object('id', br.id, 'name', br.name, 'avatar_url', br.avatar_url)
             order by br.name)
      from public.barbers br
      where br.barbershop_id = b.id and br.active = true), '[]'::jsonb)
  )
  from public.barbershops b
  left join public.barbershop_settings s on s.barbershop_id = b.id
  where b.slug = lower(trim(p_slug))
    and b.status not in ('suspended', 'cancelled')
$$;

revoke all on function public.get_barbershop_public(text) from public;
grant execute on function public.get_barbershop_public(text) to anon, authenticated, service_role;

-- Cliente entra na barbearia do link. Quem já é membro (de qualquer papel) mantém o papel.
create or replace function public.join_barbershop(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado para entrar na barbearia';
  end if;

  select id into v_shop from public.barbershops
  where slug = lower(trim(p_slug)) and status not in ('suspended', 'cancelled');
  if v_shop is null then
    raise exception 'Barbearia não encontrada';
  end if;

  insert into public.barbershop_members (barbershop_id, user_id, role)
  values (v_shop, auth.uid(), 'customer')
  on conflict (barbershop_id, user_id) do nothing;

  return v_shop;
end;
$$;

revoke all on function public.join_barbershop(text) from public, anon;
grant execute on function public.join_barbershop(text) to authenticated, service_role;

-- Admin altera só o slug; nome vem das Configurações e status fica com a cobrança (1.9).
revoke update on public.barbershops from authenticated;
grant update (slug) on public.barbershops to authenticated;
