-- Permite desfazer uma baixa manual feita errada (título confirmado como
-- Pago por engano, ou com dados errados). Guarda o valor de antes da baixa
-- numa coluna (valor_antes_pagamento), porque a regra de pontualidade pode
-- ter alterado o valor (removido o desconto) na hora da confirmação - sem
-- guardar isso, desfazer a baixa devolveria o título com o valor errado.

alter table public.financeiro add column if not exists valor_antes_pagamento numeric;

create or replace function public.confirmar_pagamento_financeiro(
  p_id uuid,
  p_data_pagamento date,
  p_forma_pagamento text default null,
  p_manter_desconto boolean default false
)
returns public.financeiro
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_escola_id uuid;
  v_result public.financeiro;
begin
  select escola_id into v_escola_id from public.financeiro where id = p_id;
  if not found then
    raise exception 'Título não encontrado';
  end if;

  if not public.usuario_tem_permissao(v_escola_id, 'financeiro', 'editar') then
    raise exception 'Sem permissão para dar baixa neste título';
  end if;

  if p_manter_desconto then
    perform set_config('app.manter_desconto_pontualidade', 'true', true);
  end if;

  update public.financeiro f
  set status = 'Pago',
      data_pagamento = p_data_pagamento,
      forma_pagamento = p_forma_pagamento,
      valor_antes_pagamento = f.valor
  where id = p_id
  returning * into v_result;

  return v_result;
end;
$function$;

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
  v_tolerancia int;
  v_novo_status text;
  v_result public.financeiro;
begin
  select escola_id, status, valor_antes_pagamento, data_vencimento
    into v_escola_id, v_status_atual, v_valor_antes, v_data_vencimento
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
