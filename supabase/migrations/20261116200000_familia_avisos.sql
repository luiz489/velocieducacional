-- App da família (Veloci Família): leitura de avisos pelo responsável.
-- Mesmo padrão de familia_boletim/familia_frequencia/familia_links_compras:
-- gate via familia_ids_alunos(), nunca via is_staff()/usuario_tem_permissao
-- (avisos é staff-only por RLS — "Staff view avisos" usa só is_staff()).
--
-- avisos não tem segmentação por turma hoje, só por escola inteira ou por
-- um destinatario_aluno_id específico. Canal 'bullying' é propositalmente
-- excluído: é um canal interno de denúncia/caso, não um mural pros pais.

CREATE OR REPLACE FUNCTION public.familia_avisos(
  p_aluno_id UUID,
  p_limite   INTEGER DEFAULT 30
)
RETURNS TABLE (
  id            UUID,
  titulo        TEXT,
  mensagem      TEXT,
  canal         TEXT,
  prioridade    TEXT,
  autor         TEXT,
  anexo_url     TEXT,
  publicado_em  TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT av.id, av.titulo, av.mensagem, av.canal, av.prioridade, av.autor, av.anexo_url, av.publicado_em
    FROM public.avisos av
   WHERE av.escola_id = (SELECT a.escola_id FROM public.alunos a WHERE a.id = p_aluno_id)
     AND av.publicado = true
     AND av.canal <> 'bullying'
     AND (av.destinatario_aluno_id IS NULL OR av.destinatario_aluno_id = p_aluno_id)
     AND p_aluno_id IN (SELECT aluno_id FROM public.familia_ids_alunos() AS aluno_id)
   ORDER BY av.publicado_em DESC
   LIMIT p_limite;
$$;

REVOKE ALL ON FUNCTION public.familia_avisos(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.familia_avisos(UUID, INTEGER) TO authenticated;
