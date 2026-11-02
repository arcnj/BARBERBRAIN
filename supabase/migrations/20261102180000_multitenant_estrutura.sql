-- Etapa 1.0a · Estrutura multi-tenant (docs/ARQUITETURA.md §10)
--
-- Cria barbearias e membros, marca todos os dados de negócio com barbershop_id e
-- transforma os dados existentes na "barbearia nº 1". Não muda nenhuma política de
-- acesso (isso é a etapa 1.0d): o app atual continua funcionando igual.
--
-- Transição: enquanto o front não envia barbershop_id, o valor é preenchido
--   1) pelo registro pai (ex.: order_items herda de orders), ou
--   2) por current_barbershop_id(): a única barbearia do usuário logado, ou a única
--      barbearia existente.
-- Sem nenhum dos dois, o insert falha (nunca grava dado sem barbearia).

-- ---------------------------------------------------------------------------
-- 1. Barbearias, membros e administradores da plataforma
-- ---------------------------------------------------------------------------
create table public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  status text not null default 'trial'
    check (status in ('trial', 'active', 'past_due', 'read_only', 'suspended', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.barbershop_members (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (barbershop_id, user_id)
);
create index barbershop_members_user_idx on public.barbershop_members (user_id);

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create trigger update_barbershops_updated_at
  before update on public.barbershops
  for each row execute function public.update_updated_at_column();

-- Barbearia nº 1: recebe todos os dados que já existem.
insert into public.barbershops (id, name, slug, status)
select '00000000-0000-0000-0000-000000000001',
       coalesce(nullif(trim((select name from public.barbershop_settings
                             where id = '00000000-0000-0000-0000-000000000001')), ''), 'Minha Barbearia'),
       'minha-barbearia',
       'active';

insert into public.barbershop_members (barbershop_id, user_id, role)
select '00000000-0000-0000-0000-000000000001', ur.user_id, ur.role
from public.user_roles ur
on conflict (barbershop_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Funções de apoio (usadas pelas políticas da etapa 1.0d)
-- ---------------------------------------------------------------------------
create or replace function public.is_member(p_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.barbershop_members
    where barbershop_id = p_shop and user_id = auth.uid()
  )
$$;

create or replace function public.has_shop_role(p_shop uuid, p_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.barbershop_members
    where barbershop_id = p_shop and user_id = auth.uid() and role = p_role
  )
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

-- Barbearia "implícita" durante a transição: a única do usuário ou a única existente.
create or replace function public.current_barbershop_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case when count(*) = 1 then min(barbershop_id::text)::uuid end
       from public.barbershop_members where user_id = auth.uid()),
    (select case when count(*) = 1 then min(id::text)::uuid end
       from public.barbershops)
  )
$$;

revoke all on function public.is_member(uuid) from public, anon;
revoke all on function public.has_shop_role(uuid, public.app_role) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.current_barbershop_id() from public, anon;
grant execute on function public.is_member(uuid) to authenticated, service_role;
grant execute on function public.has_shop_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.current_barbershop_id() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. barbershop_id em todas as tabelas de negócio
-- ---------------------------------------------------------------------------
-- Preenche barbershop_id a partir do registro pai (TG_ARGV: tabela pai, coluna FK).
create or replace function public.set_barbershop_id_from_parent()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_parent_id uuid := (to_jsonb(new) ->> tg_argv[1])::uuid;
  v_shop uuid;
begin
  if v_parent_id is not null then
    execute format('select barbershop_id from public.%I where id = $1', tg_argv[0])
      into v_shop using v_parent_id;
    if v_shop is not null then
      new.barbershop_id := v_shop;
    end if;
  end if;
  if new.barbershop_id is null then
    raise exception 'barbershop_id obrigatório em %', tg_table_name;
  end if;
  return new;
end;
$$;

create or replace function public.require_barbershop_id()
returns trigger language plpgsql as $$
begin
  if new.barbershop_id is null then
    raise exception 'barbershop_id obrigatório em %', tg_table_name;
  end if;
  return new;
end;
$$;

do $$
declare
  -- tabela, tabela pai, coluna FK para o pai (null = raiz)
  t record;
begin
  for t in
    select * from (values
      ('barbers',                    null,                     null),
      ('services',                   null,                     null),
      ('orders',                     null,                     null),
      ('products',                   null,                     null),
      ('promotions',                 null,                     null),
      ('service_combos',             null,                     null),
      ('birthday_coupons',           null,                     null),
      ('birthday_settings',          null,                     null),
      ('satisfaction_settings',      null,                     null),
      ('satisfaction_questions',     null,                     null),
      ('barbershop_settings',        null,                     null),
      ('subscription_plans',         null,                     null),
      ('subscription_reminder_settings', null,                 null),
      ('order_items',                'orders',                 'order_id'),
      ('order_products',             'orders',                 'order_id'),
      ('satisfaction_responses',     'orders',                 'order_id'),
      ('promotion_items',            'promotions',             'promotion_id'),
      ('combo_services',             'service_combos',         'combo_id'),
      ('stock_movements',            'products',               'product_id'),
      ('barber_goals',               'barbers',                'barber_id'),
      ('barber_commission_settings', 'barbers',                'barber_id'),
      ('barber_financial_records',   'barbers',                'barber_id'),
      ('customer_subscriptions',     'subscription_plans',     'plan_id'),
      ('subscription_requests',      'subscription_plans',     'plan_id'),
      ('subscription_plan_services', 'subscription_plans',     'plan_id'),
      ('subscription_payments',      'customer_subscriptions', 'subscription_id'),
      ('subscription_reminders',     'customer_subscriptions', 'subscription_id'),
      ('subscription_cycles',        'customer_subscriptions', 'subscription_id'),
      ('subscription_usages',        'customer_subscriptions', 'subscription_id')
    ) as v(tbl, parent, fk)
  loop
    execute format(
      'alter table public.%I add column barbershop_id uuid references public.barbershops(id) default public.current_barbershop_id()',
      t.tbl);
    execute format(
      'update public.%I set barbershop_id = %L where barbershop_id is null',
      t.tbl, '00000000-0000-0000-0000-000000000001');
    execute format('alter table public.%I alter column barbershop_id set not null', t.tbl);
    execute format('create index %I on public.%I (barbershop_id)', t.tbl || '_barbershop_idx', t.tbl);

    if t.parent is null then
      execute format(
        'create trigger set_barbershop_id before insert on public.%I for each row execute function public.require_barbershop_id()',
        t.tbl);
    else
      execute format(
        'create trigger set_barbershop_id before insert on public.%I for each row execute function public.set_barbershop_id_from_parent(%L, %L)',
        t.tbl, t.parent, t.fk);
    end if;
  end loop;
end;
$$;

-- Configurações: uma linha por barbearia.
alter table public.barbershop_settings add constraint barbershop_settings_barbershop_unique unique (barbershop_id);
alter table public.birthday_settings add constraint birthday_settings_barbershop_unique unique (barbershop_id);
alter table public.satisfaction_settings add constraint satisfaction_settings_barbershop_unique unique (barbershop_id);
alter table public.subscription_reminder_settings
  add constraint subscription_reminder_settings_barbershop_unique unique (barbershop_id);

-- ---------------------------------------------------------------------------
-- 4. Novos usuários e papéis entram na barbearia
-- ---------------------------------------------------------------------------
-- Cadastro: entra como cliente na barbearia do link (metadata barbershop_slug) ou,
-- durante a transição, na única barbearia existente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_shop uuid;
begin
  insert into public.profiles (user_id, full_name, email, phone, birth_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'birth_date' is not null
         then (new.raw_user_meta_data ->> 'birth_date')::date end
  );

  select id into v_shop from public.barbershops
  where slug = new.raw_user_meta_data ->> 'barbershop_slug';
  if v_shop is null then
    select case when count(*) = 1 then min(id::text)::uuid end into v_shop from public.barbershops;
  end if;
  if v_shop is not null then
    insert into public.barbershop_members (barbershop_id, user_id, role)
    values (v_shop, new.id, 'customer')
    on conflict (barbershop_id, user_id) do nothing;
  end if;

  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end;
$$;

-- Transição: mudar o papel em user_roles (edge function create-barber-user, SQL do
-- primeiro admin) reflete no vínculo com a barbearia. Some na etapa 1.0d.
create or replace function public.sync_member_role_from_user_roles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.barbershop_members set role = new.role where user_id = new.user_id;
  return new;
end;
$$;

create trigger sync_member_role
  after insert or update of role on public.user_roles
  for each row execute function public.sync_member_role_from_user_roles();

-- ---------------------------------------------------------------------------
-- 5. RLS das tabelas novas
-- ---------------------------------------------------------------------------
alter table public.barbershops enable row level security;
alter table public.barbershop_members enable row level security;
alter table public.platform_admins enable row level security;

create policy "member select own barbershops" on public.barbershops
  for select to authenticated using (public.is_member(id) or public.is_platform_admin());
create policy "admin update own barbershop" on public.barbershops
  for update to authenticated
  using (public.has_shop_role(id, 'admin'))
  with check (public.has_shop_role(id, 'admin'));

create policy "user select own memberships" on public.barbershop_members
  for select to authenticated
  using (user_id = auth.uid() or public.has_shop_role(barbershop_id, 'admin') or public.is_platform_admin());
create policy "admin manage shop members" on public.barbershop_members
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin'))
  with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "platform admin select self" on public.platform_admins
  for select to authenticated using (user_id = auth.uid());

grant select, update on public.barbershops to authenticated;
grant select, insert, update, delete on public.barbershop_members to authenticated;
grant select on public.platform_admins to authenticated;
grant all on public.barbershops, public.barbershop_members, public.platform_admins to service_role;
