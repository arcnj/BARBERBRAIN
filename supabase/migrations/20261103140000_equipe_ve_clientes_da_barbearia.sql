-- Equipe vê quem participa da barbearia (lista de clientes, aniversariantes, assinantes).
--
-- Na 1.0d as telas da equipe deixaram de achar os clientes porque buscavam em
-- user_roles (agora cada um vê só o próprio papel). Elas passam a buscar em
-- barbershop_members, filtrando pela barbearia: o admin já via os membros; o barbeiro
-- também precisa ver (ele "vê os clientes" da barbearia).
create policy "staff select shop members" on public.barbershop_members
  for select to authenticated
  using (public.is_shop_staff(barbershop_id));
