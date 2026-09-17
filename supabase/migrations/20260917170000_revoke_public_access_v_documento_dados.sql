-- CRÍTICO: v_documento_dados tinha SELECT liberado pra anon e authenticated.
-- Como a view roda com privilégio do dono (postgres, que tem BYPASSRLS), isso
-- expunha os dados de TODOS os alunos de TODAS as escolas (CPF, telefone dos
-- pais, data de nascimento, valores financeiros) pra qualquer requisição não
-- autenticada via /rest/v1/v_documento_dados, sem login nenhum.
--
-- A view só precisa ser lida de dentro da função gerar_documento() (SECURITY
-- DEFINER, dona = postgres, já faz checagem de permissão antes de usar a
-- view) - revogar o acesso direto de anon/authenticated não quebra nada no
-- frontend (nenhuma tela consulta a view diretamente).

revoke all on public.v_documento_dados from anon, authenticated;
