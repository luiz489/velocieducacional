-- Fase 0 da integração Sicredi: fundação + fechamento de brecha de segurança.
--
-- 1) baixar_titulo_por_cobranca_bancaria e confirmar_pagamento_bancario eram
--    SECURITY DEFINER, executáveis por `anon` e sem nenhuma checagem de
--    permissão. Enquanto gateway_cobranca_id nunca era preenchido isso era
--    inofensivo; a partir de agora qualquer pessoa na internet poderia marcar
--    título como pago e lançar movimentação bancária via /rest/v1/rpc.
--    Ficam executáveis só pelo service_role (a edge function do webhook).
-- 2) O nosso número do Sicredi só é único por beneficiário: a busca do título
--    agora é sempre escopada por escola.
-- 3) Credenciais Sicredi (código de acesso / x-api-key) deixam de ser legíveis
--    pelo navegador (a tela só escreve essas colunas).

-- ---------------------------------------------------------------------------
-- financeiro: estado do boleto no banco
-- ---------------------------------------------------------------------------
alter table public.financeiro
  add column if not exists gateway_txid text,
  add column if not exists gateway_status text,
  add column if not exists gateway_registrado_em timestamptz,
  add column if not exists gateway_erro text;

alter table public.financeiro
  drop constraint if exists financeiro_gateway_status_check;
alter table public.financeiro
  add constraint financeiro_gateway_status_check
  check (gateway_status is null or gateway_status in ('registrado','liquidado','baixado','erro'));

create unique index if not exists financeiro_escola_gateway_cobranca_uniq
  on public.financeiro (escola_id, gateway_cobranca_id)
  where gateway_cobranca_id is not null;

-- ---------------------------------------------------------------------------
-- escolas_integracao_bancaria: parâmetros da cobrança + segredos do webhook
-- ---------------------------------------------------------------------------
alter table public.escolas_integracao_bancaria
  add column if not exists conta_bancaria_id uuid references public.contas_bancarias(id) on delete set null,
  add column if not exists webhook_segredo text,
  add column if not exists webhook_contrato_id text,
  add column if not exists webhook_status text,
  add column if not exists multa_percentual numeric(5,2) not null default 2,
  add column if not exists juros_mensal_percentual numeric(5,2) not null default 1,
  add column if not exists tipo_cobranca text not null default 'HIBRIDO',
  add column if not exists especie_documento text not null default 'DUPLICATA_MERCANTIL_INDICACAO',
  add column if not exists registrar_na_matricula boolean not null default false;

alter table public.escolas_integracao_bancaria
  drop constraint if exists escolas_integracao_bancaria_tipo_cobranca_check;
alter table public.escolas_integracao_bancaria
  add constraint escolas_integracao_bancaria_tipo_cobranca_check
  check (tipo_cobranca in ('HIBRIDO','NORMAL'));

alter table public.escolas_integracao_bancaria
  drop constraint if exists escolas_integracao_bancaria_multa_juros_check;
alter table public.escolas_integracao_bancaria
  add constraint escolas_integracao_bancaria_multa_juros_check
  check (multa_percentual between 0 and 20 and juros_mensal_percentual between 0 and 20);

-- Leitura pelo navegador: só as colunas que não são segredo. A edge function
-- (service_role) lê tudo. Novas colunas sensíveis NÃO entram nesta lista.
revoke all on public.escolas_integracao_bancaria from anon;
revoke select on public.escolas_integracao_bancaria from authenticated;
grant select (
  id, escola_id, banco, agencia, conta_corrente, codigo_beneficiario, posto, chave_pix,
  ambiente, ativo, criado_em, atualizado_em, conta_bancaria_id, webhook_contrato_id,
  webhook_status, multa_percentual, juros_mensal_percentual, tipo_cobranca,
  especie_documento, registrar_na_matricula
) on public.escolas_integracao_bancaria to authenticated;

