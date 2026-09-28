-- Contrato/documentos: o "dia de vencimento" passa a sair do CARNÊ de verdade: dia da
-- data de vencimento da 1ª Mensalidade da matrícula (financeiro). Se a matrícula ainda
-- não tem parcelas, cai no dia negociado da matrícula e depois no dia padrão do plano.
-- Assim o contrato acompanha o que foi cobrado, mesmo se o dia da parcela foi ajustado
-- depois (ex.: 1ª parcela em 10/01/2027 -> "Todo dia 10 de cada mês").
-- Só a coluna dia_vencimento muda (integer -> integer). A view roda como dono (postgres),
-- então a leitura de financeiro não depende do papel de quem gera o contrato.

CREATE OR REPLACE VIEW public.v_documento_dados AS
 SELECT DISTINCT ON (a.id) a.id AS aluno_id,
    a.escola_id,
    a.nome,
    a.nome_pai,
    a.nome_mae,
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
    COALESCE(mft.valor_mensalidade, pft.valor_mensalidade)::numeric(12,2) AS valor_mensalidade,
    pft.numero_parcelas,
    COALESCE(
        (SELECT EXTRACT(day FROM f.data_vencimento)::integer
           FROM financeiro f
          WHERE f.matricula_id = m.id AND f.tipo = 'Mensalidade'
          ORDER BY f.data_vencimento
          LIMIT 1),
        m.dia_vencimento_mensalidade,
        pft.dia_vencimento) AS dia_vencimento,
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
