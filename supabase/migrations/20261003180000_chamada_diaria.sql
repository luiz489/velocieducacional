-- Chamada diária (frequência por data), substituindo o percentual digitado à mão.
--
-- Duas granularidades no mesmo par de tabelas:
--   * chamada do DIA  -> horario_aula_id IS NULL (Infantil / Fund I, um professor o dia todo)
--   * chamada da AULA -> horario_aula_id preenchido (Fund II, uma chamada por aula da grade)
-- A chamada do dia vale para TODAS as disciplinas da turma; a da aula vale só para a
-- disciplina daquela aula. Quem concilia isso é fn_frequencia_percentual, lá embaixo.

CREATE TABLE IF NOT EXISTS public.chamadas (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escola_id         UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_id          UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  data_aula         DATE NOT NULL,
  -- NULL = chamada do dia inteiro. Preenchido = chamada de uma aula da grade.
  horario_aula_id   UUID REFERENCES public.horarios_aulas(id) ON DELETE SET NULL,
  -- Cópia da disciplina da aula, pra não depender da grade continuar existindo.
  disciplina_id     UUID REFERENCES public.disciplinas(id) ON DELETE SET NULL,
  observacao        TEXT,
  registrado_por    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uma chamada por turma+data quando é do dia inteiro; uma por turma+data+aula quando é por aula.
-- Dois índices parciais porque UNIQUE comum não barra duplicata quando a coluna é NULL.
CREATE UNIQUE INDEX IF NOT EXISTS chamadas_turma_data_dia_uniq
  ON public.chamadas (turma_id, data_aula)
  WHERE horario_aula_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chamadas_turma_data_aula_uniq
  ON public.chamadas (turma_id, data_aula, horario_aula_id)
  WHERE horario_aula_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chamadas_escola_data_idx ON public.chamadas (escola_id, data_aula DESC);

CREATE TABLE IF NOT EXISTS public.chamada_presencas (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamada_id    UUID NOT NULL REFERENCES public.chamadas(id) ON DELETE CASCADE,
  matricula_id  UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  situacao      TEXT NOT NULL DEFAULT 'Presente'
                CHECK (situacao IN ('Presente', 'Falta', 'Falta Justificada')),
  observacao    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chamada_id, matricula_id)
);

CREATE INDEX IF NOT EXISTS chamada_presencas_matricula_idx
  ON public.chamada_presencas (matricula_id);

DROP TRIGGER IF EXISTS update_chamadas_updated_at ON public.chamadas;
CREATE TRIGGER update_chamadas_updated_at
  BEFORE UPDATE ON public.chamadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chamada_presencas_updated_at ON public.chamada_presencas;
CREATE TRIGGER update_chamada_presencas_updated_at
  BEFORE UPDATE ON public.chamada_presencas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------- RLS
-- Mesmo módulo da tela de notas: 'pedagogico'.

ALTER TABLE public.chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamada_presencas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chamadas_select ON public.chamadas;
CREATE POLICY chamadas_select ON public.chamadas
  FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'pedagogico', 'visualizar'));

DROP POLICY IF EXISTS chamadas_insert ON public.chamadas;
CREATE POLICY chamadas_insert ON public.chamadas
  FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'pedagogico', 'criar'));

DROP POLICY IF EXISTS chamadas_update ON public.chamadas;
CREATE POLICY chamadas_update ON public.chamadas
  FOR UPDATE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'pedagogico', 'editar'))
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'pedagogico', 'editar'));

DROP POLICY IF EXISTS chamadas_delete ON public.chamadas;
CREATE POLICY chamadas_delete ON public.chamadas
  FOR DELETE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'pedagogico', 'excluir'));

DROP POLICY IF EXISTS chamada_presencas_select ON public.chamada_presencas;
CREATE POLICY chamada_presencas_select ON public.chamada_presencas
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chamadas c
     WHERE c.id = chamada_presencas.chamada_id
       AND public.usuario_tem_permissao(c.escola_id, 'pedagogico', 'visualizar')));

DROP POLICY IF EXISTS chamada_presencas_insert ON public.chamada_presencas;
CREATE POLICY chamada_presencas_insert ON public.chamada_presencas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chamadas c
     WHERE c.id = chamada_presencas.chamada_id
       AND public.usuario_tem_permissao(c.escola_id, 'pedagogico', 'criar')));

DROP POLICY IF EXISTS chamada_presencas_update ON public.chamada_presencas;
CREATE POLICY chamada_presencas_update ON public.chamada_presencas
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chamadas c
     WHERE c.id = chamada_presencas.chamada_id
       AND public.usuario_tem_permissao(c.escola_id, 'pedagogico', 'editar')))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chamadas c
     WHERE c.id = chamada_presencas.chamada_id
       AND public.usuario_tem_permissao(c.escola_id, 'pedagogico', 'editar')));

DROP POLICY IF EXISTS chamada_presencas_delete ON public.chamada_presencas;
CREATE POLICY chamada_presencas_delete ON public.chamada_presencas
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chamadas c
     WHERE c.id = chamada_presencas.chamada_id
       AND public.usuario_tem_permissao(c.escola_id, 'pedagogico', 'excluir')));

