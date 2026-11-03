-- Etapa 1.0d (parte 2) · Regras de acesso por barbearia e por papel
--
-- Até aqui as políticas usavam o papel global (has_role): o admin ou o barbeiro de
-- uma barbearia via e alterava dados de todas. Agora toda política filtra pela
-- barbearia da linha (barbershop_id) e pelo papel da pessoa NAQUELA barbearia:
--
--   admin    · tudo da própria barbearia
--   barbeiro · a própria agenda (pedidos dele), clientes da barbearia, as próprias
--              metas, comissões e extrato; muda só o status dos próprios atendimentos.
--              Nada de catálogo, preços ou configurações.
--   cliente  · o catálogo ativo das barbearias de que participa e os próprios dados;
--              cria agendamento pendente e só pode cancelar os próprios.
--
-- Corrige C-01 (barbeiro mudava preços), C-02 (barbeiro lançava comissão para si),
-- C-04 (cliente marcava o próprio pedido como concluído ou mudava o preço) e o
-- vazamento entre barbearias. Todas as políticas antigas são substituídas.

-- ---------------------------------------------------------------------------
-- 1. Funções de apoio
-- ---------------------------------------------------------------------------
create or replace function public.is_shop_staff(p_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.barbershop_members
    where barbershop_id = p_shop and user_id = auth.uid() and role in ('admin', 'barber')
  )
$$;

-- O barbeiro (registro em barbers) pertence ao usuário logado?
create or replace function public.is_own_barber(p_barber uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_barber is not null and exists (
    select 1 from public.barbers where id = p_barber and user_id = auth.uid()
  )
$$;

-- A equipe vê o perfil de quem participa da mesma barbearia.
create or replace function public.can_see_user(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.barbershop_members target
    join public.barbershop_members me
      on me.barbershop_id = target.barbershop_id
     and me.user_id = auth.uid()
     and me.role in ('admin', 'barber')
    where target.user_id = p_user
  )
$$;

create or replace function public.is_any_shop_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.barbershop_members where user_id = auth.uid() and role = 'admin')
$$;

revoke all on function public.is_shop_staff(uuid) from public, anon;
revoke all on function public.is_own_barber(uuid) from public, anon;
revoke all on function public.can_see_user(uuid) from public, anon;
revoke all on function public.is_any_shop_admin() from public, anon;
grant execute on function public.is_shop_staff(uuid) to authenticated, service_role;
grant execute on function public.is_own_barber(uuid) to authenticated, service_role;
grant execute on function public.can_see_user(uuid) to authenticated, service_role;
grant execute on function public.is_any_shop_admin() to authenticated, service_role;

-- get_user_role revelava o papel de qualquer usuário para visitantes anônimos.
revoke execute on function public.get_user_role(uuid) from anon;

-- ---------------------------------------------------------------------------
-- 2. Remove as políticas antigas (todas são recriadas abaixo)
-- ---------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in (
        'barbers', 'services', 'products', 'promotions', 'promotion_items', 'service_combos',
        'combo_services', 'barbershop_settings', 'birthday_settings', 'birthday_coupons',
        'satisfaction_settings', 'satisfaction_questions', 'satisfaction_responses',
        'orders', 'order_items', 'order_products', 'profiles', 'stock_movements',
        'barber_goals', 'barber_commission_settings', 'barber_financial_records',
        'subscription_plans', 'subscription_plan_services', 'subscription_reminder_settings',
        'customer_subscriptions', 'subscription_cycles', 'subscription_payments',
        'subscription_reminders', 'subscription_requests', 'subscription_usages', 'user_roles'
      )
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Catálogo e configurações: equipe vê tudo da barbearia, cliente vê o ativo,
--    só o admin altera.
-- ---------------------------------------------------------------------------
create policy "staff select shop services" on public.services
  for select to authenticated using (public.is_shop_staff(barbershop_id));
create policy "customer select active services" on public.services
  for select to authenticated using (active and public.is_member(barbershop_id));
