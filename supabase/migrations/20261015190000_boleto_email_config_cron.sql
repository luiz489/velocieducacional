-- Envio do boleto por e-mail (via n8n). Desligado por padrão em todas as escolas.
alter table public.escolas_integracao_bancaria
  add column if not exists email_boleto_ativo boolean not null default false,
  add column if not exists email_boleto_dias_antes integer not null default 5
    check (email_boleto_dias_antes between 1 and 30),
  add column if not exists email_responder_para text;

-- segredo compartilhado com o fluxo do n8n (gerado aqui; nunca sai do banco por RPC de cliente)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'email_n8n_edu_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'email_n8n_edu_secret',
      'Segredo do webhook de e-mail do Educacional no n8n'
    );
  end if;
end $$;

create or replace function public.email_n8n_segredo()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'email_n8n_edu_secret' limit 1;
$$;

revoke execute on function public.email_n8n_segredo() from public, anon, authenticated;
grant execute on function public.email_n8n_segredo() to service_role;

-- todo dia às 11:00 UTC (08:00 em Brasília)
select cron.unschedule('boleto-enviar-emails') where exists (select 1 from cron.job where jobname = 'boleto-enviar-emails');
select cron.schedule(
  'boleto-enviar-emails',
  '0 11 * * *',
  $cron$
  select net.http_post(
    url := 'https://mqjsfmhqxdbtanrqizvr.supabase.co/functions/v1/boleto-enviar-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sicredi_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);
