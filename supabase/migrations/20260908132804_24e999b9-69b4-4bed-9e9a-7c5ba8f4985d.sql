-- Vincular usuario a varias unidades (matriz + filiais) de uma vez
--
-- escolas_gerenciaveis_do_grupo: lista as escolas do mesmo grupo economico,
--   marcando a matriz (mais antiga) e se o usuario atual pode gerenciar usuarios
--   naquela unidade. Usada pela tela Configuracoes > Usuarios.
--
-- vincular_usuario_multi_escola: vincula um usuario existente (por e-mail) a
--   varias escolas de uma vez, resolvendo o papel PELO NOME em cada escola
--   (papeis e por escola). Tudo ou nada.

CREATE OR REPLACE FUNCTION public.escolas_gerenciaveis_do_grupo(p_escola_id uuid)
 RETURNS TABLE(escola_id uuid, nome text, eh_matriz boolean, posso_gerenciar boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT grupo_economico_id FROM public.escolas WHERE id = p_escola_id
  ),
  grupo AS (
    SELECT e.id, e.nome, e.criado_em
    FROM public.escolas e, base b
    WHERE e.id = p_escola_id
       OR (b.grupo_economico_id IS NOT NULL AND e.grupo_economico_id = b.grupo_economico_id)
  )
  SELECT
    g.id,
    g.nome,
    g.criado_em = min(g.criado_em) OVER () AS eh_matriz,
    public.usuario_tem_permissao(g.id, 'configuracoes', 'editar') AS posso_gerenciar
  FROM grupo g
  ORDER BY g.criado_em;
$function$;

CREATE OR REPLACE FUNCTION public.vincular_usuario_multi_escola(
  p_escola_ids uuid[],
  p_email text,
  p_papel_nome text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_escola_id UUID;
  v_papel_id UUID;
  v_escola_nome TEXT;
BEGIN
  IF p_escola_ids IS NULL OR array_length(p_escola_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione pelo menos uma unidade';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado com o e-mail %. Peça para essa pessoa criar a conta no app primeiro (tela de login).', p_email;
  END IF;

  FOREACH v_escola_id IN ARRAY p_escola_ids LOOP
    IF NOT public.usuario_tem_permissao(v_escola_id, 'configuracoes', 'editar') THEN
      RAISE EXCEPTION 'Sem permissão para gerenciar usuários de uma das unidades selecionadas';
    END IF;

    SELECT id INTO v_papel_id
    FROM public.papeis
    WHERE escola_id = v_escola_id AND nome = p_papel_nome;

    IF v_papel_id IS NULL THEN
      SELECT nome INTO v_escola_nome FROM public.escolas WHERE id = v_escola_id;
      RAISE EXCEPTION 'A unidade "%" não tem o papel "%"', COALESCE(v_escola_nome, v_escola_id::text), p_papel_nome;
    END IF;

    INSERT INTO public.usuarios_escolas (user_id, escola_id, papel_id)
    VALUES (v_user_id, v_escola_id, v_papel_id)
    ON CONFLICT (user_id, escola_id) DO UPDATE SET papel_id = EXCLUDED.papel_id, ativo = true;
  END LOOP;
END;
$function$;
