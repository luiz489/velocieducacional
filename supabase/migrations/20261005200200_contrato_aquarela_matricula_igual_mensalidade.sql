-- O sistema cobra a matrícula com o valor de uma mensalidade (gerar_parcelas_para_matricula),
-- sem usar planos_financeiros_turma.taxa_matricula. O contrato do Aquarela segue a mesma regra,
-- para o valor impresso bater com o financeiro.
CREATE OR REPLACE VIEW public.v_documento_dados_aquarela AS
SELECT d.*,
       (d.valor_mensalidade_com_desconto * (1 + COALESCE(d.numero_parcelas, 12)))::numeric(12,2) AS valor_total_contrato,
       fn_valor_por_extenso(d.valor_mensalidade_com_desconto * (1 + COALESCE(d.numero_parcelas, 12))) AS valor_total_contrato_extenso,
       fn_valor_por_extenso(d.valor_mensalidade_com_desconto) AS taxa_matricula_extenso,
       replace(replace(replace(to_char(d.valor_mensalidade_com_desconto * (1 + COALESCE(d.numero_parcelas, 12)), 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') AS valor_total_contrato_br,
       replace(replace(replace(to_char(d.valor_mensalidade_com_desconto, 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') AS taxa_matricula_br,
       replace(replace(replace(to_char(d.valor_mensalidade_com_desconto, 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') AS valor_parcela_br
FROM public.v_documento_dados d;
