-- Link público do boleto (página que o responsável abre pelo e-mail). Token aleatório por parcela;
-- só edge functions (service_role) leem/gravam. Também guarda o controle de envio do e-mail.
create table if not exists public.boleto_links (
  id uuid primary key default gen_random_uuid(),
  financeiro_id uuid not null references public.financeiro(id) on delete cascade,
  escola_id uuid not null references public.escolas(id) on delete cascade,
  token text not null unique,
  criado_em timestamptz not null default now(),
  acessos integer not null default 0,
  ultimo_acesso_em timestamptz,
  email_enviado_em timestamptz,
  email_destino text,
  email_erro text
);

create unique index if not exists boleto_links_financeiro_uq on public.boleto_links (financeiro_id);
create index if not exists boleto_links_escola_idx on public.boleto_links (escola_id);

alter table public.boleto_links enable row level security;
revoke all on public.boleto_links from public, anon, authenticated;
grant all on public.boleto_links to service_role;

-- devolve o token da parcela, criando se ainda não existir
create or replace function public.boleto_link_garantir(p_financeiro_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_escola uuid;
begin
  select escola_id into v_escola from financeiro where id = p_financeiro_id;
  if v_escola is null then
    raise exception 'Título não encontrado';
  end if;

  select token into v_token from boleto_links where financeiro_id = p_financeiro_id;
  if v_token is not null then
    return v_token;
  end if;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into boleto_links (financeiro_id, escola_id, token)
  values (p_financeiro_id, v_escola, v_token)
  on conflict (financeiro_id) do nothing;

  select token into v_token from boleto_links where financeiro_id = p_financeiro_id;
  return v_token;
end;
$$;

revoke execute on function public.boleto_link_garantir(uuid) from public, anon, authenticated;
grant execute on function public.boleto_link_garantir(uuid) to service_role;
