-- Status "Atrasado" / inadimplencia no modulo financeiro (lote 2)
--
-- O status da tabela financeiro nunca virava "Atrasado": titulos vencidos e nao
-- pagos ficavam como "Pendente". Isso zerava a aba Inadimplentes, o KPI "Em
-- Atraso" e a % de inadimplencia em Financeiro.tsx, e impedia
-- matriculas.status_pagamento de virar "Atrasado" (via trigger
-- on_financeiro_change_sync_status).
--
-- Solucao: rotina diaria (pg_cron) que move financeiro.status entre
-- Pendente <-> Atrasado conforme o vencimento. Nunca toca Pago/Cancelado.

CREATE OR REPLACE FUNCTION public.atualizar_status_financeiro_vencido()
 RETURNS TABLE(marcados_atrasado integer, revertidos_pendente integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_a INT;
  v_r INT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_superadmin_erp(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o cron/superadmin pode rodar essa rotina';
  END IF;

  UPDATE public.financeiro
  SET status = 'Atrasado'
  WHERE status = 'Pendente'
    AND data_pagamento IS NULL
    AND data_vencimento < CURRENT_DATE;
  GET DIAGNOSTICS v_a = ROW_COUNT;

  -- rede de seguranca: titulo remarcado com vencimento futuro volta a Pendente
  UPDATE public.financeiro
  SET status = 'Pendente'
  WHERE status = 'Atrasado'
    AND data_pagamento IS NULL
    AND data_vencimento >= CURRENT_DATE;
  GET DIAGNOSTICS v_r = ROW_COUNT;

  RETURN QUERY SELECT v_a, v_r;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.atualizar_status_financeiro_vencido() FROM anon, authenticated;

-- Agenda diaria (03:05). unschedule antes pra ser idempotente.
select cron.unschedule('atualizar-status-financeiro-vencido')
where exists (select 1 from cron.job where jobname = 'atualizar-status-financeiro-vencido');

select cron.schedule(
  'atualizar-status-financeiro-vencido',
  '5 3 * * *',
  $$select public.atualizar_status_financeiro_vencido()$$
);

-- Backfill dos titulos ja vencidos
select public.atualizar_status_financeiro_vencido();
