-- Achado na varredura de regras fixas direto no banco (pedido do usuário):
--
-- 1) BUG: trg_novo_aluno_gera_carteirinha sempre gerava a carteirinha com
--    validade fixa de 1 ano, ignorando a coluna escolas.carteirinha_validade_meses
--    que já existe e já tem tela de configuração (Configurações). Uma escola
--    que configurasse 6 ou 24 meses não via efeito nenhum em carteirinhas novas.
--
-- 2) GAP: atualizar_status_financeiro_vencido() marca "Atrasado" no primeiro
--    dia após o vencimento, sem nenhuma tolerância configurável - mesmo tipo
--    de regra da pontualidade (que já ganhou tolerância), só que pro status
--    em vez do valor.

alter table public.escolas
  add column if not exists atraso_dias_tolerancia integer not null default 0;

alter table public.escolas
  add constraint escolas_atraso_dias_tolerancia_check check (atraso_dias_tolerancia >= 0);

create or replace function public.trg_novo_aluno_gera_carteirinha()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_meses int;
begin
  select carteirinha_validade_meses into v_meses from public.escolas where id = new.escola_id;
  insert into public.carteirinhas (aluno_id, escola_id, codigo, status, validade)
  values (
    new.id, new.escola_id, 'PENDENTE-' || substr(new.id::text, 1, 8), 'Pendente',
    current_date + (coalesce(v_meses, 12) * interval '1 month')
  )
  on conflict (aluno_id) do nothing;
  return new;
end;
$function$;

create or replace function public.atualizar_status_financeiro_vencido()
 returns table(marcados_atrasado integer, revertidos_pendente integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_a int;
  v_r int;
begin
  if auth.uid() is not null and not public.is_superadmin_erp(auth.uid()) then
    raise exception 'Apenas o cron/superadmin pode rodar essa rotina';
  end if;

  update public.financeiro f
  set status = 'Atrasado'
  from public.escolas e
  where f.escola_id = e.id
    and f.status = 'Pendente'
    and f.data_pagamento is null
    and (f.data_vencimento + e.atraso_dias_tolerancia) < current_date;
  get diagnostics v_a = row_count;

  update public.financeiro f
  set status = 'Pendente'
  from public.escolas e
  where f.escola_id = e.id
    and f.status = 'Atrasado'
    and f.data_pagamento is null
    and (f.data_vencimento + e.atraso_dias_tolerancia) >= current_date;
  get diagnostics v_r = row_count;

  return query select v_a, v_r;
end;
$function$;
