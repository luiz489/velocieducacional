
CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor_mensal NUMERIC NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  data_inicio DATE NOT NULL,
  data_fim DATE,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contratos"
ON public.contratos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contratos"
ON public.contratos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contratos"
ON public.contratos FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_contratos_updated_at
BEFORE UPDATE ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
