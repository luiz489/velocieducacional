-- Corrige diferença de centavos no "valor negociado da mensalidade": antes a tela convertia o valor
-- digitado (ex.: 700,00) num percentual de desconto arredondado (2 casas) e esse percentual arredondado
-- é que era salvo e usado para gerar as parcelas — por isso o carnê podia sair em R$ 699,98 em vez de
-- R$ 700,00 (relatado pelo Aquarela em 10/11/2026). Agora o valor exato combinado fica guardado à parte
-- e é usado direto, sem passar por percentual nenhum.

alter table public.matriculas add column if not exists valor_mensalidade_negociado numeric(12,2);
alter table public.matriculas drop constraint if exists matriculas_valor_mensalidade_negociado_nao_negativo;
alter table public.matriculas add constraint matriculas_valor_mensalidade_negociado_nao_negativo
  check (valor_mensalidade_negociado is null or valor_mensalidade_negociado >= 0);

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
    -- Valor combinado exato (sem opcionais); opcionais somam por cima, como no cálculo por percentual.
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
      v_ano_mes := v_ano_letivo + (v_offset / 12);
      v_mes_mes := (v_offset % 12) + 1;
      v_ultimo_dia_mes := extract(day FROM (make_date(v_ano_mes, v_mes_mes, 1) + interval '1 month - 1 day'))::int;
      v_vencimento := make_date(v_ano_mes, v_mes_mes, LEAST(v_dia_vencimento_mensalidade, v_ultimo_dia_mes));
      INSERT INTO public.financeiro (matricula_id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo, faturado)
      VALUES (v_matricula.id, v_matricula.escola_id, v_descricao_mensalidade, v_valor_mensalidade,
              v_valor_base_mensalidade, v_vencimento, 'Pendente', 'Mensalidade', false);
    END IF;
  END LOOP;
END;
$function$;

