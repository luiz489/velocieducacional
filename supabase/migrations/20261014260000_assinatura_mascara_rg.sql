-- O RG do responsável também não aparece no texto exibido pelo link público (a escola vê tudo no sistema).
-- Guarda o RG do cadastro no momento do pedido para a função pública saber o que mascarar.

alter table public.assinaturas_documentos add column if not exists rg_esperado text;

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
  v_cpf text;
  v_rg text;
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

  v_html := public.gerar_documento(p_template_id, p_aluno_id, coalesce(p_valores_manuais, '{}'::jsonb));

  -- CPF e RG do responsável financeiro (contratante) no momento do pedido
  select nullif(regexp_replace(coalesce(d.contratante_cpf, ''), '\D', '', 'g'), ''),
         nullif(btrim(coalesce(d.contratante_rg, '')), '')
    into v_cpf, v_rg
    from public.v_documento_dados d where d.aluno_id = p_aluno_id limit 1;
  if v_cpf is not null and length(v_cpf) <> 11 then v_cpf := null; end if;

  update public.assinaturas_documentos s
     set cancelado_em = now()
   where s.aluno_id = p_aluno_id and s.template_id = p_template_id
     and s.assinado_em is null and s.cancelado_em is null;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.assinaturas_documentos
    (escola_id, aluno_id, template_id, titulo, corpo_html, hash_documento, token, cpf_esperado, rg_esperado, expira_em)
  values (v_escola_id, p_aluno_id, p_template_id, v_titulo, v_html,
          encode(sha256(convert_to(v_html, 'UTF8')), 'hex'), v_token, v_cpf, v_rg, now() + interval '15 days')
  returning assinaturas_documentos.id into v_id;

  return query select v_id, v_token;
end;
$$;

revoke execute on function public.solicitar_assinatura_documento(uuid, uuid, jsonb) from public, anon;
grant execute on function public.solicitar_assinatura_documento(uuid, uuid, jsonb) to authenticated;
