-- familia_atividades_turma devolvia as colunas cruas de atividades_turma (sem nome da disciplina).
-- O app precisa mostrar o nome, nao o disciplina_id.
drop function if exists public.familia_atividades_turma(uuid, integer);

create function public.familia_atividades_turma(p_aluno_id uuid, p_limite integer default 20)
returns table(id uuid, data date, disciplina text, descricao text)
language sql stable security definer set search_path to 'public'
as $$
  select at.id, at.data, d.nome, at.descricao
  from public.atividades_turma at
  join public.disciplinas d on d.id = at.disciplina_id
  where p_aluno_id in (select aluno_id from public.familia_ids_alunos() as aluno_id)
    and at.turma_id = public.familia_turma_atual(p_aluno_id)
  order by at.data desc, at.created_at desc
  limit greatest(p_limite, 1)
$$;

revoke all on function public.familia_atividades_turma(uuid, integer) from public, anon, authenticated;
grant execute on function public.familia_atividades_turma(uuid, integer) to authenticated;
