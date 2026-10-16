-- Dados bancários dos favorecidos (fornecedores, professores, funcionários) completos para pagamento por
-- arquivo CNAB 240 (crédito em conta/TED) e Pix: código do banco, dígitos da agência/conta e tipo da chave Pix.

alter table public.fornecedores
  add column if not exists banco_codigo text,
  add column if not exists agencia_dv text,
  add column if not exists conta_dv text,
  add column if not exists tipo_chave_pix text;

alter table public.funcionarios
  add column if not exists agencia_dv text,
  add column if not exists conta_dv text,
  add column if not exists tipo_chave_pix text;

alter table public.professores
  add column if not exists agencia_dv text,
  add column if not exists conta_dv text,
  add column if not exists tipo_chave_pix text;

-- tipo de conta padronizado (corrente | poupanca | pagamento); os cadastros antigos usavam "Corrente"/"Poupança"
update public.funcionarios set tipo_conta = case
  when lower(tipo_conta) like 'poup%' then 'poupanca'
  when lower(tipo_conta) like '%pagamento%' then 'pagamento'
  else 'corrente' end
 where tipo_conta is not null and tipo_conta not in ('corrente', 'poupanca', 'pagamento');
update public.professores set tipo_conta = case
  when lower(tipo_conta) like 'poup%' then 'poupanca'
  when lower(tipo_conta) like '%pagamento%' then 'pagamento'
  else 'corrente' end
 where tipo_conta is not null and tipo_conta not in ('corrente', 'poupanca', 'pagamento');
update public.fornecedores set tipo_conta = case
  when lower(tipo_conta) like 'poup%' then 'poupanca'
  when lower(tipo_conta) like '%pagamento%' then 'pagamento'
  else 'corrente' end
 where tipo_conta is not null and tipo_conta not in ('corrente', 'poupanca', 'pagamento');

-- formatos (NOT VALID: valem para o que for gravado daqui para frente). A tela antiga ainda grava
-- "Corrente"/"Poupança": os dois formatos são aceitos até a tela nova entrar em produção.
do $$
declare t text;
begin
  foreach t in array array['fornecedores', 'funcionarios', 'professores'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_dados_bancarios_chk');
    execute format($f$alter table public.%I add constraint %I check (
      (banco_codigo is null or banco_codigo ~ '^[0-9]{3}$')
      and (agencia_dv is null or agencia_dv ~ '^[0-9Xx]$')
      and (conta_dv is null or conta_dv ~ '^[0-9Xx]$')
      and (tipo_conta is null or tipo_conta in ('corrente', 'poupanca', 'pagamento', 'Corrente', 'Poupança'))
      and (tipo_chave_pix is null or tipo_chave_pix in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'))
    ) not valid$f$, t, t || '_dados_bancarios_chk');
  end loop;
end $$;

-- contas a pagar: como pagar (para o arquivo bancário) e qual conta da escola paga
alter table public.contas_a_pagar
  add column if not exists forma_pagamento text
    check (forma_pagamento is null or forma_pagamento in ('pix', 'ted', 'credito_conta', 'boleto')),
  add column if not exists codigo_barras text,
  add column if not exists conta_bancaria_id uuid references public.contas_bancarias(id) on delete set null;

-- prontidão de cada favorecido para o pagamento: o que falta preencher
create or replace view public.v_favorecidos_pagamento with (security_invoker = true) as
with base as (
  select 'fornecedor'::text as origem, f.id, f.escola_id, f.nome, f.cnpj_cpf as documento, null::text as vinculo,
         f.banco_codigo, f.banco as banco_nome, f.agencia, f.agencia_dv, f.conta, f.conta_dv, f.tipo_conta,
         f.tipo_chave_pix, f.chave_pix, f.ativo
    from public.fornecedores f
  union all
  select 'professor', p.id, p.escola_id, p.nome, coalesce(nullif(p.cnpj, ''), p.cpf), p.tipo_contratacao,
         p.banco_codigo, p.banco_nome, p.agencia, p.agencia_dv, p.conta, p.conta_dv, p.tipo_conta,
         p.tipo_chave_pix, p.chave_pix, p.ativo
    from public.professores p
  union all
  select 'funcionario', fu.id, fu.escola_id, fu.nome, fu.cpf, fu.tipo_contrato,
         fu.banco_codigo, fu.banco_nome, fu.agencia, fu.agencia_dv, fu.conta, fu.conta_dv, fu.tipo_conta,
         fu.tipo_chave_pix, fu.chave_pix, fu.ativo
    from public.funcionarios fu
), calc as (
  select b.*,
         (coalesce(b.chave_pix, '') <> '' and coalesce(b.tipo_chave_pix, '') <> '') as pix_ok,
         (coalesce(b.banco_codigo, '') ~ '^[0-9]{3}$' and coalesce(b.agencia, '') <> ''
            and coalesce(b.conta, '') <> '' and coalesce(b.conta_dv, '') <> '' and coalesce(b.tipo_conta, '') <> '') as conta_ok,
         (regexp_replace(coalesce(b.documento, ''), '\D', '', 'g') ~ '^([0-9]{11}|[0-9]{14})$') as documento_ok
    from base b
)
select origem, id, escola_id, nome, documento, vinculo, banco_codigo, banco_nome, agencia, agencia_dv, conta, conta_dv,
       tipo_conta, tipo_chave_pix, chave_pix, ativo,
       (documento_ok and (pix_ok or conta_ok)) as pronto_para_pagar,
       nullif(concat_ws(', ',
         case when not documento_ok then 'CPF/CNPJ' end,
         case when not (pix_ok or conta_ok) then
           'chave Pix ou dados da conta (' || concat_ws(', ',
             case when coalesce(banco_codigo, '') !~ '^[0-9]{3}$' then 'código do banco' end,
             case when coalesce(agencia, '') = '' then 'agência' end,
             case when coalesce(conta, '') = '' then 'conta' end,
             case when coalesce(conta_dv, '') = '' then 'dígito da conta' end,
             case when coalesce(tipo_conta, '') = '' then 'tipo de conta' end) || ')'
         end), '') as pendencias
  from calc;

grant select on public.v_favorecidos_pagamento to authenticated, service_role;