create policy "admin manage services" on public.services
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "staff select shop products" on public.products
  for select to authenticated using (public.is_shop_staff(barbershop_id));
create policy "customer select active products" on public.products
  for select to authenticated using (active and public.is_member(barbershop_id));
create policy "admin manage products" on public.products
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "staff select shop promotions" on public.promotions
  for select to authenticated using (public.is_shop_staff(barbershop_id));
create policy "customer select active promotions" on public.promotions
  for select to authenticated
  using (active and (end_date is null or end_date > now()) and public.is_member(barbershop_id));
create policy "admin manage promotions" on public.promotions
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "member select visible promotion items" on public.promotion_items
  for select to authenticated
  using (exists (select 1 from public.promotions p where p.id = promotion_id));
create policy "admin manage promotion items" on public.promotion_items
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "staff select shop combos" on public.service_combos
  for select to authenticated using (public.is_shop_staff(barbershop_id));
create policy "customer select available combos" on public.service_combos
  for select to authenticated
  using (active and (max_redemptions is null or current_redemptions < max_redemptions)
         and public.is_member(barbershop_id));
create policy "admin manage combos" on public.service_combos
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "member select visible combo services" on public.combo_services
  for select to authenticated
  using (exists (select 1 from public.service_combos c where c.id = combo_id));
create policy "admin manage combo services" on public.combo_services
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "member select shop plans" on public.subscription_plans
  for select to authenticated using (public.is_member(barbershop_id));
create policy "admin manage plans" on public.subscription_plans
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "member select plan services" on public.subscription_plan_services
  for select to authenticated using (public.is_member(barbershop_id));
create policy "admin manage plan services" on public.subscription_plan_services
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "member select shop settings" on public.barbershop_settings
  for select to authenticated using (public.is_member(barbershop_id));
create policy "admin manage shop settings" on public.barbershop_settings
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "member select birthday settings" on public.birthday_settings
  for select to authenticated using (public.is_member(barbershop_id));
create policy "admin manage birthday settings" on public.birthday_settings
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "member select satisfaction settings" on public.satisfaction_settings
  for select to authenticated using (public.is_member(barbershop_id));
create policy "admin manage satisfaction settings" on public.satisfaction_settings
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "staff select shop questions" on public.satisfaction_questions
  for select to authenticated using (public.is_shop_staff(barbershop_id));
create policy "customer select active questions" on public.satisfaction_questions
  for select to authenticated using (active and public.is_member(barbershop_id));
create policy "admin manage questions" on public.satisfaction_questions
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "staff select reminder settings" on public.subscription_reminder_settings
  for select to authenticated using (public.is_shop_staff(barbershop_id));
create policy "admin manage reminder settings" on public.subscription_reminder_settings
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

-- Estoque é do admin (o barbeiro não tem a aba de estoque).
create policy "admin manage stock movements" on public.stock_movements
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

-- ---------------------------------------------------------------------------
-- 4. Barbeiros
-- ---------------------------------------------------------------------------
create policy "staff select shop barbers" on public.barbers
  for select to authenticated using (public.is_shop_staff(barbershop_id));
create policy "customer select active barbers" on public.barbers
  for select to authenticated using (active and public.is_member(barbershop_id));
create policy "admin manage barbers" on public.barbers
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
-- O barbeiro edita o próprio cadastro (nome, telefone, foto); o resto é travado abaixo.
create policy "barber update own record" on public.barbers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function private.guard_barber_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.has_shop_role(old.barbershop_id, 'admin') then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.active is distinct from old.active
     or new.barbershop_id is distinct from old.barbershop_id
     or new.email is distinct from old.email then
    raise exception 'Você só pode alterar seu nome, telefone e foto.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_barber_self_update
  before update on public.barbers
  for each row execute function private.guard_barber_self_update();

