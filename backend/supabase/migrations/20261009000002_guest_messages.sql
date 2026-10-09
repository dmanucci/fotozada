-- Mural de recados da festa.
--
-- Modelo de segurança (igual ao resto do projeto):
--   * anon NÃO escreve na tabela: o recado entra pela Edge Function
--     `create-guest-message` (service role), que valida tamanho, bloqueia links
--     e limita a frequência por aparelho.
--   * anon LÊ só os recados não ocultos (o mural é público por natureza —
--     quem tem o link da festa vê). Dados pessoais: só o nome que a pessoa
--     digitou, sem e-mail/telefone. device_id nunca sai (ver view abaixo).
--   * admin pode ocultar/remover um recado inadequado.
create table public.guest_messages (
  id         uuid primary key default gen_random_uuid(),
  kiosk_id   text not null references public.kiosk_settings(kiosk_id),
  author     text not null default '' check (char_length(author) <= 40),
  message    text not null check (char_length(message) between 1 and 200),
  device_id  text not null,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);

create index guest_messages_kiosk_created_idx
  on public.guest_messages (kiosk_id, created_at desc);

alter table public.guest_messages enable row level security;

-- Leitura pública apenas das linhas visíveis; device_id é protegido por uma
-- view (colunas públicas), então o front consulta a view, não a tabela.
create policy "guest_messages_read_visible" on public.guest_messages
  for select using (not hidden);
create policy "guest_messages_admin_read" on public.guest_messages
  for select using (public.is_admin());
create policy "guest_messages_admin_update" on public.guest_messages
  for update using (public.is_admin()) with check (public.is_admin());
create policy "guest_messages_admin_delete" on public.guest_messages
  for delete using (public.is_admin());

-- Colunas seguras para o público (sem device_id). security_invoker faz a view
-- respeitar a RLS acima.
create view public.guest_messages_public
  with (security_invoker = true) as
  select id, kiosk_id, author, message, created_at
  from public.guest_messages
  where not hidden;

-- anon não precisa de SELECT direto na tabela base com device_id: revoga e
-- concede só as colunas públicas.
revoke select on public.guest_messages from anon;
grant select (id, kiosk_id, author, message, created_at, hidden)
  on public.guest_messages to anon;
grant select on public.guest_messages_public to anon, authenticated;
