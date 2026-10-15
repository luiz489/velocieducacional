-- Assinatura digital de documentos (contrato de matrícula, a princípio).
-- O texto é CONGELADO no momento do pedido (corpo_html + hash SHA-256) e nunca regenerado.
-- A página pública fala com o banco só pela edge function assinatura-publica (service role);
-- quem está logado na escola cria o pedido e consulta, mas nunca grava nem altera uma assinatura.

create table if not exists public.assinaturas_documentos (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas(id) on delete cascade,
  aluno_id uuid references public.alunos(id) on delete set null,
  template_id uuid references public.document_templates(id) on delete set null,
  titulo text not null,
  corpo_html text not null,
  hash_documento text not null,
  token text not null unique,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  cancelado_em timestamptz,
  assinado_em timestamptz,
  assinante_nome text,
  assinante_documento text,
  assinante_ip text,
  assinante_user_agent text,
  assinatura_imagem text
);

create index if not exists assinaturas_documentos_escola_idx on public.assinaturas_documentos (escola_id, criado_em desc);
create index if not exists assinaturas_documentos_aluno_idx on public.assinaturas_documentos (aluno_id);

alter table public.assinaturas_documentos enable row level security;

drop policy if exists assinaturas_documentos_select on public.assinaturas_documentos;
create policy assinaturas_documentos_select on public.assinaturas_documentos
  for select to authenticated
  using (public.usuario_tem_permissao(escola_id, 'relatorios_documentos', 'visualizar'));

-- Sem policy de insert/update/delete: só as funções abaixo (e a edge function, via service role) gravam.
revoke all on public.assinaturas_documentos from anon;
revoke insert, update, delete on public.assinaturas_documentos from authenticated;

create or replace function public.solicitar_assinatura_documento(
  p_template_id uuid,
  p_aluno_id uuid,
  p_valores_manuais jsonb default '{}'::jsonb
) returns table (assinatura_id uuid, assinatura_token text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_escola_id uuid;
  v_titulo text;
  v_html text;
  v_token text;
  v_id uuid;
begin
  select a.escola_id into v_escola_id from public.alunos a where a.id = p_aluno_id;
  if v_escola_id is null then
    raise exception 'Aluno não encontrado';
  end if;

  if not public.usuario_tem_permissao(v_escola_id, 'relatorios_documentos', 'criar') then
    raise exception 'Sem permissão para enviar documentos para assinatura';
  end if;

  select t.nome into v_titulo from public.document_templates t
   where t.id = p_template_id and (t.escola_id is null or t.escola_id = v_escola_id);
  if v_titulo is null then
    raise exception 'Modelo de documento não encontrado';
  end if;

  -- gerar_documento confere a permissão de visualizar e registra em documentos_gerados
  v_html := public.gerar_documento(p_template_id, p_aluno_id, coalesce(p_valores_manuais, '{}'::jsonb));

  -- pedido anterior ainda não assinado do mesmo modelo/aluno perde a validade (link antigo deixa de abrir)
  update public.assinaturas_documentos s
     set cancelado_em = now()
   where s.aluno_id = p_aluno_id and s.template_id = p_template_id
     and s.assinado_em is null and s.cancelado_em is null;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.assinaturas_documentos (escola_id, aluno_id, template_id, titulo, corpo_html, hash_documento, token)
  values (v_escola_id, p_aluno_id, p_template_id, v_titulo, v_html,
          encode(sha256(convert_to(v_html, 'UTF8')), 'hex'), v_token)
  returning assinaturas_documentos.id into v_id;

  return query select v_id, v_token;
end;
$$;

create or replace function public.cancelar_assinatura_documento(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_escola_id uuid;
  v_assinado timestamptz;
begin
  select s.escola_id, s.assinado_em into v_escola_id, v_assinado
    from public.assinaturas_documentos s where s.id = p_id;
  if v_escola_id is null then
    raise exception 'Pedido de assinatura não encontrado';
  end if;
  if not public.usuario_tem_permissao(v_escola_id, 'relatorios_documentos', 'editar') then
    raise exception 'Sem permissão para cancelar este pedido';
  end if;
  if v_assinado is not null then
    raise exception 'Documento já assinado não pode ser cancelado';
  end if;
  update public.assinaturas_documentos set cancelado_em = now() where id = p_id and cancelado_em is null;
end;
$$;

revoke execute on function public.solicitar_assinatura_documento(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.cancelar_assinatura_documento(uuid) from public, anon;
grant execute on function public.solicitar_assinatura_documento(uuid, uuid, jsonb) to authenticated;
grant execute on function public.cancelar_assinatura_documento(uuid) to authenticated;
