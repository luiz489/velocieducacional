-- O upsert direto da tela (ON CONFLICT DO UPDATE) exige poder LER as colunas,
-- o que conflita com esconder código de acesso/x-api-key do navegador.
-- Solução: a escrita passa a ser só via função (SECURITY DEFINER), que:
--  - confere a permissão integracao_bancaria:editar na escola;
--  - só aceita como conta bancária uma conta DA MESMA escola (sem isso um admin
--    poderia apontar as liquidações pra conta de outra escola);
--  - permite deixar código de acesso / x-api-key em branco = manter o atual
--    (a tela não consegue ler esses valores de volta).

revoke insert, update on public.escolas_integracao_bancaria from authenticated;

alter table public.escolas_integracao_bancaria
  add column if not exists tem_credenciais boolean
  generated always as (coalesce(codigo_acesso, '') <> '' and coalesce(x_api_key, '') <> '') stored;

grant select (tem_credenciais) on public.escolas_integracao_bancaria to authenticated;

create or replace function public.salvar_integracao_sicredi(
  p_escola_id uuid,
  p_agencia text,
  p_conta_corrente text,
  p_codigo_beneficiario text,
  p_posto text,
  p_chave_pix text,
  p_ambiente text,
  p_codigo_acesso text default null,
  p_x_api_key text default null,
  p_conta_bancaria_id uuid default null,
  p_multa_percentual numeric default 2,
  p_juros_mensal_percentual numeric default 1,
  p_tipo_cobranca text default 'HIBRIDO',
  p_especie_documento text default 'DUPLICATA_MERCANTIL_INDICACAO',
  p_registrar_na_matricula boolean default false
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_existe boolean;
begin
  if not public.usuario_tem_permissao(p_escola_id, 'integracao_bancaria', 'editar') then
    raise exception 'Sem permissão para configurar a integração bancária desta escola';
  end if;

  if p_ambiente not in ('homologacao', 'producao') then
    raise exception 'Ambiente inválido';
  end if;

  if p_conta_bancaria_id is not null and not exists (
    select 1 from public.contas_bancarias where id = p_conta_bancaria_id and escola_id = p_escola_id
  ) then
    raise exception 'A conta bancária escolhida não pertence a esta escola';
  end if;

  select exists (select 1 from public.escolas_integracao_bancaria where escola_id = p_escola_id)
    into v_existe;

  if not v_existe and (coalesce(p_codigo_acesso, '') = '' or coalesce(p_x_api_key, '') = '') then
    raise exception 'Informe o código de acesso e a x-api-key na primeira configuração';
  end if;

  insert into public.escolas_integracao_bancaria (
    escola_id, banco, agencia, conta_corrente, codigo_beneficiario, posto,
    codigo_acesso, x_api_key, chave_pix, ambiente, conta_bancaria_id,
    multa_percentual, juros_mensal_percentual, tipo_cobranca, especie_documento,
    registrar_na_matricula
  ) values (
    p_escola_id, 'sicredi', p_agencia, p_conta_corrente, p_codigo_beneficiario, p_posto,
    coalesce(p_codigo_acesso, ''), coalesce(p_x_api_key, ''), p_chave_pix, p_ambiente,
    p_conta_bancaria_id, p_multa_percentual, p_juros_mensal_percentual, p_tipo_cobranca,
    p_especie_documento, p_registrar_na_matricula
  )
  on conflict (escola_id) do update set
    agencia = excluded.agencia,
    conta_corrente = excluded.conta_corrente,
    codigo_beneficiario = excluded.codigo_beneficiario,
    posto = excluded.posto,
    chave_pix = excluded.chave_pix,
    ambiente = excluded.ambiente,
    codigo_acesso = coalesce(nullif(p_codigo_acesso, ''), escolas_integracao_bancaria.codigo_acesso),
    x_api_key = coalesce(nullif(p_x_api_key, ''), escolas_integracao_bancaria.x_api_key),
    conta_bancaria_id = excluded.conta_bancaria_id,
    multa_percentual = excluded.multa_percentual,
    juros_mensal_percentual = excluded.juros_mensal_percentual,
    tipo_cobranca = excluded.tipo_cobranca,
    especie_documento = excluded.especie_documento,
    registrar_na_matricula = excluded.registrar_na_matricula,
    atualizado_em = now();
end;
$function$;

revoke execute on function public.salvar_integracao_sicredi(
  uuid, text, text, text, text, text, text, text, text, uuid, numeric, numeric, text, text, boolean
) from public, anon;
grant execute on function public.salvar_integracao_sicredi(
  uuid, text, text, text, text, text, text, text, text, uuid, numeric, numeric, text, text, boolean
) to authenticated, service_role;
