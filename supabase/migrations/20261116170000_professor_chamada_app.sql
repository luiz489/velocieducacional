-- App do professor (Veloci Família): leitura da chamada do dia para uma turma
-- do próprio professor. A gravação reaproveita o RPC já existente salvar_chamada
-- (mesma permissão 'pedagogico'/'editar' que a tela admin usa) — não precisa de
-- função nova para escrever.
--
-- Chamada do dia inteiro (horario_aula_id IS NULL), que é o padrão usado hoje
-- no Colégio teste (sem grade de horarios_aulas configurada).

CREATE OR REPLACE FUNCTION public.professor_chamada_dia(
  p_turma_id UUID,
  p_data     DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  matricula_id UUID,
  aluno_id     UUID,
  aluno_nome   TEXT,
  situacao     TEXT,
  observacao   TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id AS matricula_id,
         m.aluno_id,
         al.nome AS aluno_nome,
         COALESCE(cp.situacao, 'Presente') AS situacao,
         cp.observacao
    FROM public.matriculas m
    JOIN public.alunos al ON al.id = m.aluno_id
    LEFT JOIN public.chamadas c
      ON c.turma_id = m.turma_id AND c.data_aula = p_data AND c.horario_aula_id IS NULL
    LEFT JOIN public.chamada_presencas cp
      ON cp.chamada_id = c.id AND cp.matricula_id = m.id
   WHERE m.turma_id = p_turma_id
     AND p_turma_id IN (SELECT turma_id FROM public.professor_minhas_turmas())
   ORDER BY al.nome;
$$;

REVOKE ALL ON FUNCTION public.professor_chamada_dia(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_chamada_dia(UUID, DATE) TO authenticated;
