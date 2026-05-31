
-- 1) horarios_aulas
CREATE TABLE public.horarios_aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  disciplina TEXT NOT NULL,
  professor TEXT,
  sala TEXT,
  ano_letivo INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_aulas TO authenticated;
GRANT ALL ON public.horarios_aulas TO service_role;
ALTER TABLE public.horarios_aulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view horarios" ON public.horarios_aulas FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert horarios" ON public.horarios_aulas FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update horarios" ON public.horarios_aulas FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff delete horarios" ON public.horarios_aulas FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER trg_horarios_updated BEFORE UPDATE ON public.horarios_aulas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) eventos_calendario
CREATE TABLE public.eventos_calendario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  tipo TEXT NOT NULL DEFAULT 'anual' CHECK (tipo IN ('anual', 'academico')),
  publico_alvo TEXT NOT NULL DEFAULT 'Todos',
  cor TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos_calendario TO authenticated;
GRANT ALL ON public.eventos_calendario TO service_role;
ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view eventos" ON public.eventos_calendario FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert eventos" ON public.eventos_calendario FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update eventos" ON public.eventos_calendario FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff delete eventos" ON public.eventos_calendario FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER trg_eventos_updated BEFORE UPDATE ON public.eventos_calendario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) avisos
CREATE TABLE public.avisos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'secretaria' CHECK (canal IN ('secretaria', 'cobranca', 'coordenacao', 'bullying')),
  prioridade TEXT NOT NULL DEFAULT 'Normal' CHECK (prioridade IN ('Baixa', 'Normal', 'Alta', 'Urgente')),
  autor TEXT,
  anexo_url TEXT,
  destinatario_aluno_id UUID,
  anonimo BOOLEAN NOT NULL DEFAULT false,
  publicado BOOLEAN NOT NULL DEFAULT true,
  publicado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO service_role;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view avisos" ON public.avisos FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert avisos" ON public.avisos FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update avisos" ON public.avisos FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff delete avisos" ON public.avisos FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER trg_avisos_updated BEFORE UPDATE ON public.avisos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) rematriculas
CREATE TABLE public.rematriculas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL,
  ano_letivo_destino INTEGER NOT NULL,
  turma_destino_id UUID,
  status TEXT NOT NULL DEFAULT 'Aberta' CHECK (status IN ('Aberta', 'Em andamento', 'Concluída', 'Cancelada')),
  observacoes TEXT,
  data_abertura DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rematriculas TO authenticated;
GRANT ALL ON public.rematriculas TO service_role;
ALTER TABLE public.rematriculas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view rematriculas" ON public.rematriculas FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert rematriculas" ON public.rematriculas FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update rematriculas" ON public.rematriculas FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff delete rematriculas" ON public.rematriculas FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER trg_rematriculas_updated BEFORE UPDATE ON public.rematriculas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) carteirinhas
CREATE TABLE public.carteirinhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL UNIQUE,
  codigo TEXT NOT NULL UNIQUE,
  validade DATE NOT NULL,
  foto_url TEXT,
  qr_data TEXT,
  status TEXT NOT NULL DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Bloqueada', 'Vencida')),
  emitida_em DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carteirinhas TO authenticated;
GRANT ALL ON public.carteirinhas TO service_role;
ALTER TABLE public.carteirinhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view carteirinhas" ON public.carteirinhas FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert carteirinhas" ON public.carteirinhas FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update carteirinhas" ON public.carteirinhas FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff delete carteirinhas" ON public.carteirinhas FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER trg_carteirinhas_updated BEFORE UPDATE ON public.carteirinhas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
