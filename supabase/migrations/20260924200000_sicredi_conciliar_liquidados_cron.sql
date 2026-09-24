-- Rede de segurança do webhook: 2x por dia consulta os boletos liquidados no Sicredi (escolas em produção).
-- 09:00 e 21:00 UTC = 06:00 e 18:00 em Brasília.
-- pg_net desiste em 5 s por padrão; as funções do Sicredi podem levar mais: timeout de 120 s.
select cron.unschedule('sicredi-conciliar-liquidados') where exists (select 1 from cron.job where jobname = 'sicredi-conciliar-liquidados');
select cron.schedule(
  'sicredi-conciliar-liquidados',
  '0 9,21 * * *',
  $cron$
  select net.http_post(
    url := 'https://mqjsfmhqxdbtanrqizvr.supabase.co/functions/v1/sicredi-conciliar-liquidados',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sicredi_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);

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
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  where exists (
    select 1 from public.cobranca_fila
    where status in ('pendente', 'processando') and proxima_tentativa_em <= now()
  );
  $cron$
);
