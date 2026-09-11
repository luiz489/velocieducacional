-- Bug: contrato gerado não refletia o valor da modalidade financeira da
-- matrícula (ex.: Integral com valor diferente do padrão da turma) -
-- v_documento_dados calculava tudo em cima de planos_financeiros_turma.
-- valor_mensalidade (o valor PADRÃO da turma) e nunca olhava pra
-- modalidades_financeiras_turma.valor_mensalidade (o valor da modalidade
-- escolhida na matrícula), quando existia. Mesmo problema que
-- gerar_parcelas_para_matricula já tratava direito (COALESCE modalidade ->
-- padrão da turma) - só a view do documento tinha ficado pra trás.
--
-- Confirmado com dado real: aluno "luiz Cintra", modalidade INTEGRAL =
-- R$ 1.800, turma padrão = R$ 1.000 - o contrato saía com R$ 1.000.

create or replace view public.v_documento_dados as
SELECT DISTINCT ON (a.id) a.id AS aluno_id,
    a.escola_id,
    a.nome,
    a.nome_pai,
    a.nome_mae,
    a.data_nascimento,
    a.naturalidade_cidade,
    a.naturalidade_uf,
    a.cpf AS aluno_cpf,
    a.ra_censo,
    m.id AS matricula_id,
    m.percentual_desconto,
    m.bolsa_100,
    t.nome AS serie,
    t.ano_letivo AS ano,
    t.turno,
    cat.nome_padrao_documento AS ensino_padrao,
    cat.diretor_nome,
    cat.diretor_cargo,
    e.nome AS escola_nome,
    e.cidade AS escola_cidade,
    e.uf AS escola_uf,
    e.cnpj AS escola_cnpj,
    e.endereco AS escola_endereco,
    e.telefone AS escola_telefone,
    e.cep AS escola_cep,
    e.logo_url AS escola_logo_url,
    c.id AS contratante_id,
    COALESCE(c.nome, a.responsavel_financeiro) AS contratante_nome,
    COALESCE(c.cpf, a.responsavel_cpf) AS contratante_cpf,
    COALESCE(c.rg, a.responsavel_rg) AS contratante_rg,
    COALESCE(c.endereco, a.endereco) AS contratante_endereco,
    COALESCE(c.telefone, a.telefone_responsavel) AS contratante_telefone,
    COALESCE(c.email, a.email_responsavel) AS contratante_email,
    a.responsavel_data_nascimento AS contratante_data_nascimento,
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
    COALESCE(mft.valor_mensalidade, pft.valor_mensalidade)::numeric(12,2) AS valor_mensalidade,
    pft.numero_parcelas,
    pft.dia_vencimento,
    pft.taxa_matricula,
    round(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) * pft.numero_parcelas::numeric, 2) AS valor_anual_sem_desconto,
    fn_valor_por_extenso(round(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) * pft.numero_parcelas::numeric, 2)) AS valor_anual_sem_desconto_extenso,
    fn_valor_por_extenso(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade)) AS valor_mensalidade_extenso,
        CASE
            WHEN m.bolsa_100 THEN 0::numeric
            WHEN m.percentual_desconto IS NOT NULL AND m.percentual_desconto > 0::numeric THEN round(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) * (1::numeric - m.percentual_desconto / 100.0), 2)
            ELSE COALESCE(mft.valor_mensalidade, pft.valor_mensalidade)
        END AS valor_mensalidade_com_desconto,
    fn_valor_por_extenso(
        CASE
            WHEN m.bolsa_100 THEN 0::numeric
            WHEN m.percentual_desconto IS NOT NULL AND m.percentual_desconto > 0::numeric THEN round(COALESCE(mft.valor_mensalidade, pft.valor_mensalidade) * (1::numeric - m.percentual_desconto / 100.0), 2)
            ELSE COALESCE(mft.valor_mensalidade, pft.valor_mensalidade)
        END) AS valor_mensalidade_com_desconto_extenso
   FROM alunos a
     LEFT JOIN matriculas m ON m.aluno_id = a.id
     LEFT JOIN turmas t ON t.id = m.turma_id
     LEFT JOIN categorias cat ON cat.id = t.categoria_id
     LEFT JOIN escolas e ON e.id = a.escola_id
     LEFT JOIN aluno_contratantes ac ON ac.aluno_id = a.id AND ac.principal = true
     LEFT JOIN contratantes c ON c.id = ac.contratante_id
     LEFT JOIN planos_financeiros_turma pft ON pft.turma_id = m.turma_id
     LEFT JOIN modalidades_financeiras_turma mft ON mft.id = m.modalidade_financeira_id
  ORDER BY a.id, m.created_at DESC;
