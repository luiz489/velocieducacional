-- Contrato do Aquarela: a matrícula usa o valor próprio do plano da turma (se houver) e mostra as datas das parcelas
-- da matrícula, lidas do financeiro da própria matrícula (ex.: "em 2 parcelas, com vencimentos em 20/11/2026 e 10/12/2026").

-- A view base ganhou colunas desde a criação desta (d.* mudou de posição): recria em vez de CREATE OR REPLACE.
DROP VIEW IF EXISTS public.v_documento_dados_aquarela;
CREATE VIEW public.v_documento_dados_aquarela AS
SELECT d.*,
       (tx.valor + d.valor_mensalidade_com_desconto * COALESCE(d.numero_parcelas, 12))::numeric(12,2) AS valor_total_contrato,
       fn_valor_por_extenso(tx.valor + d.valor_mensalidade_com_desconto * COALESCE(d.numero_parcelas, 12)) AS valor_total_contrato_extenso,
       fn_valor_por_extenso(tx.valor) AS taxa_matricula_extenso,
       replace(replace(replace(to_char(tx.valor + d.valor_mensalidade_com_desconto * COALESCE(d.numero_parcelas, 12), 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') AS valor_total_contrato_br,
       replace(replace(replace(to_char(tx.valor, 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') AS taxa_matricula_br,
       replace(replace(replace(to_char(d.valor_mensalidade_com_desconto, 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') AS valor_parcela_br,
       CASE
         WHEN pt.n = 1 THEN ', com vencimento em ' || pt.datas || ','
         WHEN pt.n > 1 THEN ', pagável em ' || pt.n || ' parcelas iguais, com vencimentos em '
                            || regexp_replace(pt.datas, ', ([^,]*)$', ' e \1') || ','
         ELSE ''
       END AS taxa_matricula_condicao
FROM public.v_documento_dados d
CROSS JOIN LATERAL (
  SELECT CASE
           WHEN COALESCE(d.taxa_matricula, 0) > 0 THEN
             CASE WHEN d.bolsa_100 THEN 0
                  ELSE round(d.taxa_matricula * (1 - COALESCE(d.percentual_desconto, 0) / 100.0), 2) END
           ELSE d.valor_mensalidade_com_desconto
         END AS valor
) tx
LEFT JOIN LATERAL (
  SELECT count(*) AS n, string_agg(to_char(f.data_vencimento, 'DD/MM/YYYY'), ', ' ORDER BY f.data_vencimento) AS datas
  FROM public.financeiro f
  WHERE f.matricula_id = d.matricula_id AND f.tipo = 'Taxa Extra'
) pt ON true;

UPDATE public.document_templates
SET corpo_html = replace(corpo_html,
  '({{automatico.taxa_matricula_extenso}}) e {{automatico.numero_parcelas}}',
  '({{automatico.taxa_matricula_extenso}}){{automatico.taxa_matricula_condicao}} e {{automatico.numero_parcelas}}')
WHERE escola_id = 'cd47ca83-c20d-43b8-867a-a1e7d1883c49' AND codigo = 'contrato_aquarela'
  AND corpo_html NOT LIKE '%taxa_matricula_condicao%';

INSERT INTO public.document_template_campos (template_id, chave, rotulo, tipo_dado, origem, obrigatorio, ordem, visivel)
SELECT t.id, 'automatico.taxa_matricula_condicao', 'Condição de pagamento da matrícula', 'texto', 'automatico', false, 29, true
FROM public.document_templates t
WHERE t.escola_id = 'cd47ca83-c20d-43b8-867a-a1e7d1883c49' AND t.codigo = 'contrato_aquarela'
  AND NOT EXISTS (SELECT 1 FROM public.document_template_campos c WHERE c.template_id = t.id AND c.chave = 'automatico.taxa_matricula_condicao');
