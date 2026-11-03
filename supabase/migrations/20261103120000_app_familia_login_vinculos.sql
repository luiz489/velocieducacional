-- App dos pais (projeto app-educacional): login por código (WhatsApp ou e-mail do cadastro) e vínculos
-- pessoa <-> aluno. O app NUNCA lê a tabela alunos direto: só enxerga o que estas funções devolvem.
--
-- Como funciona:
--  1. familia_codigos_login guarda o código (com hash) enviado por WhatsApp ou e-mail. Só as edge
--     functions (service_role) mexem nela.
--  2. Quem entra vira uma linha em familia_pessoas (ligada a um usuário do Supabase Auth).
--  3. familia_sincronizar_vinculos acha os alunos cujo telefone/e-mail de pai, mãe ou responsável
--     bate com o da pessoa, em TODAS as escolas, e cria os vínculos (familia_vinculos).
--  4. A secretaria pode bloquear um vínculo (bloqueio_manual): a sincronização nunca o reativa.

-- ---------------------------------------------------------------------------
-- 0. E-mail do pai e da mãe no cadastro do aluno (hoje só existe o do responsável)
-- ---------------------------------------------------------------------------
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS email_pai text,
  ADD COLUMN IF NOT EXISTS email_mae text;

-- ---------------------------------------------------------------------------
-- 1. Telefone normalizado: só dígitos, com 55 na frente (10/11 dígitos de DDD+número viram 55+...)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.familia_normalizar_telefone(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN d = '' THEN NULL
    WHEN length(d) IN (10, 11) THEN '55' || d
    WHEN length(d) IN (12, 13) AND left(d, 2) = '55' THEN d
    ELSE NULL
  END
  FROM (SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g') AS d) x
$$;

-- ---------------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.familia_pessoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  telefone text UNIQUE,            -- normalizado (familia_normalizar_telefone)
  email text,                      -- minúsculo
  ultimo_acesso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT familia_pessoas_contato CHECK (telefone IS NOT NULL OR email IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS familia_pessoas_email_uq ON public.familia_pessoas (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.familia_vinculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.familia_pessoas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL,
  parentesco text NOT NULL CHECK (parentesco IN ('pai', 'mae', 'responsavel')),
  ativo boolean NOT NULL DEFAULT true,
  bloqueio_manual boolean NOT NULL DEFAULT false,   -- true = a secretaria bloqueou; a sincronização não reativa
  origem text NOT NULL DEFAULT 'cadastro',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pessoa_id, aluno_id)
);
CREATE INDEX IF NOT EXISTS familia_vinculos_aluno_idx ON public.familia_vinculos (aluno_id);

CREATE TABLE IF NOT EXISTS public.familia_codigos_login (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal text NOT NULL CHECK (canal IN ('whatsapp', 'email')),
  destino text NOT NULL,           -- telefone normalizado ou e-mail minúsculo
  codigo_hash text NOT NULL,
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0,
  usado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS familia_codigos_destino_idx ON public.familia_codigos_login (canal, destino, created_at DESC);

ALTER TABLE public.familia_pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familia_vinculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familia_codigos_login ENABLE ROW LEVEL SECURITY;   -- sem política: só service_role

DROP POLICY IF EXISTS familia_pessoas_proprio ON public.familia_pessoas;
CREATE POLICY familia_pessoas_proprio ON public.familia_pessoas
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS familia_vinculos_proprio ON public.familia_vinculos;
CREATE POLICY familia_vinculos_proprio ON public.familia_vinculos
  FOR SELECT TO authenticated
  USING (pessoa_id IN (SELECT id FROM public.familia_pessoas WHERE auth_user_id = auth.uid()));

-- GRANT explícito (tabelas novas não ficam acessíveis pela API sem ele).
REVOKE ALL ON public.familia_pessoas, public.familia_vinculos, public.familia_codigos_login FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.familia_pessoas, public.familia_vinculos TO authenticated;
GRANT ALL ON public.familia_pessoas, public.familia_vinculos, public.familia_codigos_login TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Quais alunos pertencem a um telefone/e-mail (todas as escolas, só alunos ativos)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.familia_achar_alunos(p_telefone text, p_email text)
RETURNS TABLE (aluno_id uuid, escola_id uuid, parentesco text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (x.aluno_id) x.aluno_id, x.escola_id, x.parentesco
  FROM (
    SELECT a.id AS aluno_id, a.escola_id, 'pai'::text AS parentesco
      FROM public.alunos a WHERE a.status = 'Ativo' AND p_telefone IS NOT NULL
       AND public.familia_normalizar_telefone(a.telefone_pai) = p_telefone
    UNION ALL
    SELECT a.id, a.escola_id, 'mae'
      FROM public.alunos a WHERE a.status = 'Ativo' AND p_telefone IS NOT NULL
       AND public.familia_normalizar_telefone(a.telefone_mae) = p_telefone
    UNION ALL
    SELECT a.id, a.escola_id, 'responsavel'
      FROM public.alunos a WHERE a.status = 'Ativo' AND p_telefone IS NOT NULL
       AND public.familia_normalizar_telefone(a.telefone_responsavel) = p_telefone
    UNION ALL
    SELECT a.id, a.escola_id, 'pai'
      FROM public.alunos a WHERE a.status = 'Ativo' AND p_email IS NOT NULL
       AND lower(btrim(a.email_pai)) = lower(p_email)
    UNION ALL
    SELECT a.id, a.escola_id, 'mae'
      FROM public.alunos a WHERE a.status = 'Ativo' AND p_email IS NOT NULL
       AND lower(btrim(a.email_mae)) = lower(p_email)
    UNION ALL
    SELECT a.id, a.escola_id, 'responsavel'
      FROM public.alunos a WHERE a.status = 'Ativo' AND p_email IS NOT NULL
       AND lower(btrim(a.email_responsavel)) = lower(p_email)
  ) x
  ORDER BY x.aluno_id, CASE x.parentesco WHEN 'pai' THEN 1 WHEN 'mae' THEN 2 ELSE 3 END
$$;

-- ---------------------------------------------------------------------------
-- 4. Sincroniza os vínculos de uma pessoa com o cadastro. Respeita o bloqueio da secretaria.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.familia_sincronizar_vinculos(p_pessoa uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tel text;
  v_email text;
  v_ativos integer;
BEGIN
  SELECT telefone, lower(email) INTO v_tel, v_email FROM public.familia_pessoas WHERE id = p_pessoa;
  IF NOT FOUND THEN RETURN 0; END IF;

  INSERT INTO public.familia_vinculos (pessoa_id, aluno_id, escola_id, parentesco)
  SELECT p_pessoa, f.aluno_id, f.escola_id, f.parentesco FROM public.familia_achar_alunos(v_tel, v_email) f
  ON CONFLICT (pessoa_id, aluno_id) DO NOTHING;

  -- quem saiu do cadastro perde o acesso; quem voltou recupera (menos os bloqueados à mão)
  UPDATE public.familia_vinculos v
     SET ativo = EXISTS (SELECT 1 FROM public.familia_achar_alunos(v_tel, v_email) f WHERE f.aluno_id = v.aluno_id)
   WHERE v.pessoa_id = p_pessoa AND v.origem = 'cadastro' AND NOT v.bloqueio_manual;

  -- nome da pessoa, tirado do cadastro do aluno (só preenche se ainda estiver vazio)
  UPDATE public.familia_pessoas fp
     SET nome = (
       SELECT nullif(btrim(CASE v.parentesco WHEN 'pai' THEN a.nome_pai WHEN 'mae' THEN a.nome_mae ELSE a.responsavel_financeiro END), '')
       FROM public.familia_vinculos v JOIN public.alunos a ON a.id = v.aluno_id
       WHERE v.pessoa_id = p_pessoa AND v.ativo
         AND nullif(btrim(CASE v.parentesco WHEN 'pai' THEN a.nome_pai WHEN 'mae' THEN a.nome_mae ELSE a.responsavel_financeiro END), '') IS NOT NULL
       ORDER BY v.created_at LIMIT 1)
   WHERE fp.id = p_pessoa AND fp.nome IS NULL;

  SELECT count(*) INTO v_ativos FROM public.familia_vinculos WHERE pessoa_id = p_pessoa AND ativo;
  RETURN v_ativos;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. O que o app enxerga: os filhos da pessoa logada (só as colunas necessárias)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.familia_meus_filhos()
RETURNS TABLE (aluno_id uuid, nome text, escola_id uuid, escola_nome text, parentesco text, turma_nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.nome, a.escola_id, e.nome, v.parentesco, t.nome
  FROM public.familia_vinculos v
  JOIN public.familia_pessoas p ON p.id = v.pessoa_id AND p.auth_user_id = auth.uid()
  JOIN public.alunos a ON a.id = v.aluno_id
  JOIN public.escolas e ON e.id = a.escola_id
  LEFT JOIN LATERAL (
    SELECT tt.nome FROM public.matriculas m JOIN public.turmas tt ON tt.id = m.turma_id
    WHERE m.aluno_id = a.id ORDER BY tt.ano_letivo DESC, m.created_at DESC LIMIT 1
  ) t ON true
  WHERE v.ativo
  ORDER BY a.nome
$$;

-- IDs dos alunos que a pessoa logada pode ver (base das políticas das próximas telas)
CREATE OR REPLACE FUNCTION public.familia_ids_alunos()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.aluno_id FROM public.familia_vinculos v
  JOIN public.familia_pessoas p ON p.id = v.pessoa_id
  WHERE p.auth_user_id = auth.uid() AND v.ativo
$$;

-- Execução: só o que precisa. Tirar de PUBLIC (tirar só de anon/authenticated não adianta).
REVOKE EXECUTE ON FUNCTION public.familia_achar_alunos(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.familia_sincronizar_vinculos(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.familia_meus_filhos() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.familia_ids_alunos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.familia_achar_alunos(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.familia_sincronizar_vinculos(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.familia_meus_filhos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.familia_ids_alunos() TO authenticated;
