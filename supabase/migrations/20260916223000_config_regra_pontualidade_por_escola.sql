-- A regra de pontualidade (perder o desconto se pagar depois do vencimento)
-- era fixa direto na trigger, sem nenhuma tela de configuração - a escola não
-- tinha como ligar/desligar nem dar uma tolerância de dias.
--
-- Adiciona 2 colunas em escolas: pontualidade_ativa (liga/desliga a regra) e
-- pontualidade_dias_tolerancia (quantos dias após o vencimento ainda contam
-- como "pontual"). Default mantém o comportamento atual (ativa, 0 dias de
-- tolerância) - não muda nada pra quem não configurar.

alter table public.escolas
  add column if not exists pontualidade_ativa boolean not null default true,
  add column if not exists pontualidade_dias_tolerancia integer not null default 0;

alter table public.escolas
  add constraint escolas_pontualidade_dias_tolerancia_check check (pontualidade_dias_tolerancia >= 0);

create or replace function public.trg_financeiro_aplica_regra_pontualidade()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_ativa boolean;
  v_tolerancia int;
begin
  if NEW.status = 'Pago' and NEW.data_pagamento is not null
     and NEW.valor_integral is not null and NEW.valor > 0
     and NEW.valor_integral > NEW.valor
     and coalesce(current_setting('app.manter_desconto_pontualidade', true), 'false') <> 'true'
  then
    select pontualidade_ativa, pontualidade_dias_tolerancia into v_ativa, v_tolerancia
    from public.escolas where id = NEW.escola_id;

    if coalesce(v_ativa, true) and NEW.data_pagamento > (NEW.data_vencimento + coalesce(v_tolerancia, 0)) then
      NEW.valor := NEW.valor_integral;
    end if;
  end if;
  return NEW;
end;
$function$;
