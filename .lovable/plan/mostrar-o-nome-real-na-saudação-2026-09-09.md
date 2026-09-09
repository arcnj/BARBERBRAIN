# Mostrar o nome real na saudação

## O problema

O banco está correto: sua conta de administrador tem o nome "Gabriel" salvo, e os barbeiros têm "Carlos Silva" e "João Santos".

A saudação mostra "usuário" porque três telas diferentes (o topo da página, a janela de perfil e o resumo do dia) pedem os dados da pessoa usando o mesmo rótulo interno, mas cada uma espera campos diferentes. A tela do resumo acaba recebendo a resposta preparada para o topo da página, que não inclui o nome completo — então ela cai no texto de reserva "usuário".

## O que vou fazer

- Separar esses pedidos de dados para que cada tela receba exatamente o que precisa, sem se atropelarem.
- No resumo do dia, buscar o nome de quem está logado: nome do barbeiro quando for barbeiro, nome do perfil para administrador.
- Mostrar somente o primeiro nome (ex.: "Boa noite, Gabriel!").
- Se por algum motivo o nome ainda não tiver carregado, mostrar a saudação sem nome ("Boa noite!") em vez de "usuário".

## Detalhes técnicos

- `src/components/layout/Header.tsx`: renomear a queryKey para `["header-avatar", user?.id]`.
- `src/components/layout/ProfileDialog.tsx`: renomear para `["profile-dialog", user?.id]`.
- `src/components/dashboard/TodayTab.tsx`: queryKey `["today-greeting-profile", user?.id]`, usar `maybeSingle()`, e derivar `userName` de `barberName` ou `profile.full_name` (primeiro nome); sem fallback "usuário".

Nenhuma mudança no banco de dados é necessária.
