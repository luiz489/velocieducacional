
CREATE OR REPLACE FUNCTION public.plataforma_overview()
RETURNS SETOF public.v_plataforma_overview
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.v_plataforma_overview WHERE public.is_superadmin_erp(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.plataforma_distribuicao_por_plano()
RETURNS SETOF public.v_distribuicao_por_plano
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.v_distribuicao_por_plano WHERE public.is_superadmin_erp(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.plataforma_clientes_resumo()
RETURNS SETOF public.v_clientes_resumo
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.v_clientes_resumo WHERE public.is_superadmin_erp(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.plataforma_faturas(p_mes integer DEFAULT NULL, p_ano integer DEFAULT NULL, p_status text DEFAULT NULL)
RETURNS TABLE(
  id uuid, escola_id uuid, escola_nome text, competencia_mes integer, competencia_ano integer,
  valor numeric, status text, data_vencimento date, data_pagamento date, criado_em timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.escola_id, e.nome, f.competencia_mes, f.competencia_ano,
         f.valor, f.status, f.data_vencimento, f.data_pagamento, f.criado_em
  FROM public.faturas_saas f
  JOIN public.escolas e ON e.id = f.escola_id
  WHERE public.is_superadmin_erp(auth.uid())
    AND (p_mes IS NULL OR f.competencia_mes = p_mes)
    AND (p_ano IS NULL OR f.competencia_ano = p_ano)
    AND (p_status IS NULL OR f.status = p_status)
  ORDER BY f.competencia_ano DESC, f.competencia_mes DESC, e.nome;
$$;

REVOKE ALL ON FUNCTION public.plataforma_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.plataforma_distribuicao_por_plano() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.plataforma_clientes_resumo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.plataforma_faturas(integer, integer, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.plataforma_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.plataforma_distribuicao_por_plano() TO authenticated;
GRANT EXECUTE ON FUNCTION public.plataforma_clientes_resumo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.plataforma_faturas(integer, integer, text) TO authenticated;

CREATE POLICY escolas_select_superadmin ON public.escolas
  FOR SELECT TO authenticated
  USING (public.is_superadmin_erp(auth.uid()));