-- ---------------------------------------------------------------------------
-- 5. Metas, comissões e extrato: admin gerencia; barbeiro só lê o que é dele.
--    Comissões e premiações são lançadas pelo banco (on_order_completed).
-- ---------------------------------------------------------------------------
create policy "admin manage goals" on public.barber_goals
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select own goals" on public.barber_goals
  for select to authenticated using (public.is_own_barber(barber_id));

create policy "admin manage commission settings" on public.barber_commission_settings
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select own commission settings" on public.barber_commission_settings
  for select to authenticated using (public.is_own_barber(barber_id));

create policy "admin manage financial records" on public.barber_financial_records
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select own financial records" on public.barber_financial_records
  for select to authenticated using (public.is_own_barber(barber_id));

-- ---------------------------------------------------------------------------
-- 6. Pedidos (agenda)
-- ---------------------------------------------------------------------------
create policy "admin manage shop orders" on public.orders
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

-- Barbeiro: atendimentos dele (ou em que foi o escolhido pelo cliente).
create policy "barber select own orders" on public.orders
  for select to authenticated
  using (public.has_shop_role(barbershop_id, 'barber')
         and (public.is_own_barber(barber_id) or public.is_own_barber(preferred_barber_id)));
create policy "barber insert own orders" on public.orders
  for insert to authenticated
  with check (public.has_shop_role(barbershop_id, 'barber') and public.is_own_barber(barber_id));
create policy "barber update own orders" on public.orders
  for update to authenticated
  using (public.has_shop_role(barbershop_id, 'barber')
         and (public.is_own_barber(barber_id) or public.is_own_barber(preferred_barber_id)))
  with check (public.has_shop_role(barbershop_id, 'barber')
              and (public.is_own_barber(barber_id) or public.is_own_barber(preferred_barber_id)));

-- Cliente: vê os próprios, agenda como pendente e só cancela.
create policy "customer select own orders" on public.orders
  for select to authenticated using (customer_id = auth.uid());
create policy "customer insert own pending orders" on public.orders
  for insert to authenticated
  with check (customer_id = auth.uid() and status = 'pending' and public.is_member(barbershop_id));
create policy "customer cancel own orders" on public.orders
  for update to authenticated
  using (customer_id = auth.uid() and status in ('pending', 'confirmed'))
  with check (customer_id = auth.uid() and status = 'cancelled');

-- Barbeiro do pedido e cliente do pedido só mudam o status (e o barbeiro, a observação).
create or replace function private.guard_order_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.has_shop_role(old.barbershop_id, 'admin') then
    return new;
  end if;

  if new.barbershop_id is distinct from old.barbershop_id
     or new.customer_id is distinct from old.customer_id
     or new.barber_id is distinct from old.barber_id
     or new.preferred_barber_id is distinct from old.preferred_barber_id
     or new.scheduled_at is distinct from old.scheduled_at
     or new.total_price is distinct from old.total_price then
    raise exception 'Você só pode alterar o status deste atendimento.' using errcode = '42501';
  end if;

  if public.has_shop_role(old.barbershop_id, 'barber')
     and (public.is_own_barber(old.barber_id) or public.is_own_barber(old.preferred_barber_id)) then
    return new;
  end if;

  -- cliente
  if new.status is distinct from old.status
     and (new.status <> 'cancelled' or old.status not in ('pending', 'confirmed')) then
    raise exception 'Você só pode cancelar agendamentos pendentes ou confirmados.' using errcode = '42501';
  end if;
  if new.notes is distinct from old.notes then
    raise exception 'Para mudar o agendamento, cancele e agende de novo.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_order_update
  before update on public.orders
  for each row execute function private.guard_order_update();

