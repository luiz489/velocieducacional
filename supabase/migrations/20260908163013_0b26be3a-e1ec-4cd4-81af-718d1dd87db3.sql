-- Faturamento automatico: fatura o mes corrente (nao o mes seguinte)
--
-- Antes a rotina faturava os titulos com vencimento no MES SEGUINTE. O
-- esperado e: no dia configurado (dia_faturamento_automatico), faturar tudo
-- que vence ate o fim do mes corrente e ainda nao foi faturado - pegando
-- tambem stragglers de meses anteriores. A data de vencimento nao muda (a
-- funcao so mexe em faturado/faturado_em). O que for incluido depois do dia do
-- faturamento fica "nao faturado" ate a proxima rodada (ou faturamento manual).

CREATE OR REPLACE FUNCTION public.processar_faturamento_automatico()
 RETURNS TABLE(escola_nome text, titulos_faturados integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escola RECORD;
  v_qtd INT;
BEGIN
  FOR v_escola IN
    SELECT id, nome FROM public.escolas
    WHERE dia_faturamento_automatico = EXTRACT(DAY FROM CURRENT_DATE)::int
  LOOP
    UPDATE public.financeiro f
    SET faturado = true, faturado_em = now()
    WHERE f.escola_id = v_escola.id
      AND f.faturado = false
      AND f.status IN ('Pendente', 'Atrasado')
      AND f.tipo IN ('Mensalidade', 'Curso Extra')
      AND f.data_vencimento < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date;
    GET DIAGNOSTICS v_qtd = ROW_COUNT;
    IF v_qtd > 0 THEN
      RETURN QUERY SELECT v_escola.nome, v_qtd;
    END IF;
  END LOOP;
END;
$function$;
