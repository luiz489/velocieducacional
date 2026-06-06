
CREATE TABLE public.professores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  formacao TEXT,
  disciplinas TEXT[] NOT NULL DEFAULT '{}',
  data_admissao DATE,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professores TO authenticated;
GRANT ALL ON public.professores TO service_role;

ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff pode ver professores" ON public.professores
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff pode inserir professores" ON public.professores
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff pode atualizar professores" ON public.professores
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff pode remover professores" ON public.professores
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_professores_updated_at
  BEFORE UPDATE ON public.professores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.horarios_aulas
  ADD COLUMN professor_id UUID REFERENCES public.professores(id) ON DELETE SET NULL;

CREATE INDEX idx_horarios_aulas_professor_id ON public.horarios_aulas(professor_id);
