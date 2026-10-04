-- Notas e frequência por BIMESTRE.
--
-- O banco já tinha o modelo bimestral (avaliacoes_bimestrais, recuperacoes_semestrais,
-- conselho_classe, frequencia_bimestral) e NENHUMA tela usava: a tela de notas lia a
-- tabela antiga `pedagogico` (AV1/AV2/Rec, uma linha por aluno+disciplina no ano).
-- Esta migration liga o modelo bimestral à aplicação:
--
--   1. periodos_letivos  -> início e fim de cada bimestre, por escola e ano letivo.
--                           Sem isso não existe "frequência do 2º bimestre".
--   2. v_frequencia_chamada ganha a coluna `bimestre`, resolvida pela data da chamada.
--   3. v_boletim_bimestral reescrita: pivota B1..B4, recuperações e a frequência vinda
--      da chamada. NÃO calcula média/situação de propósito - essa regra vive em um
--      único lugar, `src/lib/boletim.ts`, usado pela tela e pelo PDF. Duas cópias da
--      mesma fórmula (SQL + TS) iam divergir.
--   4. RLS das tabelas bimestrais: hoje uma policy ALL exigindo 'editar', o que impedia
--      quem só tem 'visualizar' de LER as notas. Separa leitura de escrita.
--
-- A tabela `pedagogico` não é removida: ela ainda serve de reserva para a frequência de
-- quem nunca lançou chamada (ver Pedagogico.tsx).

-- ------------------------------------------------------- 1. períodos letivos
CREATE TABLE IF NOT EXISTS public.periodos_letivos (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escola_id    UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  ano_letivo   INTEGER NOT NULL,
  bimestre     INTEGER NOT NULL CHECK (bimestre BETWEEN 1 AND 4),
  data_inicio  DATE NOT NULL,
  data_fim     DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (escola_id, ano_letivo, bimestre),
  CONSTRAINT periodos_letivos_intervalo_ck CHECK (data_fim >= data_inicio)
);

CREATE INDEX IF NOT EXISTS periodos_letivos_escola_ano_idx
  ON public.periodos_letivos (escola_id, ano_letivo);

DROP TRIGGER IF EXISTS update_periodos_letivos_updated_at ON public.periodos_letivos;
CREATE TRIGGER update_periodos_letivos_updated_at
  BEFORE UPDATE ON public.periodos_letivos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.periodos_letivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS periodos_letivos_select ON public.periodos_letivos;
CREATE POLICY periodos_letivos_select ON public.periodos_letivos
  FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'pedagogico', 'visualizar'));

DROP POLICY IF EXISTS periodos_letivos_insert ON public.periodos_letivos;
CREATE POLICY periodos_letivos_insert ON public.periodos_letivos
  FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'pedagogico', 'editar'));

DROP POLICY IF EXISTS periodos_letivos_update ON public.periodos_letivos;
CREATE POLICY periodos_letivos_update ON public.periodos_letivos
  FOR UPDATE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'pedagogico', 'editar'))
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'pedagogico', 'editar'));

DROP POLICY IF EXISTS periodos_letivos_delete ON public.periodos_letivos;
CREATE POLICY periodos_letivos_delete ON public.periodos_letivos
  FOR DELETE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'pedagogico', 'excluir'));

