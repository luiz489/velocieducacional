-- Contrato de prestação de serviços do Colégio Aquarela (0301), baseado no modelo
-- que a escola usa hoje (CONTRATO2026). Template exclusivo da escola + view de dados
-- com o valor total do contrato (matrícula + parcelas), que a view padrão não traz.

-- 1) Dados reais da escola (usados no cabeçalho e na qualificação da contratada)
UPDATE public.escolas
SET razao_social = 'Colégio Aquarela Guaíra LTDA ME',
    cnpj = '19.867.346/0001-10',
    endereco = 'Rua 20 entre a Av. 9, nº 901 - Centro',
    cidade = 'Guaíra',
    uf = 'SP',
    cep = '14790-000',
    telefone = '(17) 3331-5435'
WHERE id = 'cd47ca83-c20d-43b8-867a-a1e7d1883c49';

-- 2) View de dados: tudo da v_documento_dados + total do contrato
CREATE OR REPLACE VIEW public.v_documento_dados_aquarela AS
SELECT d.*,
       (COALESCE(d.taxa_matricula, 0)
         + d.valor_mensalidade_com_desconto * COALESCE(d.numero_parcelas, 12))::numeric(12,2) AS valor_total_contrato,
       fn_valor_por_extenso(COALESCE(d.taxa_matricula, 0)
         + d.valor_mensalidade_com_desconto * COALESCE(d.numero_parcelas, 12)) AS valor_total_contrato_extenso,
       fn_valor_por_extenso(COALESCE(d.taxa_matricula, 0)) AS taxa_matricula_extenso
FROM public.v_documento_dados d;

-- 3) Template
DELETE FROM public.document_templates
WHERE escola_id = 'cd47ca83-c20d-43b8-867a-a1e7d1883c49' AND codigo = 'contrato_aquarela';

