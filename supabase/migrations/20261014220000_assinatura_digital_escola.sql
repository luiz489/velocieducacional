-- A escola (diretora) assina primeiro, dentro do sistema, logada; só depois o link da família passa a abrir.
-- Permissão nova "assinar" em Relatórios e Documentos, dada ao papel Administrador da Escola.
-- O superadmin do ERP NÃO assina pela escola (a checagem abaixo não usa usuario_tem_permissao, que o libera).

insert into public.permissoes (modulo_id, acao, descricao)
select m.id, 'assinar', 'assinar documentos em nome da escola'
from public.modulos_sistema m
where m.codigo = 'relatorios_documentos'
on conflict (modulo_id, acao) do nothing;

insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, pe.id
from public.papeis p
cross join public.permissoes pe
join public.modulos_sistema m on m.id = pe.modulo_id
where p.nome = 'Administrador da Escola' and m.codigo = 'relatorios_documentos' and pe.acao = 'assinar'
on conflict do nothing;

alter table public.assinaturas_documentos
  add column if not exists escola_assinou_em timestamptz,
  add column if not exists escola_assinante_user_id uuid,
  add column if not exists escola_assinante_nome text,
  add column if not exists escola_assinante_cargo text,
  add column if not exists escola_assinante_ip text,
  add column if not exists escola_assinante_user_agent text,
  add column if not exists escola_assinatura_imagem text;

create or replace function public.assinar_documento_pela_escola(
  p_id uuid,
  p_cargo text,
  p_imagem text
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
    escola_assinatura_imagem = p_imagem
  where id = p_id;
end;
$$;

revoke execute on function public.assinar_documento_pela_escola(uuid, text, text) from public, anon;
grant execute on function public.assinar_documento_pela_escola(uuid, text, text) to authenticated;
