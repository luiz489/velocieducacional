-- Declaração de Matrícula: cabeçalho com logo e identificação da escola.
--
-- O texto dizia só "nesta instituição de ensino" e os únicos dados da escola eram
-- cidade/UF na linha da data: o documento saía sem dizer QUAL escola o emitiu.
-- Passa a ter o mesmo cabeçalho do Contrato Escolar Padrão.
--
-- Sobre o logo: `escolas.logo_url` é um CAMINHO no bucket privado `escola-logos`,
-- não uma URL. Por isso a tag vai com `data-logo-path` em vez de `src` — é
-- GerarDocumento.tsx que gera a URL assinada e faz a troca antes de exibir
-- (e remove a tag se a escola não tiver logo cadastrado).

UPDATE public.document_templates
   SET corpo_html = $html$<div style="text-align:center; margin-bottom:8px;">
  <img data-logo-path="{{automatico.escola_logo_url}}" alt="" style="max-height:70px; max-width:200px; object-fit:contain;" onerror="this.style.display='none'" />
</div>
<p style="text-align:center"><strong>{{escola.escola_nome}}</strong><br>
<span style="font-size:0.9em">CNPJ nº {{automatico.escola_cnpj}} — {{escola.escola_endereco}}, {{escola.escola_cidade}} - {{escola.escola_uf}} — Telefone: {{escola.escola_telefone}}</span></p>
<p style="text-align:center; margin-top:24px"><strong>DECLARAÇÃO DE MATRÍCULA</strong></p>
<p>RA: {{automatico.ra_censo}}</p>
<p>Declaro, para os devidos fins, que <strong>{{aluno.nome}}</strong>, filho(a) de {{aluno.nome_pai}} e de {{aluno.nome_mae}},
nascido(a) em {{aluno.data_nascimento}}<!--CAMPO:naturalidade-->, natural de {{aluno.naturalidade_cidade}} - {{aluno.naturalidade_uf}}<!--/CAMPO-->,
está regularmente matriculado(a) no {{aluno.serie}} {{aluno.ensino_padrao}}, no ano letivo de {{aluno.ano}}
nesta instituição de ensino.</p>
<p>Por ser esta a expressão da verdade, firmo o presente.</p>
<p style="margin-top:40px">{{escola.escola_cidade}} - {{escola.escola_uf}}, {{manual.data_extenso}}.</p>
<p style="margin-top:60px; text-align:center">_______________________________________<br>{{automatico.diretor_cargo}}</p>$html$
 WHERE id = '78bc0297-6048-44cb-90a1-801f68defeac';

-- Os campos novos precisam existir em document_template_campos, senão não
-- aparecem na listagem de campos do template.
INSERT INTO public.document_template_campos (template_id, chave, rotulo, origem, obrigatorio, ordem)
VALUES
  ('78bc0297-6048-44cb-90a1-801f68defeac', 'escola.escola_nome',           'Nome da Escola',      'automatico', false, 14),
  ('78bc0297-6048-44cb-90a1-801f68defeac', 'automatico.escola_cnpj',       'CNPJ da Escola',      'automatico', false, 15),
  ('78bc0297-6048-44cb-90a1-801f68defeac', 'escola.escola_endereco',       'Endereço da Escola',  'automatico', false, 16),
  ('78bc0297-6048-44cb-90a1-801f68defeac', 'escola.escola_telefone',       'Telefone da Escola',  'automatico', false, 17),
  ('78bc0297-6048-44cb-90a1-801f68defeac', 'automatico.escola_logo_url',   'Logo da Escola',      'automatico', false, 999)
ON CONFLICT (template_id, chave) DO NOTHING;
