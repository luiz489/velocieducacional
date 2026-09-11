-- ============================================================
-- Código de escola no formato EEUU
--   EE = empresa (grupo econômico, ou a própria escola se avulsa)
--   UU = unidade dentro da empresa (01 = matriz, pela ordem de criação)
-- Ex.: grupo Colégio DM = empresa 01 -> matriz 0101, filial 0102.
-- Escola inativa não recebe código (ganha quando reativada).
-- Substitui os códigos automáticos antigos (DMNU-ac44 etc.).
-- ============================================================

ALTER TABLE public.grupos_economicos ADD COLUMN IF NOT EXISTS numero smallint;
ALTER TABLE public.escolas ADD COLUMN IF NOT EXISTS numero_empresa smallint;   -- só p/ escola sem grupo
ALTER TABLE public.escolas ADD COLUMN IF NOT EXISTS numero_unidade smallint;

-- Próximo número de empresa livre (considera grupos e escolas avulsas)
CREATE OR REPLACE FUNCTION public.proximo_numero_empresa()
RETURNS smallint
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT (COALESCE(GREATEST(
    (SELECT max(numero) FROM public.grupos_economicos),
    (SELECT max(numero_empresa) FROM public.escolas WHERE grupo_economico_id IS NULL)
  ), 0) + 1)::smallint;
$$;

CREATE OR REPLACE FUNCTION public.montar_codigo_escola(p_empresa smallint, p_unidade smallint)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_empresa IS NULL OR p_unidade IS NULL THEN NULL
    ELSE lpad(p_empresa::text, 2, '0') || lpad(p_unidade::text, 2, '0')
  END;
$$;

-- ---------- Backfill (antes de criar o trigger) ----------

-- Grupo do Colégio DM = empresa 01 (confirmado pelo dono)
UPDATE public.grupos_economicos SET numero = 1
WHERE id = '3a28eefe-0ee5-424e-bd55-35ec74f57f8d';

-- Demais grupos COM ao menos uma escola ativa: sequência a partir de 2, por criação
WITH g AS (
  SELECT ge.id, (row_number() OVER (ORDER BY ge.criado_em) + 1)::smallint AS n
  FROM public.grupos_economicos ge
  WHERE ge.numero IS NULL
    AND EXISTS (SELECT 1 FROM public.escolas e WHERE e.grupo_economico_id = ge.id AND e.ativo)
)
UPDATE public.grupos_economicos ge SET numero = g.n FROM g WHERE ge.id = g.id;

UPDATE public.grupos_economicos
SET codigo = CASE WHEN numero IS NOT NULL THEN lpad(numero::text, 2, '0') END;

-- Escolas avulsas ativas: cada uma é uma empresa, depois do maior número de grupo
WITH base AS (SELECT COALESCE(max(numero), 0)::smallint AS m FROM public.grupos_economicos),
ea AS (
  SELECT e.id, ((SELECT m FROM base) + row_number() OVER (ORDER BY e.criado_em))::smallint AS n
  FROM public.escolas e
  WHERE e.grupo_economico_id IS NULL AND e.ativo
)
UPDATE public.escolas e SET numero_empresa = ea.n FROM ea WHERE e.id = ea.id;

-- Unidade dentro do grupo: escolas ativas, ordem de criação
WITH u AS (
  SELECT id, (row_number() OVER (PARTITION BY grupo_economico_id ORDER BY criado_em))::smallint AS n
  FROM public.escolas
  WHERE grupo_economico_id IS NOT NULL AND ativo
)
UPDATE public.escolas e SET numero_unidade = u.n FROM u WHERE e.id = u.id;

UPDATE public.escolas SET numero_unidade = 1
WHERE grupo_economico_id IS NULL AND ativo;

-- Código final das ativas
UPDATE public.escolas e
SET codigo = public.montar_codigo_escola(
  COALESCE((SELECT numero FROM public.grupos_economicos ge WHERE ge.id = e.grupo_economico_id), e.numero_empresa),
  e.numero_unidade
)
WHERE e.ativo;

