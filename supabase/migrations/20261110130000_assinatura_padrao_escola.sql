-- Assinatura padrão da escola: a diretoria (ou quem tiver a permissão 'assinar') pode guardar uma
-- imagem já pronta (ex.: assinatura digitalizada) e usar com um clique, em vez de desenhar/digitar
-- em cada contrato. Pedido do Aquarela (Diego, 10/11/2026): "deixa lá a assinatura salva, quem for
-- assinar marca o clique". O registro continua mostrando quem clicou, quando e de que IP — é um ato
-- de quem assina, só que rápido (ver [[veloci-educacional-assinatura-digital]]).
--
-- O arquivo em si é enviado pela tela (Configurações), igual ao logo, no bucket escola-logos
-- (já tem RLS: upload/alterar exige 'configuracoes:editar'); aqui só guardamos o caminho.

alter table public.escolas add column if not exists assinatura_padrao_path text;
alter table public.escolas add column if not exists assinatura_padrao_cargo text;

CREATE OR REPLACE FUNCTION public.assinar_documento_pela_escola(
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
  if v_forma not in ('desenhada', 'nome', 'iniciais', 'padrao') then
    raise exception 'Forma de assinatura inválida';
  end if;
  if v_forma in ('desenhada', 'padrao') then
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
