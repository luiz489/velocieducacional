-- Função SECURITY DEFINER sem checagem de quem chama: qualquer usuário logado (inclusive um pai no app novo)
-- podia criar papéis e permissões em qualquer escola. Só é usada por dentro de outras funções do sistema
-- (que rodam como dono e não dependem deste privilégio).
-- Já aplicado no banco em 03/11/2026.
revoke execute on function public.clonar_papeis_modelo_para_escola(uuid) from public, anon, authenticated;
grant execute on function public.clonar_papeis_modelo_para_escola(uuid) to service_role;
