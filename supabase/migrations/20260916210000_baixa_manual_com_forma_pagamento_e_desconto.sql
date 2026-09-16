-- Baixa manual de pagamento hoje só grava status='Pago' + data de hoje, sem
-- forma de pagamento e sem chance de escolher a data real do pagamento. Isso
-- causa o mesmo problema do caso Benjamim/Bento: cliente paga em dinheiro/pix
-- no dia certo, mas a baixa no sistema é feita depois do vencimento - o
-- trigger de pontualidade (trg_financeiro_aplica_regra_pontualidade) então
-- remove o desconto automaticamente, mesmo quando o pagamento real foi
-- pontual.
--
-- Fix: adiciona forma_pagamento; a baixa manual agora informa a data real do
-- pagamento; e uma nova RPC permite decidir explicitamente manter o desconto
-- mesmo com baixa tardia, via uma flag de transação que a trigger respeita
-- (não desabilita a trigger globalmente - evita afetar outras baixas
-- concorrentes).

alter table public.financeiro add column if not exists forma_pagamento text;

alter table public.financeiro
  add constraint financeiro_forma_pagamento_check
  check (forma_pagamento is null or forma_pagamento in ('Boleto','Pix','Dinheiro','Cartão','Transferência','Outro'));

create or replace function public.trg_financeiro_aplica_regra_pontualidade()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if NEW.status = 'Pago' and NEW.data_pagamento is not null
     and NEW.valor_integral is not null and NEW.valor > 0
     and NEW.data_pagamento > NEW.data_vencimento
     and NEW.valor_integral > NEW.valor
     and coalesce(current_setting('app.manter_desconto_pontualidade', true), 'false') <> 'true'
  then
    NEW.valor := NEW.valor_integral;
  end if;
  return NEW;
end;
$function$;

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

  update public.financeiro
  set status = 'Pago',
      data_pagamento = p_data_pagamento,
      forma_pagamento = p_forma_pagamento
  where id = p_id
  returning * into v_result;

  return v_result;
end;
$function$;
