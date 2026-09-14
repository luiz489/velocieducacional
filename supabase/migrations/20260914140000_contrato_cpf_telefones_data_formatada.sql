-- Ajustes pedidos na rotina de contrato:
-- 1. Identificação do responsável financeiro: RG -> CPF.
-- 2. Sempre incluir telefone do pai e da mãe.
-- 3. Data de nascimento (aluno e contratante) no formato dd/mm/AAAA.
--
-- (1) e (2) são no texto dos 2 templates de contrato (document_templates) e
-- exigem os campos novos (telefone_pai/telefone_mae) na fonte de dados.
-- (3) é só na view - já formatada, atinge os dois templates automaticamente
-- em todo lugar que {{aluno.data_nascimento}}/{{contratante.contratante_data_nascimento}}
-- é usado.
--
-- A view precisa ser recriada (não só substituída) porque mudar
-- data_nascimento de `date` pra texto formatado muda o tipo da coluna, e
-- CREATE OR REPLACE VIEW não permite isso. Sem dependentes (conferido antes).

drop view public.v_documento_dados;

create view public.v_documento_dados as
SELECT DISTINCT ON (a.id) a.id AS aluno_id,
    a.escola_id,
    a.nome,
    a.nome_pai,
    a.nome_mae,
    a.telefone_pai,
    a.telefone_mae,
    to_char(a.data_nascimento, 'DD/MM/YYYY') AS data_nascimento,
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
    to_char(a.responsavel_data_nascimento, 'DD/MM/YYYY') AS contratante_data_nascimento,
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

-- Campos novos (telefone do pai/mãe) nos dois templates de contrato, pra
-- ficarem disponíveis como {{aluno.telefone_pai}} / {{aluno.telefone_mae}}.
insert into public.document_template_campos (template_id, chave, rotulo, tipo_dado, origem, visivel, ordem)
select t.id, v.chave, v.rotulo, 'texto', 'automatico', true, v.ordem
from public.document_templates t
cross join (values
  ('aluno.telefone_mae', 'Telefone da Mãe', 26.5),
  ('aluno.telefone_pai', 'Telefone do Pai', 27.5)
) as v(chave, rotulo, ordem)
where t.id in ('419ab7a0-5639-405f-816b-fa8946bfe781', '5a046315-f43a-4569-b08c-00ef7e3c9a8c')
  and not exists (
    select 1 from public.document_template_campos c
    where c.template_id = t.id and c.chave = v.chave
  );

-- Texto do "Contrato Escolar Padrão": RG -> CPF na identificação do
-- responsável, telefone do pai/mãe nos dados do aluno.
update public.document_templates
set corpo_html = replace(
  replace(
    corpo_html,
    '<!--CAMPO:responsavel_documentos-->RG: {{contratante.contratante_rg}} &nbsp; Órgão Emissor: {{contratante.contratante_rg_orgao}} &nbsp; Data de Emissão: {{contratante.contratante_rg_data_emissao}}<br><!--/CAMPO-->
<!--CAMPO:responsavel_naturalidade-->Naturalidade: {{contratante.contratante_naturalidade_cidade}} - {{contratante.contratante_naturalidade_uf}}<br><!--/CAMPO-->
<!--CAMPO:responsavel_documentos-->CPF: {{contratante.contratante_cpf}}<!--/CAMPO--> <!--CAMPO:responsavel_telefone_email--> &nbsp;&nbsp; Telefone: {{contratante.contratante_telefone}}<!--/CAMPO-->',
    '<!--CAMPO:responsavel_documentos-->CPF: {{contratante.contratante_cpf}}<br><!--/CAMPO-->
<!--CAMPO:responsavel_naturalidade-->Naturalidade: {{contratante.contratante_naturalidade_cidade}} - {{contratante.contratante_naturalidade_uf}}<br><!--/CAMPO--> <!--CAMPO:responsavel_telefone_email--> &nbsp;&nbsp; Telefone: {{contratante.contratante_telefone}}<!--/CAMPO-->'
  ),
  'Mãe: {{aluno.nome_mae}} &nbsp;&nbsp; Pai: {{aluno.nome_pai}}',
  'Mãe: {{aluno.nome_mae}} &nbsp; Telefone: {{aluno.telefone_mae}}<br>
Pai: {{aluno.nome_pai}} &nbsp; Telefone: {{aluno.telefone_pai}}'
)
where id = '419ab7a0-5639-405f-816b-fa8946bfe781';

-- Texto do "Contrato Escolar (2ª Versão)": idem. O RG que aparece de novo
-- lá embaixo (bloco da Duplicata/fatura) não é a seção "Identificação do
-- Responsável Financeiro" e fica como está (formato padrão de duplicata,
-- mostra CNPJ/CPF e RG juntos).
update public.document_templates
set corpo_html = replace(
  replace(
    corpo_html,
    '<!--CAMPO:responsavel_documentos--><td style="border:1px solid #999; padding:4px;">RG: {{contratante.contratante_rg}} Órgão: {{contratante.contratante_rg_orgao}} Data Emis.: {{contratante.contratante_rg_data_emissao}}</td><!--/CAMPO-->',
    '<!--CAMPO:responsavel_documentos--><td style="border:1px solid #999; padding:4px;">CPF: {{contratante.contratante_cpf}}</td><!--/CAMPO-->'
  ),
  'Mãe: {{aluno.nome_mae}} Pai: {{aluno.nome_pai}}<br>',
  'Mãe: {{aluno.nome_mae}} Tel: {{aluno.telefone_mae}} &nbsp;&nbsp; Pai: {{aluno.nome_pai}} Tel: {{aluno.telefone_pai}}<br>'
)
where id = '5a046315-f43a-4569-b08c-00ef7e3c9a8c';
