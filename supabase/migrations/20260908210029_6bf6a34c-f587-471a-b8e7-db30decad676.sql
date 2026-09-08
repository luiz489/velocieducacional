-- minhas_permissoes: pares (modulo, acao) que o usuario logado tem na escola,
-- via o papel do vinculo dele. O frontend usa isso pra esconder menu/rotas dos
-- modulos que o papel nao alcanca (o superadmin e tratado no client).

CREATE OR REPLACE FUNCTION public.minhas_permissoes(p_escola_id uuid)
 RETURNS TABLE(modulo_codigo text, acao text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT m.codigo, p.acao
  FROM public.usuarios_escolas ue
  JOIN public.papel_permissoes pp ON pp.papel_id = ue.papel_id
  JOIN public.permissoes p ON p.id = pp.permissao_id
  JOIN public.modulos_sistema m ON m.id = p.modulo_id
  WHERE ue.user_id = auth.uid()
    AND ue.escola_id = p_escola_id
    AND ue.ativo = true;
$function$;