-- Barbeiro do pedido precisa ser da mesma barbearia; o cliente precisa participar dela.
create or replace function private.validate_order_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.barber_id is not null and not exists (
    select 1 from public.barbers where id = new.barber_id and barbershop_id = new.barbershop_id
  ) then
    raise exception 'Barbeiro não pertence a esta barbearia.' using errcode = '23514';
  end if;
  if new.preferred_barber_id is not null and not exists (
    select 1 from public.barbers where id = new.preferred_barber_id and barbershop_id = new.barbershop_id
  ) then
    raise exception 'Barbeiro não pertence a esta barbearia.' using errcode = '23514';
  end if;
  if auth.uid() is not null and not exists (
    select 1 from public.barbershop_members where user_id = new.customer_id and barbershop_id = new.barbershop_id
  ) then
    raise exception 'Cliente não participa desta barbearia.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validate_order_tenant
  before insert or update of barber_id, preferred_barber_id, customer_id, barbershop_id on public.orders
  for each row execute function private.validate_order_tenant();

-- Itens do pedido: visíveis para quem vê o pedido; criados por quem pode criar o pedido.
create policy "select items of visible orders" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "insert items of own orders" on public.order_items
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id
      and ((o.customer_id = auth.uid() and o.status = 'pending')
           or public.has_shop_role(o.barbershop_id, 'admin')
           or (public.has_shop_role(o.barbershop_id, 'barber') and public.is_own_barber(o.barber_id)))
  ));
create policy "admin manage order items" on public.order_items
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

create policy "select products of visible orders" on public.order_products
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "insert products of own orders" on public.order_products
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id
      and ((o.customer_id = auth.uid() and o.status = 'pending')
           or public.has_shop_role(o.barbershop_id, 'admin')
           or (public.has_shop_role(o.barbershop_id, 'barber') and public.is_own_barber(o.barber_id)))
  ));
create policy "admin manage order products" on public.order_products
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));

-- Serviço e produto do item precisam ser da barbearia do pedido.
create or replace function private.validate_order_line_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ok boolean;
begin
  if tg_table_name = 'order_items' then
    if new.service_id is null then return new; end if;
    select exists (select 1 from public.services s join public.orders o on o.id = new.order_id
                   where s.id = new.service_id and s.barbershop_id = o.barbershop_id) into v_ok;
  else
    if new.product_id is null then return new; end if;
    select exists (select 1 from public.products p join public.orders o on o.id = new.order_id
                   where p.id = new.product_id and p.barbershop_id = o.barbershop_id) into v_ok;
  end if;
  if not v_ok then
    raise exception 'Item não pertence a esta barbearia.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validate_order_line_tenant
  before insert or update on public.order_items
  for each row execute function private.validate_order_line_tenant();
create trigger validate_order_line_tenant
  before insert or update on public.order_products
  for each row execute function private.validate_order_line_tenant();

-- ---------------------------------------------------------------------------
-- 7. Perfis
-- ---------------------------------------------------------------------------
create policy "user select own profile" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "user insert own profile" on public.profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "user update own profile" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff select shop member profiles" on public.profiles
  for select to authenticated using (public.can_see_user(user_id));

-- ---------------------------------------------------------------------------
-- 8. Cupons de aniversário e satisfação
-- ---------------------------------------------------------------------------
create policy "admin manage birthday coupons" on public.birthday_coupons
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "customer select own birthday coupons" on public.birthday_coupons
  for select to authenticated
  using (profile_id in (select id from public.profiles where user_id = auth.uid()));