-- ------------------------------------------------- consolidação da frequência
-- Uma linha por aluno x disciplina da chamada. disciplina_id NULL = chamada do dia
-- inteiro, que conta para todas as disciplinas da turma.
-- security_invoker: a view respeita a RLS de quem consulta, não a do dono.

DROP VIEW IF EXISTS public.v_frequencia_chamada;
CREATE VIEW public.v_frequencia_chamada
WITH (security_invoker = true) AS
SELECT
  p.matricula_id,
  c.disciplina_id,
  count(*)::integer                                                     AS aulas,
  count(*) FILTER (WHERE p.situacao = 'Presente')::integer              AS presencas,
  count(*) FILTER (WHERE p.situacao = 'Falta')::integer                 AS faltas,
  count(*) FILTER (WHERE p.situacao = 'Falta Justificada')::integer     AS faltas_justificadas
FROM public.chamada_presencas p
JOIN public.chamadas c ON c.id = p.chamada_id
GROUP BY p.matricula_id, c.disciplina_id;

REVOKE ALL ON public.v_frequencia_chamada FROM PUBLIC, anon;
GRANT SELECT ON public.v_frequencia_chamada TO authenticated;

-- Percentual de presença de um aluno numa disciplina: soma as chamadas daquela
-- disciplina com as chamadas do dia inteiro. Falta justificada NÃO conta como
-- presença (a regra dos 75% do MEC é sobre presença efetiva); ela aparece separada
-- na tela pra escola saber o motivo.
CREATE OR REPLACE FUNCTION public.fn_frequencia_percentual(
  p_matricula_id UUID,
  p_disciplina_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT round(100.0 * sum(f.presencas) / nullif(sum(f.aulas), 0), 1)
    FROM public.v_frequencia_chamada f
   WHERE f.matricula_id = p_matricula_id
     AND (f.disciplina_id IS NULL OR f.disciplina_id = p_disciplina_id);
$$;

-- anon tem GRANT explícito por default privilege do Supabase: revogar de PUBLIC não basta.
REVOKE ALL ON FUNCTION public.fn_frequencia_percentual(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_frequencia_percentual(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------- gravar chamada
-- Um RPC só, pra cabeçalho e presenças entrarem na mesma transação e a permissão
-- ser conferida uma vez. SECURITY DEFINER com guard explícito, como os demais.
CREATE OR REPLACE FUNCTION public.salvar_chamada(
  p_turma_id        UUID,
  p_data            DATE,
  p_presencas       JSONB,
  p_horario_aula_id UUID DEFAULT NULL,
  p_observacao      TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escola_id     UUID;
  v_disciplina_id UUID;
  v_chamada_id    UUID;
BEGIN
  SELECT escola_id INTO v_escola_id FROM public.turmas WHERE id = p_turma_id;
  IF v_escola_id IS NULL THEN
    RAISE EXCEPTION 'Turma não encontrada';
  END IF;

  IF NOT public.usuario_tem_permissao(v_escola_id, 'pedagogico', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para lançar chamada nesta escola';
  END IF;

  IF p_horario_aula_id IS NOT NULL THEN
    SELECT disciplina_id INTO STRICT v_disciplina_id
      FROM public.horarios_aulas
     WHERE id = p_horario_aula_id AND turma_id = p_turma_id;
  END IF;

  SELECT id INTO v_chamada_id
    FROM public.chamadas
   WHERE turma_id = p_turma_id
     AND data_aula = p_data
     AND horario_aula_id IS NOT DISTINCT FROM p_horario_aula_id;

  IF v_chamada_id IS NULL THEN
    INSERT INTO public.chamadas
      (escola_id, turma_id, data_aula, horario_aula_id, disciplina_id, observacao, registrado_por)
    VALUES
      (v_escola_id, p_turma_id, p_data, p_horario_aula_id, v_disciplina_id, p_observacao, auth.uid())
    RETURNING id INTO v_chamada_id;
  ELSE
    UPDATE public.chamadas
       SET observacao = p_observacao,
           disciplina_id = v_disciplina_id,
           updated_at = now()
     WHERE id = v_chamada_id;
  END IF;

  INSERT INTO public.chamada_presencas (chamada_id, matricula_id, situacao, observacao)
  SELECT v_chamada_id,
         (e->>'matricula_id')::uuid,
         COALESCE(NULLIF(e->>'situacao', ''), 'Presente'),
         NULLIF(e->>'observacao', '')
    FROM jsonb_array_elements(COALESCE(p_presencas, '[]'::jsonb)) e
   WHERE EXISTS (
     SELECT 1 FROM public.matriculas m
      WHERE m.id = (e->>'matricula_id')::uuid AND m.turma_id = p_turma_id)
  ON CONFLICT (chamada_id, matricula_id) DO UPDATE
    SET situacao = EXCLUDED.situacao,
        observacao = EXCLUDED.observacao,
        updated_at = now();

  -- Aluno que saiu da turma depois da chamada lançada deixa de contar.
  DELETE FROM public.chamada_presencas cp
   WHERE cp.chamada_id = v_chamada_id
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(COALESCE(p_presencas, '[]'::jsonb)) e
        WHERE (e->>'matricula_id')::uuid = cp.matricula_id);

  RETURN v_chamada_id;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_chamada(UUID, DATE, JSONB, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_chamada(UUID, DATE, JSONB, UUID, TEXT) TO authenticated;
