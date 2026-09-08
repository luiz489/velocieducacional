-- Saldo bancario / espelho do banco (Fase 1)
--
-- Contas bancarias com saldo inicial + saldo atual (mantido por trigger), e um
-- extrato de movimentacoes. O saldo so muda por movimentacao (retorno do banco,
-- ajuste manual) - faturar/dar baixa no sistema nao mexe no saldo.
-- Movimento do banco sem titulo => "a classificar": o usuario vincula a um
-- titulo existente ou cria um (conta a pagar / receita avulsa) e da baixa.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  chave_pix TEXT,
  saldo_inicial NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_saldo_inicial DATE NOT NULL DEFAULT CURRENT_DATE,
  saldo_atual NUMERIC(14,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.receitas_avulsas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  pagador TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  valor NUMERIC(14,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente','Pago','Cancelado')),
  data_recebimento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.movimentacoes_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT,
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  natureza TEXT NOT NULL CHECK (natureza IN ('credito','debito')),
  origem TEXT NOT NULL DEFAULT 'ajuste_manual'
    CHECK (origem IN ('api_recebimento','api_pagamento','ajuste_manual')),
  financeiro_id UUID REFERENCES public.financeiro(id) ON DELETE SET NULL,
  conta_a_pagar_id UUID REFERENCES public.contas_a_pagar(id) ON DELETE SET NULL,
  receita_avulsa_id UUID REFERENCES public.receitas_avulsas(id) ON DELETE SET NULL,
  identificada BOOLEAN NOT NULL DEFAULT true,
  gateway_ref TEXT,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX movimentacoes_bancarias_conta_idx ON public.movimentacoes_bancarias(conta_bancaria_id, data);

CREATE TRIGGER contas_bancarias_updated_at BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER receitas_avulsas_updated_at BEFORE UPDATE ON public.receitas_avulsas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Saldo atual = saldo inicial + creditos - debitos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalcular_saldo_conta_bancaria(p_conta_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  UPDATE public.contas_bancarias c
  SET saldo_atual = c.saldo_inicial + COALESCE((
    SELECT sum(CASE WHEN m.natureza = 'credito' THEN m.valor ELSE -m.valor END)
    FROM public.movimentacoes_bancarias m
    WHERE m.conta_bancaria_id = c.id
  ), 0)
  WHERE c.id = p_conta_id;
$function$;

CREATE OR REPLACE FUNCTION public.trg_mov_bancaria_recalcula_saldo()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.recalcular_saldo_conta_bancaria(COALESCE(NEW.conta_bancaria_id, OLD.conta_bancaria_id));
  IF TG_OP = 'UPDATE' AND NEW.conta_bancaria_id IS DISTINCT FROM OLD.conta_bancaria_id THEN
    PERFORM public.recalcular_saldo_conta_bancaria(OLD.conta_bancaria_id);
  END IF;
  RETURN NULL;
END;
$function$;

CREATE TRIGGER on_mov_bancaria_change
  AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.trg_mov_bancaria_recalcula_saldo();

CREATE OR REPLACE FUNCTION public.trg_conta_bancaria_saldo_inicial()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.recalcular_saldo_conta_bancaria(NEW.id);
  RETURN NULL;
END;
$function$;

CREATE TRIGGER on_conta_bancaria_saldo_inicial
  AFTER INSERT OR UPDATE OF saldo_inicial ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.trg_conta_bancaria_saldo_inicial();

-- ---------------------------------------------------------------------------
-- Permissao
-- ---------------------------------------------------------------------------
INSERT INTO public.modulos_sistema (codigo, nome, ordem)
VALUES ('conciliacao', 'Conciliação Bancária', 16)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.permissoes (modulo_id, acao)
SELECT m.id, a.acao
FROM public.modulos_sistema m
CROSS JOIN (VALUES ('visualizar'),('criar'),('editar'),('excluir')) AS a(acao)
WHERE m.codigo = 'conciliacao'
ON CONFLICT DO NOTHING;

INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT pa.id, pe.id
FROM public.papeis pa
JOIN public.permissoes pe ON pe.modulo_id = (SELECT id FROM public.modulos_sistema WHERE codigo = 'conciliacao')
WHERE pa.nome IN ('Administrador da Escola', 'Financeiro')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY contas_bancarias_select ON public.contas_bancarias FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'conciliacao', 'visualizar'));
CREATE POLICY contas_bancarias_insert ON public.contas_bancarias FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'conciliacao', 'criar'));
CREATE POLICY contas_bancarias_update ON public.contas_bancarias FOR UPDATE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'conciliacao', 'editar'))
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'conciliacao', 'editar'));
CREATE POLICY contas_bancarias_delete ON public.contas_bancarias FOR DELETE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'conciliacao', 'excluir'));

