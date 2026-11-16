-- Liga o cadastro de RH do professor (tabela professores) a uma conta de login (usuarios_escolas),
-- e expoe pro app da familia uma forma de a equipe (secretaria/professor) saber quem esta logado
-- e, se for professor, quais turmas ele e regente.

alter table public.professores add column user_id uuid references auth.users(id);
create index idx_professores_user_id on public.professores(user_id) where user_id is not null;

-- v_professores_seguro: so pode ACRESCENTAR coluna no fim (CREATE OR REPLACE VIEW nao reordena).
create or replace view public.v_professores_seguro as
select
  id, nome, email, telefone, formacao, disciplinas, data_admissao, observacoes, ativo,
  created_at, updated_at, escola_id, tipo_contratacao, foto_url, endereco, cep, bairro, cidade, uf,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then cpf else null end as cpf,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then rg else null end as rg,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then cnpj else null end as cnpj,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then razao_social else null end as razao_social,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then data_nascimento else null end as data_nascimento,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then banco_codigo else null end as banco_codigo,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then banco_nome else null end as banco_nome,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then agencia else null end as agencia,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then conta else null end as conta,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then tipo_conta else null end as tipo_conta,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then chave_pix else null end as chave_pix,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then valor_mensal else null end as valor_mensal,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then dia_pagamento else null end as dia_pagamento,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then agencia_dv else null end as agencia_dv,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then conta_dv else null end as conta_dv,
  case when usuario_tem_permissao(escola_id, 'rh_financeiro', 'visualizar') then tipo_chave_pix else null end as tipo_chave_pix,
  user_id
from public.professores;

-- Candidatos a vincular: usuarios ja com login ativo na escola, que ainda nao estao ligados a
-- nenhum professor. Usado pelo combo "vincular ao login" na tela de Professores.
create or replace function public.usuarios_disponiveis_para_professor(p_escola_id uuid)
returns table(user_id uuid, email text, papel_nome text)
language sql stable security definer set search_path to 'public'
as $$
  select ue.user_id, u.email, p.nome
  from public.usuarios_escolas ue
  join auth.users u on u.id = ue.user_id
  join public.papeis p on p.id = ue.papel_id
  where ue.escola_id = p_escola_id and ue.ativo
    and usuario_tem_permissao(p_escola_id, 'rh', 'editar')
    and ue.user_id not in (select pr.user_id from public.professores pr where pr.user_id is not null)
  order by u.email
$$;

revoke all on function public.usuarios_disponiveis_para_professor(uuid) from public, anon, authenticated;
grant execute on function public.usuarios_disponiveis_para_professor(uuid) to authenticated;

-- App da familia: quem esta logado, se e equipe (staff) e, se for professor vinculado, suas turmas.
create or replace function public.app_sessao_staff()
returns table(escola_id uuid, escola_nome text, papel_nome text, professor_id uuid, professor_nome text)
language sql stable security definer set search_path to 'public'
as $$
  select ue.escola_id, e.nome, p.nome, pr.id, pr.nome
  from public.usuarios_escolas ue
  join public.escolas e on e.id = ue.escola_id
  join public.papeis p on p.id = ue.papel_id
  left join public.professores pr on pr.user_id = ue.user_id and pr.escola_id = ue.escola_id
  where ue.user_id = auth.uid() and ue.ativo
$$;

create or replace function public.professor_minhas_turmas()
returns table(turma_id uuid, nome text, escola_id uuid)
language sql stable security definer set search_path to 'public'
as $$
  select t.id, t.nome, t.escola_id
  from public.turmas t
  join public.professores pr on pr.id = t.professor_regente_id
  where pr.user_id = auth.uid()
  order by t.nome
$$;

revoke all on function public.app_sessao_staff() from public, anon, authenticated;
revoke all on function public.professor_minhas_turmas() from public, anon, authenticated;
grant execute on function public.app_sessao_staff() to authenticated;
grant execute on function public.professor_minhas_turmas() to authenticated;
