-- Dados de DESENVOLVIMENTO (só para o banco local: `supabase db reset`).
-- Nunca é aplicado em produção pelo `supabase db push`.
--
-- Logins (senha de todos: senha123):
--   dono@barberbrain.test      admin
--   joao@barberbrain.test      barbeiro
--   pedro@barberbrain.test     barbeiro
--   cliente1@barberbrain.test  cliente
--   cliente2@barberbrain.test  cliente

-- Usuários de auth. O trigger handle_new_user cria o profile e o papel "customer".
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  crypt('senha123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name, 'phone', u.phone),
  now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'dono@barberbrain.test',     'Dono da Barbearia', '11990000001'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'joao@barberbrain.test',     'João Barbeiro',     '11990000002'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'pedro@barberbrain.test',    'Pedro Barbeiro',    '11990000003'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'cliente1@barberbrain.test', 'Carlos Cliente',    '11990000004'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'cliente2@barberbrain.test', 'Marcos Cliente',    '11990000005')
) as u(id, email, name, phone);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users
where email like '%@barberbrain.test';

-- Papéis
update public.user_roles set role = 'admin'  where user_id = 'a0000000-0000-0000-0000-000000000001';
update public.user_roles set role = 'barber' where user_id in ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003');

-- Barbeiros
insert into public.barbers (id, user_id, name, phone, email, active) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'João Barbeiro',  '11990000002', 'joao@barberbrain.test',  true),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Pedro Barbeiro', '11990000003', 'pedro@barberbrain.test', true);

insert into public.barber_commission_settings (barber_id, service_commission_percent, product_commission_percent) values
  ('b0000000-0000-0000-0000-000000000001', 50, 10),
  ('b0000000-0000-0000-0000-000000000002', 40, 10);

-- Serviços
insert into public.services (id, name, category, categories, price, duration_minutes, description) values
  ('c0000000-0000-0000-0000-000000000001', 'Corte',            'Cabelo', array['Cabelo'],          50, 30, 'Corte masculino'),
  ('c0000000-0000-0000-0000-000000000002', 'Barba',            'Barba',  array['Barba'],           35, 30, 'Barba com toalha quente'),
  ('c0000000-0000-0000-0000-000000000003', 'Sobrancelha',      'Rosto',  array['Rosto'],           15, 15, null),
  ('c0000000-0000-0000-0000-000000000004', 'Pigmentação',      'Cabelo', array['Cabelo'],          60, 45, null);

insert into public.service_combos (id, name, description, promotional_price, original_price) values
  ('d0000000-0000-0000-0000-000000000001', 'Corte + Barba', 'Combo clássico', 75, 85);
insert into public.combo_services (combo_id, service_id) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002');

-- Produtos
insert into public.products (name, description, price, cost_price, category, stock_quantity, min_stock_quantity) values
  ('Pomada modeladora', 'Efeito matte', 45, 20, 'Cabelo', 12, 5),
  ('Óleo para barba',   'Hidratação',   39, 15, 'Barba',  3,  5);

-- Configurações da barbearia (a linha padrão vem da migration)
update public.barbershop_settings
set name = 'Barbearia de Teste', whatsapp_phone = '5511990000001', address = 'Rua Exemplo, 123'
where id = '00000000-0000-0000-0000-000000000001';

-- Plano de assinatura para clientes
insert into public.subscription_plans (id, name, description, price, benefits, monthly_visit_limit) values
  ('e0000000-0000-0000-0000-000000000001', 'Clube Corte', '4 cortes por mês', 150, array['4 cortes por mês'], 4);
insert into public.subscription_plan_services (plan_id, service_id, monthly_limit) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 4);

-- Agendamentos de hoje e um concluído no passado
insert into public.orders (id, customer_id, barber_id, preferred_barber_id, status, scheduled_at, total_price) values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'confirmed', date_trunc('day', now()) + interval '13 hours', 50),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'pending',   date_trunc('day', now()) + interval '15 hours', 85),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'completed', now() - interval '20 days', 35);
insert into public.order_items (order_id, service_id, price) values
  ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 50),
  ('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 50),
  ('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 35),
  ('f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 35);
