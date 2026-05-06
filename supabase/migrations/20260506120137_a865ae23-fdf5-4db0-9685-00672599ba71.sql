
CREATE TABLE public.disciplinas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT,
  carga_horaria INTEGER NOT NULL DEFAULT 0,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view disciplinas" ON public.disciplinas FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert disciplinas" ON public.disciplinas FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update disciplinas" ON public.disciplinas FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff delete disciplinas" ON public.disciplinas FOR DELETE TO authenticated USING (is_staff(auth.uid()));

CREATE TRIGGER trg_disciplinas_updated BEFORE UPDATE ON public.disciplinas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.matrizes_curriculares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  serie TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL,
  turno TEXT NOT NULL DEFAULT 'Manhã',
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matrizes_curriculares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view matrizes" ON public.matrizes_curriculares FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert matrizes" ON public.matrizes_curriculares FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update matrizes" ON public.matrizes_curriculares FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff delete matrizes" ON public.matrizes_curriculares FOR DELETE TO authenticated USING (is_staff(auth.uid()));

CREATE TRIGGER trg_matrizes_updated BEFORE UPDATE ON public.matrizes_curriculares
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.matriz_disciplinas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matriz_id UUID NOT NULL REFERENCES public.matrizes_curriculares(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE RESTRICT,
  carga_horaria INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (matriz_id, disciplina_id)
);

ALTER TABLE public.matriz_disciplinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view matriz_disc" ON public.matriz_disciplinas FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert matriz_disc" ON public.matriz_disciplinas FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update matriz_disc" ON public.matriz_disciplinas FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff delete matriz_disc" ON public.matriz_disciplinas FOR DELETE TO authenticated USING (is_staff(auth.uid()));

CREATE INDEX idx_matriz_disc_matriz ON public.matriz_disciplinas(matriz_id);
CREATE INDEX idx_matriz_disc_disciplina ON public.matriz_disciplinas(disciplina_id);
