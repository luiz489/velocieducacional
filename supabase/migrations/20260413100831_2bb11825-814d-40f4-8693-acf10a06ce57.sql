
-- =============================================
-- 1. Aprovadores (cadastro de alçadas)
-- =============================================
CREATE TABLE public.aprovadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  email TEXT,
  valor_max_aprovacao NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.aprovadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view aprovadores" ON public.aprovadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert aprovadores" ON public.aprovadores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update aprovadores" ON public.aprovadores FOR UPDATE TO authenticated USING (true);

-- =============================================
-- 2. Solicitações de Compra
-- =============================================
CREATE TABLE public.solicitacoes_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_solicitacao SERIAL,
  solicitante TEXT NOT NULL,
  departamento TEXT NOT NULL DEFAULT 'Geral',
  descricao TEXT NOT NULL,
  justificativa TEXT,
  valor_estimado NUMERIC NOT NULL DEFAULT 0,
  urgencia TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'Pendente',
  data_necessidade DATE,
  observacoes TEXT,
  aprovador_id UUID REFERENCES public.aprovadores(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  motivo_rejeicao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitacoes_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view solicitacoes_compra" ON public.solicitacoes_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert solicitacoes_compra" ON public.solicitacoes_compra FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update solicitacoes_compra" ON public.solicitacoes_compra FOR UPDATE TO authenticated USING (true);

-- =============================================
-- 3. Cotações
-- =============================================
CREATE TABLE public.cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_compra(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  prazo_entrega TEXT,
  condicao_pagamento TEXT,
  observacoes TEXT,
  selecionada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cotacoes" ON public.cotacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cotacoes" ON public.cotacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cotacoes" ON public.cotacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cotacoes" ON public.cotacoes FOR DELETE TO authenticated USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_aprovadores_updated_at BEFORE UPDATE ON public.aprovadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_solicitacoes_compra_updated_at BEFORE UPDATE ON public.solicitacoes_compra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cotacoes_updated_at BEFORE UPDATE ON public.cotacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
