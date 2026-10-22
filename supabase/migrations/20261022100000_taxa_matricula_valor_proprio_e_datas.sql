-- Taxa de matrícula com valor próprio e parcelas em datas livres (pedido do Colégio Aquarela, 22/10/2026).
--  * Valor: se o plano da turma (planos_financeiros_turma.taxa_matricula) tem valor > 0, a matrícula cobra esse valor;
--    sem valor no plano, continua cobrando o equivalente a uma mensalidade (comportamento anterior, usado pelas outras escolas).
--    Desconto/bolsa da matrícula valem para a taxa, como já valiam.
--  * Datas: matriculas.datas_taxa_matricula guarda as datas das parcelas da matrícula (ex.: 20/11 e 10/12).
--    Sem lista, as parcelas seguem mensais a partir de data_vencimento_matricula (comportamento anterior).
--  * As mensalidades continuam mensais.

alter table public.matriculas add column if not exists datas_taxa_matricula date[];

alter table public.matriculas drop constraint if exists matriculas_datas_taxa_tamanho;
alter table public.matriculas add constraint matriculas_datas_taxa_tamanho
  check (datas_taxa_matricula is null or coalesce(array_length(datas_taxa_matricula, 1), 0) between 1 and 24);

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
  v_vencimento_taxa DATE;
  v_vencimento_taxa_base DATE;
  v_datas DATE[];
  v_valor_mensalidade NUMERIC;
  v_valor_taxa NUMERIC;
  v_valor_taxa_integral NUMERIC;
  v_valor_taxa_parcela NUMERIC;
  v_taxa_integral_parcela NUMERIC;
  v_dia_vencimento_mensalidade INT;
  v_descricao_taxa TEXT;
  v_descricao_mensalidade TEXT;
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

  -- v_valor_base_mensalidade passa a representar o valor "cheio" (mensalidade + opcionais),
  -- usado como valor_integral. O desconto/bolsa abaixo incide só na parte da mensalidade.
  v_valor_base_mensalidade := v_valor_base_mensalidade + v_valor_opcionais;

  SELECT ano_letivo INTO v_ano_letivo FROM public.turmas WHERE id = v_matricula.turma_id;

  -- Matrícula antecipada (assinada em ano anterior ao ano letivo da turma):
  -- o carnê sempre começa em janeiro do ano letivo, não no mês da assinatura.
  IF extract(year FROM v_matricula.data_ingresso)::int < v_ano_letivo THEN
    v_mes_ingresso := 1;
  ELSE
    v_mes_ingresso := extract(month FROM v_matricula.data_ingresso)::int;
  END IF;

  IF v_matricula.bolsa_100 THEN
    -- Bolsa isenta só a mensalidade - valores opcionais continuam cobrados no valor cheio.
    v_valor_mensalidade := v_valor_opcionais;
  ELSE
    v_valor_mensalidade := round(
      (v_valor_base_mensalidade - v_valor_opcionais) * (1 - COALESCE(v_matricula.percentual_desconto, 0) / 100.0), 2
    ) + v_valor_opcionais;
  END IF;

  IF COALESCE(v_plano.taxa_matricula, 0) > 0 THEN
    -- Taxa de matrícula com valor próprio (plano da turma); desconto/bolsa valem para ela também.
    v_valor_taxa_integral := v_plano.taxa_matricula;
    IF v_matricula.bolsa_100 THEN
      v_valor_taxa := 0;
    ELSE
      v_valor_taxa := round(v_plano.taxa_matricula * (1 - COALESCE(v_matricula.percentual_desconto, 0) / 100.0), 2);
    END IF;
  ELSE
    -- Sem valor no plano: a matrícula equivale a uma mensalidade (comportamento anterior).
    v_valor_taxa := v_valor_mensalidade;
    v_valor_taxa_integral := v_valor_base_mensalidade;
  END IF;

  IF v_valor_taxa > 0 THEN
    v_datas := v_matricula.datas_taxa_matricula;
    IF v_datas IS NOT NULL AND COALESCE(array_length(v_datas, 1), 0) > 0 THEN
      v_n := array_length(v_datas, 1);
    ELSE
      v_datas := NULL;
      v_n := GREATEST(v_matricula.parcelas_taxa_matricula, 1);
    END IF;
    v_vencimento_taxa_base := COALESCE(v_matricula.data_vencimento_matricula, v_matricula.data_ingresso);
    v_valor_taxa_parcela := round(v_valor_taxa / v_n, 2);
    v_taxa_integral_parcela := round(v_valor_taxa_integral / v_n, 2);

    FOR i IN 1..v_n LOOP
      v_descricao_taxa := 'Taxa de Matrícula ' || v_ano_letivo ||
        CASE WHEN v_n > 1 THEN ' ' || i || '/' || v_n ELSE '' END;

      IF v_datas IS NOT NULL THEN
        v_vencimento_taxa := v_datas[i];
      ELSE
        v_vencimento_taxa := (v_vencimento_taxa_base + make_interval(months => i - 1))::date;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.financeiro
        WHERE matricula_id = p_matricula_id AND tipo = 'Taxa Extra'
          AND descricao = v_descricao_taxa AND status NOT IN ('Pendente', 'Atrasado')
      ) THEN
        INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado, faturado_em)
        VALUES (
          v_matricula.id, v_matricula.escola_id, v_descricao_taxa,
          CASE WHEN i = v_n THEN v_valor_taxa - v_valor_taxa_parcela * (v_n - 1) ELSE v_valor_taxa_parcela END,
          CASE WHEN i = v_n THEN v_valor_taxa_integral - v_taxa_integral_parcela * (v_n - 1) ELSE v_taxa_integral_parcela END,
          v_vencimento_taxa,
          'Pendente', 'Taxa Extra', true, now()
        );
      END IF;
    END LOOP;
  END IF;

  v_dia_vencimento_mensalidade := COALESCE(v_matricula.dia_vencimento_mensalidade, v_plano.dia_vencimento);

  FOR i IN 1..v_plano.numero_parcelas LOOP
    v_descricao_mensalidade := 'Mensalidade ' || i || '/' || v_plano.numero_parcelas;

    IF NOT EXISTS (
      SELECT 1 FROM public.financeiro
      WHERE matricula_id = p_matricula_id AND tipo = 'Mensalidade'
        AND descricao = v_descricao_mensalidade AND status NOT IN ('Pendente', 'Atrasado')
    ) THEN
      v_offset := v_mes_ingresso + i - 2;
      v_vencimento := make_date(
        v_ano_letivo + (v_offset / 12),
        (v_offset % 12) + 1,
        LEAST(v_dia_vencimento_mensalidade, 28)
      );
      INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado)
      VALUES (v_matricula.id, v_matricula.escola_id, v_descricao_mensalidade, v_valor_mensalidade,
              v_valor_base_mensalidade, v_vencimento, 'Pendente', 'Mensalidade', false);
    END IF;
  END LOOP;
END;
$function$;