-- Inativas: limpa o código automático antigo
UPDATE public.escolas
SET codigo = NULL, numero_unidade = NULL, numero_empresa = NULL
WHERE NOT ativo;

-- ---------- Trigger que mantém tudo dali pra frente ----------

CREATE OR REPLACE FUNCTION public.trg_escola_codigo()
RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE
  v_empresa   smallint;
  v_ganhou_grupo boolean := false;
BEGIN
  -- Edição manual do código (plataforma): respeita e sai.
  IF TG_OP = 'UPDATE'
     AND NEW.codigo IS DISTINCT FROM OLD.codigo
     AND NEW.codigo IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.grupo_economico_id IS NULL
     AND NEW.grupo_economico_id IS NOT NULL THEN
    v_ganhou_grupo := true;   -- escola avulsa virando matriz de um grupo
  END IF;

  -- Escola inativa não tem código.
  IF NOT NEW.ativo THEN
    NEW.codigo := NULL;
    NEW.numero_unidade := NULL;
    RETURN NEW;
  END IF;

  -- Já tem código e nada relevante mudou.
  IF TG_OP = 'UPDATE'
     AND NEW.codigo IS NOT NULL
     AND NOT v_ganhou_grupo
     AND NEW.grupo_economico_id IS NOT DISTINCT FROM OLD.grupo_economico_id
     AND NEW.ativo = OLD.ativo THEN
    RETURN NEW;
  END IF;

  IF NEW.grupo_economico_id IS NOT NULL THEN
    SELECT numero INTO v_empresa FROM public.grupos_economicos WHERE id = NEW.grupo_economico_id;
    IF v_empresa IS NULL THEN
      v_empresa := COALESCE(NEW.numero_empresa, public.proximo_numero_empresa());
      UPDATE public.grupos_economicos
        SET numero = v_empresa, codigo = lpad(v_empresa::text, 2, '0')
        WHERE id = NEW.grupo_economico_id;
    END IF;
    NEW.numero_empresa := NULL;

    IF v_ganhou_grupo THEN
      NEW.numero_unidade := 1;
    ELSIF NEW.numero_unidade IS NULL THEN
      SELECT COALESCE(max(numero_unidade), 0) + 1 INTO NEW.numero_unidade
      FROM public.escolas
      WHERE grupo_economico_id = NEW.grupo_economico_id
        AND id <> NEW.id
        AND numero_unidade IS NOT NULL;
    END IF;
  ELSE
    IF NEW.numero_empresa IS NULL THEN
      NEW.numero_empresa := public.proximo_numero_empresa();
    END IF;
    v_empresa := NEW.numero_empresa;
    NEW.numero_unidade := 1;
  END IF;

  NEW.codigo := public.montar_codigo_escola(v_empresa, NEW.numero_unidade);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS escola_codigo ON public.escolas;
CREATE TRIGGER escola_codigo
  BEFORE INSERT OR UPDATE ON public.escolas
  FOR EACH ROW EXECUTE FUNCTION public.trg_escola_codigo();

-- ---------- Edição do código pela plataforma (superadmin) ----------

CREATE OR REPLACE FUNCTION public.plataforma_definir_codigo_escola(p_escola_id uuid, p_codigo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_superadmin_erp(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o superadmin do ERP pode definir o código da escola';
  END IF;

  p_codigo := nullif(btrim(p_codigo), '');

  IF p_codigo IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.escolas WHERE codigo = p_codigo AND id <> p_escola_id
  ) THEN
    RAISE EXCEPTION 'Já existe uma escola com o código %', p_codigo;
  END IF;

  -- p_codigo NULL faz o trigger recalcular o código automático.
  UPDATE public.escolas SET codigo = p_codigo WHERE id = p_escola_id;
END;
$$;
