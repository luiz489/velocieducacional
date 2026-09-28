DROP POLICY IF EXISTS document_categorias_select ON public.document_categorias;
CREATE POLICY document_categorias_select
ON public.document_categorias
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.usuarios_escolas ue
    JOIN public.papel_permissoes pp ON pp.papel_id = ue.papel_id
    JOIN public.permissoes p ON p.id = pp.permissao_id
    JOIN public.modulos_sistema m ON m.id = p.modulo_id
    WHERE ue.user_id = auth.uid()
      AND ue.ativo = true
      AND m.codigo = 'documentos'
      AND p.acao = 'visualizar'
  )
  OR public.is_superadmin_erp(auth.uid())
);

DROP FUNCTION IF EXISTS public.usuario_tem_permissao_em_alguma_escola(text, text);