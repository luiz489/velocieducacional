-- profiles: gestor da escola enxerga nome/email dos usuarios da propria escola
--
-- A tela Configuracoes > Usuarios lista usuarios_escolas e mostra nome/email
-- vindos de profiles. As policies de profiles so liberavam "o proprio perfil"
-- ou "equipe da plataforma" (is_staff), entao o administrador da escola via "-"
-- no lugar do nome de todos os outros usuarios.
--
-- Esta policy libera SELECT em profiles para quem tem configuracoes:visualizar
-- numa escola onde o perfil-alvo esta vinculado - mesmo criterio da policy
-- usuarios_escolas_select. profiles so tem id, full_name, email e timestamps.

CREATE OR REPLACE FUNCTION public.pode_ver_perfil_por_gestao(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_escolas ue
    WHERE ue.user_id = p_user_id
      AND public.usuario_tem_permissao(ue.escola_id, 'configuracoes', 'visualizar')
  );
$function$;

DROP POLICY IF EXISTS "Gestor ve perfis de usuarios das suas escolas" ON public.profiles;
CREATE POLICY "Gestor ve perfis de usuarios das suas escolas"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.pode_ver_perfil_por_gestao(id));
