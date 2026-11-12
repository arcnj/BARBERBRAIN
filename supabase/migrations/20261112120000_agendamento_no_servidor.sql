-- Etapa 1.5 · Agendamento e disponibilidade no servidor (C-02, C-04, A-04)
--
-- Antes o navegador calculava os horários livres (sem enxergar a agenda dos outros
-- clientes, por causa do RLS: overbooking), o preço, o combo e o cupom, e gravava o
-- pedido direto nas tabelas. Agora:
--   get_available_slots  · horários livres do barbeiro no dia, pelo expediente da
--                          barbearia e pela duração somada dos serviços;
--   create_appointment   · cria o pedido numa transação: confere horário (com trava
--                          contra dois agendamentos ao mesmo tempo), calcula o preço
--                          pelo catálogo, aplica combo (limite de resgates) e cupom de
--                          aniversário (uso único) e limita produtos ao estoque.
-- Cliente e barbeiro deixam de inserir pedidos direto nas tabelas.

-- ---------------------------------------------------------------------------
-- 1. Registro do desconto, do combo e do cupom no pedido (colunas novas)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column discount_amount numeric(10, 2) not null default 0,
  add column combo_id uuid references public.service_combos(id) on delete set null,
  add column birthday_coupon_id uuid references public.birthday_coupons(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. Expediente e ocupação
-- ---------------------------------------------------------------------------
-- Abertura e fechamento da barbearia num dia (null = fechado). Sem configuração, 09h–19h.
create or replace function private.shop_hours(p_shop uuid, p_date date, out opens time, out closes time)
language plpgsql stable security definer set search_path = public as $$
declare
  s public.barbershop_settings;
  v_day text := (array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])[extract(dow from p_date)::int + 1];
  v_closed boolean;
begin
  select * into s from public.barbershop_settings where barbershop_id = p_shop;
  if s.id is null then
    opens := '09:00'; closes := '19:00';
    return;
  end if;
  execute format('select ($1).%I, ($1).%I, ($1).%I', v_day || '_open', v_day || '_close', v_day || '_closed')
    into opens, closes, v_closed using s;
  if coalesce(v_closed, false) or opens is null or closes is null or closes <= opens then
    opens := null; closes := null;
  end if;
end;
$$;