create policy "admin select shop responses" on public.satisfaction_responses
  for select to authenticated using (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select own responses" on public.satisfaction_responses
  for select to authenticated
  using (public.has_shop_role(barbershop_id, 'barber') and public.is_own_barber(barber_id));
create policy "customer select own responses" on public.satisfaction_responses
  for select to authenticated using (customer_id = auth.uid());
create policy "customer insert response for own completed order" on public.satisfaction_responses
  for insert to authenticated
  with check (customer_id = auth.uid() and exists (
    select 1 from public.orders o
    where o.id = order_id and o.customer_id = auth.uid() and o.status = 'completed'
  ));

-- ---------------------------------------------------------------------------
-- 9. Assinaturas dos clientes da barbearia
-- ---------------------------------------------------------------------------
create policy "admin manage subscriptions" on public.customer_subscriptions
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select shop subscriptions" on public.customer_subscriptions
  for select to authenticated using (public.has_shop_role(barbershop_id, 'barber'));
create policy "customer select own subscriptions" on public.customer_subscriptions
  for select to authenticated using (customer_id = auth.uid());

create policy "admin manage cycles" on public.subscription_cycles
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select shop cycles" on public.subscription_cycles
  for select to authenticated using (public.has_shop_role(barbershop_id, 'barber'));
create policy "customer select own cycles" on public.subscription_cycles
  for select to authenticated using (customer_id = auth.uid());

create policy "admin manage payments" on public.subscription_payments
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select shop payments" on public.subscription_payments
  for select to authenticated using (public.has_shop_role(barbershop_id, 'barber'));
create policy "customer select own payments" on public.subscription_payments
  for select to authenticated
  using (exists (select 1 from public.customer_subscriptions s
                 where s.id = subscription_id and s.customer_id = auth.uid()));

create policy "admin manage reminders" on public.subscription_reminders
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select shop reminders" on public.subscription_reminders
  for select to authenticated using (public.has_shop_role(barbershop_id, 'barber'));

create policy "admin manage subscription requests" on public.subscription_requests
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select shop subscription requests" on public.subscription_requests
  for select to authenticated using (public.has_shop_role(barbershop_id, 'barber'));
create policy "customer select own subscription requests" on public.subscription_requests
  for select to authenticated using (customer_id = auth.uid());
create policy "customer insert own pending request" on public.subscription_requests
  for insert to authenticated
  with check (customer_id = auth.uid() and status = 'pending' and payment_id is null
              and decided_by is null and public.is_member(barbershop_id));

-- O uso da assinatura é registrado pelo banco ao concluir o atendimento.
create policy "admin manage usages" on public.subscription_usages
  for all to authenticated
  using (public.has_shop_role(barbershop_id, 'admin')) with check (public.has_shop_role(barbershop_id, 'admin'));
create policy "barber select shop usages" on public.subscription_usages
  for select to authenticated using (public.has_shop_role(barbershop_id, 'barber'));
create policy "customer select own usages" on public.subscription_usages
  for select to authenticated using (customer_id = auth.uid());

-- Um pedido pendente por cliente em CADA barbearia (antes era um no sistema todo).
create unique index subscription_requests_one_pending_per_shop_customer
  on public.subscription_requests (barbershop_id, customer_id) where status = 'pending';
drop index public.subscription_requests_one_pending_per_customer;

-- ---------------------------------------------------------------------------
-- 10. Papéis (user_roles)
-- ---------------------------------------------------------------------------
-- Antes o admin de qualquer barbearia podia dar qualquer papel a qualquer usuário, e o
-- papel era copiado para todas as barbearias da pessoa. Agora o admin só registra o
-- papel de cliente para quem participa da barbearia dele; papéis de equipe vêm das
-- edge functions (service role).
create policy "user select own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "admin insert customer role for shop members" on public.user_roles
  for insert to authenticated
  with check (role = 'customer' and exists (
    select 1 from public.barbershop_members target
    where target.user_id = user_roles.user_id and public.has_shop_role(target.barbershop_id, 'admin')
  ));

-- Espelhar user_roles em barbershop_members só para as edge functions (service role).
create or replace function public.sync_member_role_from_user_roles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    return new;
  end if;
  update public.barbershop_members set role = new.role where user_id = new.user_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. RPCs de assinatura: admin da barbearia da assinatura
-- ---------------------------------------------------------------------------
create or replace function public.confirm_subscription_payment(
  p_subscription_id uuid, p_amount numeric, p_paid_at date, p_method text, p_notes text default null)
returns public.subscription_cycles
language plpgsql security definer set search_path = public
as $$
declare
  v_sub public.customer_subscriptions;
  v_plan public.subscription_plans;
  v_current public.subscription_cycles;
  v_new public.subscription_cycles;
  v_payment_id uuid;
  v_start date;
  v_end date;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_subscription_id::text, 0));

  select * into v_sub from public.customer_subscriptions where id = p_subscription_id;
  if v_sub.id is null or not public.has_shop_role(v_sub.barbershop_id, 'admin') then
    raise exception 'Apenas o administrador da barbearia pode confirmar pagamentos';
  end if;

  select * into v_plan from public.subscription_plans where id = v_sub.plan_id;

  select * into v_current
  from public.subscription_cycles
  where subscription_id = p_subscription_id and status = 'current'
  order by period_end desc
  limit 1;

  if v_current.id is not null and v_current.period_start >= coalesce(v_sub.current_period_end, v_current.period_start)
     and exists (
       select 1 from public.subscription_payments
       where cycle_id = v_current.id and status = 'confirmed'
     ) then
    return v_current;
  end if;

  if v_current.id is not null and v_current.period_end > p_paid_at then
    v_start := v_current.period_end;
  else
    v_start := p_paid_at;
  end if;
  v_end := (v_start + interval '1 month')::date;

  insert into public.subscription_payments (
    barbershop_id, subscription_id, amount, expected_amount, paid_at, method, payment_method,
    period_end, notes, status, confirmed_by, confirmed_at
  ) values (
    v_sub.barbershop_id, p_subscription_id, p_amount, coalesce(v_plan.price, p_amount), p_paid_at::timestamptz,
    p_method, p_method, v_end, p_notes, 'confirmed', auth.uid(), now()
  ) returning id into v_payment_id;

  if v_current.id is not null then
    update public.subscription_cycles set status = 'closed' where id = v_current.id;
  end if;

  insert into public.subscription_cycles (
    barbershop_id, subscription_id, plan_id, customer_id, period_start, period_end, status, payment_id
  ) values (
    v_sub.barbershop_id, p_subscription_id, v_sub.plan_id, v_sub.customer_id, v_start, v_end, 'current', v_payment_id
  ) returning * into v_new;

  update public.subscription_payments set cycle_id = v_new.id where id = v_payment_id;

  update public.customer_subscriptions
  set current_period_end = v_end, status = 'active'
  where id = p_subscription_id;

  return v_new;
