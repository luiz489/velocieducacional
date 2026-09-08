-- Cursos extracurriculares (esporte / artes) cobrados a parte - Fase 1
--
-- Catalogo de cursos (com periodicidade parametrizavel), horarios, inscricoes
-- de alunos e geracao das cobrancas no financeiro (tipo 'Curso Extra',
-- penduradas na matricula do aluno no ano). Cancelamento com politica
-- "mes cheio": para no fim do mes atual, apaga as parcelas futuras ainda nao
-- faturadas, preserva o que ja foi faturado.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
CREATE TABLE public.cursos_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  ano_letivo INT NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outro',
  sala TEXT,
  vagas INT,
  fornecedor_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  professor_nome TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  intervalo_meses INT NOT NULL DEFAULT 1,   -- 1 mensal, 2 bimestral, 6 semestral, 12 anual
  numero_parcelas INT NOT NULL DEFAULT 12,  -- 1 = valor unico
  dia_vencimento INT NOT NULL DEFAULT 10,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cursos_extra_intervalo_ck CHECK (intervalo_meses BETWEEN 1 AND 24),
  CONSTRAINT cursos_extra_parcelas_ck CHECK (numero_parcelas BETWEEN 1 AND 60),
  CONSTRAINT cursos_extra_dia_ck CHECK (dia_vencimento BETWEEN 1 AND 28)
);

CREATE TABLE public.cursos_extra_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_extra_id UUID NOT NULL REFERENCES public.cursos_extra(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  sala TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cursos_extra_horarios_curso_idx ON public.cursos_extra_horarios(curso_extra_id);

CREATE TABLE public.cursos_extra_inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_extra_id UUID NOT NULL REFERENCES public.cursos_extra(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_cancelamento DATE,
  status TEXT NOT NULL DEFAULT 'Ativa',
  valor_negociado NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cursos_extra_inscricoes_unq UNIQUE (curso_extra_id, aluno_id)
);
CREATE INDEX cursos_extra_inscricoes_curso_idx ON public.cursos_extra_inscricoes(curso_extra_id);

ALTER TABLE public.financeiro
  ADD COLUMN IF NOT EXISTS curso_extra_inscricao_id UUID
  REFERENCES public.cursos_extra_inscricoes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS financeiro_curso_extra_insc_idx ON public.financeiro(curso_extra_inscricao_id);

-- libera o novo tipo de lancamento
ALTER TABLE public.financeiro DROP CONSTRAINT IF EXISTS financeiro_tipo_check;
ALTER TABLE public.financeiro ADD CONSTRAINT financeiro_tipo_check
  CHECK (tipo = ANY (ARRAY['Mensalidade','Taxa Extra','Material','Curso Extra','Outros']));

CREATE TRIGGER cursos_extra_updated_at BEFORE UPDATE ON public.cursos_extra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER cursos_extra_inscricoes_updated_at BEFORE UPDATE ON public.cursos_extra_inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Permissao: modulo + acoes + concede ao Administrador da Escola de cada escola
-- ---------------------------------------------------------------------------
INSERT INTO public.modulos_sistema (codigo, nome, ordem)
VALUES ('cursos_extra', 'Cursos Extracurriculares', 15)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.permissoes (modulo_id, acao)
SELECT m.id, a.acao
FROM public.modulos_sistema m
CROSS JOIN (VALUES ('visualizar'),('criar'),('editar'),('excluir')) AS a(acao)
WHERE m.codigo = 'cursos_extra'
ON CONFLICT DO NOTHING;

INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT pa.id, pe.id
FROM public.papeis pa
JOIN public.permissoes pe ON pe.modulo_id = (SELECT id FROM public.modulos_sistema WHERE codigo = 'cursos_extra')
WHERE pa.nome = 'Administrador da Escola'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.cursos_extra ENABLE ROW LEVEL SECURITY;
CREATE POLICY cursos_extra_select ON public.cursos_extra FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'visualizar'));
CREATE POLICY cursos_extra_insert ON public.cursos_extra FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'criar'));
CREATE POLICY cursos_extra_update ON public.cursos_extra FOR UPDATE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'editar'))
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'editar'));
CREATE POLICY cursos_extra_delete ON public.cursos_extra FOR DELETE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'excluir'));

