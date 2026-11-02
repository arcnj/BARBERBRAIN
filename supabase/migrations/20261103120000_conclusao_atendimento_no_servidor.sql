-- Etapa 1.0d (parte 1) · Conclusão de atendimento calculada no banco
--
-- Quando um pedido passa a 'completed', o próprio banco registra (uma única vez):
--   1. o uso da assinatura do cliente (A-07: o upsert do front falhava sempre);
--   2. as comissões do barbeiro (C-03: o valor vinha do navegador);
--   3. o progresso das metas do mês e a premiação, sem duplicar (A-01).
-- O front deixa de gravar essas tabelas. Datas no fuso de São Paulo.
--
-- As funções internas ficam no schema "private", que a API (PostgREST) não expõe:
-- só o gatilho e a RPC pública recalculate_barber_goals as chamam.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Comissões
-- ---------------------------------------------------------------------------
create or replace function private.register_order_commissions(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_local timestamp;
  v_service_total numeric;
  v_product_total numeric;
  v_service_pct numeric;
  v_product_pct numeric;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null or v_order.status <> 'completed' or v_order.barber_id is null then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('commission:' || p_order_id::text, 0));

  v_local := coalesce(v_order.scheduled_at, now()) at time zone 'America/Sao_Paulo';
  select coalesce(sum(price), 0) into v_service_total from public.order_items where order_id = p_order_id;
  select coalesce(sum(price * quantity), 0) into v_product_total from public.order_products where order_id = p_order_id;
  select coalesce(max(service_commission_percent), 50), coalesce(max(product_commission_percent), 10)
    into v_service_pct, v_product_pct
  from public.barber_commission_settings where barber_id = v_order.barber_id;

  if v_service_total * v_service_pct / 100 > 0 and not exists (
    select 1 from public.barber_financial_records
    where reference_id = p_order_id and record_type = 'service_commission'
  ) then
    insert into public.barber_financial_records
      (barbershop_id, barber_id, record_type, amount, reference_id, description, month, year)
    values (v_order.barbershop_id, v_order.barber_id, 'service_commission',
            round(v_service_total * v_service_pct / 100, 2), p_order_id,
            format('Comissão de serviços (%s%%)', v_service_pct),
            extract(month from v_local)::int, extract(year from v_local)::int);
  end if;

  if v_product_total * v_product_pct / 100 > 0 and not exists (
    select 1 from public.barber_financial_records
    where reference_id = p_order_id and record_type = 'product_commission'
  ) then
    insert into public.barber_financial_records
      (barbershop_id, barber_id, record_type, amount, reference_id, description, month, year)
    values (v_order.barbershop_id, v_order.barber_id, 'product_commission',
            round(v_product_total * v_product_pct / 100, 2), p_order_id,
            format('Comissão de produtos (%s%%)', v_product_pct),
            extract(month from v_local)::int, extract(year from v_local)::int);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Metas do mês (mesmas regras do front antigo) e premiação única
-- ---------------------------------------------------------------------------
create or replace function private.goal_progress_value(p_goal public.barber_goals)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with period as (
    select make_timestamptz(p_goal.year, p_goal.month, 1, 0, 0, 0, 'America/Sao_Paulo') as starts,
           make_timestamptz(p_goal.year, p_goal.month, 1, 0, 0, 0, 'America/Sao_Paulo') + interval '1 month' as ends
  ),
  done as (
    select o.* from public.orders o, period
    where o.barber_id = p_goal.barber_id and o.status = 'completed'
      and o.scheduled_at >= period.starts and o.scheduled_at < period.ends
  )
  select case p_goal.goal_type
    when 'cuts' then (select count(*)::numeric from done)
    when 'revenue' then (select coalesce(sum(total_price), 0) from done)
    when 'product_sales' then (
      select coalesce(sum(op.quantity), 0)::numeric from public.order_products op join done on done.id = op.order_id)
    when 'services' then
      case
        when p_goal.service_category is not null then (
          select count(*)::numeric from public.order_items oi
          join done on done.id = oi.order_id
          join public.services s on s.id = oi.service_id
          where p_goal.service_category = any (s.categories))
        when p_goal.service_id is not null then (
          select count(*)::numeric from public.order_items oi
          join done on done.id = oi.order_id
          where oi.service_id = p_goal.service_id)
        else (select count(*)::numeric from done)
      end
    else 0
  end
$$;

-- Recalcula as metas ativas do barbeiro no mês e paga a premiação uma única vez.
-- Pode ser chamada pela tela (botão "Atualizar progresso"): só o admin da barbearia
-- do barbeiro ou o próprio barbeiro.
create or replace function public.recalculate_barber_goals(p_barber_id uuid, p_month int, p_year int)
returns setof public.barber_goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barber public.barbers;
  v_goal public.barber_goals;
  v_value numeric;
