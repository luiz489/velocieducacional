-- Secretaria consegue fazer matricula sem ter o modulo Financeiro
--
-- Dois bloqueios:
-- 1. As tabelas de PRECO (planos/modalidades/opcionais) so liberavam SELECT pra
--    quem tem financeiro:visualizar (ou editar) - entao ao escolher a turma na
--    matricula, os valores nao carregavam pra Secretaria.
-- 2. gerar_parcelas_para_matricula (trigger na criacao da matricula) inseria em
--    financeiro como o usuario que criou a matricula -> RLS de financeiro:criar
--    barrava e a matricula inteira falhava.

-- 1. Ler o catalogo de precos: quem faz matricula pode ver
CREATE POLICY planos_financeiros_turma_select_matricula ON public.planos_financeiros_turma
  FOR SELECT TO authenticated
  USING (
    public.usuario_tem_permissao(escola_id, 'financeiro', 'visualizar')
    OR public.usuario_tem_permissao(escola_id, 'matriculas', 'visualizar')
  );

CREATE POLICY modalidades_financeiras_turma_select_matricula ON public.modalidades_financeiras_turma
  FOR SELECT TO authenticated
  USING (
    public.usuario_tem_permissao(escola_id, 'financeiro', 'visualizar')
    OR public.usuario_tem_permissao(escola_id, 'matriculas', 'visualizar')
  );

CREATE POLICY valores_opcionais_matricula_select_matricula ON public.valores_opcionais_matricula
  FOR SELECT TO authenticated
  USING (
    public.usuario_tem_permissao(escola_id, 'financeiro', 'visualizar')
    OR public.usuario_tem_permissao(escola_id, 'matriculas', 'visualizar')
  );

CREATE POLICY matricula_valores_opcionais_select_matricula ON public.matricula_valores_opcionais
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matriculas m
    WHERE m.id = matricula_valores_opcionais.matricula_id
      AND (
        public.usuario_tem_permissao(m.escola_id, 'financeiro', 'visualizar')
        OR public.usuario_tem_permissao(m.escola_id, 'matriculas', 'visualizar')
      )
  ));

-- 2. Geracao do carne roda como owner (bypass RLS de financeiro), mas so pra
--    quem pode criar matricula ou editar financeiro naquela escola.
CREATE OR REPLACE FUNCTION public.gerar_parcelas_para_matricula(p_matricula_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_matricula public.matriculas;
  v_plano public.planos_financeiros_turma;
  v_valor_base_mensalidade NUMERIC;
  v_valor_opcionais NUMERIC;
  v_ano_letivo INT;
  i INT;
  v_n INT;
  v_mes_ingresso INT;
  v_offset INT;
  v_vencimento DATE;
  v_vencimento_taxa_base DATE;
  v_valor_mensalidade NUMERIC;
  v_valor_taxa NUMERIC;
  v_valor_taxa_integral NUMERIC;
  v_valor_taxa_parcela NUMERIC;
  v_taxa_integral_parcela NUMERIC;
BEGIN
  SELECT * INTO v_matricula FROM public.matriculas WHERE id = p_matricula_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Matrícula não encontrada';
  END IF;

  IF NOT (
    public.usuario_tem_permissao(v_matricula.escola_id, 'matriculas', 'criar')
    OR public.usuario_tem_permissao(v_matricula.escola_id, 'financeiro', 'editar')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para gerar as parcelas desta matrícula';
  END IF;

  SELECT * INTO v_plano FROM public.planos_financeiros_turma WHERE turma_id = v_matricula.turma_id;
  IF NOT FOUND THEN
    RAISE NOTICE 'Turma % sem plano financeiro cadastrado - parcelas não geradas', v_matricula.turma_id;
    RETURN;
  END IF;

  IF v_matricula.modalidade_financeira_id IS NOT NULL THEN
    SELECT valor_mensalidade INTO v_valor_base_mensalidade
    FROM public.modalidades_financeiras_turma WHERE id = v_matricula.modalidade_financeira_id;
  END IF;
  IF v_valor_base_mensalidade IS NULL THEN
    v_valor_base_mensalidade := v_plano.valor_mensalidade;
  END IF;

  SELECT COALESCE(sum(vom.valor), 0) INTO v_valor_opcionais
  FROM public.matricula_valores_opcionais mvo
  JOIN public.valores_opcionais_matricula vom ON vom.id = mvo.valor_opcional_id
  WHERE mvo.matricula_id = p_matricula_id;

  v_valor_base_mensalidade := v_valor_base_mensalidade + v_valor_opcionais;

  SELECT ano_letivo INTO v_ano_letivo FROM public.turmas WHERE id = v_matricula.turma_id;
  v_mes_ingresso := extract(month FROM v_matricula.data_ingresso)::int;

  IF v_matricula.bolsa_100 THEN
    v_valor_mensalidade := 0;
  ELSE
    v_valor_mensalidade := round(v_valor_base_mensalidade * (1 - COALESCE(v_matricula.percentual_desconto, 0) / 100.0), 2);
  END IF;

  v_valor_taxa := v_valor_mensalidade;
  v_valor_taxa_integral := v_valor_base_mensalidade;

  IF v_valor_taxa > 0 THEN
    v_n := GREATEST(v_matricula.parcelas_taxa_matricula, 1);
    v_vencimento_taxa_base := COALESCE(v_matricula.data_vencimento_matricula, v_matricula.data_ingresso);
    v_valor_taxa_parcela := round(v_valor_taxa / v_n, 2);
    v_taxa_integral_parcela := round(v_valor_taxa_integral / v_n, 2);

    FOR i IN 1..v_n LOOP
      INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado, faturado_em)
      VALUES (
        v_matricula.id, v_matricula.escola_id,
        'Taxa de Matrícula ' || v_ano_letivo ||
          CASE WHEN v_n > 1 THEN ' ' || i || '/' || v_n ELSE '' END,
        CASE WHEN i = v_n THEN v_valor_taxa - v_valor_taxa_parcela * (v_n - 1) ELSE v_valor_taxa_parcela END,
        CASE WHEN i = v_n THEN v_valor_taxa_integral - v_taxa_integral_parcela * (v_n - 1) ELSE v_taxa_integral_parcela END,
        (v_vencimento_taxa_base + make_interval(months => i - 1)),
        'Pendente', 'Taxa Extra', true, now()
      );
    END LOOP;
  END IF;

  FOR i IN 1..v_plano.numero_parcelas LOOP
    v_offset := v_mes_ingresso + i - 2;
    v_vencimento := make_date(
      v_ano_letivo + (v_offset / 12),
      (v_offset % 12) + 1,
      LEAST(v_plano.dia_vencimento, 28)
    );
    INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado)
    VALUES (v_matricula.id, v_matricula.escola_id, 'Mensalidade ' || i || '/' || v_plano.numero_parcelas, v_valor_mensalidade,
            v_valor_base_mensalidade, v_vencimento, 'Pendente', 'Mensalidade', false);
  END LOOP;
END;
$function$;