-- ---------------------------------------------------------------------------
-- Tabelas internas (sem policy de cliente: só service_role acessa)
-- ---------------------------------------------------------------------------
create table if not exists public.sicredi_tokens (
  escola_id uuid primary key references public.escolas(id) on delete cascade,
  access_token text not null,
  access_expires_at timestamptz not null,
  refresh_token text,
  refresh_expires_at timestamptz,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.cobranca_fila (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas(id) on delete cascade,
  financeiro_id uuid references public.financeiro(id) on delete set null,
  operacao text not null check (operacao in ('registrar','baixar')),
  nosso_numero text,
  status text not null default 'pendente' check (status in ('pendente','processando','ok','erro')),
  tentativas integer not null default 0,
  ultimo_erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  processado_em timestamptz
);

create unique index if not exists cobranca_fila_registrar_ativo_uniq
  on public.cobranca_fila (financeiro_id)
  where operacao = 'registrar' and status in ('pendente','processando');
create index if not exists cobranca_fila_status_idx
  on public.cobranca_fila (status, criado_em);

create table if not exists public.cobranca_eventos (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid references public.escolas(id) on delete set null,
  chave_beneficiario text not null,
  id_evento text not null,
  movimento text,
  nosso_numero text,
  payload jsonb not null,
  headers jsonb,
  status text not null default 'recebido'
    check (status in ('recebido','processado','ignorado','erro','estorno_pendente')),
  detalhe text,
  recebido_em timestamptz not null default now()
);

create unique index if not exists cobranca_eventos_evento_uniq
  on public.cobranca_eventos (chave_beneficiario, id_evento);

alter table public.sicredi_tokens enable row level security;
alter table public.cobranca_fila enable row level security;
alter table public.cobranca_eventos enable row level security;

revoke all on public.sicredi_tokens from anon, authenticated;
revoke all on public.cobranca_fila from anon, authenticated;
revoke all on public.cobranca_eventos from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Baixa por cobrança bancária: escopada por escola, idempotente, só service_role
-- ---------------------------------------------------------------------------
drop function if exists public.baixar_titulo_por_cobranca_bancaria(text, numeric, date, uuid);

create or replace function public.baixar_titulo_por_cobranca_bancaria(
  p_escola_id uuid,
  p_gateway_cobranca_id text,
  p_valor_pago numeric,
  p_data_pagamento date,
  p_conta_bancaria_id uuid default null,
  p_forma_pagamento text default 'Boleto',
  p_ref_evento text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_titulo public.financeiro;
begin
  select * into v_titulo from public.financeiro
  where escola_id = p_escola_id and gateway_cobranca_id = p_gateway_cobranca_id
  for update;

  if v_titulo.id is null then
    raise notice 'Nenhum título encontrado para a cobrança % na escola %', p_gateway_cobranca_id, p_escola_id;
    return null;
  end if;

  -- idempotente: evento repetido não baixa nem lança movimentação duas vezes
  if v_titulo.status = 'Pago' then
    return v_titulo.id;
  end if;

  update public.financeiro
  set status = 'Pago',
      data_pagamento = p_data_pagamento,
      forma_pagamento = p_forma_pagamento,
      gateway_status = 'liquidado',
      valor_antes_pagamento = valor
  where id = v_titulo.id;

  if p_conta_bancaria_id is not null then
    insert into public.movimentacoes_bancarias
      (conta_bancaria_id, escola_id, data, descricao, valor, natureza, origem,
       financeiro_id, identificada, gateway_ref)
    values
      (p_conta_bancaria_id, v_titulo.escola_id, p_data_pagamento,
       v_titulo.descricao || ' (boleto ' || p_gateway_cobranca_id || ')',
       p_valor_pago, 'credito', 'api_recebimento',
       v_titulo.id, true, coalesce(p_ref_evento, p_gateway_cobranca_id));
  end if;

  return v_titulo.id;
end;
$function$;

revoke execute on function public.baixar_titulo_por_cobranca_bancaria(uuid, text, numeric, date, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.baixar_titulo_por_cobranca_bancaria(uuid, text, numeric, date, uuid, text, text)
  to service_role;

revoke execute on function public.confirmar_pagamento_bancario(text, text, uuid, date)
  from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_bancario(text, text, uuid, date)
  to service_role;

-- ---------------------------------------------------------------------------
-- Desfazer confirmação: não vale pra pagamento confirmado pelo banco
-- ---------------------------------------------------------------------------
create or replace function public.desfazer_confirmacao_pagamento(p_id uuid)
returns public.financeiro
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_escola_id uuid;
  v_status_atual text;
  v_valor_antes numeric;
  v_data_vencimento date;
  v_gateway_status text;
  v_tolerancia int;
  v_novo_status text;
  v_result public.financeiro;
begin
  select escola_id, status, valor_antes_pagamento, data_vencimento, gateway_status
    into v_escola_id, v_status_atual, v_valor_antes, v_data_vencimento, v_gateway_status
  from public.financeiro where id = p_id;

  if not found then
    raise exception 'Título não encontrado';
  end if;

  if not public.usuario_tem_permissao(v_escola_id, 'financeiro', 'editar') then
    raise exception 'Sem permissão para desfazer a confirmação deste título';
  end if;

  if v_status_atual <> 'Pago' then
    raise exception 'Só é possível desfazer a confirmação de um título que está Pago';
  end if;

  if v_gateway_status = 'liquidado' then
    raise exception 'Este pagamento foi confirmado pelo banco (boleto liquidado) e não pode ser desfeito por aqui.';
  end if;

  select atraso_dias_tolerancia into v_tolerancia from public.escolas where id = v_escola_id;
  v_novo_status := case
    when (v_data_vencimento + coalesce(v_tolerancia, 0)) < current_date then 'Atrasado'
    else 'Pendente'
  end;

  update public.financeiro
  set status = v_novo_status,
      data_pagamento = null,
      forma_pagamento = null,
      valor = coalesce(v_valor_antes, valor),
      valor_antes_pagamento = null
  where id = p_id
  returning * into v_result;

  return v_result;
end;
$function$;
