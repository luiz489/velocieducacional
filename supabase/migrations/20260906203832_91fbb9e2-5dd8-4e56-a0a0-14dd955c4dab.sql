-- Correcoes de seguranca no modulo financeiro (lote 1)
--
-- 1. Remove as sobrecargas inseguras de geracao de folha de pagamento:
--    as versoes (integer, integer) nao validam permissao nem filtram escola,
--    permitindo que qualquer usuario autenticado gere contas a pagar de folha
--    para todas as escolas do SaaS e leia nome + salario de todos.
--    As versoes com p_escola_id (usadas pelo frontend) permanecem.
--
-- 2. Escopa por escola o UPDATE das funcoes de faturamento/estorno: a permissao
--    era checada apenas em p_ids[1] enquanto o UPDATE atingia todos os ids,
--    permitindo faturar/estornar titulos de outra escola via lista mista.

-- ---------------------------------------------------------------------------
-- Parte 1: remover sobrecargas inseguras
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.gerar_pagamentos_funcionarios(integer, integer);
DROP FUNCTION IF EXISTS public.gerar_pagamentos_professores_pj(integer, integer);

-- ---------------------------------------------------------------------------
-- Parte 2: escopar UPDATE por escola nas funcoes de faturamento
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.faturar_titulos(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_qtd INT;
  v_escola_id UUID;
BEGIN
  SELECT escola_id INTO v_escola_id FROM public.financeiro WHERE id = p_ids[1];
  IF v_escola_id IS NULL THEN RETURN 0; END IF;
  IF NOT public.usuario_tem_permissao(v_escola_id, 'financeiro', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para faturar títulos desta escola';
  END IF;

  UPDATE public.financeiro
  SET faturado = true, faturado_em = now()
  WHERE id = ANY(p_ids) AND faturado = false
    AND escola_id = v_escola_id;
  GET DIAGNOSTICS v_qtd = ROW_COUNT;
  RETURN v_qtd;
END;
$function$;

CREATE OR REPLACE FUNCTION public.faturar_contas_a_pagar(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_qtd INT;
  v_escola_id UUID;
BEGIN
  SELECT escola_id INTO v_escola_id FROM public.contas_a_pagar WHERE id = p_ids[1];
  IF v_escola_id IS NULL THEN RETURN 0; END IF;
  IF NOT public.usuario_tem_permissao(v_escola_id, 'financeiro', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para faturar contas a pagar desta escola';
  END IF;

  UPDATE public.contas_a_pagar
  SET faturado = true, faturado_em = now()
  WHERE id = ANY(p_ids) AND faturado = false
    AND escola_id = v_escola_id;
  GET DIAGNOSTICS v_qtd = ROW_COUNT;
  RETURN v_qtd;
END;
$function$;

CREATE OR REPLACE FUNCTION public.estornar_faturamento_titulos(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_qtd INT;
  v_escola_id UUID;
  v_qtd_pagos INT;
BEGIN
  SELECT escola_id INTO v_escola_id FROM public.financeiro WHERE id = p_ids[1];
  IF v_escola_id IS NULL THEN RETURN 0; END IF;
  IF NOT public.usuario_tem_permissao(v_escola_id, 'financeiro', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para estornar faturamento desta escola';
  END IF;

  SELECT count(*) INTO v_qtd_pagos FROM public.financeiro
  WHERE id = ANY(p_ids) AND escola_id = v_escola_id AND status = 'Pago';
  IF v_qtd_pagos > 0 THEN
    RAISE EXCEPTION 'Não é possível estornar: % título(s) já está(ão) pago(s).', v_qtd_pagos;
  END IF;

  UPDATE public.financeiro
  SET faturado = false, faturado_em = NULL
  WHERE id = ANY(p_ids) AND faturado = true AND status != 'Pago'
    AND escola_id = v_escola_id;
  GET DIAGNOSTICS v_qtd = ROW_COUNT;
  RETURN v_qtd;
END;
$function$;

CREATE OR REPLACE FUNCTION public.estornar_faturamento_conta_a_pagar(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_qtd INT;
  v_escola_id UUID;
  v_qtd_pagos INT;
BEGIN
  SELECT escola_id INTO v_escola_id FROM public.contas_a_pagar WHERE id = p_ids[1];
  IF v_escola_id IS NULL THEN RETURN 0; END IF;
  IF NOT public.usuario_tem_permissao(v_escola_id, 'financeiro', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para estornar faturamento desta escola';
  END IF;

  SELECT count(*) INTO v_qtd_pagos FROM public.contas_a_pagar
  WHERE id = ANY(p_ids) AND escola_id = v_escola_id AND status = 'Pago';
  IF v_qtd_pagos > 0 THEN
    RAISE EXCEPTION 'Não é possível estornar: % conta(s) já está(ão) paga(s).', v_qtd_pagos;
  END IF;

  UPDATE public.contas_a_pagar
  SET faturado = false, faturado_em = NULL
  WHERE id = ANY(p_ids) AND faturado = true AND status != 'Pago'
    AND escola_id = v_escola_id;
  GET DIAGNOSTICS v_qtd = ROW_COUNT;
  RETURN v_qtd;
END;
$function$;
