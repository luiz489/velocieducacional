-- Performance: matrícula "travando muito"
--
-- 1. `matriculas` tinha DOIS índices UNIQUE idênticos em (aluno_id, turma_id)
--    (matriculas_aluno_id_turma_id_key e matriculas_aluno_turma_unique) -
--    toda matrícula criada mantinha os dois à toa. Mantém só
--    matriculas_aluno_turma_unique (o nome que o código já checa no erro
--    23505 em useAlunos.ts).
--
-- 2. O fix "Secretaria consegue matricular" (planos_financeiros_turma,
--    modalidades_financeiras_turma, valores_opcionais_matricula,
--    matricula_valores_opcionais) acrescentou uma política de SELECT nova
--    (financeiro:visualizar OR matriculas:visualizar) em vez de substituir
--    a antiga (só financeiro:visualizar) - a nova já cobre tudo que a
--    antiga cobria, então as duas juntas so fazem o Postgres avaliar
--    usuario_tem_permissao() em dobro em toda leitura dessas 4 tabelas,
--    que são lidas sempre que alguém abre ou salva uma matrícula.
--
-- 3. usuarios_escolas_select (a policy mais "quente" do sistema - é
--    consultada por trás de usuario_tem_permissao() em praticamente toda
--    tabela) chamava auth.uid() direto, reavaliado à toa; troca por
--    (select auth.uid()) deixa o Postgres cachear o valor por consulta.

-- 1. índice duplicado
alter table public.matriculas drop constraint if exists matriculas_aluno_id_turma_id_key;

-- 2. colapsa as políticas de SELECT duplicadas

drop policy if exists matricula_valores_opcionais_select on public.matricula_valores_opcionais;
alter policy matricula_valores_opcionais_select_matricula on public.matricula_valores_opcionais
  rename to matricula_valores_opcionais_select;

drop policy if exists modalidades_financeiras_turma_select on public.modalidades_financeiras_turma;
alter policy modalidades_financeiras_turma_select_matricula on public.modalidades_financeiras_turma
  rename to modalidades_financeiras_turma_select;

drop policy if exists valores_opcionais_matricula_select on public.valores_opcionais_matricula;
alter policy valores_opcionais_matricula_select_matricula on public.valores_opcionais_matricula
  rename to valores_opcionais_matricula_select;

-- planos_financeiros_turma_all cobria SELECT/INSERT/UPDATE/DELETE com
-- financeiro:editar; separa em insert/update/delete pra não duplicar o
-- SELECT (que já está coberto por _select_matricula).
drop policy if exists planos_financeiros_turma_all on public.planos_financeiros_turma;

create policy planos_financeiros_turma_insert on public.planos_financeiros_turma
  for insert to authenticated
  with check (usuario_tem_permissao(escola_id, 'financeiro', 'editar'));

create policy planos_financeiros_turma_update on public.planos_financeiros_turma
  for update to authenticated
  using (usuario_tem_permissao(escola_id, 'financeiro', 'editar'))
  with check (usuario_tem_permissao(escola_id, 'financeiro', 'editar'));

create policy planos_financeiros_turma_delete on public.planos_financeiros_turma
  for delete to authenticated
  using (usuario_tem_permissao(escola_id, 'financeiro', 'editar'));

alter policy planos_financeiros_turma_select_matricula on public.planos_financeiros_turma
  rename to planos_financeiros_turma_select;

-- 3. auth.uid() cacheado por consulta na policy mais quente do sistema
drop policy if exists usuarios_escolas_select on public.usuarios_escolas;
create policy usuarios_escolas_select on public.usuarios_escolas
  for select to authenticated
  using (
    (user_id = (select auth.uid()))
    or usuario_tem_permissao(escola_id, 'configuracoes', 'visualizar')
  );
