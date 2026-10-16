-- Remessa de pagamentos (folha, professores PJ, fornecedores): lote que será enviado ao banco por arquivo CNAB.
-- Cada item guarda um retrato dos dados bancários do favorecido no momento da inclusão (histórico/auditoria).
-- Tudo é gravado só pelas funções abaixo (security definer), que conferem permissão e dados; o cliente só lê.

create table if not exists public.remessas_pagamento (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas(id) on delete cascade,
  numero integer not null,
  conta_bancaria_id uuid references public.contas_bancarias(id) on delete set null,
  data_pagamento date not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'concluida', 'cancelada')),
  qtde integer not null default 0,
  total numeric(14, 2) not null default 0,
  observacoes text,
  criado_por uuid,
  created_at timestamptz not null default now(),
  enviada_em timestamptz,
  concluida_em timestamptz,
  cancelada_em timestamptz,
  unique (escola_id, numero)
);

create table if not exists public.remessas_pagamento_itens (
  id uuid primary key default gen_random_uuid(),
  remessa_id uuid not null references public.remessas_pagamento(id) on delete cascade,
  escola_id uuid not null references public.escolas(id) on delete cascade,
  conta_a_pagar_id uuid not null references public.contas_a_pagar(id) on delete restrict,
  origem text not null check (origem in ('fornecedor', 'professor', 'funcionario')),
  favorecido_id uuid not null,
  favorecido_nome text not null,
  documento text,
  forma_pagamento text not null check (forma_pagamento in ('pix', 'ted', 'credito_conta', 'boleto')),
  valor numeric(14, 2) not null,
  banco_codigo text, banco_nome text, agencia text, agencia_dv text, conta text, conta_dv text,
  tipo_conta text, tipo_chave_pix text, chave_pix text, codigo_barras text,
  status text not null default 'incluido' check (status in ('incluido', 'pago', 'rejeitado', 'cancelado')),
  motivo text,
  created_at timestamptz not null default now()
);

-- uma conta a pagar só pode estar em UMA remessa ativa
create unique index if not exists remessas_itens_conta_ativa_uq
  on public.remessas_pagamento_itens (conta_a_pagar_id) where status <> 'cancelado';
create index if not exists remessas_itens_remessa_idx on public.remessas_pagamento_itens (remessa_id);
create index if not exists remessas_escola_idx on public.remessas_pagamento (escola_id, created_at desc);

alter table public.remessas_pagamento enable row level security;
alter table public.remessas_pagamento_itens enable row level security;

create policy remessas_select on public.remessas_pagamento for select to authenticated
  using (public.usuario_tem_permissao(escola_id, 'compras', 'visualizar'));