end;
$$;

create or replace function public.approve_subscription_request(
  p_request_id uuid, p_amount numeric, p_paid_at date, p_method text, p_notes text default null)
returns public.subscription_cycles
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.subscription_requests;
  v_sub public.customer_subscriptions;
  v_cycle public.subscription_cycles;
  v_payment_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));

  select * into v_req from public.subscription_requests where id = p_request_id;
  if v_req.id is null or not public.has_shop_role(v_req.barbershop_id, 'admin') then
    raise exception 'Apenas o administrador da barbearia pode aprovar pedidos';
  end if;

  if v_req.status <> 'pending' then
    select * into v_cycle from public.subscription_cycles
    where subscription_id = v_req.subscription_id and status = 'current'
    order by period_end desc limit 1;
    return v_cycle;
  end if;

  select * into v_sub from public.customer_subscriptions
  where id = v_req.subscription_id and barbershop_id = v_req.barbershop_id;

  if v_sub.id is null then
    select * into v_sub from public.customer_subscriptions
    where customer_id = v_req.customer_id
      and barbershop_id = v_req.barbershop_id
      and status <> 'cancelled'
    order by current_period_end desc
    limit 1;
  end if;

  if v_sub.id is null then
    insert into public.customer_subscriptions (
      barbershop_id, customer_id, plan_id, start_date, current_period_end, status
    ) values (
      v_req.barbershop_id, v_req.customer_id, v_req.plan_id, p_paid_at, p_paid_at, 'active'
    ) returning * into v_sub;
  elsif v_sub.plan_id <> v_req.plan_id then
    update public.customer_subscriptions
    set plan_id = v_req.plan_id, status = 'active'
    where id = v_sub.id
    returning * into v_sub;
  end if;

  v_cycle := public.confirm_subscription_payment(v_sub.id, p_amount, p_paid_at, p_method, p_notes);

  select payment_id into v_payment_id from public.subscription_cycles where id = v_cycle.id;

  update public.subscription_requests
  set status = 'approved',
      subscription_id = v_sub.id,
      payment_id = v_payment_id,
      decided_by = auth.uid(),
      decided_at = now()
  where id = p_request_id;

  return v_cycle;
