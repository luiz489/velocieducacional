-- Segurança do link de assinatura:
--  1) o CPF digitado pela família precisa bater com o do responsável cadastrado (congelado no pedido);
--     5 tentativas erradas bloqueiam o link até a escola renovar o prazo;
--  2) o link vale 15 dias (contados do pedido e renovados quando a escola assina ou renova o prazo).

alter table public.assinaturas_documentos
  add column if not exists cpf_esperado text,
  add column if not exists cpf_conferido boolean,
  add column if not exists tentativas_invalidas integer not null default 0,
  add column if not exists expira_em timestamptz;

update public.assinaturas_documentos
   set expira_em = criado_em + interval '15 days'
 where expira_em is null and assinado_em is null;

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

  -- CPF do responsável financeiro (contratante) no momento do pedido; vazio = cadastro sem CPF
  select nullif(regexp_replace(coalesce(d.contratante_cpf, ''), '\D', '', 'g'), '') into v_cpf
    from public.v_documento_dados d where d.aluno_id = p_aluno_id limit 1;
  if v_cpf is not null and length(v_cpf) <> 11 then v_cpf := null; end if;

  update public.assinaturas_documentos s
     set cancelado_em = now()
   where s.aluno_id = p_aluno_id and s.template_id = p_template_id
     and s.assinado_em is null and s.cancelado_em is null;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.assinaturas_documentos
    (escola_id, aluno_id, template_id, titulo, corpo_html, hash_documento, token, cpf_esperado, expira_em)
  values (v_escola_id, p_aluno_id, p_template_id, v_titulo, v_html,
          encode(sha256(convert_to(v_html, 'UTF8')), 'hex'), v_token, v_cpf, now() + interval '15 days')
  returning assinaturas_documentos.id into v_id;

  return query select v_id, v_token;
end;
$$;

create or replace function public.renovar_prazo_assinatura(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_escola_id uuid;
  v_assinado timestamptz;
  v_cancelado timestamptz;
begin
  select s.escola_id, s.assinado_em, s.cancelado_em into v_escola_id, v_assinado, v_cancelado
    from public.assinaturas_documentos s where s.id = p_id;
  if v_escola_id is null then raise exception 'Pedido de assinatura não encontrado'; end if;
  if not public.usuario_tem_permissao(v_escola_id, 'relatorios_documentos', 'editar') then
    raise exception 'Sem permissão para renovar este pedido';
  end if;
  if v_assinado is not null then raise exception 'Documento já assinado'; end if;
  if v_cancelado is not null then raise exception 'Este pedido foi cancelado'; end if;
  update public.assinaturas_documentos
     set expira_em = now() + interval '15 days', tentativas_invalidas = 0
   where id = p_id;
end;
$$;

revoke execute on function public.renovar_prazo_assinatura(uuid) from public, anon;
grant execute on function public.renovar_prazo_assinatura(uuid) to authenticated;
revoke execute on function public.solicitar_assinatura_documento(uuid, uuid, jsonb) from public, anon;
grant execute on function public.solicitar_assinatura_documento(uuid, uuid, jsonb) to authenticated;

-- a escola assinando reinicia os 15 dias da família
create or replace function public.assinar_documento_pela_escola(
  p_id uuid,
  p_cargo text,
  p_imagem text,
  p_forma text default 'desenhada',
  p_estilo text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_escola_id uuid;
  v_cancelado timestamptz;
  v_escola_assinou timestamptz;
  v_nome text;
  v_cargo text := btrim(coalesce(p_cargo, ''));
  v_forma text := coalesce(p_forma, 'desenhada');
  v_estilo text := p_estilo;
  v_headers jsonb;
  v_ip text;
  v_ua text;
begin
  select s.escola_id, s.cancelado_em, s.escola_assinou_em
    into v_escola_id, v_cancelado, v_escola_assinou
    from public.assinaturas_documentos s where s.id = p_id for update;
  if v_escola_id is null then
    raise exception 'Pedido de assinatura não encontrado';
  end if;

  if not exists (
    select 1
    from public.usuarios_escolas ue
    join public.papel_permissoes pp on pp.papel_id = ue.papel_id
    join public.permissoes pe on pe.id = pp.permissao_id
    join public.modulos_sistema m on m.id = pe.modulo_id
    where ue.user_id = auth.uid() and ue.escola_id = v_escola_id and ue.ativo = true
      and m.codigo = 'relatorios_documentos' and pe.acao = 'assinar'
  ) then
    raise exception 'Seu usuário não tem permissão para assinar em nome da escola';
  end if;

  if v_cancelado is not null then raise exception 'Este pedido foi cancelado'; end if;
  if v_escola_assinou is not null then raise exception 'A escola já assinou este documento'; end if;
  if length(v_cargo) < 2 or length(v_cargo) > 80 then raise exception 'Informe o cargo de quem assina'; end if;
  if p_imagem is null or length(p_imagem) > 400000 or p_imagem !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' then
    raise exception 'Assinatura inválida. Desenhe de novo no quadro';
  end if;
  if v_forma not in ('desenhada', 'nome', 'iniciais') then
    raise exception 'Forma de assinatura inválida';
  end if;
  if v_forma = 'desenhada' then
    v_estilo := null;
  elsif v_estilo is null or v_estilo not in ('dancing', 'vibes', 'caveat') then
    raise exception 'Estilo de assinatura inválido';
  end if;

  select coalesce(nullif(btrim(pr.full_name), ''), pr.email) into v_nome from public.profiles pr where pr.id = auth.uid();

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;
  v_ip := coalesce(v_headers ->> 'cf-connecting-ip', nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''));
  v_ua := left(v_headers ->> 'user-agent', 300);

  update public.assinaturas_documentos set
    escola_assinou_em = now(),
    escola_assinante_user_id = auth.uid(),
    escola_assinante_nome = v_nome,
    escola_assinante_cargo = v_cargo,
    escola_assinante_ip = v_ip,
    escola_assinante_user_agent = v_ua,
    escola_assinatura_imagem = p_imagem,
    escola_assinatura_forma = v_forma,
    escola_assinatura_estilo = v_estilo,
    expira_em = now() + interval '15 days',
    tentativas_invalidas = 0
  where id = p_id;
end;
$$;

revoke execute on function public.assinar_documento_pela_escola(uuid, text, text, text, text) from public, anon;
grant execute on function public.assinar_documento_pela_escola(uuid, text, text, text, text) to authenticated;
