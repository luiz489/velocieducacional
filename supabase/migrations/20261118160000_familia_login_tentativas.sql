-- Diagnóstico do login do app da família (Veloci Família): registra o
-- RESULTADO de cada tentativa de pedir código (whatsapp/email), sem mudar a
-- resposta que o app recebe (continua sempre {ok:true}, por anti-enumeração).
-- Só pra equipe conseguir saber, quando alguém reclamar "não chegou o
-- código", se foi (a) e-mail/telefone não cadastrado, (b) limite de 3
-- pedidos em 10 min, ou (c) erro de verdade no envio (com o detalhe).

create table public.familia_login_tentativas (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('whatsapp', 'email')),
  destino text not null,
  resultado text not null check (resultado in ('nao_cadastrado', 'limite_destino', 'limite_global', 'erro_envio', 'enviado')),
  detalhe text,
  created_at timestamptz not null default now()
);

alter table public.familia_login_tentativas enable row level security;

-- Só staff enxerga (mesmo padrão de avisos/financeiro: is_staff, sem escopo por escola
-- porque a tentativa pode nem ter achado a escola do destino ainda).
create policy familia_login_tentativas_select on public.familia_login_tentativas
  for select using (is_staff(auth.uid()));

grant select on public.familia_login_tentativas to authenticated;
grant all on public.familia_login_tentativas to service_role;

create index idx_familia_login_tentativas_destino on public.familia_login_tentativas(destino, created_at desc);
create index idx_familia_login_tentativas_created on public.familia_login_tentativas(created_at desc);