INSERT INTO public.document_templates (escola_id, categoria_id, codigo, nome, descricao, fonte_dados, orientacao, ativo, corpo_html)
VALUES (
  'cd47ca83-c20d-43b8-867a-a1e7d1883c49',
  '4d33ef26-7e43-4a2c-9797-973aee75512f',
  'contrato_aquarela',
  'Contrato de Prestação de Serviços Educacionais (Aquarela)',
  'Modelo de contrato do Colégio Aquarela Guaíra, com as cláusulas da escola.',
  'v_documento_dados_aquarela',
  'retrato',
  true,
$html$<div style="text-align:center; margin-bottom:8px;">
  <img data-logo-path="{{automatico.escola_logo_url}}" alt="" style="max-height:70px; max-width:200px; object-fit:contain;" onerror="this.style.display='none'" />
</div>
<p style="text-align:center"><strong>COLÉGIO AQUARELA GUAÍRA LTDA ME</strong><br>
CNPJ {{automatico.escola_cnpj}}<br>
{{escola.escola_endereco}} – {{escola.escola_cidade}} {{escola.escola_uf}}<br>
CEP {{automatico.escola_cep}} — Fone {{escola.escola_telefone}}</p>

<p style="text-align:center"><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS - ANO DE {{aluno.ano}}</strong></p>

<p>Aluno(a): <strong>{{aluno.nome}}</strong></p>

<p style="text-align:justify">Pelo presente instrumento, de um lado, o contratante qualificado abaixo, e de outro lado, como contratado o Colégio Aquarela Guaíra LTDA. - ME, CNPJ: {{automatico.escola_cnpj}}, situado na {{escola.escola_endereco}}, {{escola.escola_cidade}} - {{escola.escola_uf}}, CEP {{automatico.escola_cep}}, celebram o presente Contrato de Prestação de Serviços de Ensino, de acordo com o disposto nos arts. 205 e 209 da Constituição Federal e das Leis nº 8.078/90 e nº 9.870/99, mediante as cláusulas e condições abaixo:</p>

<p>
<strong>Contratante:</strong> {{contratante.contratante_nome}}<br>
CPF: {{contratante.contratante_cpf}} &nbsp;&nbsp; RG: {{contratante.contratante_rg}}<br>
Endereço: {{contratante.contratante_endereco}} {{contratante.contratante_bairro}}<br>
Cidade: {{contratante.contratante_cidade}} - {{contratante.contratante_uf}} &nbsp;&nbsp; CEP: {{contratante.contratante_cep}}<br>
Aluno(a): {{aluno.nome}}
</p>

<p style="text-align:justify"><strong>CLÁUSULA 1 -</strong> O objetivo do presente contrato é a prestação de serviços de ensino durante o ano letivo de {{aluno.ano}}, a serem ministrados em conformidade com o previsto na legislação de ensino vigente, de acordo com o planejamento pedagógico elaborado e das normas gerais do Colégio Aquarela Guaíra LTDA - ME.</p>
<p style="text-align:justify">1. O Contratante indica como destinatário dos serviços de ensino do presente contrato o aluno(a) a seguir designado(a): <strong>{{aluno.nome}}</strong>, matriculado(a) em {{aluno.serie}} ({{aluno.ensino_padrao}}), turno {{automatico.turno}}.<br>
2. Os serviços prestados através do Colégio Aquarela Guaíra LTDA - ME atenderão toda a turma, coletivamente. Não estão incluídos os serviços facultativos ou de caráter individual ou de grupo, a serem oferecidos segundo as necessidades pedagógicas e de interesse do contratante, a critério da contratada.<br>
3. É de responsabilidade exclusiva do Contratante comunicar à Contratada alterações de seu endereço e do responsável financeiro pelo aluno acima designado.</p>

<p style="text-align:justify"><strong>CLÁUSULA 2 -</strong> Pelos serviços de ensino referidos na Cláusula 1, o contratante pagará à contratada o valor total de R$ {{automatico.valor_total_contrato}} ({{automatico.valor_total_contrato_extenso}}), correspondente a 1 (uma) matrícula no valor de R$ {{automatico.taxa_matricula}} ({{automatico.taxa_matricula_extenso}}) e {{automatico.numero_parcelas}} parcelas mensais iguais e sucessivas no valor de R$ {{automatico.valor_mensalidade_com_desconto}} ({{automatico.valor_mensalidade_com_desconto_extenso}}).</p>
<p style="text-align:justify">1. As parcelas deverão ser pagas, sucessivamente e mensalmente, todo dia {{automatico.dia_vencimento}} de cada mês, obrigatoriamente em agências bancárias, através de boleto previamente remetido ao Contratante. Caso o Contratante não receba o boleto até 3 (três) dias antes do 1º dia útil do mês de vencimento, é de sua responsabilidade solicitar a 2ª via à secretaria da Escola.<br>
2. Havendo atraso de pagamento de qualquer parcela, o contratante pagará o valor da parcela vencida sem desconto, acrescido de multa de 2% (dois por cento), além da incidência de juros de mora de 1% (um por cento) ao mês.</p>

<p style="text-align:justify"><strong>CLÁUSULA 3 -</strong> O material didático é de responsabilidade do contratante, que realizará a compra do material diretamente no site do Sistema Positivo de Ensino (será enviado um link para efetuar a compra).</p>

<p style="text-align:justify"><strong>CLÁUSULA 4 -</strong> O pedido de cancelamento, transferência ou desistência da matrícula deverá ser formulado por escrito e protocolado na secretaria da Instituição.<br>
1. Fica o contratante obrigado ao pagamento das parcelas vencidas até a data do requerimento e multa de 10% (dez por cento) calculada sobre o saldo devedor total do contrato.<br>
2. O não atendimento dessa formalidade implicará na cobrança das parcelas integrais, até o final do ano letivo vigente.</p>

<p style="text-align:justify"><strong>CLÁUSULA 5 -</strong> Havendo atraso de pagamento superior a 10 (dez) dias, a contratada poderá efetuar a cobrança dos valores devidos pelos meios previstos na legislação comum aplicável.<br>
1. Se o atraso for superior a 15 (quinze) dias, o contratante terá o seu nome enviado para o Serviço de Proteção ao Crédito.<br>
2. O contratante em atraso com o pagamento de mensalidades ou de qualquer outro débito com a Instituição não poderá renovar sua matrícula para o próximo ano, nos termos da legislação vigente.</p>

<p style="text-align:justify"><strong>CLÁUSULA 6 -</strong> No caso de alteração legislativa ou normativa, emanada dos poderes públicos, bem como na hipótese de acentuada variação do índice inflacionário, que implique em comprovada variação dos custos ou receitas da Contratada, os valores das parcelas em aberto das mensalidades poderão ser revistos no período letivo seguinte, de modo a manter o equilíbrio da equação econômico-financeira resultante do presente contrato.</p>

<p style="text-align:justify"><strong>CLÁUSULA 7 -</strong> A contratada se reserva o direito de cancelar este contrato e de não firmá-lo para o ano letivo seguinte, expedindo documento de transferência do aluno, por motivo disciplinar ou de divergência ou conflito com o contratante, atendidos os postulados do contraditório e da ampla defesa.</p>

<p style="text-align:justify"><strong>CLÁUSULA 8 -</strong> As partes elegem o foro da Comarca de {{escola.escola_cidade}}, com renúncia de qualquer outro, por mais privilegiado que seja, para dirimir quaisquer dúvidas inerentes ao presente contrato. E por estarem assim justos e acordados, assinam o presente em 2 (duas) vias, na presença de suas testemunhas abaixo.</p>

<p style="margin-top:30px">{{escola.escola_cidade}}, {{manual.data_extenso}}.</p>

<div style="display:flex; justify-content:space-around; margin-top:60px; text-align:center;">
  <div style="width:40%;">
    <div style="border-bottom:1px solid #000; height:30px;"></div>
    <p style="margin-top:4px;">Contratante<br>{{contratante.contratante_nome}}</p>
  </div>
  <div style="width:40%;">
    <div style="border-bottom:1px solid #000; height:30px;"></div>
    <p style="margin-top:4px;">Colégio Aquarela Guaíra LTDA ME</p>
  </div>
</div>
<div style="display:flex; justify-content:space-around; margin-top:50px; text-align:center;">
  <div style="width:40%;">
    <div style="border-bottom:1px solid #000; height:30px;"></div>
    <p style="margin-top:4px;">1ª Testemunha</p>
  </div>
  <div style="width:40%;">
    <div style="border-bottom:1px solid #000; height:30px;"></div>
    <p style="margin-top:4px;">2ª Testemunha</p>
  </div>
</div>$html$
);

