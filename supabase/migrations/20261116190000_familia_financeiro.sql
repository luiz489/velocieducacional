-- App da família (Veloci Família): leitura do financeiro do aluno pelo
-- responsável. Mesmo padrão de familia_boletim/familia_frequencia/
-- familia_links_compras: gate via familia_ids_alunos(), nunca via
-- usuario_tem_permissao (isso é pra staff, responsável não é staff).
--
-- financeiro tem RLS "Staff can view financeiro" (is_staff(auth.uid())),
-- mas a função roda SECURITY DEFINER como dono (postgres, com BYPASSRLS),
-- então a única checagem de segurança real é o filtro por
-- familia_ids_alunos() abaixo — igual já validado para boletim/frequência.
--
-- Pix (pix_qr_code) e linha digitável (boleto_linha_digitavel) já vêm
-- estáticos da tabela (gravados quando o boleto é registrado no Sicredi);
-- não precisa chamar edge function nenhuma pra ler. PDF do boleto fica de
-- fora por ora (precisaria de uma ação separada autenticada).

CREATE OR REPLACE FUNCTION public.familia_financeiro(p_aluno_id UUID)
RETURNS TABLE (
  id                     UUID,
  descricao              TEXT,
  tipo                   TEXT,
  valor                  NUMERIC,
  valor_integral         NUMERIC,
  data_vencimento        DATE,
  data_pagamento         DATE,
  status                 TEXT,
  forma_pagamento        TEXT,
  boleto_linha_digitavel TEXT,
  pix_qr_code            TEXT,
  gateway_status         TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.descricao, f.tipo, f.valor, f.valor_integral, f.data_vencimento, f.data_pagamento,
         f.status, f.forma_pagamento, f.boleto_linha_digitavel, f.pix_qr_code, f.gateway_status
    FROM public.financeiro f
    JOIN public.matriculas m ON m.id = f.matricula_id
   WHERE m.aluno_id = p_aluno_id
     AND f.faturado = true
     AND p_aluno_id IN (SELECT aluno_id FROM public.familia_ids_alunos() AS aluno_id)
   ORDER BY f.data_vencimento DESC;
$$;

REVOKE ALL ON FUNCTION public.familia_financeiro(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.familia_financeiro(UUID) TO authenticated;
