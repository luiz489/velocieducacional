-- Hoje o dia de vencimento das mensalidades vem sempre do plano financeiro
-- da turma (planos_financeiros_turma.dia_vencimento), sem exceção por
-- aluno. Quando um responsável negocia um dia diferente do padrão da
-- turma, não havia como registrar isso - só editando manualmente cada
-- parcela gerada, uma por uma.
--
-- Adiciona matriculas.dia_vencimento_mensalidade (opcional): quando
-- preenchido, sobrescreve o dia do plano só pra essa matrícula. Não afeta
-- a Taxa de Matrícula (que já tem seu próprio campo,
-- data_vencimento_matricula).

alter table public.matriculas
  add column if not exists dia_vencimento_mensalidade integer;

alter table public.matriculas
  add constraint matriculas_dia_vencimento_mensalidade_check
  check (dia_vencimento_mensalidade is null or dia_vencimento_mensalidade between 1 and 28);

create or replace function public.gerar_parcelas_para_matricula(p_matricula_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  v_dia_vencimento_mensalidade INT;
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

  -- Matrícula antecipada (assinada em ano anterior ao ano letivo da turma):
  -- o carnê sempre começa em janeiro do ano letivo, não no mês da assinatura.
  IF extract(year FROM v_matricula.data_ingresso)::int < v_ano_letivo THEN
    v_mes_ingresso := 1;
  ELSE
    v_mes_ingresso := extract(month FROM v_matricula.data_ingresso)::int;
  END IF;

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

  v_dia_vencimento_mensalidade := COALESCE(v_matricula.dia_vencimento_mensalidade, v_plano.dia_vencimento);

  FOR i IN 1..v_plano.numero_parcelas LOOP
    v_offset := v_mes_ingresso + i - 2;
    v_vencimento := make_date(
      v_ano_letivo + (v_offset / 12),
      (v_offset % 12) + 1,
      LEAST(v_dia_vencimento_mensalidade, 28)
    );
    INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado)
    VALUES (v_matricula.id, v_matricula.escola_id, 'Mensalidade ' || i || '/' || v_plano.numero_parcelas, v_valor_mensalidade,
            v_valor_base_mensalidade, v_vencimento, 'Pendente', 'Mensalidade', false);
  END LOOP;
END;
$function$;
