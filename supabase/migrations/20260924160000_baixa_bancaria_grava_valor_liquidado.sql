-- A baixa por webhook passa a gravar em financeiro.valor o que o banco liquidou
-- (ex.: pago depois do vencimento = valor cheio + multa/juros). O valor anterior
-- fica em valor_antes_pagamento, como já acontece na confirmação manual.
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
      valor_antes_pagamento = valor,
      valor = case when coalesce(p_valor_pago, 0) > 0 then p_valor_pago else valor end
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