-- itens de professor/funcionário só para quem pode ver os dados financeiros de RH
create policy remessas_itens_select on public.remessas_pagamento_itens for select to authenticated
  using (
    public.usuario_tem_permissao(escola_id, 'compras', 'visualizar')
    and (origem = 'fornecedor' or public.usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar'))
  );

revoke all on public.remessas_pagamento, public.remessas_pagamento_itens from public, anon, authenticated;
grant select on public.remessas_pagamento, public.remessas_pagamento_itens to authenticated;
grant all on public.remessas_pagamento, public.remessas_pagamento_itens to service_role;

-- Cria a remessa a partir de contas a pagar pendentes. Recusa favorecido sem dados bancários completos,
-- conta já incluída em outra remessa ativa e conta de outra escola.
create or replace function public.criar_remessa_pagamento(
  p_escola_id uuid,
  p_conta_bancaria_id uuid,
  p_data_pagamento date,
  p_contas uuid[],
  p_observacoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remessa uuid;
  v_numero integer;
  v_cp record;
  v_f record;
  v_forma text;
  v_pix_ok boolean;
  v_conta_ok boolean;
  v_doc_ok boolean;
  v_invalidos text[] := '{}';
  v_total numeric(14, 2) := 0;
  v_qtde integer := 0;
begin
  if not public.usuario_tem_permissao(p_escola_id, 'compras', 'editar') then
    raise exception 'Sem permissão para criar remessas de pagamento desta escola';
  end if;
  if p_contas is null or coalesce(array_length(p_contas, 1), 0) = 0 then
    raise exception 'Selecione ao menos um pagamento';
  end if;
  if p_data_pagamento is null then
    raise exception 'Informe a data do pagamento';
  end if;
  if not exists (select 1 from contas_bancarias where id = p_conta_bancaria_id and escola_id = p_escola_id and ativo) then
    raise exception 'Conta bancária de débito inválida';
  end if;

  perform pg_advisory_xact_lock(hashtext('remessa_pagamento:' || p_escola_id::text));
  select coalesce(max(numero), 0) + 1 into v_numero from remessas_pagamento where escola_id = p_escola_id;

  insert into remessas_pagamento (escola_id, numero, conta_bancaria_id, data_pagamento, observacoes, criado_por)
  values (p_escola_id, v_numero, p_conta_bancaria_id, p_data_pagamento, nullif(trim(coalesce(p_observacoes, '')), ''), auth.uid())
  returning id into v_remessa;

  for v_cp in
    select cp.* from contas_a_pagar cp where cp.id = any (p_contas) order by cp.data_vencimento, cp.id
  loop
    if v_cp.escola_id <> p_escola_id then
      raise exception 'Há um pagamento que não pertence a esta escola';
    end if;
    if v_cp.status <> 'Pendente' then
      raise exception 'O pagamento "%" não está pendente', v_cp.descricao;
    end if;
    if exists (select 1 from remessas_pagamento_itens i where i.conta_a_pagar_id = v_cp.id and i.status <> 'cancelado') then
      raise exception 'O pagamento "%" já está em outra remessa', v_cp.descricao;
    end if;

    if v_cp.professor_id is not null then
      if not public.usuario_tem_permissao(p_escola_id, 'rh_financeiro', 'visualizar') then
        raise exception 'Sem permissão para incluir pagamentos de RH';
      end if;
      select 'professor'::text as origem, p.id as id, p.nome as nome, coalesce(nullif(p.cnpj, ''), p.cpf) as documento,
             p.banco_codigo as banco_codigo, p.banco_nome as banco_nome, p.agencia as agencia, p.agencia_dv as agencia_dv,
             p.conta as conta, p.conta_dv as conta_dv, p.tipo_conta as tipo_conta,
             p.tipo_chave_pix as tipo_chave_pix, p.chave_pix as chave_pix into v_f from professores p where p.id = v_cp.professor_id;
    elsif v_cp.funcionario_id is not null then
      if not public.usuario_tem_permissao(p_escola_id, 'rh_financeiro', 'visualizar') then
        raise exception 'Sem permissão para incluir pagamentos de RH';
      end if;
      select 'funcionario'::text as origem, f.id as id, f.nome as nome, f.cpf as documento,
             f.banco_codigo as banco_codigo, f.banco_nome as banco_nome, f.agencia as agencia, f.agencia_dv as agencia_dv,
             f.conta as conta, f.conta_dv as conta_dv, f.tipo_conta as tipo_conta,
             f.tipo_chave_pix as tipo_chave_pix, f.chave_pix as chave_pix into v_f from funcionarios f where f.id = v_cp.funcionario_id;
    elsif v_cp.fornecedor_id is not null then
      select 'fornecedor'::text as origem, f.id as id, f.nome as nome, f.cnpj_cpf as documento,
             f.banco_codigo as banco_codigo, f.banco as banco_nome, f.agencia as agencia, f.agencia_dv as agencia_dv,
             f.conta as conta, f.conta_dv as conta_dv, f.tipo_conta as tipo_conta,
             f.tipo_chave_pix as tipo_chave_pix, f.chave_pix as chave_pix into v_f from fornecedores f where f.id = v_cp.fornecedor_id;
    else
      v_invalidos := v_invalidos || (v_cp.descricao || ' (sem favorecido cadastrado)');
      continue;
    end if;

    v_pix_ok := coalesce(v_f.chave_pix, '') <> '' and coalesce(v_f.tipo_chave_pix, '') <> '';
    v_conta_ok := coalesce(v_f.banco_codigo, '') ~ '^[0-9]{3}$' and coalesce(v_f.agencia, '') <> ''
                  and coalesce(v_f.conta, '') <> '' and coalesce(v_f.conta_dv, '') <> '' and coalesce(v_f.tipo_conta, '') <> '';
    v_doc_ok := regexp_replace(coalesce(v_f.documento, ''), '\D', '', 'g') ~ '^([0-9]{11}|[0-9]{14})$';

    if v_cp.forma_pagamento = 'boleto' or (v_cp.forma_pagamento is null and coalesce(v_cp.codigo_barras, '') <> '') then
      v_forma := 'boleto';
      if coalesce(v_cp.codigo_barras, '') = '' then
        v_invalidos := v_invalidos || (v_f.nome || ' (boleto sem código de barras)');
        continue;
      end if;
    else
      if not (v_doc_ok and (v_pix_ok or v_conta_ok)) then
        v_invalidos := v_invalidos || v_f.nome;
        continue;
      end if;
      v_forma := coalesce(v_cp.forma_pagamento,
        case when v_pix_ok then 'pix' when v_f.banco_codigo = '748' then 'credito_conta' else 'ted' end);
    end if;

    insert into remessas_pagamento_itens (
      remessa_id, escola_id, conta_a_pagar_id, origem, favorecido_id, favorecido_nome, documento, forma_pagamento, valor,
      banco_codigo, banco_nome, agencia, agencia_dv, conta, conta_dv, tipo_conta, tipo_chave_pix, chave_pix, codigo_barras
    ) values (
      v_remessa, p_escola_id, v_cp.id, v_f.origem, v_f.id, v_f.nome, v_f.documento, v_forma, v_cp.valor,
      v_f.banco_codigo, v_f.banco_nome, v_f.agencia, v_f.agencia_dv, v_f.conta, v_f.conta_dv, v_f.tipo_conta,
      v_f.tipo_chave_pix, v_f.chave_pix, v_cp.codigo_barras
    );
    v_total := v_total + v_cp.valor;
    v_qtde := v_qtde + 1;
  end loop;

  if array_length(v_invalidos, 1) > 0 then
    raise exception 'Faltam dados para pagar: %', array_to_string(v_invalidos, '; ');
  end if;
  if v_qtde = 0 then
    raise exception 'Nenhum pagamento válido na seleção';
  end if;

  update remessas_pagamento set qtde = v_qtde, total = v_total where id = v_remessa;
  return v_remessa;
end;
$$;

-- Muda o estado da remessa: enviar (rascunho -> enviada), concluir (enviada -> concluida), cancelar.
create or replace function public.atualizar_status_remessa(p_remessa_id uuid, p_acao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r remessas_pagamento%rowtype;
begin
  select * into v_r from remessas_pagamento where id = p_remessa_id;
  if not found then
    raise exception 'Remessa não encontrada';
  end if;
  if not public.usuario_tem_permissao(v_r.escola_id, 'compras', 'editar') then
    raise exception 'Sem permissão para alterar remessas desta escola';
  end if;

  if p_acao = 'enviar' then
    if v_r.status <> 'rascunho' then raise exception 'Só uma remessa em rascunho pode ser marcada como enviada'; end if;
    update remessas_pagamento set status = 'enviada', enviada_em = now() where id = v_r.id;
    update contas_a_pagar set status_envio_banco = 'enviado', enviado_em = now()
     where id in (select conta_a_pagar_id from remessas_pagamento_itens where remessa_id = v_r.id and status = 'incluido');

  elsif p_acao = 'concluir' then
    if v_r.status <> 'enviada' then raise exception 'Só uma remessa enviada pode ser concluída'; end if;
    update remessas_pagamento set status = 'concluida', concluida_em = now() where id = v_r.id;
    update remessas_pagamento_itens set status = 'pago' where remessa_id = v_r.id and status = 'incluido';
    update contas_a_pagar set status_envio_banco = 'efetivado', efetivado_em = now()
     where id in (select conta_a_pagar_id from remessas_pagamento_itens where remessa_id = v_r.id and status = 'pago');

  elsif p_acao = 'cancelar' then
    if v_r.status not in ('rascunho', 'enviada') then raise exception 'Esta remessa não pode mais ser cancelada'; end if;
    update contas_a_pagar set status_envio_banco = 'nao_enviado', enviado_em = null
     where status_envio_banco = 'enviado'
       and id in (select conta_a_pagar_id from remessas_pagamento_itens where remessa_id = v_r.id and status = 'incluido');
    update remessas_pagamento_itens set status = 'cancelado' where remessa_id = v_r.id and status = 'incluido';
    update remessas_pagamento set status = 'cancelada', cancelada_em = now() where id = v_r.id;

  else
    raise exception 'Ação inválida';
  end if;
end;
$$;

revoke execute on function public.criar_remessa_pagamento(uuid, uuid, date, uuid[], text) from public, anon;
revoke execute on function public.atualizar_status_remessa(uuid, text) from public, anon;
grant execute on function public.criar_remessa_pagamento(uuid, uuid, date, uuid[], text) to authenticated, service_role;
grant execute on function public.atualizar_status_remessa(uuid, text) to authenticated, service_role;
