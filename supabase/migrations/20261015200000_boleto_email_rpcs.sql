-- A tela precisa ler as opções de e-mail (as colunas sensíveis continuam fechadas).
grant select (email_boleto_ativo, email_boleto_dias_antes, email_responder_para)
  on public.escolas_integracao_bancaria to authenticated;

-- Salva as opções de envio por e-mail do boleto (só quem pode editar a integração bancária).
create or replace function public.salvar_email_boleto(
  p_escola_id uuid,
  p_ativo boolean,
  p_dias_antes integer,
  p_responder_para text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.usuario_tem_permissao(p_escola_id, 'integracao_bancaria', 'editar') then
    raise exception 'Sem permissão para configurar a integração bancária desta escola';
  end if;
  if p_dias_antes is null or p_dias_antes < 1 or p_dias_antes > 30 then
    raise exception 'Informe de 1 a 30 dias de antecedência';
  end if;
  if coalesce(trim(p_responder_para), '') <> '' and trim(p_responder_para) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail de resposta inválido';
  end if;

  update escolas_integracao_bancaria
     set email_boleto_ativo = coalesce(p_ativo, false),
         email_boleto_dias_antes = p_dias_antes,
         email_responder_para = nullif(trim(coalesce(p_responder_para, '')), '')
   where escola_id = p_escola_id;

  if not found then
    raise exception 'Configure primeiro a integração com o Sicredi';
  end if;
end;
$$;

revoke execute on function public.salvar_email_boleto(uuid, boolean, integer, text) from public, anon;
grant execute on function public.salvar_email_boleto(uuid, boolean, integer, text) to authenticated, service_role;

-- Situação do envio de e-mail por título (para o selo "e-mail enviado" no Financeiro).
create or replace function public.boleto_email_situacao(p_escola_id uuid)
returns table (financeiro_id uuid, email_enviado_em timestamptz, email_destino text, email_erro text, acessos integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.usuario_tem_permissao(p_escola_id, 'financeiro', 'visualizar') then
    raise exception 'Sem permissão para ver o financeiro desta escola';
  end if;
  return query
    select b.financeiro_id, b.email_enviado_em, b.email_destino, b.email_erro, b.acessos
      from boleto_links b
     where b.escola_id = p_escola_id;
end;
$$;

revoke execute on function public.boleto_email_situacao(uuid) from public, anon;
grant execute on function public.boleto_email_situacao(uuid) to authenticated, service_role;
