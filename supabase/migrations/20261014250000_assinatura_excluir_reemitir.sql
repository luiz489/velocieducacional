-- Excluir pedido/contrato de assinatura.
--  * Ainda não assinado pela família (pendente, expirado, bloqueado, cancelado): quem tem "excluir" em Relatórios e Documentos.
--  * Já assinado pela família: só quem tem também a permissão "assinar" (diretora; superadmin do ERP não entra),
--    e a exclusão deixa um registro (sem o texto) em assinaturas_documentos_excluidas.
-- Reemitir usa solicitar_assinatura_documento (novo texto congelado; o pedido anterior não assinado é cancelado).

create table if not exists public.assinaturas_documentos_excluidas (
  id uuid primary key default gen_random_uuid(),
  assinatura_id uuid not null,
  escola_id uuid not null references public.escolas(id) on delete cascade,
  aluno_id uuid,
  aluno_nome text,
  titulo text not null,
  hash_documento text,
  criado_em timestamptz,
  escola_assinou_em timestamptz,
  assinado_em timestamptz,
  assinante_nome text,
  excluido_por uuid default auth.uid(),
  excluido_em timestamptz not null default now()
);

alter table public.assinaturas_documentos_excluidas enable row level security;
drop policy if exists assinaturas_excluidas_select on public.assinaturas_documentos_excluidas;
create policy assinaturas_excluidas_select on public.assinaturas_documentos_excluidas
  for select to authenticated
  using (public.usuario_tem_permissao(escola_id, 'relatorios_documentos', 'excluir'));
revoke all on public.assinaturas_documentos_excluidas from anon;
revoke insert, update, delete on public.assinaturas_documentos_excluidas from authenticated;

create or replace function public.excluir_assinatura_documento(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  s public.assinaturas_documentos;
  v_aluno_nome text;
begin
  select * into s from public.assinaturas_documentos where id = p_id for update;
  if s.id is null then
    raise exception 'Pedido de assinatura não encontrado';
  end if;

  if not public.usuario_tem_permissao(s.escola_id, 'relatorios_documentos', 'excluir') then
    raise exception 'Sem permissão para excluir este documento';
  end if;

  if s.assinado_em is not null and not exists (
    select 1
    from public.usuarios_escolas ue
    join public.papel_permissoes pp on pp.papel_id = ue.papel_id
    join public.permissoes pe on pe.id = pp.permissao_id
    join public.modulos_sistema m on m.id = pe.modulo_id
    where ue.user_id = auth.uid() and ue.escola_id = s.escola_id and ue.ativo = true
      and m.codigo = 'relatorios_documentos' and pe.acao = 'assinar'
  ) then
    raise exception 'Contrato já assinado só pode ser excluído por quem assina pela escola';
  end if;

  select a.nome into v_aluno_nome from public.alunos a where a.id = s.aluno_id;

  insert into public.assinaturas_documentos_excluidas
    (assinatura_id, escola_id, aluno_id, aluno_nome, titulo, hash_documento, criado_em, escola_assinou_em, assinado_em, assinante_nome)
  values (s.id, s.escola_id, s.aluno_id, v_aluno_nome, s.titulo, s.hash_documento, s.criado_em, s.escola_assinou_em, s.assinado_em, s.assinante_nome);

  delete from public.assinaturas_documentos where id = p_id;
end;
$$;

revoke execute on function public.excluir_assinatura_documento(uuid) from public, anon;
grant execute on function public.excluir_assinatura_documento(uuid) to authenticated;
