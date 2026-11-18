-- Permite a secretaria gerar manualmente um código de login do app da
-- família (quando o e-mail não chega / cai no spam), pela tela de
-- Diagnóstico. Adiciona o resultado 'gerado_staff' ao log existente.

alter table public.familia_login_tentativas drop constraint familia_login_tentativas_resultado_check;
alter table public.familia_login_tentativas add constraint familia_login_tentativas_resultado_check
  check (resultado in ('nao_cadastrado', 'limite_destino', 'limite_global', 'erro_envio', 'enviado', 'gerado_staff'));