begin
  select * into v_barber from public.barbers where id = p_barber_id;
  if v_barber.id is null then
    raise exception 'Barbeiro não encontrado';
  end if;

  if auth.uid() is not null
     and not public.has_shop_role(v_barber.barbershop_id, 'admin')
     and v_barber.user_id is distinct from auth.uid() then
    raise exception 'Sem permissão para atualizar as metas deste barbeiro';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('goals:%s:%s:%s', p_barber_id, p_year, p_month), 0));

  for v_goal in
    select * from public.barber_goals
    where barber_id = p_barber_id and month = p_month and year = p_year and status = 'active'
  loop
    v_value := private.goal_progress_value(v_goal);

    update public.barber_goals
    set current_value = v_value,
        status = case when v_value >= target_value then 'completed'::public.goal_status else status end,
        completed_at = case when v_value >= target_value and completed_at is null then now() else completed_at end
    where id = v_goal.id;

    if v_value >= v_goal.target_value and v_goal.reward_value > 0 and not exists (
      select 1 from public.barber_financial_records
      where reference_id = v_goal.id and record_type = 'goal_reward'
    ) then
      insert into public.barber_financial_records
        (barbershop_id, barber_id, record_type, amount, reference_id, description, month, year)
      values (v_goal.barbershop_id, v_goal.barber_id, 'goal_reward', v_goal.reward_value, v_goal.id,
              'Premiação por meta atingida', v_goal.month, v_goal.year);
    end if;
  end loop;

  return query
    select * from public.barber_goals
    where barber_id = p_barber_id and month = p_month and year = p_year;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Uso da assinatura (mesma regra de cobertura de useSubscriptionCoverage)
-- ---------------------------------------------------------------------------
create or replace function private.record_subscription_usage(p_order_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_sub public.customer_subscriptions;
  v_cycle public.subscription_cycles;
  v_general_limit int;
  v_has_rules boolean;
  v_general_used int;
  v_item record;
  v_rule_limit int;
  v_rule_exists boolean;
  v_service_used int;
  v_covered boolean;
  v_recorded int := 0;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null or v_order.status <> 'completed' then
    return 0;
  end if;

  select * into v_sub from public.customer_subscriptions
  where customer_id = v_order.customer_id and barbershop_id = v_order.barbershop_id and status = 'active'
  order by current_period_end desc limit 1;
  if v_sub.id is null then
    return 0;
  end if;

  select * into v_cycle from public.subscription_cycles
  where subscription_id = v_sub.id and status = 'current' limit 1;
  if v_cycle.id is null or (now() at time zone 'America/Sao_Paulo')::date > v_cycle.period_end then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('usage:' || v_cycle.id::text, 0));

  select monthly_visit_limit into v_general_limit from public.subscription_plans where id = v_sub.plan_id;
  select exists (select 1 from public.subscription_plan_services where plan_id = v_sub.plan_id) into v_has_rules;
  select count(*) into v_general_used from public.subscription_usages
  where cycle_id = v_cycle.id and status = 'active' and covered;

  for v_item in
    select oi.service_id from public.order_items oi
    where oi.order_id = p_order_id and oi.service_id is not null
    order by oi.created_at, oi.id
  loop
    -- já registrado (atendimento concluído de novo): não conta duas vezes
    if exists (select 1 from public.subscription_usages
               where cycle_id = v_cycle.id and order_id = p_order_id and service_id = v_item.service_id) then
      continue;
    end if;

    if v_has_rules then
      select true, monthly_limit into v_rule_exists, v_rule_limit
      from public.subscription_plan_services
      where plan_id = v_sub.plan_id and service_id = v_item.service_id;
      select count(*) into v_service_used from public.subscription_usages
      where cycle_id = v_cycle.id and status = 'active' and covered and service_id = v_item.service_id;
      v_covered := coalesce(v_rule_exists, false)
        and (v_rule_limit is null or v_service_used < v_rule_limit)
        and (v_general_limit is null or v_general_used < v_general_limit);
    else
      v_covered := v_general_limit is null or v_general_used < v_general_limit;
    end if;

    insert into public.subscription_usages
      (barbershop_id, subscription_id, cycle_id, customer_id, order_id, service_id, barber_id, used_at, covered)
    values (v_order.barbershop_id, v_sub.id, v_cycle.id, v_order.customer_id, p_order_id, v_item.service_id,
            v_order.barber_id, coalesce(v_order.scheduled_at, now()), v_covered)
    on conflict (cycle_id, order_id, service_id) where order_id is not null and service_id is not null
    do nothing;

    if v_covered then
      v_general_used := v_general_used + 1;
      v_recorded := v_recorded + 1;
    end if;
    v_rule_exists := null;
    v_rule_limit := null;
  end loop;

  return v_recorded;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Gatilho: pedido concluído
-- ---------------------------------------------------------------------------
-- Cada efeito roda isolado: uma falha num deles não impede a conclusão do atendimento
-- nem os outros efeitos (fica registrada como WARNING no log do banco).
create or replace function private.on_order_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local timestamp := coalesce(new.scheduled_at, now()) at time zone 'America/Sao_Paulo';
begin
  begin
    perform private.record_subscription_usage(new.id);
  exception when others then
    raise warning 'record_subscription_usage(%) falhou: %', new.id, sqlerrm;
  end;

  begin
    perform private.register_order_commissions(new.id);
  exception when others then
    raise warning 'register_order_commissions(%) falhou: %', new.id, sqlerrm;
  end;

  if new.barber_id is not null then
    begin
      perform public.recalculate_barber_goals(new.barber_id, extract(month from v_local)::int, extract(year from v_local)::int);
    exception when others then
      raise warning 'recalculate_barber_goals(%) falhou: %', new.barber_id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

create trigger on_order_completed
  after update of status on public.orders
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function private.on_order_completed();

-- Só o gatilho e a tela de metas usam estas funções
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.recalculate_barber_goals(uuid, int, int) from public, anon;
grant execute on function public.recalculate_barber_goals(uuid, int, int) to authenticated, service_role;
