-- Divide a mensalidade (e, opcionalmente, a taxa de matrícula) entre dois responsáveis financeiros —
-- caso de pais separados que pagam cada um a sua parte, cada um com seu próprio boleto/e-mail.
-- Caso real: CONRADO MUSSI FRATICELLI (Unidade 2 Doce Mel) — pai único responsável hoje, mãe sem
-- nenhuma cobrança. Pedido em 24/11/2026.
--
-- Nota: boa parte do schema de matriculas/financeiro e a função gerar_parcelas_para_matricula foram
-- editadas direto no banco, fora do histórico de migrations deste repositório. Esta migration parte do
-- corpo REAL e atual da função (obtido via pg_get_functiondef direto no banco), não da versão antiga
-- que porventura exista em migrations anteriores deste repo.

-- ---------------------------------------------------------------------------
-- 1. Configuração da divisão, por matrícula.
-- ---------------------------------------------------------------------------
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS mensalidade_dividida boolean NOT NULL DEFAULT false;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS dividir_taxa_matricula boolean NOT NULL DEFAULT false;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS responsavel2_nome text;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS responsavel2_cpf text;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS responsavel2_telefone text;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS responsavel2_email text;
-- responsavel2_percentual é sempre "o que o responsável 2 paga"; o responsável 1 recebe o resto
-- (total - parte2), nunca guardado em coluna separada, pra nunca dessincronizar.
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS responsavel2_percentual numeric(5,2) NOT NULL DEFAULT 50;

ALTER TABLE public.matriculas DROP CONSTRAINT IF EXISTS matriculas_responsavel2_percentual_valido;
ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_responsavel2_percentual_valido
  CHECK (responsavel2_percentual > 0 AND responsavel2_percentual < 100);

-- ---------------------------------------------------------------------------
-- 2. Snapshot de "quem paga" por parcela. Nomes genéricos (não "primary/secondary"): a mesma coluna
--    serve pra responsável 1 ou 2, dependendo de qual deles é o titular daquela parcela específica.
--    NULL em toda parcela não dividida (comportamento 100% inalterado: quem lê cai no fallback
--    alunos.* de sempre).
-- ---------------------------------------------------------------------------
ALTER TABLE public.financeiro ADD COLUMN IF NOT EXISTS responsavel_nome text;
ALTER TABLE public.financeiro ADD COLUMN IF NOT EXISTS responsavel_cpf text;
ALTER TABLE public.financeiro ADD COLUMN IF NOT EXISTS responsavel_telefone text;
ALTER TABLE public.financeiro ADD COLUMN IF NOT EXISTS responsavel_email text;