-- Grava os 4 bimestres de uma vez, validando ordem e sobreposição. Sem btree_gist
-- não dá pra usar EXCLUDE com daterange, então a checagem é aqui.
CREATE OR REPLACE FUNCTION public.salvar_periodos_letivos(
  p_escola_id  UUID,
  p_ano_letivo INTEGER,
  p_periodos   JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  -- Uma linha por bimestre recebido, já tipada.
  v_periodos public.periodos_letivos[];
  v_item     public.periodos_letivos;
  v_anterior DATE;
BEGIN
  IF NOT public.usuario_tem_permissao(p_escola_id, 'pedagogico', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão para configurar os períodos letivos desta escola';
  END IF;

  IF p_ano_letivo IS NULL OR p_ano_letivo < 2000 OR p_ano_letivo > 2100 THEN
    RAISE EXCEPTION 'Ano letivo inválido';
  END IF;

  SELECT array_agg(s.x ORDER BY (s.x).bimestre) INTO v_periodos
    FROM (
      SELECT ROW(NULL, p_escola_id, p_ano_letivo,
                 (e->>'bimestre')::integer,
                 (e->>'data_inicio')::date,
                 (e->>'data_fim')::date,
                 now(), now())::public.periodos_letivos AS x
        FROM jsonb_array_elements(COALESCE(p_periodos, '[]'::jsonb)) e
    ) s;

  IF v_periodos IS NULL OR array_length(v_periodos, 1) <> 4 THEN
    RAISE EXCEPTION 'Informe exatamente os 4 bimestres (recebido: %)',
                    COALESCE(array_length(v_periodos, 1), 0);
  END IF;

  v_anterior := NULL;
  FOR i IN 1..4 LOOP
    v_item := v_periodos[i];

    IF v_item.bimestre <> i THEN
      RAISE EXCEPTION 'Os bimestres devem ser 1, 2, 3 e 4, sem repetição';
    END IF;
    IF v_item.data_inicio IS NULL OR v_item.data_fim IS NULL THEN
      RAISE EXCEPTION 'Preencha início e fim do %º bimestre', i;
    END IF;
    IF v_item.data_fim < v_item.data_inicio THEN
      RAISE EXCEPTION 'No %º bimestre o fim está antes do início', i;
    END IF;
    IF v_anterior IS NOT NULL AND v_item.data_inicio <= v_anterior THEN
      RAISE EXCEPTION 'O %º bimestre começa antes de o anterior terminar', i;
    END IF;

    v_anterior := v_item.data_fim;
  END LOOP;

  INSERT INTO public.periodos_letivos (escola_id, ano_letivo, bimestre, data_inicio, data_fim)
  SELECT p_escola_id, p_ano_letivo, p.bimestre, p.data_inicio, p.data_fim
    FROM unnest(v_periodos) p
  ON CONFLICT (escola_id, ano_letivo, bimestre) DO UPDATE
    SET data_inicio = EXCLUDED.data_inicio,
        data_fim    = EXCLUDED.data_fim,
        updated_at  = now();
END;
$fn$;

REVOKE ALL ON FUNCTION public.salvar_periodos_letivos(UUID, INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_periodos_letivos(UUID, INTEGER, JSONB) TO authenticated;

-- ------------------------------------- 2. frequência da chamada com bimestre
-- A função depende da view, então as duas caem e voltam juntas.
DROP FUNCTION IF EXISTS public.fn_frequencia_percentual(UUID, UUID);
DROP VIEW IF EXISTS public.v_frequencia_chamada;

CREATE VIEW public.v_frequencia_chamada
WITH (security_invoker = true) AS
SELECT
  p.matricula_id,
  c.disciplina_id,
  pl.bimestre,
  count(*)::integer                                                   AS aulas,
  count(*) FILTER (WHERE p.situacao = 'Presente')::integer            AS presencas,
  count(*) FILTER (WHERE p.situacao = 'Falta')::integer               AS faltas,
  count(*) FILTER (WHERE p.situacao = 'Falta Justificada')::integer   AS faltas_justificadas
FROM public.chamada_presencas p
JOIN public.chamadas c ON c.id = p.chamada_id
-- Chamada em data fora de qualquer bimestre configurado entra com bimestre NULL:
-- continua contando no total do ano, só não cai em nenhum bimestre.
LEFT JOIN public.periodos_letivos pl
       ON pl.escola_id = c.escola_id
      AND c.data_aula BETWEEN pl.data_inicio AND pl.data_fim
GROUP BY p.matricula_id, c.disciplina_id, pl.bimestre;

REVOKE ALL ON public.v_frequencia_chamada FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_frequencia_chamada TO authenticated;

-- Percentual do ano (soma todos os bimestres). p_bimestre NULL = ano todo.
CREATE OR REPLACE FUNCTION public.fn_frequencia_percentual(
  p_matricula_id  UUID,
  p_disciplina_id UUID,
  p_bimestre      INTEGER DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  SELECT round(100.0 * sum(f.presencas) / nullif(sum(f.aulas), 0), 1)
    FROM public.v_frequencia_chamada f
   WHERE f.matricula_id = p_matricula_id
     AND (f.disciplina_id IS NULL OR f.disciplina_id = p_disciplina_id)
     AND (p_bimestre IS NULL OR f.bimestre = p_bimestre);
$fn$;

REVOKE ALL ON FUNCTION public.fn_frequencia_percentual(UUID, UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_frequencia_percentual(UUID, UUID, INTEGER) TO authenticated;

-- --------------------------------------------- 3. boletim: pivô, sem regra
-- Só organiza o dado. Média do semestre, efeito da recuperação, média final e
-- situação são calculados em src/lib/boletim.ts (um lugar só).
DROP VIEW IF EXISTS public.v_boletim_bimestral;

CREATE VIEW public.v_boletim_bimestral
WITH (security_invoker = true) AS
WITH notas AS (
  SELECT ab.matricula_id, ab.disciplina_id, ab.escola_id,
         max(ab.nota)     FILTER (WHERE ab.bimestre = 1) AS nota_b1,
         max(ab.nota)     FILTER (WHERE ab.bimestre = 2) AS nota_b2,
         max(ab.nota)     FILTER (WHERE ab.bimestre = 3) AS nota_b3,
         max(ab.nota)     FILTER (WHERE ab.bimestre = 4) AS nota_b4,
         max(ab.conceito) FILTER (WHERE ab.bimestre = 1) AS conceito_b1,
         max(ab.conceito) FILTER (WHERE ab.bimestre = 2) AS conceito_b2,
         max(ab.conceito) FILTER (WHERE ab.bimestre = 3) AS conceito_b3,
         max(ab.conceito) FILTER (WHERE ab.bimestre = 4) AS conceito_b4
    FROM public.avaliacoes_bimestrais ab
   GROUP BY ab.matricula_id, ab.disciplina_id, ab.escola_id
)
SELECT n.matricula_id,
       m.aluno_id,
       n.escola_id,
       n.disciplina_id,
       d.nome           AS disciplina,
       d.tipo_avaliacao,
       n.nota_b1, n.nota_b2, n.nota_b3, n.nota_b4,
       n.conceito_b1, n.conceito_b2, n.conceito_b3, n.conceito_b4,
       rec1.nota        AS recuperacao_1sem,
       rec2.nota        AS recuperacao_2sem,
       COALESCE(fr.aulas, 0)      AS aulas,
       COALESCE(fr.presencas, 0)  AS presencas,
       fr.faltas_b1, fr.faltas_b2, fr.faltas_b3, fr.faltas_b4,
       round(100.0 * fr.presencas / nullif(fr.aulas, 0), 1) AS frequencia_percentual
  FROM notas n
  JOIN public.matriculas m  ON m.id = n.matricula_id
  JOIN public.disciplinas d ON d.id = n.disciplina_id
  LEFT JOIN public.recuperacoes_semestrais rec1
         ON rec1.matricula_id = n.matricula_id AND rec1.disciplina_id = n.disciplina_id AND rec1.semestre = 1
  LEFT JOIN public.recuperacoes_semestrais rec2
         ON rec2.matricula_id = n.matricula_id AND rec2.disciplina_id = n.disciplina_id AND rec2.semestre = 2
  LEFT JOIN LATERAL (
    -- disciplina_id NULL na chamada = chamada do dia inteiro, vale para esta disciplina.
    SELECT sum(f.aulas)     AS aulas,
           sum(f.presencas) AS presencas,
           sum(f.faltas + f.faltas_justificadas) FILTER (WHERE f.bimestre = 1) AS faltas_b1,
           sum(f.faltas + f.faltas_justificadas) FILTER (WHERE f.bimestre = 2) AS faltas_b2,
           sum(f.faltas + f.faltas_justificadas) FILTER (WHERE f.bimestre = 3) AS faltas_b3,
           sum(f.faltas + f.faltas_justificadas) FILTER (WHERE f.bimestre = 4) AS faltas_b4
      FROM public.v_frequencia_chamada f
     WHERE f.matricula_id = n.matricula_id
       AND (f.disciplina_id IS NULL OR f.disciplina_id = n.disciplina_id)
  ) fr ON true;

REVOKE ALL ON public.v_boletim_bimestral FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_boletim_bimestral TO authenticated;

-- ------------------------------- 4. RLS: quem só vê, passa a conseguir ler
-- As policies eram FOR ALL exigindo 'editar', então um usuário com apenas
-- 'pedagogico:visualizar' abria a tela de notas vazia.
DO $do$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['avaliacoes_bimestrais', 'recuperacoes_semestrais',
                           'frequencia_bimestral', 'conselho_classe']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_all', t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
        USING (public.usuario_tem_permissao(escola_id, 'pedagogico', 'visualizar'))$p$,
      t || '_select', t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
        WITH CHECK (public.usuario_tem_permissao(escola_id, 'pedagogico', 'criar'))$p$,
      t || '_insert', t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
        USING (public.usuario_tem_permissao(escola_id, 'pedagogico', 'editar'))
        WITH CHECK (public.usuario_tem_permissao(escola_id, 'pedagogico', 'editar'))$p$,
      t || '_update', t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
        USING (public.usuario_tem_permissao(escola_id, 'pedagogico', 'excluir'))$p$,
      t || '_delete', t);
  END LOOP;
END
$do$;
