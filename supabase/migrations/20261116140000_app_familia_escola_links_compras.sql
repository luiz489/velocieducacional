-- App dos pais (Veloci Familia): dados reais da aba "Escola" (boletim, frequencia, atividades da
-- turma) + links de compra (material/uniforme) que a secretaria/direcao posta para os responsaveis.

-- 1) Tabela nova: links de compra, por escola (turma_id null) ou por turma especifica.
create table public.escola_links_compras (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas(id),
  turma_id uuid references public.turmas(id), -- null = vale pra escola toda
  titulo text not null,
  url text not null,
  tipo text not null default 'material' check (tipo in ('material', 'uniforme', 'outro')),
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.escola_links_compras enable row level security;

-- Mesma permissao de "comunicacao" usada em avisos (secretaria/direcao ja tem isso configurado).
create policy escola_links_compras_select on public.escola_links_compras
  for select using (usuario_tem_permissao(escola_id, 'comunicacao', 'visualizar'));
create policy escola_links_compras_insert on public.escola_links_compras
  for insert with check (usuario_tem_permissao(escola_id, 'comunicacao', 'criar'));
create policy escola_links_compras_update on public.escola_links_compras
  for update using (usuario_tem_permissao(escola_id, 'comunicacao', 'editar'))
  with check (usuario_tem_permissao(escola_id, 'comunicacao', 'editar'));
create policy escola_links_compras_delete on public.escola_links_compras
  for delete using (usuario_tem_permissao(escola_id, 'comunicacao', 'excluir'));

create trigger trg_escola_links_compras_updated
  before update on public.escola_links_compras
  for each row execute function update_updated_at_column();

-- Tabelas criadas depois de 30/10/2026 precisam de GRANT explicito pra API acessar.
grant select, insert, update, delete on public.escola_links_compras to authenticated;
grant select on public.escola_links_compras to service_role;

create index idx_escola_links_compras_escola on public.escola_links_compras(escola_id) where ativo;
create index idx_escola_links_compras_turma on public.escola_links_compras(turma_id) where ativo;

-- 2) Funcoes do app da familia: cada uma recebe o aluno_id e confere que é filho de quem chama.
-- Nenhuma delas aceita filtro livre de aluno; sempre cruzam com familia_ids_alunos().

create or replace function public.familia_turma_atual(p_aluno_id uuid)
returns uuid
language sql stable security definer set search_path to 'public'
as $$
  select m.turma_id
  from public.matriculas m
  join public.turmas t on t.id = m.turma_id
  where m.aluno_id = p_aluno_id
  order by t.ano_letivo desc, m.created_at desc
  limit 1
$$;

create or replace function public.familia_boletim(p_aluno_id uuid)
returns setof public.v_boletim_bimestral
language sql stable security definer set search_path to 'public'
as $$
  select b.* from public.v_boletim_bimestral b
  where b.aluno_id = p_aluno_id
    and p_aluno_id in (select aluno_id from public.familia_ids_alunos() as aluno_id)
  order by b.disciplina
$$;

create or replace function public.familia_frequencia(p_aluno_id uuid)
returns setof public.v_frequencia_chamada
language sql stable security definer set search_path to 'public'
as $$
  select f.* from public.v_frequencia_chamada f
  join public.matriculas m on m.id = f.matricula_id
  where m.aluno_id = p_aluno_id
    and p_aluno_id in (select aluno_id from public.familia_ids_alunos() as aluno_id)
  order by f.bimestre, f.disciplina_id
$$;

create or replace function public.familia_atividades_turma(p_aluno_id uuid, p_limite integer default 20)
returns setof public.atividades_turma
language sql stable security definer set search_path to 'public'
as $$
  select at.* from public.atividades_turma at
  where p_aluno_id in (select aluno_id from public.familia_ids_alunos() as aluno_id)
    and at.turma_id = public.familia_turma_atual(p_aluno_id)
  order by at.data desc, at.created_at desc
  limit greatest(p_limite, 1)
$$;

create or replace function public.familia_links_compras(p_aluno_id uuid)
returns setof public.escola_links_compras
language sql stable security definer set search_path to 'public'
as $$
  select l.* from public.escola_links_compras l
  where l.ativo
    and p_aluno_id in (select aluno_id from public.familia_ids_alunos() as aluno_id)
    and l.escola_id = (select a.escola_id from public.alunos a where a.id = p_aluno_id)
    and (l.turma_id is null or l.turma_id = public.familia_turma_atual(p_aluno_id))
  order by l.tipo, l.ordem, l.titulo
$$;

revoke all on function public.familia_turma_atual(uuid) from public, anon, authenticated;
revoke all on function public.familia_boletim(uuid) from public, anon, authenticated;
revoke all on function public.familia_frequencia(uuid) from public, anon, authenticated;
revoke all on function public.familia_atividades_turma(uuid, integer) from public, anon, authenticated;
revoke all on function public.familia_links_compras(uuid) from public, anon, authenticated;

grant execute on function public.familia_turma_atual(uuid) to authenticated;
grant execute on function public.familia_boletim(uuid) to authenticated;
grant execute on function public.familia_frequencia(uuid) to authenticated;
grant execute on function public.familia_atividades_turma(uuid, integer) to authenticated;
grant execute on function public.familia_links_compras(uuid) to authenticated;
