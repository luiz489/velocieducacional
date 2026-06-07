
-- 1. Parceiros: tipo
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'Outro'
    CHECK (tipo IN ('Fornecedor','Cliente','Outro'));

-- 2. Contas a Pagar: fornecedor_id
ALTER TABLE public.contas_a_pagar
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID
    REFERENCES public.parceiros(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON public.contas_a_pagar(fornecedor_id);

-- 3. Solicitações de Compra: fornecedor_id
ALTER TABLE public.solicitacoes_compra
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID
    REFERENCES public.parceiros(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_solic_compra_fornecedor ON public.solicitacoes_compra(fornecedor_id);

-- 4. Contratos: fornecedor_id
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID
    REFERENCES public.parceiros(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_fornecedor ON public.contratos(fornecedor_id);

-- 5. Ocorrências: professor_id
ALTER TABLE public.ocorrencias
  ADD COLUMN IF NOT EXISTS professor_id UUID
    REFERENCES public.professores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ocorrencias_professor ON public.ocorrencias(professor_id);

-- 6. Pedagógico: disciplina_id
ALTER TABLE public.pedagogico
  ADD COLUMN IF NOT EXISTS disciplina_id UUID
    REFERENCES public.disciplinas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pedagogico_disciplina ON public.pedagogico(disciplina_id);