-- ---------------------------------------------------------------------------
-- 3. gerar_parcelas_para_matricula: só os dois loops (taxa de matrícula e mensalidade) ganham o
--    comportamento de duas linhas quando a divisão está ligada; o resto da função é idêntico ao
--    corpo real atual.
-- ---------------------------------------------------------------------------
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
  v_ano_mes INT;
  v_mes_mes INT;
  v_ultimo_dia_mes INT;
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
  v_dividir BOOLEAN;
  v_aluno public.alunos;
  v_valor_resp2 NUMERIC;
  v_valor_resp1 NUMERIC;
  v_integral_resp2 NUMERIC;
  v_integral_resp1 NUMERIC;
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

  IF extract(year FROM v_matricula.data_ingresso)::int < v_ano_letivo THEN
    v_mes_ingresso := 1;
  ELSE
    v_mes_ingresso := extract(month FROM v_matricula.data_ingresso)::int;
  END IF;

  IF v_matricula.bolsa_100 THEN
    v_valor_mensalidade := v_valor_opcionais;
  ELSIF v_matricula.valor_mensalidade_negociado IS NOT NULL THEN
    v_valor_mensalidade := v_matricula.valor_mensalidade_negociado + v_valor_opcionais;
  ELSE
    v_valor_mensalidade := round(
      (v_valor_base_mensalidade - v_valor_opcionais) * (1 - COALESCE(v_matricula.percentual_desconto, 0) / 100.0), 2
    ) + v_valor_opcionais;
  END IF;

  IF COALESCE(v_plano.taxa_matricula, 0) > 0 THEN
    v_valor_taxa_integral := v_plano.taxa_matricula;
    IF v_matricula.bolsa_100 THEN
      v_valor_taxa := 0;
    ELSE
      v_valor_taxa := round(v_plano.taxa_matricula * (1 - COALESCE(v_matricula.percentual_desconto, 0) / 100.0), 2);
    END IF;
  ELSE
    v_valor_taxa := v_valor_mensalidade;
    v_valor_taxa_integral := v_valor_base_mensalidade;
  END IF;

  IF v_matricula.valor_taxa_matricula IS NOT NULL THEN
    v_valor_taxa := v_matricula.valor_taxa_matricula;
    v_valor_taxa_integral := GREATEST(v_valor_taxa_integral, v_valor_taxa);
  END IF;

  v_dividir := v_matricula.mensalidade_dividida
    AND v_valor_mensalidade > 0
    AND COALESCE(trim(v_matricula.responsavel2_nome), '') <> '';

  IF v_dividir THEN
    SELECT * INTO v_aluno FROM public.alunos WHERE id = v_matricula.aluno_id;
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

      IF v_dividir AND v_matricula.dividir_taxa_matricula THEN
        v_valor_resp2 := round((CASE WHEN i = v_n THEN v_valor_taxa - v_valor_taxa_parcela * (v_n - 1) ELSE v_valor_taxa_parcela END) * v_matricula.responsavel2_percentual / 100.0, 2);
        v_valor_resp1 := (CASE WHEN i = v_n THEN v_valor_taxa - v_valor_taxa_parcela * (v_n - 1) ELSE v_valor_taxa_parcela END) - v_valor_resp2;
        v_integral_resp2 := round((CASE WHEN i = v_n THEN v_valor_taxa_integral - v_taxa_integral_parcela * (v_n - 1) ELSE v_taxa_integral_parcela END) * v_matricula.responsavel2_percentual / 100.0, 2);
        v_integral_resp1 := (CASE WHEN i = v_n THEN v_valor_taxa_integral - v_taxa_integral_parcela * (v_n - 1) ELSE v_taxa_integral_parcela END) - v_integral_resp2;

        IF NOT EXISTS (
          SELECT 1 FROM public.financeiro
          WHERE matricula_id = p_matricula_id AND tipo = 'Taxa Extra'
            AND descricao = v_descricao_taxa || ' - Responsável 1' AND status NOT IN ('Pendente', 'Atrasado')
        ) THEN
          INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado, faturado_em,
            responsavel_nome, responsavel_cpf, responsavel_telefone, responsavel_email)
          VALUES (v_matricula.id, v_matricula.escola_id, v_descricao_taxa || ' - Responsável 1', v_valor_resp1, v_integral_resp1,
            v_vencimento_taxa, 'Pendente', 'Taxa Extra', true, now(),
            v_aluno.responsavel_financeiro, v_aluno.responsavel_cpf, v_aluno.telefone_responsavel, v_aluno.email_responsavel);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM public.financeiro
          WHERE matricula_id = p_matricula_id AND tipo = 'Taxa Extra'
            AND descricao = v_descricao_taxa || ' - Responsável 2' AND status NOT IN ('Pendente', 'Atrasado')
        ) THEN
          INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado, faturado_em,
            responsavel_nome, responsavel_cpf, responsavel_telefone, responsavel_email)
          VALUES (v_matricula.id, v_matricula.escola_id, v_descricao_taxa || ' - Responsável 2', v_valor_resp2, v_integral_resp2,
            v_vencimento_taxa, 'Pendente', 'Taxa Extra', true, now(),
            v_matricula.responsavel2_nome, v_matricula.responsavel2_cpf, v_matricula.responsavel2_telefone, v_matricula.responsavel2_email);
        END IF;
      ELSE
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
      END IF;
    END LOOP;
  END IF;

  v_dia_vencimento_mensalidade := COALESCE(v_matricula.dia_vencimento_mensalidade, v_plano.dia_vencimento);

  FOR i IN 1..v_plano.numero_parcelas LOOP
    v_offset := v_mes_ingresso + i - 2;
    v_ano_mes := v_ano_letivo + (v_offset / 12);
    v_mes_mes := (v_offset % 12) + 1;
    v_ultimo_dia_mes := extract(day FROM (make_date(v_ano_mes, v_mes_mes, 1) + interval '1 month - 1 day'))::int;
    v_vencimento := make_date(v_ano_mes, v_mes_mes, LEAST(v_dia_vencimento_mensalidade, v_ultimo_dia_mes));

    IF v_dividir THEN
      v_valor_resp2 := round(v_valor_mensalidade * v_matricula.responsavel2_percentual / 100.0, 2);
      v_valor_resp1 := v_valor_mensalidade - v_valor_resp2;
      v_integral_resp2 := round(v_valor_base_mensalidade * v_matricula.responsavel2_percentual / 100.0, 2);
      v_integral_resp1 := v_valor_base_mensalidade - v_integral_resp2;

      v_descricao_mensalidade := 'Mensalidade ' || i || '/' || v_plano.numero_parcelas || ' - Responsável 1';
      IF NOT EXISTS (
        SELECT 1 FROM public.financeiro
        WHERE matricula_id = p_matricula_id AND tipo = 'Mensalidade' AND descricao = v_descricao_mensalidade AND status NOT IN ('Pendente', 'Atrasado')
      ) THEN
        INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado,
          responsavel_nome, responsavel_cpf, responsavel_telefone, responsavel_email)
        VALUES (v_matricula.id, v_matricula.escola_id, v_descricao_mensalidade, v_valor_resp1, v_integral_resp1, v_vencimento, 'Pendente', 'Mensalidade', false,
          v_aluno.responsavel_financeiro, v_aluno.responsavel_cpf, v_aluno.telefone_responsavel, v_aluno.email_responsavel);
      END IF;

      v_descricao_mensalidade := 'Mensalidade ' || i || '/' || v_plano.numero_parcelas || ' - Responsável 2';
      IF NOT EXISTS (
        SELECT 1 FROM public.financeiro
        WHERE matricula_id = p_matricula_id AND tipo = 'Mensalidade' AND descricao = v_descricao_mensalidade AND status NOT IN ('Pendente', 'Atrasado')
      ) THEN
        INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado,
          responsavel_nome, responsavel_cpf, responsavel_telefone, responsavel_email)
        VALUES (v_matricula.id, v_matricula.escola_id, v_descricao_mensalidade, v_valor_resp2, v_integral_resp2, v_vencimento, 'Pendente', 'Mensalidade', false,
          v_matricula.responsavel2_nome, v_matricula.responsavel2_cpf, v_matricula.responsavel2_telefone, v_matricula.responsavel2_email);
      END IF;
    ELSE
      v_descricao_mensalidade := 'Mensalidade ' || i || '/' || v_plano.numero_parcelas;
      IF NOT EXISTS (
        SELECT 1 FROM public.financeiro
        WHERE matricula_id = p_matricula_id AND tipo = 'Mensalidade' AND descricao = v_descricao_mensalidade AND status NOT IN ('Pendente', 'Atrasado')
      ) THEN
        INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado)
        VALUES (v_matricula.id, v_matricula.escola_id, v_descricao_mensalidade, v_valor_mensalidade,
                v_valor_base_mensalidade, v_vencimento, 'Pendente', 'Mensalidade', false);
      END IF;
    END IF;
  END LOOP;
END;
$function$;