-- Duração de um pedido: soma dos serviços (30 min por serviço sem duração; 30 min sem itens).
create or replace function private.order_duration(p_order_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select greatest(coalesce(sum(coalesce(s.duration_minutes, 30)), 0), 30)::int
  from public.order_items oi
  left join public.services s on s.id = oi.service_id
  where oi.order_id = p_order_id
$$;

-- O barbeiro tem algum atendimento ativo que se sobrepõe a [início, fim)?
create or replace function private.barber_is_busy(
  p_barber uuid, p_start timestamptz, p_end timestamptz, p_ignore_order uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where (o.barber_id = p_barber or o.preferred_barber_id = p_barber)
      and o.status in ('pending', 'confirmed', 'in_progress')
      and o.id is distinct from p_ignore_order
      and o.scheduled_at < p_end
      and o.scheduled_at + make_interval(mins => private.order_duration(o.id)) > p_start
  )
$$;

-- Duração somada dos serviços escolhidos (só serviços ativos da barbearia).
create or replace function private.services_duration(p_shop uuid, p_service_ids uuid[])
returns int language sql stable security definer set search_path = public as $$
  select greatest(coalesce(sum(coalesce(duration_minutes, 30)), 0), 30)::int
  from public.services
  where id = any (p_service_ids) and barbershop_id = p_shop and active
$$;

-- ---------------------------------------------------------------------------
-- 3. Horários disponíveis (o cliente não vê de quem são os horários ocupados)
-- ---------------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_barbershop_id uuid, p_barber_id uuid, p_date date, p_service_ids uuid[])
returns table (slot_time text, available boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_opens time;
  v_closes time;
  v_duration int;
  v_slot timestamp;
  v_start timestamptz;
  v_now timestamptz := now();
begin
  if not public.is_member(p_barbershop_id) then
    raise exception 'Você não participa desta barbearia.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.barbers
                 where id = p_barber_id and barbershop_id = p_barbershop_id and active) then
    raise exception 'Profissional não encontrado nesta barbearia.' using errcode = '23514';
  end if;

  select opens, closes into v_opens, v_closes from private.shop_hours(p_barbershop_id, p_date);
  if v_opens is null then
    return;  -- barbearia fechada neste dia
  end if;

  v_duration := private.services_duration(p_barbershop_id, p_service_ids);
  v_slot := p_date + v_opens;
  while v_slot + make_interval(mins => v_duration) <= p_date + v_closes loop
    v_start := v_slot at time zone 'America/Sao_Paulo';
    slot_time := to_char(v_slot, 'HH24:MI');
    available := v_start > v_now
      and not private.barber_is_busy(p_barber_id, v_start, v_start + make_interval(mins => v_duration));
    return next;
    v_slot := v_slot + interval '30 minutes';
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Criar agendamento
-- ---------------------------------------------------------------------------
-- p_products: [{"product_id": "...", "quantity": 2}, ...]
-- p_customer_id: só para a equipe (admin, ou barbeiro agendando para si); o cliente
-- sempre agenda para si mesmo.
create or replace function public.create_appointment(
  p_barbershop_id uuid,
  p_barber_id uuid,
  p_scheduled_at timestamptz,
  p_service_ids uuid[],
  p_products jsonb default '[]'::jsonb,
  p_combo_id uuid default null,
  p_use_birthday_coupon boolean default false,
  p_notes text default null,
  p_customer_id uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_customer uuid;
  v_is_admin boolean;
  v_is_barber boolean;
  v_status public.order_status;
  v_service_ids uuid[];
  v_duration int;
  v_local timestamp;
  v_opens time;
  v_closes time;
  v_combo public.service_combos;
  v_combo_services uuid[];
  v_services_total numeric := 0;
  v_products_total numeric := 0;
  v_subtotal numeric;
  v_discount numeric := 0;
  v_coupon public.birthday_coupons;
  v_order_id uuid;
  v_item record;
  v_allocated numeric := 0;
  v_count int;
  v_i int := 0;
  v_price numeric;
  v_product public.products;
  v_qty int;
begin
  if v_caller is null then
    raise exception 'Entre na sua conta para agendar.' using errcode = '42501';
  end if;

  v_is_admin := public.has_shop_role(p_barbershop_id, 'admin');
  v_is_barber := public.has_shop_role(p_barbershop_id, 'barber');

  -- quem é o cliente do agendamento
  if p_customer_id is null or p_customer_id = v_caller then
    v_customer := v_caller;
    if not public.is_member(p_barbershop_id) then
      raise exception 'Você não participa desta barbearia.' using errcode = '42501';
    end if;
  elsif v_is_admin or (v_is_barber and public.is_own_barber(p_barber_id)) then
    v_customer := p_customer_id;
    if not exists (select 1 from public.barbershop_members
                   where user_id = v_customer and barbershop_id = p_barbershop_id) then
      raise exception 'Cliente não participa desta barbearia.' using errcode = '23514';
    end if;
  elsif v_is_barber then
    raise exception 'Você só pode agendar clientes na sua própria agenda.' using errcode = '42501';
  else
    raise exception 'Você só pode agendar para você mesmo.' using errcode = '42501';
  end if;
  v_status := case when v_is_admin or v_is_barber then 'confirmed' else 'pending' end;

  -- profissional
  if not exists (select 1 from public.barbers
                 where id = p_barber_id and barbershop_id = p_barbershop_id and active) then
    raise exception 'Profissional não encontrado nesta barbearia.' using errcode = '23514';
  end if;

  -- serviços: ativos e da barbearia
  select array_agg(distinct x) into v_service_ids from unnest(p_service_ids) x;
  if v_service_ids is null or cardinality(v_service_ids) = 0 then
    raise exception 'Escolha pelo menos um serviço.' using errcode = '23514';
  end if;
  select count(*) into v_count from public.services
  where id = any (v_service_ids) and barbershop_id = p_barbershop_id and active;
  if v_count <> cardinality(v_service_ids) then
    raise exception 'Algum serviço escolhido não está mais disponível. Atualize a página.' using errcode = '23514';
  end if;

  -- horário: futuro, dentro do expediente e livre (trava por barbeiro e dia)
  v_duration := private.services_duration(p_barbershop_id, v_service_ids);
  v_local := p_scheduled_at at time zone 'America/Sao_Paulo';
  -- a equipe pode encaixar fora do expediente ou registrar quem já chegou; o cliente não
  if v_status = 'pending' then
    if p_scheduled_at <= now() then
      raise exception 'Este horário já passou. Escolha outro.' using errcode = '23514';
    end if;
    select opens, closes into v_opens, v_closes from private.shop_hours(p_barbershop_id, v_local::date);
    if v_opens is null
       or v_local::time < v_opens
       or v_local + make_interval(mins => v_duration) > v_local::date + v_closes then
      raise exception 'A barbearia não atende neste horário.' using errcode = '23514';
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(format('agenda:%s:%s', p_barber_id, v_local::date), 0));
  if private.barber_is_busy(p_barber_id, p_scheduled_at, p_scheduled_at + make_interval(mins => v_duration)) then
    raise exception 'Este horário acabou de ser reservado. Escolha outro.' using errcode = '23P01';
  end if;

  -- preço dos serviços (do catálogo, nunca do navegador)
  select coalesce(sum(price), 0) into v_services_total
  from public.services where id = any (v_service_ids);

  -- combo: mesmos serviços do combo e com resgates disponíveis
  if p_combo_id is not null then
    select * into v_combo from public.service_combos
    where id = p_combo_id and barbershop_id = p_barbershop_id and active
    for update;
    if v_combo.id is null then
      raise exception 'Este combo não está mais disponível.' using errcode = '23514';
    end if;
    if v_combo.max_redemptions is not null and v_combo.current_redemptions >= v_combo.max_redemptions then
      raise exception 'As vagas deste combo acabaram.' using errcode = '23514';
    end if;
    select array_agg(service_id order by service_id) into v_combo_services
    from public.combo_services where combo_id = v_combo.id;
    if v_combo_services is distinct from (select array_agg(x order by x) from unnest(v_service_ids) x) then
      raise exception 'Os serviços escolhidos não correspondem ao combo.' using errcode = '23514';
    end if;
    update public.service_combos set current_redemptions = current_redemptions + 1 where id = v_combo.id;
  end if;

  -- produtos: ativos, da barbearia e dentro do estoque
  if jsonb_typeof(coalesce(p_products, '[]'::jsonb)) <> 'array' then
    raise exception 'Lista de produtos inválida.' using errcode = '22023';
  end if;
  for v_item in
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'quantity')::int) as quantity
    from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) e
    group by 1
  loop
    v_qty := v_item.quantity;
    select * into v_product from public.products
    where id = v_item.product_id and barbershop_id = p_barbershop_id and active
    for update;
    if v_product.id is null then
      raise exception 'Algum produto escolhido não está mais disponível.' using errcode = '23514';
    end if;
    if v_qty is null or v_qty < 1 then
      raise exception 'Quantidade inválida para %.', v_product.name using errcode = '23514';
    end if;
    if v_product.stock_quantity is not null and v_qty > v_product.stock_quantity then
      raise exception 'Só temos % unidade(s) de % em estoque.', greatest(v_product.stock_quantity, 0), v_product.name
        using errcode = '23514';
    end if;
    v_products_total := v_products_total + v_product.price * v_qty;
  end loop;

  v_subtotal := coalesce(v_combo.promotional_price, v_services_total) + v_products_total;

  -- cupom de aniversário: válido hoje, desta barbearia, uso único
  if p_use_birthday_coupon then
    select c.* into v_coupon
    from public.birthday_coupons c
    join public.profiles p on p.id = c.profile_id
    where p.user_id = v_customer
      and c.barbershop_id = p_barbershop_id
      and not c.used
      and (now() at time zone 'America/Sao_Paulo')::date between c.valid_from and c.valid_until
    order by c.valid_until
    limit 1
    for update of c;
    if v_coupon.id is null then
      raise exception 'Seu cupom de aniversário não está mais disponível.' using errcode = '23514';
    end if;
    v_discount := case
      when v_coupon.discount_percentage is not null then round(v_subtotal * v_coupon.discount_percentage / 100, 2)
      else least(coalesce(v_coupon.discount_value, 0), v_subtotal)
    end;
  end if;

  insert into public.orders (
    barbershop_id, customer_id, barber_id, preferred_barber_id, status, scheduled_at,
    total_price, discount_amount, combo_id, birthday_coupon_id, notes)
  values (
    p_barbershop_id, v_customer, p_barber_id, p_barber_id, v_status, p_scheduled_at,
    v_subtotal - v_discount, v_discount, v_combo.id, v_coupon.id, nullif(trim(p_notes), ''))
  returning id into v_order_id;

  -- itens: no combo, o preço promocional é dividido entre os serviços (proporcional)
  v_count := cardinality(v_service_ids);
  for v_item in
    select id, price from public.services where id = any (v_service_ids) order by price, id
  loop
    v_i := v_i + 1;
    if v_combo.id is null then
      v_price := v_item.price;
    elsif v_i = v_count then
      v_price := v_combo.promotional_price - v_allocated;
    elsif v_services_total > 0 then
      v_price := round(v_combo.promotional_price * v_item.price / v_services_total, 2);
    else
      v_price := round(v_combo.promotional_price / v_count, 2);
    end if;
    v_allocated := v_allocated + v_price;
    insert into public.order_items (barbershop_id, order_id, service_id, price)
    values (p_barbershop_id, v_order_id, v_item.id, v_price);
  end loop;

  insert into public.order_products (barbershop_id, order_id, product_id, price, quantity)
  select p_barbershop_id, v_order_id, pr.id, pr.price, q.quantity
  from (
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'quantity')::int)::int as quantity
    from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) e
    group by 1
  ) q
  join public.products pr on pr.id = q.product_id;

  if v_coupon.id is not null then
    update public.birthday_coupons set used = true, used_at = now(), order_id = v_order_id where id = v_coupon.id;
  end if;

  return v_order_id;
end;
$$;

revoke all on function private.shop_hours(uuid, date) from public, anon, authenticated;
revoke all on function private.order_duration(uuid) from public, anon, authenticated;
revoke all on function private.barber_is_busy(uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke all on function private.services_duration(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.get_available_slots(uuid, uuid, date, uuid[]) from public, anon;
revoke all on function public.create_appointment(uuid, uuid, timestamptz, uuid[], jsonb, uuid, boolean, text, uuid)
  from public, anon;
grant execute on function public.get_available_slots(uuid, uuid, date, uuid[]) to authenticated, service_role;
grant execute on function public.create_appointment(uuid, uuid, timestamptz, uuid[], jsonb, uuid, boolean, text, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Cliente e barbeiro passam a agendar só pela create_appointment
-- ---------------------------------------------------------------------------
-- (o admin continua com acesso total aos pedidos da própria barbearia)
drop policy "customer insert own pending orders" on public.orders;
drop policy "barber insert own orders" on public.orders;
drop policy "insert items of own orders" on public.order_items;
drop policy "insert products of own orders" on public.order_products;
