-- App do professor (Veloci Família): Notas e Tarefas conectadas aos dados reais.
-- Mesmo padrão já usado em professor_chamada_dia / salvar_chamada: gate por
-- professor_minhas_turmas() (só turma onde o professor é regente) + checagem
-- explícita de usuario_tem_permissao('pedagogico','editar'), RPC único por
-- escrita pra entrar tudo numa transação com um check de permissão só.

-- ---------------------------------------------------------------- disciplinas
-- Não existe turma_disciplinas no sistema: disciplina é por escola, não por
-- turma (mesmo critério que a tela admin de notas usa). Serve pra montar o
-- seletor de disciplina tanto em Notas quanto em Tarefas.
CREATE OR REPLACE FUNCTION public.professor_disciplinas_turma(p_turma_id UUID)
RETURNS TABLE (disciplina_id UUID, nome TEXT, tipo_avaliacao TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.nome, d.tipo_avaliacao
    FROM public.disciplinas d
    JOIN public.turmas t ON t.escola_id = d.escola_id
   WHERE t.id = p_turma_id
     AND d.ativo = true
     AND p_turma_id IN (SELECT turma_id FROM public.professor_minhas_turmas())
   ORDER BY d.nome;
$$;

REVOKE ALL ON FUNCTION public.professor_disciplinas_turma(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_disciplinas_turma(UUID) TO authenticated;

-- Bimestre vigente hoje pra turma, se a escola tiver periodos_letivos
-- configurados pro ano corrente. NULL se não houver (a escola ainda não
-- cadastrou os períodos) — a tela decide o padrão nesse caso.
CREATE OR REPLACE FUNCTION public.professor_bimestre_atual(p_turma_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pl.bimestre
    FROM public.turmas t
    JOIN public.periodos_letivos pl
      ON pl.escola_id = t.escola_id AND CURRENT_DATE BETWEEN pl.data_inicio AND pl.data_fim
   WHERE t.id = p_turma_id
     AND p_turma_id IN (SELECT turma_id FROM public.professor_minhas_turmas())
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.professor_bimestre_atual(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_bimestre_atual(UUID) TO authenticated;

-- -------------------------------------------------------------------- notas
CREATE OR REPLACE FUNCTION public.professor_notas_turma(
  p_turma_id UUID,
  p_disciplina_id UUID,
  p_bimestre INTEGER
)
RETURNS TABLE (
  matricula_id UUID,
  aluno_id     UUID,
  aluno_nome   TEXT,
  nota         NUMERIC,
  conceito     TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.aluno_id, al.nome, av.nota, av.conceito
    FROM public.matriculas m
    JOIN public.alunos al ON al.id = m.aluno_id
    LEFT JOIN public.avaliacoes_bimestrais av
      ON av.matricula_id = m.id AND av.disciplina_id = p_disciplina_id AND av.bimestre = p_bimestre
   WHERE m.turma_id = p_turma_id
     AND p_turma_id IN (SELECT turma_id FROM public.professor_minhas_turmas())
   ORDER BY al.nome;
$$;

REVOKE ALL ON FUNCTION public.professor_notas_turma(UUID, UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_notas_turma(UUID, UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.professor_salvar_notas(
  p_turma_id      UUID,
  p_disciplina_id UUID,
  p_bimestre      INTEGER,
  p_notas         JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT escola_id INTO v_escola_id FROM public.turmas WHERE id = p_turma_id;
  IF v_escola_id IS NULL THEN
    RAISE EXCEPTION 'Turma não encontrada';
  END IF;

  IF p_turma_id NOT IN (SELECT turma_id FROM public.professor_minhas_turmas()) THEN
    RAISE EXCEPTION 'Essa turma não é sua';
  END IF;

  IF NOT public.usuario_tem_permissao(v_escola_id, 'pedagogico', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para lançar notas nesta escola';
  END IF;

  INSERT INTO public.avaliacoes_bimestrais (escola_id, matricula_id, disciplina_id, bimestre, nota, conceito)
  SELECT v_escola_id,
         (e->>'matricula_id')::uuid,
         p_disciplina_id,
         p_bimestre,
         NULLIF(e->>'nota', '')::numeric,
         NULLIF(e->>'conceito', '')
    FROM jsonb_array_elements(COALESCE(p_notas, '[]'::jsonb)) e
   WHERE EXISTS (
     SELECT 1 FROM public.matriculas m
      WHERE m.id = (e->>'matricula_id')::uuid AND m.turma_id = p_turma_id)
  ON CONFLICT (matricula_id, disciplina_id, bimestre) DO UPDATE
    SET nota = EXCLUDED.nota,
        conceito = EXCLUDED.conceito,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.professor_salvar_notas(UUID, UUID, INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_salvar_notas(UUID, UUID, INTEGER, JSONB) TO authenticated;

-- ----------------------------------------------------------------- tarefas
-- atividades_turma não tem "tipo" (tarefa de casa x atividade em sala x
-- trabalho) nem data de entrega separada — só data + descrição livre.
CREATE OR REPLACE FUNCTION public.professor_atividades_turma(
  p_turma_id UUID,
  p_limite   INTEGER DEFAULT 20
)
RETURNS TABLE (
  id               UUID,
  data             DATE,
  descricao        TEXT,
  disciplina_nome  TEXT,
  created_at       TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.data, a.descricao, d.nome, a.created_at
    FROM public.atividades_turma a
    LEFT JOIN public.disciplinas d ON d.id = a.disciplina_id
   WHERE a.turma_id = p_turma_id
     AND p_turma_id IN (SELECT turma_id FROM public.professor_minhas_turmas())
   ORDER BY a.data DESC, a.created_at DESC
   LIMIT p_limite;
$$;

REVOKE ALL ON FUNCTION public.professor_atividades_turma(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_atividades_turma(UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.professor_criar_atividade(
  p_turma_id      UUID,
  p_disciplina_id UUID,
  p_data          DATE,
  p_descricao     TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escola_id UUID;
  v_id        UUID;
BEGIN
  SELECT escola_id INTO v_escola_id FROM public.turmas WHERE id = p_turma_id;
  IF v_escola_id IS NULL THEN
    RAISE EXCEPTION 'Turma não encontrada';
  END IF;

  IF p_turma_id NOT IN (SELECT turma_id FROM public.professor_minhas_turmas()) THEN
    RAISE EXCEPTION 'Essa turma não é sua';
  END IF;

  IF trim(coalesce(p_descricao, '')) = '' THEN
    RAISE EXCEPTION 'Descrição obrigatória';
  END IF;

  IF NOT public.usuario_tem_permissao(v_escola_id, 'pedagogico', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para lançar atividade nesta escola';
  END IF;

  INSERT INTO public.atividades_turma (escola_id, turma_id, disciplina_id, data, descricao)
  VALUES (v_escola_id, p_turma_id, p_disciplina_id, p_data, trim(p_descricao))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.professor_criar_atividade(UUID, UUID, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_criar_atividade(UUID, UUID, DATE, TEXT) TO authenticated;
