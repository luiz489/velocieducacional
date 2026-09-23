-- Suporte à importação de extrato bancário (OFX/CSV): evita duplicar uma
-- movimentação já importada antes (mesmo FITID do OFX, ou mesma chave
-- sintética gerada pro CSV) dentro da mesma conta bancária.

create unique index if not exists movimentacoes_bancarias_conta_gateway_ref_uniq
  on public.movimentacoes_bancarias (conta_bancaria_id, gateway_ref)
  where gateway_ref is not null;