ALTER TABLE public.receitas_avulsas ENABLE ROW LEVEL SECURITY;
CREATE POLICY receitas_avulsas_select ON public.receitas_avulsas FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'conciliacao', 'visualizar'));
CREATE POLICY receitas_avulsas_insert ON public.receitas_avulsas FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'conciliacao', 'criar'));
CREATE POLICY receitas_avulsas_update ON public.receitas_avulsas FOR UPDATE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'conciliacao', 'editar'))
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'conciliacao', 'editar'));
CREATE POLICY receitas_avulsas_delete ON public.receitas_avulsas FOR DELETE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'conciliacao', 'excluir'));

ALTER TABLE public.movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY movimentacoes_bancarias_select ON public.movimentacoes_bancarias FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'conciliacao', 'visualizar'));
CREATE POLICY movimentacoes_bancarias_insert ON public.movimentacoes_bancarias FOR INSERT TO authenticated
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'conciliacao', 'editar'));
CREATE POLICY movimentacoes_bancarias_update ON public.movimentacoes_bancarias FOR UPDATE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'conciliacao', 'editar'))
  WITH CHECK (public.usuario_tem_permissao(escola_id, 'conciliacao', 'editar'));
CREATE POLICY movimentacoes_bancarias_delete ON public.movimentacoes_bancarias FOR DELETE TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'conciliacao', 'excluir'));

