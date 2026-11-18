-- Lista de materiais por turma (itens de uso pessoal, material didatico e uniforme),
-- cadastrada pela secretaria/direcao e exibida pro responsavel no app da familia.
-- Mesmo padrao de escola_links_compras: RLS pelo modulo 'comunicacao', GRANT explicito
-- (tabela criada depois de 30/10/2026), e leitura da familia so via SECURITY DEFINER
-- gateada por familia_ids_alunos().
--
-- Granularidade: uma lista por turma (sem suporte a "mesma lista pra varias turmas"
-- nesta primeira versao) — decisao explicita, ainda que gere cadastro repetido quando
-- duas turmas da mesma serie tem a mesma lista.

create table public.listas_materiais (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas(id),
  turma_id uuid not null references public.turmas(id),
  ano_letivo integer not null,
  titulo text not null,
  orientacoes text,
  itens text not null,
  material_didatico_texto text,
  material_didatico_url text,
  mochila_texto text,
  uniforme_texto text,
  ativo boolean not null default true,
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (turma_id, ano_letivo)
);

alter table public.listas_materiais enable row level security;

create policy listas_materiais_select on public.listas_materiais
  for select using (usuario_tem_permissao(escola_id, 'comunicacao', 'visualizar'));
create policy listas_materiais_insert on public.listas_materiais
  for insert with check (usuario_tem_permissao(escola_id, 'comunicacao', 'criar'));
create policy listas_materiais_update on public.listas_materiais
  for update using (usuario_tem_permissao(escola_id, 'comunicacao', 'editar'))
  with check (usuario_tem_permissao(escola_id, 'comunicacao', 'editar'));
create policy listas_materiais_delete on public.listas_materiais
  for delete using (usuario_tem_permissao(escola_id, 'comunicacao', 'excluir'));

create trigger trg_listas_materiais_updated
  before update on public.listas_materiais
  for each row execute function update_updated_at_column();

grant select, insert, update, delete on public.listas_materiais to authenticated;
grant select on public.listas_materiais to service_role;

create index idx_listas_materiais_turma on public.listas_materiais(turma_id) where ativo;

-- Leitura da familia: a lista da turma ATUAL do aluno (ano letivo corrente da turma).
create or replace function public.familia_lista_materiais(p_aluno_id uuid)
returns setof public.listas_materiais
language sql
stable
security definer
set search_path to 'public'
as $$
  select lm.*
    from public.listas_materiais lm
   where lm.turma_id = public.familia_turma_atual(p_aluno_id)
     and lm.ativo = true
     and p_aluno_id in (select aluno_id from public.familia_ids_alunos() as aluno_id)
$$;

revoke all on function public.familia_lista_materiais(uuid) from public, anon, authenticated;
grant execute on function public.familia_lista_materiais(uuid) to authenticated;
