-- Fase 2 do fluxo Sicredi: registro automático de boletos na matrícula e baixa no
-- banco quando a parcela some / é paga por fora / muda. Tudo passa por uma fila
-- (cobranca_fila) processada pela edge function sicredi-processar-fila.
-- Nada é enfileirado pra registro enquanto escolas_integracao_bancaria.registrar_na_matricula
-- estiver false (padrão).

create extension if not exists pg_net with schema extensions;

alter table public.cobranca_fila
  add column if not exists proxima_tentativa_em timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Baixa por webhook: o valor liquidado pelo banco prevalece sobre a regra de
-- pontualidade (que reescreve valor = valor_integral em pagamento atrasado).
-- ---------------------------------------------------------------------------
create or replace function public.baixar_titulo_por_cobranca_bancaria(
  p_escola_id uuid,
  p_gateway_cobranca_id text,
  p_valor_pago numeric,
  p_data_pagamento date,
  p_conta_bancaria_id uuid default null,
  p_forma_pagamento text default 'Boleto',
  p_ref_evento text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_titulo public.financeiro;
begin
  select * into v_titulo from public.financeiro
  where escola_id = p_escola_id and gateway_cobranca_id = p_gateway_cobranca_id
  for update;

  if v_titulo.id is null then
    raise notice 'Nenhum título encontrado para a cobrança % na escola %', p_gateway_cobranca_id, p_escola_id;
    return null;
  end if;

  if v_titulo.status = 'Pago' then
    return v_titulo.id;
  end if;

  perform set_config('app.manter_desconto_pontualidade', 'true', true);

  update public.financeiro
  set status = 'Pago',
      data_pagamento = p_data_pagamento,
      forma_pagamento = p_forma_pagamento,
      gateway_status = 'liquidado',
      valor_antes_pagamento = valor,
      valor = case when coalesce(p_valor_pago, 0) > 0 then p_valor_pago else valor end
  where id = v_titulo.id;

  if p_conta_bancaria_id is not null then
    insert into public.movimentacoes_bancarias
      (conta_bancaria_id, escola_id, data, descricao, valor, natureza, origem,
       financeiro_id, identificada, gateway_ref)
    values
      (p_conta_bancaria_id, v_titulo.escola_id, p_data_pagamento,
       v_titulo.descricao || ' (boleto ' || p_gateway_cobranca_id || ')',
       p_valor_pago, 'credito', 'api_recebimento',
       v_titulo.id, true, coalesce(p_ref_evento, p_gateway_cobranca_id));
  end if;

  return v_titulo.id;
end;
$function$;

revoke execute on function public.baixar_titulo_por_cobranca_bancaria(uuid, text, numeric, date, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.baixar_titulo_por_cobranca_bancaria(uuid, text, numeric, date, uuid, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- A escola quer registro automático?
-- ---------------------------------------------------------------------------
create or replace function public.cobranca_registro_automatico(p_escola_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((
    select ativo and registrar_na_matricula and tem_credenciais
    from public.escolas_integracao_bancaria where escola_id = p_escola_id
  ), false);
$$;
revoke execute on function public.cobranca_registro_automatico(uuid) from public, anon, authenticated;
grant execute on function public.cobranca_registro_automatico(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Gatilhos em financeiro
-- ---------------------------------------------------------------------------
create or replace function public.trg_financeiro_cobranca_ins()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if NEW.status in ('Pendente', 'Atrasado') and coalesce(NEW.valor, 0) > 0
     and NEW.gateway_cobranca_id is null and NEW.gateway_status is null
     and public.cobranca_registro_automatico(NEW.escola_id) then
    insert into public.cobranca_fila (escola_id, financeiro_id, operacao)
    values (NEW.escola_id, NEW.id, 'registrar')
    on conflict do nothing;
  end if;
  return NEW;
end;
$function$;

create or replace function public.trg_financeiro_cobranca_upd()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_limpar boolean := false;
begin
  -- 1) boleto vivo no banco e o título foi pago POR FORA (baixa manual): cancela o boleto
  if OLD.gateway_cobranca_id is not null and OLD.gateway_status = 'registrado'
     and NEW.status = 'Pago' and NEW.gateway_status = 'registrado' then
    insert into public.cobranca_fila (escola_id, financeiro_id, operacao, nosso_numero)
    values (OLD.escola_id, OLD.id, 'baixar', OLD.gateway_cobranca_id);
    NEW.gateway_status := 'baixado';
    return NEW;
  end if;

  -- 2) boleto vivo e o vencimento ou o valor cheio mudaram: baixa o antigo e registra outro
  --    (o Sicredi não altera valor de boleto registrado). Mudança só em "valor" (regra de
  --    pontualidade) não conta: o boleto já cobra o valor cheio depois do vencimento.
  if OLD.gateway_cobranca_id is not null and OLD.gateway_status = 'registrado'
     and NEW.status in ('Pendente', 'Atrasado')
     and (NEW.data_vencimento is distinct from OLD.data_vencimento
          or NEW.valor_integral is distinct from OLD.valor_integral) then
    insert into public.cobranca_fila (escola_id, financeiro_id, operacao, nosso_numero)
    values (OLD.escola_id, OLD.id, 'baixar', OLD.gateway_cobranca_id);
    v_limpar := true;
  end if;

  -- 3) desfez a confirmação de um pagamento manual (boleto já baixado por nós): precisa de boleto novo
  if OLD.gateway_status = 'baixado' and OLD.status = 'Pago' and NEW.status in ('Pendente', 'Atrasado') then
    v_limpar := true;
  end if;

  if v_limpar then
    NEW.gateway_cobranca_id := null;
    NEW.boleto_linha_digitavel := null;
    NEW.pix_qr_code := null;
    NEW.gateway_txid := null;
    NEW.gateway_status := null;
    NEW.gateway_registrado_em := null;
    NEW.gateway_erro := null;
    if coalesce(NEW.valor, 0) > 0 and public.cobranca_registro_automatico(NEW.escola_id) then
      insert into public.cobranca_fila (escola_id, financeiro_id, operacao)
      values (NEW.escola_id, NEW.id, 'registrar')
      on conflict do nothing;
    end if;
  end if;

  return NEW;
end;
$function$;

create or replace function public.trg_financeiro_cobranca_del()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- nunca deixar boleto vivo no banco sem título correspondente
  if OLD.gateway_cobranca_id is not null and OLD.gateway_status = 'registrado' then
    insert into public.cobranca_fila (escola_id, financeiro_id, operacao, nosso_numero)
    values (OLD.escola_id, null, 'baixar', OLD.gateway_cobranca_id);
  end if;
  -- registros pendentes dessa parcela perdem o sentido
  delete from public.cobranca_fila
  where financeiro_id = OLD.id and operacao = 'registrar' and status in ('pendente', 'erro');
  return OLD;
end;
$function$;

drop trigger if exists trg_financeiro_cobranca_ins on public.financeiro;
create trigger trg_financeiro_cobranca_ins after insert on public.financeiro
  for each row execute function public.trg_financeiro_cobranca_ins();

drop trigger if exists trg_financeiro_cobranca_upd on public.financeiro;
create trigger trg_financeiro_cobranca_upd before update on public.financeiro
  for each row execute function public.trg_financeiro_cobranca_upd();

drop trigger if exists trg_financeiro_cobranca_del on public.financeiro;
create trigger trg_financeiro_cobranca_del before delete on public.financeiro
  for each row execute function public.trg_financeiro_cobranca_del();

-- ---------------------------------------------------------------------------
-- Fila: reservar lote (service_role) e ações da tela
-- ---------------------------------------------------------------------------
create or replace function public.cobranca_fila_reservar(p_limite integer default 30, p_escola_id uuid default null)
returns setof public.cobranca_fila
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- itens que ficaram "processando" por mais de 10 min (função caiu no meio) voltam pra fila
  update public.cobranca_fila set status = 'pendente', atualizado_em = now()
  where status = 'processando' and atualizado_em < now() - interval '10 minutes';

  return query
  with pegos as (
    select id from public.cobranca_fila
    where status = 'pendente' and proxima_tentativa_em <= now()
      and (p_escola_id is null or escola_id = p_escola_id)
    order by criado_em
    limit greatest(p_limite, 1)
    for update skip locked
  )
  update public.cobranca_fila f
  set status = 'processando', tentativas = f.tentativas + 1, atualizado_em = now()
  from pegos where f.id = pegos.id
  returning f.*;
end;
$function$;
revoke execute on function public.cobranca_fila_reservar(integer, uuid) from public, anon, authenticated;
grant execute on function public.cobranca_fila_reservar(integer, uuid) to service_role;

-- títulos que ainda não têm boleto no banco (prévia do "registrar pendentes")
create or replace function public.cobranca_contar_pendentes(p_escola_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.usuario_tem_permissao(p_escola_id, 'integracao_bancaria', 'visualizar') then
    raise exception 'Sem permissão';
  end if;
  return (
    select count(*)::int from public.financeiro f
    where f.escola_id = p_escola_id
      and f.status in ('Pendente', 'Atrasado') and coalesce(f.valor, 0) > 0
      and f.gateway_cobranca_id is null
      and coalesce(f.gateway_status, 'erro') = 'erro'
      and not exists (select 1 from public.cobranca_fila q
                      where q.financeiro_id = f.id and q.operacao = 'registrar' and q.status in ('pendente', 'processando'))
  );
end;
$function$;
revoke execute on function public.cobranca_contar_pendentes(uuid) from public, anon;
grant execute on function public.cobranca_contar_pendentes(uuid) to authenticated, service_role;

create or replace function public.cobranca_enfileirar_pendentes(p_escola_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_qtd integer;
begin
  if not public.usuario_tem_permissao(p_escola_id, 'integracao_bancaria', 'editar') then
    raise exception 'Sem permissão para registrar boletos desta escola';
  end if;
  if not exists (select 1 from public.escolas_integracao_bancaria where escola_id = p_escola_id and ativo and tem_credenciais) then
    raise exception 'A integração com o Sicredi não está configurada nesta escola';
  end if;

  with novos as (
    insert into public.cobranca_fila (escola_id, financeiro_id, operacao)
    select f.escola_id, f.id, 'registrar' from public.financeiro f
    where f.escola_id = p_escola_id
      and f.status in ('Pendente', 'Atrasado') and coalesce(f.valor, 0) > 0
      and f.gateway_cobranca_id is null
      and coalesce(f.gateway_status, 'erro') = 'erro'
      and not exists (select 1 from public.cobranca_fila q
                      where q.financeiro_id = f.id and q.operacao = 'registrar' and q.status in ('pendente', 'processando'))
    on conflict do nothing
    returning 1
  )
  select count(*) into v_qtd from novos;
  return v_qtd;
end;
$function$;
revoke execute on function public.cobranca_enfileirar_pendentes(uuid) from public, anon;
grant execute on function public.cobranca_enfileirar_pendentes(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Cron: chama a edge function a cada minuto, só quando há trabalho na fila.
-- O segredo fica no Vault; a função valida via sicredi_cron_ok().
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sicredi_cron_secret') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'sicredi_cron_secret');
  end if;
end $$;

create or replace function public.sicredi_cron_ok(p_segredo text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'vault'
as $$
  select coalesce(p_segredo <> '' and p_segredo = (select decrypted_secret from vault.decrypted_secrets where name = 'sicredi_cron_secret'), false);
$$;
revoke execute on function public.sicredi_cron_ok(text) from public, anon, authenticated;
grant execute on function public.sicredi_cron_ok(text) to service_role;

select cron.unschedule('sicredi-processar-fila') where exists (select 1 from cron.job where jobname = 'sicredi-processar-fila');
select cron.schedule(
  'sicredi-processar-fila',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://mqjsfmhqxdbtanrqizvr.supabase.co/functions/v1/sicredi-processar-fila',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sicredi_cron_secret')
    ),
    body := '{}'::jsonb
  )
  where exists (
    select 1 from public.cobranca_fila
    where status in ('pendente', 'processando') and proxima_tentativa_em <= now()
  );
  $cron$
);
