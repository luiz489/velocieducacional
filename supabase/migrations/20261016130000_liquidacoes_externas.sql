-- Boletos emitidos FORA do sistema (Internet Banking): o webhook não avisa, só a consulta de liquidados do dia.
-- A rotina casa o pagamento com a parcela (CPF + vencimento + valor). O que for seguro é baixado; o resto cai
-- em "pagamentos para conferir". Desligado por padrão em cada escola.

alter table public.escolas_integracao_bancaria
  add column if not exists baixa_boleto_manual boolean not null default false;
grant select (baixa_boleto_manual) on public.escolas_integracao_bancaria to authenticated;

create table if not exists public.liquidacoes_externas (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas(id) on delete cascade,
  nosso_numero text not null,
  data_pagamento date,
  valor_pago numeric(14, 2),
  tipo_liquidacao text,
  pagador_nome text,
  pagador_doc_final text,
  vencimento date,
  valor_nominal numeric(14, 2),
  resultado text not null check (resultado in ('unico', 'ambiguo', 'nenhum', 'api_sem_parcela')),
  motivo text,
  financeiro_id uuid references public.financeiro(id) on delete set null,
  candidatos jsonb not null default '[]'::jsonb,
  situacao text not null default 'conferir' check (situacao in ('conferir', 'baixada', 'resolvida', 'ignorada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolvido_por uuid,
  unique (escola_id, nosso_numero)
);
create index if not exists liquidacoes_externas_escola_situacao_idx on public.liquidacoes_externas (escola_id, situacao);

alter table public.liquidacoes_externas enable row level security;
create policy liquidacoes_externas_select on public.liquidacoes_externas for select to authenticated
  using (public.usuario_tem_permissao(escola_id, 'financeiro', 'visualizar'));
revoke all on public.liquidacoes_externas from public, anon, authenticated;
grant select on public.liquidacoes_externas to authenticated;
grant all on public.liquidacoes_externas to service_role;

-- Baixa de UMA parcela por um boleto emitido fora do sistema. Mesmo caminho da baixa por webhook:
-- valor pago, data, forma, entrada na conta bancária. Se a parcela tem boleto da API vivo, o gatilho
-- do financeiro cancela esse boleto no banco (evita dois boletos vivos); senão guarda o nosso número.
create or replace function public.baixar_parcela_por_boleto_externo(
  p_escola_id uuid,
  p_financeiro_id uuid,
  p_nosso_numero text,
  p_valor_pago numeric,
  p_data_pagamento date,
  p_conta_bancaria_id uuid default null,
  p_forma_pagamento text default 'Boleto',
  p_ref_evento text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t public.financeiro;
begin
  select * into v_t from financeiro where id = p_financeiro_id and escola_id = p_escola_id for update;
  if v_t.id is null then
    return null;
  end if;
  if v_t.status = 'Pago' then
    return v_t.id;
  end if;
  if v_t.status not in ('Pendente', 'Atrasado') then
    return null;
  end if;

  perform set_config('app.manter_desconto_pontualidade', 'true', true);

  if v_t.gateway_cobranca_id is null then
    update financeiro
       set status = 'Pago', data_pagamento = p_data_pagamento, forma_pagamento = p_forma_pagamento,
           gateway_cobranca_id = p_nosso_numero, gateway_status = 'liquidado',
           valor_antes_pagamento = valor,
           valor = case when coalesce(p_valor_pago, 0) > 0 then p_valor_pago else valor end
     where id = v_t.id;
  else
    -- já tem boleto da API: não mexe no gateway_* (o gatilho enfileira a baixa desse boleto)
    update financeiro
       set status = 'Pago', data_pagamento = p_data_pagamento, forma_pagamento = p_forma_pagamento,
           valor_antes_pagamento = valor,
           valor = case when coalesce(p_valor_pago, 0) > 0 then p_valor_pago else valor end
     where id = v_t.id;
  end if;

  if p_conta_bancaria_id is not null then
    insert into movimentacoes_bancarias
      (conta_bancaria_id, escola_id, data, descricao, valor, natureza, origem, financeiro_id, identificada, gateway_ref)
    values
      (p_conta_bancaria_id, v_t.escola_id, p_data_pagamento,
       v_t.descricao || ' (boleto banco ' || p_nosso_numero || ')',
       p_valor_pago, 'credito', 'api_recebimento', v_t.id, true, coalesce(p_ref_evento, p_nosso_numero));
  end if;

  return v_t.id;
end;
$$;
revoke execute on function public.baixar_parcela_por_boleto_externo(uuid, uuid, text, numeric, date, uuid, text, text) from public, anon, authenticated;
grant execute on function public.baixar_parcela_por_boleto_externo(uuid, uuid, text, numeric, date, uuid, text, text) to service_role;

-- Ação do usuário na tela "pagamentos para conferir": baixar numa parcela escolhida, marcar como resolvido ou ignorar.
create or replace function public.resolver_liquidacao_externa(p_id uuid, p_acao text, p_financeiro_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_l public.liquidacoes_externas;
  v_conta uuid;
  v_ok uuid;
begin
  select * into v_l from liquidacoes_externas where id = p_id for update;
  if v_l.id is null then raise exception 'Registro não encontrado'; end if;
  if not public.usuario_tem_permissao(v_l.escola_id, 'financeiro', 'editar') then
    raise exception 'Sem permissão para conferir pagamentos desta escola';
  end if;
  if v_l.situacao <> 'conferir' then raise exception 'Este pagamento já foi tratado'; end if;

  if p_acao = 'baixar' then
    if p_financeiro_id is null then raise exception 'Escolha a parcela'; end if;
    select conta_bancaria_id into v_conta from escolas_integracao_bancaria where escola_id = v_l.escola_id;
    v_ok := public.baixar_parcela_por_boleto_externo(
      v_l.escola_id, p_financeiro_id, v_l.nosso_numero, v_l.valor_pago, v_l.data_pagamento, v_conta,
      case when coalesce(v_l.tipo_liquidacao, '') ~* 'PIX' then 'Pix' else 'Boleto' end, 'conferencia:' || v_l.nosso_numero);
    if v_ok is null then raise exception 'Essa parcela não está em aberto'; end if;
    update liquidacoes_externas
       set situacao = 'baixada', financeiro_id = v_ok, resolvido_em = now(), resolvido_por = auth.uid(), atualizado_em = now()
     where id = v_l.id;
  elsif p_acao = 'resolvida' then
    update liquidacoes_externas
       set situacao = 'resolvida', resolvido_em = now(), resolvido_por = auth.uid(), atualizado_em = now()
     where id = v_l.id;
  elsif p_acao = 'ignorar' then
    update liquidacoes_externas
       set situacao = 'ignorada', resolvido_em = now(), resolvido_por = auth.uid(), atualizado_em = now()
     where id = v_l.id;
  else
    raise exception 'Ação inválida';
  end if;
end;
$$;
revoke execute on function public.resolver_liquidacao_externa(uuid, text, uuid) from public, anon;
grant execute on function public.resolver_liquidacao_externa(uuid, text, uuid) to authenticated, service_role;

-- Liga/desliga a baixa automática de boletos emitidos no banco (por escola).
create or replace function public.salvar_baixa_boleto_manual(p_escola_id uuid, p_ativo boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.usuario_tem_permissao(p_escola_id, 'integracao_bancaria', 'editar') then
    raise exception 'Sem permissão para configurar a integração bancária desta escola';
  end if;
  update escolas_integracao_bancaria set baixa_boleto_manual = coalesce(p_ativo, false) where escola_id = p_escola_id;
  if not found then raise exception 'Configure primeiro a integração com o Sicredi'; end if;
end;
$$;
revoke execute on function public.salvar_baixa_boleto_manual(uuid, boolean) from public, anon;
grant execute on function public.salvar_baixa_boleto_manual(uuid, boolean) to authenticated, service_role;