end;
$$;

create or replace function public.reject_subscription_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_shop uuid;
begin
  select barbershop_id into v_shop from public.subscription_requests where id = p_request_id;
  if v_shop is null or not public.has_shop_role(v_shop, 'admin') then
    raise exception 'Apenas o administrador da barbearia pode recusar pedidos';
  end if;

  update public.subscription_requests
  set status = 'rejected', decided_by = auth.uid(), decided_at = now()
  where id = p_request_id and status = 'pending';
end;
$$;

create or replace function public.reverse_subscription_usage(p_usage_id uuid, p_reason text default null)
returns public.subscription_usages
language plpgsql security definer set search_path = public
as $$
declare
  v_usage public.subscription_usages;
  v_shop uuid;
begin
  select barbershop_id into v_shop from public.subscription_usages where id = p_usage_id;
  if v_shop is null or not public.has_shop_role(v_shop, 'admin') then
    raise exception 'Apenas o administrador da barbearia pode estornar utilizações';
  end if;

  update public.subscription_usages
  set status = 'reversed', reversed_by = auth.uid(), reversed_at = now(), reversal_reason = p_reason
  where id = p_usage_id and status = 'active'
  returning * into v_usage;

  if v_usage.id is null then
    raise exception 'Utilização não encontrada ou já estornada';
  end if;

  return v_usage;
end;
$$;

-- Só usuários logados chamam as RPCs de assinatura.
revoke execute on function public.confirm_subscription_payment(uuid, numeric, date, text, text) from public, anon;
revoke execute on function public.reverse_subscription_usage(uuid, text) from public, anon;
grant execute on function public.confirm_subscription_payment(uuid, numeric, date, text, text) to authenticated, service_role;
grant execute on function public.reverse_subscription_usage(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 12. Arquivos (Storage): só admin envia imagens da barbearia e só altera ou apaga
--     o que ele mesmo enviou (antes qualquer usuário logado apagava a logo de qualquer
--     barbearia).
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can upload barbershop assets" on storage.objects;
drop policy if exists "Authenticated users can update barbershop assets" on storage.objects;
drop policy if exists "Authenticated users can delete barbershop assets" on storage.objects;
drop policy if exists "Barbers and admins can upload avatars" on storage.objects;
drop policy if exists "Barbers and admins can update avatars" on storage.objects;
drop policy if exists "Barbers and admins can delete avatars" on storage.objects;
drop policy if exists "Barbers can upload product images" on storage.objects;
drop policy if exists "Barbers can update product images" on storage.objects;
drop policy if exists "Barbers can delete product images" on storage.objects;
drop policy if exists "Barbers and admins can upload promotion banners" on storage.objects;
drop policy if exists "Barbers and admins can update promotion banners" on storage.objects;
drop policy if exists "Barbers and admins can delete promotion banners" on storage.objects;

create policy "admin upload shop images" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('barbershop', 'barbers', 'products', 'promotion-banners')
              and public.is_any_shop_admin());
create policy "admin update own shop images" on storage.objects
  for update to authenticated
  using (bucket_id in ('barbershop', 'barbers', 'products', 'promotion-banners')
         and owner_id = auth.uid()::text and public.is_any_shop_admin())
  with check (bucket_id in ('barbershop', 'barbers', 'products', 'promotion-banners')
              and owner_id = auth.uid()::text and public.is_any_shop_admin());
create policy "admin delete own shop images" on storage.objects
  for delete to authenticated
  using (bucket_id in ('barbershop', 'barbers', 'products', 'promotion-banners')
         and owner_id = auth.uid()::text and public.is_any_shop_admin());
