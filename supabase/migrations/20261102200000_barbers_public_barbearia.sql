-- Etapa 1.0c · a lista pública de barbeiros passa a informar a barbearia de cada um,
-- para a área do cliente mostrar só a equipe da barbearia atual.
-- (CREATE OR REPLACE só acrescenta a coluna no fim; nada é removido.)
create or replace view public.barbers_public
with (security_invoker = on) as
select id, name, avatar_url, active, barbershop_id
from public.barbers
where active = true;
