CREATE OR REPLACE FUNCTION public.usuario_tem_permissao_em_alguma_escola(
  p_modulo_codigo text,
  p_acao text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_escolas ue
    JOIN public.papel_permissoes pp ON pp.papel_id = ue.papel_id
    JOIN public.permissoes p ON p.id = pp.permissao_id
    JOIN public.modulos_sistema m ON m.id = p.modulo_id
    WHERE ue.user_id = auth.uid()
      AND ue.ativo = true
      AND m.codigo = p_modulo_codigo
      AND p.acao = p_acao
  ) OR public.is_superadmin_erp(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.usuario_tem_permissao_em_alguma_escola(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usuario_tem_permissao_em_alguma_escola(text, text) TO authenticated;

DROP POLICY IF EXISTS permissoes_select ON public.permissoes;
CREATE POLICY permissoes_select
ON public.permissoes
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_superadmin_erp(auth.uid())
);

DROP POLICY IF EXISTS modulos_sistema_select ON public.modulos_sistema;
CREATE POLICY modulos_sistema_select
ON public.modulos_sistema
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_superadmin_erp(auth.uid())
);

DROP POLICY IF EXISTS document_categorias_select ON public.document_categorias;
CREATE POLICY document_categorias_select
ON public.document_categorias
FOR SELECT
TO authenticated
USING (
  public.usuario_tem_permissao_em_alguma_escola('documentos', 'visualizar')
);

DROP POLICY IF EXISTS "marketing bucket public insert" ON storage.objects;
DROP POLICY IF EXISTS "marketing bucket public update" ON storage.objects;

CREATE POLICY marketing_upload_equipe_autorizada
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND public.usuario_tem_permissao(
    ((storage.foldername(name))[1])::uuid,
    'configuracoes',
    'editar'
  )
);

CREATE POLICY marketing_update_equipe_autorizada
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketing'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND public.usuario_tem_permissao(
    ((storage.foldername(name))[1])::uuid,
    'configuracoes',
    'editar'
  )
)
WITH CHECK (
  bucket_id = 'marketing'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND public.usuario_tem_permissao(
    ((storage.foldername(name))[1])::uuid,
    'configuracoes',
    'editar'
  )
);