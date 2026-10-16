-- 1) A visão de prontidão (mesmas colunas da versão anterior, por isso create or replace) mascara documento e dados bancários para quem não tem permissão
--    (RH financeiro para professores/funcionários; financeiro para fornecedores). Os indicadores
--    "pronto_para_pagar" e "pendencias" continuam visíveis: não revelam nenhum dado.
create or replace view public.v_favorecidos_pagamento with (security_invoker = true) as
with base as (
  select 'fornecedor'::text as origem, f.id, f.escola_id, f.nome, f.cnpj_cpf as documento, null::text as vinculo,
         f.banco_codigo, f.banco as banco_nome, f.agencia, f.agencia_dv, f.conta, f.conta_dv, f.tipo_conta,
         f.tipo_chave_pix, f.chave_pix, f.ativo,
         public.usuario_tem_permissao(f.escola_id, 'financeiro', 'visualizar') as pode_ver
    from public.fornecedores f
  union all
  select 'professor', p.id, p.escola_id, p.nome, coalesce(nullif(p.cnpj, ''), p.cpf), p.tipo_contratacao,
         p.banco_codigo, p.banco_nome, p.agencia, p.agencia_dv, p.conta, p.conta_dv, p.tipo_conta,
         p.tipo_chave_pix, p.chave_pix, p.ativo,
         public.usuario_tem_permissao(p.escola_id, 'rh_financeiro', 'visualizar')
    from public.professores p
  union all
  select 'funcionario', fu.id, fu.escola_id, fu.nome, fu.cpf, fu.tipo_contrato,
         fu.banco_codigo, fu.banco_nome, fu.agencia, fu.agencia_dv, fu.conta, fu.conta_dv, fu.tipo_conta,
         fu.tipo_chave_pix, fu.chave_pix, fu.ativo,
         public.usuario_tem_permissao(fu.escola_id, 'rh_financeiro', 'visualizar')
    from public.funcionarios fu
), calc as (
  select b.*,
         (coalesce(b.chave_pix, '') <> '' and coalesce(b.tipo_chave_pix, '') <> '') as pix_ok,
         (coalesce(b.banco_codigo, '') ~ '^[0-9]{3}$' and coalesce(b.agencia, '') <> ''
            and coalesce(b.conta, '') <> '' and coalesce(b.conta_dv, '') <> '' and coalesce(b.tipo_conta, '') <> '') as conta_ok,
         (regexp_replace(coalesce(b.documento, ''), '\D', '', 'g') ~ '^([0-9]{11}|[0-9]{14})$') as documento_ok
    from base b
)
select origem, id, escola_id, nome,
       case when pode_ver then documento end as documento,
       vinculo,
       case when pode_ver then banco_codigo end as banco_codigo,
       case when pode_ver then banco_nome end as banco_nome,
       case when pode_ver then agencia end as agencia,
       case when pode_ver then agencia_dv end as agencia_dv,
       case when pode_ver then conta end as conta,
       case when pode_ver then conta_dv end as conta_dv,
       case when pode_ver then tipo_conta end as tipo_conta,
       case when pode_ver then tipo_chave_pix end as tipo_chave_pix,
       case when pode_ver then chave_pix end as chave_pix,
       ativo,
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

revoke all on public.v_favorecidos_pagamento from public, anon;
grant select on public.v_favorecidos_pagamento to authenticated, service_role;

