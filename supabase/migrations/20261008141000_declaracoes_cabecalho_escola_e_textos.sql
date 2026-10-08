-- Declarações e protocolo: cabeçalho da escola e uso dos campos prontos.
--
-- Nenhuma das 7 declarações restantes identificava a escola (sem logo, sem nome).
-- A de Imposto de Renda e a de Transferência vão para terceiros (Receita e outra
-- escola) — sem identificação da emitente não servem como documento.
--
-- Quatro delas (Conclusão, Quitação, Quitação Parcial, Transferência) tinham
-- "Diretora" / "Diretora Escolar" CRAVADO no HTML em vez de
-- {{automatico.diretor_cargo}}: num SaaS multiescola isso assume o gênero de quem
-- assina e ignora o cargo configurado na categoria.
--
-- As edições são cirúrgicas (prepend + replace/regexp) em vez de reescrever os
-- corpos: preserva qualquer ajuste que a escola tenha feito no editor.
-- Sobre o logo: `escolas.logo_url` é um CAMINHO no bucket privado `escola-logos`,
-- não uma URL. Por isso a tag vai com `data-logo-path`, e é GerarDocumento.tsx que
-- gera a URL assinada e faz a troca (removendo a tag se não houver logo).

DO $do$
DECLARE
  v_cabecalho TEXT := $hdr$<div style="text-align:center; margin-bottom:8px;">
  <img data-logo-path="{{automatico.escola_logo_url}}" alt="" style="max-height:70px; max-width:200px; object-fit:contain;" onerror="this.style.display='none'" />
</div>
<p style="text-align:center"><strong>{{escola.escola_nome}}</strong><br>
<span style="font-size:0.9em">CNPJ nº {{automatico.escola_cnpj}} — {{escola.escola_endereco}}, {{escola.escola_cidade}} - {{escola.escola_uf}} — Telefone: {{escola.escola_telefone}}</span></p>
$hdr$;
  v_ids UUID[] := ARRAY[
    'ef88d6e3-a04c-4108-acc1-e56f1180a8c1',  -- Declaração de Conclusão
    'd9b22c1f-eba9-4888-bed4-f2ec0fc8ebf0',  -- Declaração de Escolaridade
    '2b41a05c-8144-4da2-8410-7f01cfdddcde',  -- Declaração de Quitação
    'c49ea362-f74b-45d4-9e1a-1a7d11ed4642',  -- Declaração de Quitação Parcial
    '61ad20c8-ffa5-487c-bdea-78874a37cff6',  -- Declaração de Transferência
    '9b5d7729-c5cc-403e-94ed-cc826cd3fc7d',  -- Declaração para Imposto de Renda
    '6ec87d38-c12f-4fed-b6c3-cbe68ccfffe9'   -- Protocolo de Entrega de Documentos
  ]::uuid[];
BEGIN
  UPDATE public.document_templates
     SET corpo_html = v_cabecalho || corpo_html
   WHERE id = ANY(v_ids)
     AND corpo_html NOT LIKE '%data-logo-path%';

  -- Naturalidade crua -> frase pronta. Dois formatos: o do protocolo
  -- ("na cidade de X, estado de Y") e o das declarações (", natural de X - Y").
  UPDATE public.document_templates
     SET corpo_html = regexp_replace(
           regexp_replace(
             corpo_html,
             '\s*na cidade de\s*\{\{aluno\.naturalidade_cidade\}\},\s*estado de\s*\{\{aluno\.naturalidade_uf\}\}',
             '{{automatico.naturalidade_frase}}', 'g'),
           ',\s*natural d[eo](\(e\))?\s*\{\{aluno\.naturalidade_cidade\}\}(\s*-\s*\{\{aluno\.naturalidade_uf\}\})?',
           '{{automatico.naturalidade_frase}}', 'g')
   WHERE id = ANY(v_ids);

  UPDATE public.document_templates
     SET corpo_html = replace(corpo_html,
           '{{aluno.serie}} {{aluno.ensino_padrao}}', '{{automatico.serie_ensino}}')
   WHERE id = ANY(v_ids);

  UPDATE public.document_templates
     SET corpo_html = replace(
           replace(corpo_html, '<br>Diretora Escolar</p>', '<br>{{automatico.diretor_cargo}}</p>'),
           '<br>Diretora</p>', '<br>{{automatico.diretor_cargo}}</p>')
   WHERE id = ANY(v_ids);
END
$do$;

-- gerar_documento() só troca {{chave}} que exista em document_template_campos:
-- campo não registrado sai como "{{...}}" literal no papel.
INSERT INTO public.document_template_campos (template_id, chave, rotulo, origem, obrigatorio, ordem)
SELECT t.id, v.chave, v.rotulo, 'automatico', false, v.ordem
  FROM (VALUES
    ('escola.escola_nome',             'Nome da Escola',              900),
    ('automatico.escola_cnpj',         'CNPJ da Escola',              901),
    ('escola.escola_endereco',         'Endereço da Escola',          902),
    ('escola.escola_cidade',           'Cidade da Escola',            903),
    ('escola.escola_uf',               'UF da Escola',                904),
    ('escola.escola_telefone',         'Telefone da Escola',          905),
    ('automatico.naturalidade_frase',  'Naturalidade (frase pronta)', 906),
    ('automatico.serie_ensino',        'Série + Ensino',              907),
    ('automatico.diretor_cargo',       'Cargo de quem assina',        908),
    ('automatico.escola_logo_url',     'Logo da Escola',              999)
  ) AS v(chave, rotulo, ordem)
 CROSS JOIN (VALUES
    ('78bc0297-6048-44cb-90a1-801f68defeac'::uuid),
    ('ef88d6e3-a04c-4108-acc1-e56f1180a8c1'::uuid),
    ('d9b22c1f-eba9-4888-bed4-f2ec0fc8ebf0'::uuid),
    ('2b41a05c-8144-4da2-8410-7f01cfdddcde'::uuid),
    ('c49ea362-f74b-45d4-9e1a-1a7d11ed4642'::uuid),
    ('61ad20c8-ffa5-487c-bdea-78874a37cff6'::uuid),
    ('9b5d7729-c5cc-403e-94ed-cc826cd3fc7d'::uuid),
    ('6ec87d38-c12f-4fed-b6c3-cbe68ccfffe9'::uuid)
  ) AS t(id)
ON CONFLICT (template_id, chave) DO NOTHING;