-- 4) Campos (todos automáticos; a data por extenso é preenchida pela função)
INSERT INTO public.document_template_campos (template_id, chave, rotulo, tipo_dado, origem, obrigatorio, ordem, visivel)
SELECT t.id, c.chave, c.rotulo, 'texto', 'automatico', false, c.ordem, true
FROM public.document_templates t,
(VALUES
  (1,  'escola.escola_nome', 'Nome da Escola'),
  (2,  'automatico.escola_cnpj', 'CNPJ da Escola'),
  (3,  'escola.escola_endereco', 'Endereço da Escola'),
  (4,  'escola.escola_cidade', 'Cidade da Escola'),
  (5,  'escola.escola_uf', 'UF da Escola'),
  (6,  'escola.escola_telefone', 'Telefone da Escola'),
  (7,  'automatico.escola_cep', 'CEP da Escola'),
  (8,  'contratante.contratante_nome', 'Nome do Contratante'),
  (9,  'contratante.contratante_cpf', 'CPF do Contratante'),
  (10, 'contratante.contratante_rg', 'RG do Contratante'),
  (11, 'contratante.contratante_endereco', 'Endereço do Contratante'),
  (12, 'contratante.contratante_bairro', 'Bairro do Contratante'),
  (13, 'contratante.contratante_cidade', 'Cidade do Contratante'),
  (14, 'contratante.contratante_uf', 'UF do Contratante'),
  (15, 'contratante.contratante_cep', 'CEP do Contratante'),
  (16, 'aluno.nome', 'Nome do Aluno'),
  (17, 'aluno.ano', 'Ano Letivo'),
  (18, 'aluno.serie', 'Série/Turma'),
  (19, 'aluno.ensino_padrao', 'Ensino (texto padrão)'),
  (20, 'automatico.turno', 'Turno'),
  (21, 'automatico.valor_total_contrato', 'Valor Total do Contrato'),
  (22, 'automatico.valor_total_contrato_extenso', 'Valor Total por Extenso'),
  (23, 'automatico.taxa_matricula', 'Valor da Matrícula'),
  (24, 'automatico.taxa_matricula_extenso', 'Valor da Matrícula por Extenso'),
  (25, 'automatico.numero_parcelas', 'Número de Parcelas'),
  (26, 'automatico.valor_mensalidade_com_desconto', 'Valor da Parcela (com desconto)'),
  (27, 'automatico.valor_mensalidade_com_desconto_extenso', 'Valor da Parcela por Extenso'),
  (28, 'automatico.dia_vencimento', 'Dia de Vencimento'),
  (999,'automatico.escola_logo_url', 'Logo da Escola')
) AS c(ordem, chave, rotulo)
WHERE t.escola_id = 'cd47ca83-c20d-43b8-867a-a1e7d1883c49' AND t.codigo = 'contrato_aquarela';
