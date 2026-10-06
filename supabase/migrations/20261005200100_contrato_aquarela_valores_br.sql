-- Valores no formato brasileiro (10.680,00) no contrato do Aquarela.
CREATE OR REPLACE VIEW public.v_documento_dados_aquarela AS
SELECT d.*,
       (COALESCE(d.taxa_matricula, 0)
         + d.valor_mensalidade_com_desconto * COALESCE(d.numero_parcelas, 12))::numeric(12,2) AS valor_total_contrato,
       fn_valor_por_extenso(COALESCE(d.taxa_matricula, 0)
         + d.valor_mensalidade_com_desconto * COALESCE(d.numero_parcelas, 12)) AS valor_total_contrato_extenso,
       fn_valor_por_extenso(COALESCE(d.taxa_matricula, 0)) AS taxa_matricula_extenso,
       replace(replace(replace(to_char(COALESCE(d.taxa_matricula, 0)
         + d.valor_mensalidade_com_desconto * COALESCE(d.numero_parcelas, 12), 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') AS valor_total_contrato_br,
       replace(replace(replace(to_char(COALESCE(d.taxa_matricula, 0), 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') AS taxa_matricula_br,
       replace(replace(replace(to_char(d.valor_mensalidade_com_desconto, 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') AS valor_parcela_br
FROM public.v_documento_dados d;

UPDATE public.document_templates
SET corpo_html = replace(replace(replace(corpo_html,
  '{{automatico.valor_total_contrato}}', '{{automatico.valor_total_contrato_br}}'),
  '{{automatico.taxa_matricula}}', '{{automatico.taxa_matricula_br}}'),
  '{{automatico.valor_mensalidade_com_desconto}}', '{{automatico.valor_parcela_br}}')
WHERE escola_id = 'cd47ca83-c20d-43b8-867a-a1e7d1883c49' AND codigo = 'contrato_aquarela';

UPDATE public.document_template_campos c
SET chave = CASE c.chave
  WHEN 'automatico.valor_total_contrato' THEN 'automatico.valor_total_contrato_br'
  WHEN 'automatico.taxa_matricula' THEN 'automatico.taxa_matricula_br'
  WHEN 'automatico.valor_mensalidade_com_desconto' THEN 'automatico.valor_parcela_br'
  ELSE c.chave END
FROM public.document_templates t
WHERE t.id = c.template_id AND t.escola_id = 'cd47ca83-c20d-43b8-867a-a1e7d1883c49' AND t.codigo = 'contrato_aquarela'
  AND c.chave IN ('automatico.valor_total_contrato','automatico.taxa_matricula','automatico.valor_mensalidade_com_desconto');