ALTER TABLE public.cursos_extra_horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY cursos_extra_horarios_select ON public.cursos_extra_horarios FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'visualizar'));
CREATE POLICY cursos_extra_horarios_insert ON public.cursos_extra_horarios FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'editar'));
CREATE POLICY cursos_extra_horarios_delete ON public.cursos_extra_horarios FOR DELETE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'editar'));

ALTER TABLE public.cursos_extra_inscricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY cursos_extra_inscricoes_select ON public.cursos_extra_inscricoes FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'visualizar'));
CREATE POLICY cursos_extra_inscricoes_insert ON public.cursos_extra_inscricoes FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'editar'));
CREATE POLICY cursos_extra_inscricoes_update ON public.cursos_extra_inscricoes FOR UPDATE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'editar'))
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'editar'));
CREATE POLICY cursos_extra_inscricoes_delete ON public.cursos_extra_inscricoes FOR DELETE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'cursos_extra', 'excluir'));

-- ---------------------------------------------------------------------------
-- Geracao das parcelas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerar_parcelas_curso_extra(p_inscricao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_insc public.cursos_extra_inscricoes;
  v_curso public.cursos_extra;
  v_valor NUMERIC(10,2);
  v_base DATE;
  v_venc DATE;
  i INT;
BEGIN
  SELECT * INTO v_insc FROM public.cursos_extra_inscricoes WHERE id = p_inscricao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inscrição não encontrada'; END IF;

  IF NOT public.usuario_tem_permissao(v_insc.escola_id, 'cursos_extra', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para gerar as parcelas deste curso';
  END IF;

  -- dedupe: se ja gerou pra essa inscricao, nao faz nada
  IF EXISTS (SELECT 1 FROM public.financeiro WHERE curso_extra_inscricao_id = p_inscricao_id) THEN
    RETURN;
  END IF;

  SELECT * INTO v_curso FROM public.cursos_extra WHERE id = v_insc.curso_extra_id;
  v_valor := COALESCE(v_insc.valor_negociado, v_curso.valor);
  IF v_valor <= 0 THEN RETURN; END IF;

  v_base := date_trunc('month', v_insc.data_inicio)::date;

  FOR i IN 0..(v_curso.numero_parcelas - 1) LOOP
    v_venc := (v_base + make_interval(months => i * v_curso.intervalo_meses))::date
              + (LEAST(v_curso.dia_vencimento, 28) - 1);
    INSERT INTO public.financeiro (
      matricula_id, escola_id, descricao, valor, data_vencimento, status, tipo,
      faturado, curso_extra_inscricao_id
    )
    VALUES (
      v_insc.matricula_id, v_insc.escola_id,
      v_curso.nome || ' - ' || to_char(v_venc, 'MM/YYYY')
        || CASE WHEN v_curso.numero_parcelas > 1 THEN ' (' || (i + 1) || '/' || v_curso.numero_parcelas || ')' ELSE '' END,
      v_valor, v_venc, 'Pendente', 'Curso Extra',
      false, p_inscricao_id
    );
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_curso_extra_inscricao_gera_financeiro()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.gerar_parcelas_curso_extra(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_curso_extra_inscricao_insert
  AFTER INSERT ON public.cursos_extra_inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_curso_extra_inscricao_gera_financeiro();

-- ---------------------------------------------------------------------------
-- Cancelamento (politica "mes cheio")
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancelar_inscricao_curso_extra(
  p_inscricao_id uuid,
  p_data date DEFAULT CURRENT_DATE
)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escola_id UUID;
  v_qtd INT;
BEGIN
  SELECT escola_id INTO v_escola_id FROM public.cursos_extra_inscricoes WHERE id = p_inscricao_id;
  IF v_escola_id IS NULL THEN RAISE EXCEPTION 'Inscrição não encontrada'; END IF;
  IF NOT public.usuario_tem_permissao(v_escola_id, 'cursos_extra', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para cancelar inscrições deste curso';
  END IF;

  UPDATE public.cursos_extra_inscricoes
  SET status = 'Cancelada', data_cancelamento = p_data
  WHERE id = p_inscricao_id;

  DELETE FROM public.financeiro
  WHERE curso_extra_inscricao_id = p_inscricao_id
    AND faturado = false
    AND data_vencimento >= (date_trunc('month', p_data) + interval '1 month')::date;
  GET DIAGNOSTICS v_qtd = ROW_COUNT;

  RETURN v_qtd;
END;
$function$;
