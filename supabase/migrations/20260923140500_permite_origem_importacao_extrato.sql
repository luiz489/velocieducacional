-- movimentacoes_bancarias_origem_check só permitia 'api_recebimento',
-- 'api_pagamento' e 'ajuste_manual' - a importação de extrato (OFX/CSV)
-- precisa gravar 'importacao_ofx'/'importacao_csv' pra distinguir a origem
-- na tela do Extrato.

alter table public.movimentacoes_bancarias drop constraint movimentacoes_bancarias_origem_check;

alter table public.movimentacoes_bancarias add constraint movimentacoes_bancarias_origem_check
  check (origem = any (array['api_recebimento','api_pagamento','ajuste_manual','importacao_ofx','importacao_csv']));