-- Mesma correção no texto do contrato (v_documento_dados, usada por todas as escolas): o valor exato
-- combinado, quando existir, passa a valer, em vez do percentual arredondado.
CREATE OR REPLACE VIEW public.v_documento_dados AS
 SELECT DISTINCT ON (a.id) a.id AS aluno_id,
    a.escola_id,
    btrim(a.nome) AS nome,
    btrim(a.nome_pai) AS nome_pai,
    btrim(a.nome_mae) AS nome_mae,
    a.telefone_pai,
    a.telefone_mae,
    to_char(a.data_nascimento::timestamp with time zone, 'DD/MM/YYYY'::text) AS data_nascimento,
    a.naturalidade_cidade,
    a.naturalidade_uf,
    a.cpf AS aluno_cpf,
    a.ra_censo,
    m.id AS matricula_id,
    m.percentual_desconto,
    m.bolsa_100,
    btrim(t.nome) AS serie,
    t.ano_letivo AS ano,
    t.turno,
    cat.nome_padrao_documento AS ensino_padrao,
    cat.diretor_nome,
    COALESCE(NULLIF(btrim(cat.diretor_cargo), ''::text), 'Direção'::text) AS diretor_cargo,
    e.nome AS escola_nome,
    e.cidade AS escola_cidade,
    e.uf AS escola_uf,
    e.cnpj AS escola_cnpj,
    e.endereco AS escola_endereco,
    e.telefone AS escola_telefone,
    e.cep AS escola_cep,
    e.logo_url AS escola_logo_url,
    c.id AS contratante_id,
    btrim(COALESCE(c.nome, a.responsavel_financeiro)) AS contratante_nome,
    COALESCE(c.cpf, a.responsavel_cpf) AS contratante_cpf,
    COALESCE(c.rg, a.responsavel_rg) AS contratante_rg,
    COALESCE(c.endereco, a.endereco) AS contratante_endereco,
    COALESCE(c.telefone, a.telefone_responsavel) AS contratante_telefone,
    COALESCE(c.email, a.email_responsavel) AS contratante_email,
    to_char(a.responsavel_data_nascimento::timestamp with time zone, 'DD/MM/YYYY'::text) AS contratante_data_nascimento,
    a.responsavel_estado_civil AS contratante_estado_civil,
    a.responsavel_conjuge AS contratante_conjuge,
    a.responsavel_bairro AS contratante_bairro,
    a.responsavel_cidade AS contratante_cidade,
    a.responsavel_uf AS contratante_uf,
    a.responsavel_cep AS contratante_cep,
    a.responsavel_rg_orgao_emissor AS contratante_rg_orgao,
    a.responsavel_rg_data_emissao AS contratante_rg_data_emissao,
    a.responsavel_naturalidade_cidade AS contratante_naturalidade_cidade,
    a.responsavel_naturalidade_uf AS contratante_naturalidade_uf,
    a.responsavel_nacionalidade AS contratante_nacionalidade,
    a.responsavel_nome_pai AS contratante_nome_pai,
    a.responsavel_nome_mae AS contratante_nome_mae,
    (COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) + COALESCE(opc.valor_opcionais, 0::numeric))::numeric(12,2) AS valor_mensalidade,
    pft.numero_parcelas,
    COALESCE(( SELECT EXTRACT(day FROM f.data_vencimento)::integer AS "extract"
           FROM financeiro f
          WHERE f.matricula_id = m.id AND f.tipo = 'Mensalidade'::text
          ORDER BY f.data_vencimento
         LIMIT 1), m.dia_vencimento_mensalidade, pft.dia_vencimento) AS dia_vencimento,
    pft.taxa_matricula,
    round((COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) + COALESCE(opc.valor_opcionais, 0::numeric)) * pft.numero_parcelas::numeric, 2) AS valor_anual_sem_desconto,
    fn_valor_por_extenso(round((COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) + COALESCE(opc.valor_opcionais, 0::numeric)) * pft.numero_parcelas::numeric, 2)) AS valor_anual_sem_desconto_extenso,
    fn_valor_por_extenso(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) + COALESCE(opc.valor_opcionais, 0::numeric)) AS valor_mensalidade_extenso,
        CASE
            WHEN m.bolsa_100 THEN COALESCE(opc.valor_opcionais, 0::numeric)
            WHEN m.valor_mensalidade_negociado IS NOT NULL THEN m.valor_mensalidade_negociado + COALESCE(opc.valor_opcionais, 0::numeric)
            WHEN m.percentual_desconto IS NOT NULL AND m.percentual_desconto > 0::numeric THEN round(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) * (1::numeric - m.percentual_desconto / 100.0), 2) + COALESCE(opc.valor_opcionais, 0::numeric)
            ELSE COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) + COALESCE(opc.valor_opcionais, 0::numeric)
        END AS valor_mensalidade_com_desconto,
    fn_valor_por_extenso(
        CASE
            WHEN m.bolsa_100 THEN COALESCE(opc.valor_opcionais, 0::numeric)
            WHEN m.valor_mensalidade_negociado IS NOT NULL THEN m.valor_mensalidade_negociado + COALESCE(opc.valor_opcionais, 0::numeric)
            WHEN m.percentual_desconto IS NOT NULL AND m.percentual_desconto > 0::numeric THEN round(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) * (1::numeric - m.percentual_desconto / 100.0), 2) + COALESCE(opc.valor_opcionais, 0::numeric)
            ELSE COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) + COALESCE(opc.valor_opcionais, 0::numeric)
        END) AS valor_mensalidade_com_desconto_extenso,
    COALESCE(opc.valor_opcionais, 0::numeric)::numeric(12,2) AS valor_opcionais,
    fn_valor_por_extenso(COALESCE(opc.valor_opcionais, 0::numeric)) AS valor_opcionais_extenso,
    opc.opcionais_nomes,
        CASE
            WHEN m.bolsa_100 THEN 0::numeric
            WHEN m.valor_mensalidade_negociado IS NOT NULL THEN m.valor_mensalidade_negociado
            WHEN m.percentual_desconto IS NOT NULL AND m.percentual_desconto > 0::numeric THEN round(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) * (1::numeric - m.percentual_desconto / 100.0), 2)
            ELSE COALESCE(mft.valor_mensalidade, pft.valor_mensalidade)
        END::numeric(12,2) AS valor_mensalidade_com_desconto_sem_opcionais,
    fn_valor_por_extenso(
        CASE
            WHEN m.bolsa_100 THEN 0::numeric
            WHEN m.valor_mensalidade_negociado IS NOT NULL THEN m.valor_mensalidade_negociado
            WHEN m.percentual_desconto IS NOT NULL AND m.percentual_desconto > 0::numeric THEN round(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) * (1::numeric - m.percentual_desconto / 100.0), 2)
            ELSE COALESCE(mft.valor_mensalidade, pft.valor_mensalidade)
        END) AS valor_mensalidade_com_desconto_sem_opcionais_extenso,
        CASE
            WHEN NULLIF(btrim(COALESCE(a.naturalidade_cidade, ''::text)), ''::text) IS NULL AND NULLIF(btrim(COALESCE(a.naturalidade_uf, ''::text)), ''::text) IS NULL THEN ''::text
            ELSE ', natural de '::text || concat_ws(' - '::text, NULLIF(btrim(a.naturalidade_cidade), ''::text), NULLIF(btrim(a.naturalidade_uf), ''::text))
        END AS naturalidade_frase,
    btrim(concat_ws(' '::text, btrim(t.nome), NULLIF(btrim(cat.nome_padrao_documento), ''::text))) AS serie_ensino
   FROM alunos a
     LEFT JOIN matriculas m ON m.aluno_id = a.id
     LEFT JOIN turmas t ON t.id = m.turma_id
     LEFT JOIN categorias cat ON cat.id = t.categoria_id
     LEFT JOIN escolas e ON e.id = a.escola_id
     LEFT JOIN aluno_contratantes ac ON ac.aluno_id = a.id AND ac.principal = true
     LEFT JOIN contratantes c ON c.id = ac.contratante_id
     LEFT JOIN planos_financeiros_turma pft ON pft.turma_id = m.turma_id
     LEFT JOIN modalidades_financeiras_turma mft ON mft.id = m.modalidade_financeira_id
     LEFT JOIN LATERAL ( SELECT sum(vom.valor) AS valor_opcionais,
            string_agg(vom.nome, ', '::text ORDER BY vom.nome) AS opcionais_nomes
           FROM matricula_valores_opcionais mvo
             JOIN valores_opcionais_matricula vom ON vom.id = mvo.valor_opcional_id
          WHERE mvo.matricula_id = m.id) opc ON true
  ORDER BY a.id, m.created_at DESC;
