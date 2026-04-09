CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.alunos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  data_nascimento DATE NOT NULL,
  endereco TEXT,
  responsavel_financeiro TEXT NOT NULL,
  telefone_responsavel TEXT,
  email_responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view alunos" ON public.alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert alunos" ON public.alunos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update alunos" ON public.alunos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete alunos" ON public.alunos FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_alunos_updated_at BEFORE UPDATE ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.turmas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('Manhã', 'Tarde', 'Noite', 'Integral')),
  sala TEXT,
  vagas_totais INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view turmas" ON public.turmas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert turmas" ON public.turmas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update turmas" ON public.turmas FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON public.turmas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.matriculas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  data_ingresso DATE NOT NULL DEFAULT CURRENT_DATE,
  status_pagamento TEXT NOT NULL DEFAULT 'Pendente' CHECK (status_pagamento IN ('Pendente', 'Pago', 'Atrasado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, turma_id)
);
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view matriculas" ON public.matriculas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert matriculas" ON public.matriculas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update matriculas" ON public.matriculas FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_matriculas_updated_at BEFORE UPDATE ON public.matriculas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.financeiro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Atrasado')),
  tipo TEXT NOT NULL DEFAULT 'Mensalidade' CHECK (tipo IN ('Mensalidade', 'Taxa Extra', 'Material', 'Outros')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view financeiro" ON public.financeiro FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert financeiro" ON public.financeiro FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update financeiro" ON public.financeiro FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_financeiro_updated_at BEFORE UPDATE ON public.financeiro FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pedagogico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  disciplina TEXT NOT NULL,
  av1 NUMERIC(4,2) CHECK (av1 >= 0 AND av1 <= 10),
  av2 NUMERIC(4,2) CHECK (av2 >= 0 AND av2 <= 10),
  recuperacao NUMERIC(4,2) CHECK (recuperacao >= 0 AND recuperacao <= 10),
  frequencia_percentual NUMERIC(5,2) DEFAULT 100 CHECK (frequencia_percentual >= 0 AND frequencia_percentual <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pedagogico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view pedagogico" ON public.pedagogico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pedagogico" ON public.pedagogico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pedagogico" ON public.pedagogico FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_pedagogico_updated_at BEFORE UPDATE ON public.pedagogico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ocorrencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Observação' CHECK (tipo IN ('Observação', 'Advertência', 'Suspensão', 'Elogio')),
  data_ocorrencia DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view ocorrencias" ON public.ocorrencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ocorrencias" ON public.ocorrencias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ocorrencias" ON public.ocorrencias FOR UPDATE TO authenticated USING (true);