-- ---------------------------------------------------------------------------
-- Classificar movimento "a classificar"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mov_bancaria_vincular_titulo(
  p_mov_id uuid,
  p_financeiro_id uuid DEFAULT NULL,
  p_conta_a_pagar_id uuid DEFAULT NULL,
  p_receita_avulsa_id uuid DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mov public.movimentacoes_bancarias;
BEGIN
  SELECT * INTO v_mov FROM public.movimentacoes_bancarias WHERE id = p_mov_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimento não encontrado'; END IF;
  IF NOT public.usuario_tem_permissao(v_mov.escola_id, 'conciliacao', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF p_financeiro_id IS NOT NULL THEN
    IF v_mov.natureza <> 'credito' THEN RAISE EXCEPTION 'Título a receber só vincula a crédito'; END IF;
    UPDATE public.financeiro SET status = 'Pago', data_pagamento = v_mov.data
    WHERE id = p_financeiro_id AND escola_id = v_mov.escola_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Título a receber não encontrado nesta escola'; END IF;
    UPDATE public.movimentacoes_bancarias
    SET financeiro_id = p_financeiro_id, identificada = true, origem = 'api_recebimento'
    WHERE id = p_mov_id;

  ELSIF p_receita_avulsa_id IS NOT NULL THEN
    IF v_mov.natureza <> 'credito' THEN RAISE EXCEPTION 'Receita avulsa só vincula a crédito'; END IF;
    UPDATE public.receitas_avulsas SET status = 'Pago', data_recebimento = v_mov.data
    WHERE id = p_receita_avulsa_id AND escola_id = v_mov.escola_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Receita avulsa não encontrada nesta escola'; END IF;
    UPDATE public.movimentacoes_bancarias
    SET receita_avulsa_id = p_receita_avulsa_id, identificada = true
    WHERE id = p_mov_id;

  ELSIF p_conta_a_pagar_id IS NOT NULL THEN
    IF v_mov.natureza <> 'debito' THEN RAISE EXCEPTION 'Conta a pagar só vincula a débito'; END IF;
    UPDATE public.contas_a_pagar SET status = 'Pago', data_pagamento = v_mov.data
    WHERE id = p_conta_a_pagar_id AND escola_id = v_mov.escola_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Conta a pagar não encontrada nesta escola'; END IF;
    UPDATE public.movimentacoes_bancarias
    SET conta_a_pagar_id = p_conta_a_pagar_id, identificada = true, origem = 'api_pagamento'
    WHERE id = p_mov_id;

  ELSE
    RAISE EXCEPTION 'Informe um título para vincular';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mov_bancaria_criar_e_vincular(
  p_mov_id uuid,
  p_categoria text,
  p_descricao text,
  p_terceiro text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mov public.movimentacoes_bancarias;
  v_novo_id uuid;
BEGIN
  SELECT * INTO v_mov FROM public.movimentacoes_bancarias WHERE id = p_mov_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimento não encontrado'; END IF;
  IF NOT public.usuario_tem_permissao(v_mov.escola_id, 'conciliacao', 'editar') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_mov.natureza = 'debito' THEN
    INSERT INTO public.contas_a_pagar (escola_id, fornecedor, descricao, valor, categoria, data_vencimento, data_pagamento, status)
    VALUES (v_mov.escola_id, COALESCE(NULLIF(p_terceiro,''),'—'), COALESCE(NULLIF(p_descricao,''), v_mov.descricao, 'Pagamento avulso'),
            v_mov.valor, COALESCE(NULLIF(p_categoria,''),'Outros'), v_mov.data, v_mov.data, 'Pago')
    RETURNING id INTO v_novo_id;
    UPDATE public.movimentacoes_bancarias
    SET conta_a_pagar_id = v_novo_id, identificada = true, origem = 'api_pagamento'
    WHERE id = p_mov_id;
  ELSE
    INSERT INTO public.receitas_avulsas (escola_id, pagador, descricao, categoria, valor, data, status, data_recebimento)
    VALUES (v_mov.escola_id, NULLIF(p_terceiro,''), COALESCE(NULLIF(p_descricao,''), v_mov.descricao, 'Recebimento avulso'),
            COALESCE(NULLIF(p_categoria,''),'Outros'), v_mov.valor, v_mov.data, 'Pago', v_mov.data)
    RETURNING id INTO v_novo_id;
    UPDATE public.movimentacoes_bancarias
    SET receita_avulsa_id = v_novo_id, identificada = true, origem = 'api_recebimento'
    WHERE id = p_mov_id;
  END IF;

  RETURN v_novo_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Webhooks (Fase 2): quando informada a conta, ja lancam a movimentacao
-- (dropa as assinaturas antigas - ganharam parametro novo)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.baixar_titulo_por_cobranca_bancaria(text, numeric, date);
DROP FUNCTION IF EXISTS public.confirmar_pagamento_bancario(text, text);

CREATE OR REPLACE FUNCTION public.baixar_titulo_por_cobranca_bancaria(
  p_gateway_cobranca_id text,
  p_valor_pago numeric,
  p_data_pagamento date,
  p_conta_bancaria_id uuid DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_titulo public.financeiro;
BEGIN
  SELECT * INTO v_titulo FROM public.financeiro
  WHERE gateway_cobranca_id = p_gateway_cobranca_id AND status != 'Pago'
  LIMIT 1;

  IF v_titulo.id IS NULL THEN
    RAISE NOTICE 'Nenhum título pendente encontrado para a cobrança %', p_gateway_cobranca_id;
    RETURN NULL;
  END IF;

  UPDATE public.financeiro
  SET status = 'Pago', data_pagamento = p_data_pagamento
  WHERE id = v_titulo.id;

  IF p_conta_bancaria_id IS NOT NULL THEN
    INSERT INTO public.movimentacoes_bancarias
      (conta_bancaria_id, escola_id, data, descricao, valor, natureza, origem, financeiro_id, identificada, gateway_ref)
    VALUES
      (p_conta_bancaria_id, v_titulo.escola_id, p_data_pagamento, v_titulo.descricao,
       p_valor_pago, 'credito', 'api_recebimento', v_titulo.id, true, p_gateway_cobranca_id);
  END IF;

  RETURN v_titulo.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento_bancario(
  p_gateway_pagamento_id text,
  p_comprovante_url text DEFAULT NULL,
  p_conta_bancaria_id uuid DEFAULT NULL,
  p_data date DEFAULT CURRENT_DATE
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_conta public.contas_a_pagar;
BEGIN
  SELECT * INTO v_conta FROM public.contas_a_pagar
  WHERE gateway_pagamento_id = p_gateway_pagamento_id
  LIMIT 1;

  IF v_conta.id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.contas_a_pagar
  SET status_envio_banco = 'efetivado', efetivado_em = now(),
      status = 'Pago', data_pagamento = p_data,
      comprovante_url = COALESCE(p_comprovante_url, comprovante_url)
  WHERE id = v_conta.id;

  IF p_conta_bancaria_id IS NOT NULL THEN
    INSERT INTO public.movimentacoes_bancarias
      (conta_bancaria_id, escola_id, data, descricao, valor, natureza, origem, conta_a_pagar_id, identificada, gateway_ref)
    VALUES
      (p_conta_bancaria_id, v_conta.escola_id, p_data, v_conta.descricao,
       v_conta.valor, 'debito', 'api_pagamento', v_conta.id, true, p_gateway_pagamento_id);
  END IF;

  RETURN v_conta.id;
END;
$function$;
