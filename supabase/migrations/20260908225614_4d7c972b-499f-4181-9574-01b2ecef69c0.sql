-- Carteirinha: validade (em meses) parametrizavel por escola. Padrao 12.

ALTER TABLE public.escolas
  ADD COLUMN IF NOT EXISTS carteirinha_validade_meses integer NOT NULL DEFAULT 12
  CHECK (carteirinha_validade_meses BETWEEN 1 AND 120);

COMMENT ON COLUMN public.escolas.carteirinha_validade_meses IS
  'Quantos meses a carteirinha do aluno vale a partir da emissao.';
