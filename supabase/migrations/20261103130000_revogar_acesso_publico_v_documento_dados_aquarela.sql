-- CRÍTICO: v_documento_dados_aquarela (criada em 05/10 sobre v_documento_dados) voltou a expor CPF, RG,
-- endereço e telefones de alunos e responsáveis de TODAS as escolas para anon e authenticated, porque a view
-- roda com o privilégio do dono (BYPASSRLS). A correção de 17/09 só tinha protegido v_documento_dados.
-- Nada lê esta view direto: ela só é usada por gerar_documento() (SECURITY DEFINER, dona postgres), que
-- continua funcionando.
-- Já aplicado no banco em 03/11/2026 (via MCP, nome revogar_acesso_publico_v_documento_dados_aquarela).
-- ATENÇÃO: toda vez que a view for recriada com CREATE OR REPLACE o acesso continua revogado, mas um
-- DROP + CREATE VIEW devolve os grants padrão: repetir este REVOKE depois.
revoke all on public.v_documento_dados_aquarela from public, anon, authenticated;