-- 2) Visões seguras: os campos novos seguem a mesma máscara dos demais dados bancários (colunas no fim).
create or replace view public.v_funcionarios_seguro with (security_invoker = on) as
 select
    id,
    escola_id,
    nome,
    sexo,
    estado_civil,
    nome_mae,
    nome_pai,
    nacionalidade,
    naturalidade_cidade,
    naturalidade_uf,
    cor_raca,
    grau_instrucao,
    endereco,
    bairro,
    cep,
    cidade,
    uf,
    telefone,
    email,
    categoria_esocial,
    cargo,
    funcao,
    codigo_cbo,
    departamento,
    data_inicio_funcao,
    tipo_contrato,
    data_admissao,
    data_demissao,
    jornada_semanal_horas,
    horario_trabalho,
    ativo,
    observacoes,
    created_at,
    updated_at,
    foto_url,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN cpf
            ELSE NULL::text
        END AS cpf,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN rg
            ELSE NULL::text
        END AS rg,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN rg_orgao_emissor
            ELSE NULL::text
        END AS rg_orgao_emissor,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN data_nascimento
            ELSE NULL::date
        END AS data_nascimento,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN pis_pasep
            ELSE NULL::text
        END AS pis_pasep,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN ctps_numero
            ELSE NULL::text
        END AS ctps_numero,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN ctps_serie
            ELSE NULL::text
        END AS ctps_serie,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN salario_base
            ELSE NULL::numeric
        END AS salario_base,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN data_vigencia_salario
            ELSE NULL::date
        END AS data_vigencia_salario,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN dia_pagamento
            ELSE NULL::integer
        END AS dia_pagamento,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN vale_transporte
            ELSE NULL::numeric
        END AS vale_transporte,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN vale_refeicao
            ELSE NULL::numeric
        END AS vale_refeicao,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN plano_saude
            ELSE NULL::numeric
        END AS plano_saude,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN banco_codigo
            ELSE NULL::text
        END AS banco_codigo,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN banco_nome
            ELSE NULL::text
        END AS banco_nome,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN agencia
            ELSE NULL::text
        END AS agencia,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN conta
            ELSE NULL::text
        END AS conta,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN tipo_conta
            ELSE NULL::text
        END AS tipo_conta,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN chave_pix
            ELSE NULL::text
        END AS chave_pix,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN agencia_dv
            ELSE NULL::text
        END AS agencia_dv,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN conta_dv
            ELSE NULL::text
        END AS conta_dv,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN tipo_chave_pix
            ELSE NULL::text
        END AS tipo_chave_pix
   from funcionarios;

create or replace view public.v_professores_seguro with (security_invoker = on) as
 select
    id,
    nome,
    email,
    telefone,
    formacao,
    disciplinas,
    data_admissao,
    observacoes,
    ativo,
    created_at,
    updated_at,
    escola_id,
    tipo_contratacao,
    foto_url,
    endereco,
    cep,
    bairro,
    cidade,
    uf,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN cpf
            ELSE NULL::text
        END AS cpf,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN rg
            ELSE NULL::text
        END AS rg,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN cnpj
            ELSE NULL::text
        END AS cnpj,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN razao_social
            ELSE NULL::text
        END AS razao_social,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN data_nascimento
            ELSE NULL::date
        END AS data_nascimento,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN banco_codigo
            ELSE NULL::text
        END AS banco_codigo,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN banco_nome
            ELSE NULL::text
        END AS banco_nome,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN agencia
            ELSE NULL::text
        END AS agencia,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN conta
            ELSE NULL::text
        END AS conta,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN tipo_conta
            ELSE NULL::text
        END AS tipo_conta,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN chave_pix
            ELSE NULL::text
        END AS chave_pix,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN valor_mensal
            ELSE NULL::numeric
        END AS valor_mensal,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN dia_pagamento
            ELSE NULL::integer
        END AS dia_pagamento,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN agencia_dv
            ELSE NULL::text
        END AS agencia_dv,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN conta_dv
            ELSE NULL::text
        END AS conta_dv,
        CASE
            WHEN usuario_tem_permissao(escola_id, 'rh_financeiro'::text, 'visualizar'::text) THEN tipo_chave_pix
            ELSE NULL::text
        END AS tipo_chave_pix
   from professores;

-- 3) Visões de exportação dos pagamentos: dígitos e tipo da chave Pix no fim.
create or replace view public.v_pagamentos_funcionarios_export with (security_invoker = on) as
 select cp.id as conta_id, cp.escola_id, f.id as funcionario_id, f.nome as funcionario_nome, f.cargo, f.cpf,
        f.banco_codigo, f.banco_nome, f.agencia, f.conta, f.tipo_conta, f.chave_pix,
        cp.valor, cp.data_vencimento, cp.competencia_mes, cp.competencia_ano, cp.status,
        f.agencia_dv, f.conta_dv, f.tipo_chave_pix
   from contas_a_pagar cp
   join funcionarios f on f.id = cp.funcionario_id
  where cp.funcionario_id is not null;

create or replace view public.v_pagamentos_professores_export with (security_invoker = on) as
 select cp.id as conta_id, cp.escola_id, p.id as professor_id, p.nome as professor_nome, p.cnpj, p.razao_social,
        p.banco_codigo, p.banco_nome, p.agencia, p.conta, p.tipo_conta, p.chave_pix,
        cp.valor, cp.data_vencimento, cp.competencia_mes, cp.competencia_ano, cp.status,
        p.agencia_dv, p.conta_dv, p.tipo_chave_pix
   from contas_a_pagar cp
   join professores p on p.id = cp.professor_id
  where cp.professor_id is not null;
