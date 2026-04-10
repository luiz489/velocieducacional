
CREATE TABLE public.contas_a_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contas_a_pagar"
ON public.contas_a_pagar FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contas_a_pagar"
ON public.contas_a_pagar FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contas_a_pagar"
ON public.contas_a_pagar FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_contas_a_pagar_updated_at
BEFORE UPDATE ON public.contas_a_pagar
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
