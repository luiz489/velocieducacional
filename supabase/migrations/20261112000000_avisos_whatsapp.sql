-- Avisos por WhatsApp: a escola conecta um número por QR code e dispara uma mensagem de texto para o
-- responsável financeiro, o pai, a mãe ou os dois de um aluno específico, ou de todos os alunos ativos.
-- Pedido da DM Núcleo em 12/11/2026.
--
-- Arquitetura (igual ao e-mail do boleto): os Edge Functions do Supabase rodam na nuvem e NÃO alcançam
-- o WAHA, que só existe na rede interna da VPS. Por isso tudo que fala com o WAHA passa por um fluxo n8n
-- (que roda na mesma VPS/rede do WAHA), do mesmo jeito que o envio de boleto por e-mail passa pelo n8n.
--
-- Reaproveitado do que já existe: os telefones de pai/mãe/responsável já existem em public.alunos
-- (telefone_pai, telefone_mae, telefone_responsavel) e a normalização de telefone já existe em
-- public.familia_normalizar_telefone (usada pelo app dos pais). O módulo de permissão "comunicacao"
-- já é usado pela tela /avisos (mural); reaproveitado aqui em vez de criar um módulo novo.

-- ---------------------------------------------------------------------------
-- 0. Módulo de permissão (idempotente: pode já existir, aplicado fora de uma migration rastreada)
-- ---------------------------------------------------------------------------
INSERT INTO public.modulos_sistema (codigo, nome, ordem)
VALUES ('comunicacao', 'Comunicação', 17)
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 1. Qual sessão do WAHA cada escola usa para mandar aviso. Nasce DESLIGADA; a migration liga só a
--    DM Núcleo (0101), que foi quem pediu. O nome da sessão não é segredo (a chave do WAHA fica só no
--    n8n); guardamos aqui pra poder ter uma sessão por escola sem mexer em código quando um cliente novo
--    pedir o mesmo recurso.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escolas_whatsapp_avisos (
  escola_id uuid PRIMARY KEY REFERENCES public.escolas(id) ON DELETE CASCADE,
  sessao text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.escolas_whatsapp_avisos (escola_id, sessao, ativo)
SELECT id, 'edu-' || codigo, true FROM public.escolas WHERE codigo = '0101'
ON CONFLICT (escola_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Um envio (campanha): uma mensagem, um destino (um aluno ou todos), uma ou mais personas.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avisos_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  mensagem text NOT NULL CHECK (btrim(mensagem) <> ''),
  destino_tipo text NOT NULL CHECK (destino_tipo IN ('aluno', 'todos')),
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  aluno_nome text,                 -- snapshot: continua legível mesmo se o aluno for removido depois
  personas text[] NOT NULL CHECK (personas <@ ARRAY['pai', 'mae', 'responsavel']::text[] AND array_length(personas, 1) > 0),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviando', 'concluido', 'erro')),
  erro text,
  total_destinatarios integer NOT NULL DEFAULT 0,
  total_enviados integer NOT NULL DEFAULT 0,
  total_erros integer NOT NULL DEFAULT 0,
  total_sem_telefone integer NOT NULL DEFAULT 0,
  criado_por uuid REFERENCES auth.users(id),
  criado_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz
);
CREATE INDEX IF NOT EXISTS avisos_whatsapp_escola_idx ON public.avisos_whatsapp (escola_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Um destinatário dentro de um envio (um aluno + uma persona = uma mensagem).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avisos_whatsapp_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id uuid NOT NULL REFERENCES public.avisos_whatsapp(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  aluno_nome text NOT NULL,
  turma_nome text,
  parentesco text NOT NULL CHECK (parentesco IN ('pai', 'mae', 'responsavel')),
  destinatario_nome text,
  telefone text,                    -- normalizado (55 + DDD + número), null quando sem telefone cadastrado
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro', 'sem_telefone')),
  erro text,
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aviso_id, aluno_id, parentesco)
);
CREATE INDEX IF NOT EXISTS avisos_whatsapp_itens_aviso_idx ON public.avisos_whatsapp_itens (aviso_id);
CREATE INDEX IF NOT EXISTS avisos_whatsapp_itens_pendentes_idx ON public.avisos_whatsapp_itens (aviso_id) WHERE status = 'pendente';

-- ---------------------------------------------------------------------------
-- 4. RLS: só leitura direta pela tela (quem tem "comunicacao":"visualizar" na escola). Criar o envio,
--    resolver destinatários e marcar enviado/erro é tudo feito pelo Edge Function com a service_role
--    (a lista de telefones dos responsáveis não deve poder ser lida/escrita por um INSERT livre do
--    cliente: a escolha de quem recebe e a validação de permissão de envio ficam no servidor).
-- ---------------------------------------------------------------------------
ALTER TABLE public.escolas_whatsapp_avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_whatsapp_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver config de whatsapp da escola" ON public.escolas_whatsapp_avisos;
CREATE POLICY "Ver config de whatsapp da escola" ON public.escolas_whatsapp_avisos
  FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'comunicacao', 'visualizar'));

DROP POLICY IF EXISTS "Ver avisos de whatsapp da escola" ON public.avisos_whatsapp;
CREATE POLICY "Ver avisos de whatsapp da escola" ON public.avisos_whatsapp
  FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(escola_id, 'comunicacao', 'visualizar'));

DROP POLICY IF EXISTS "Ver itens de avisos de whatsapp da escola" ON public.avisos_whatsapp_itens;
CREATE POLICY "Ver itens de avisos de whatsapp da escola" ON public.avisos_whatsapp_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.avisos_whatsapp av
    WHERE av.id = aviso_id AND public.usuario_tem_permissao(av.escola_id, 'comunicacao', 'visualizar')
  ));

-- GRANT explícito: tabela nova não fica acessível pela API sem isso (lição de 30/10/2026).
REVOKE ALL ON public.escolas_whatsapp_avisos, public.avisos_whatsapp, public.avisos_whatsapp_itens FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.escolas_whatsapp_avisos, public.avisos_whatsapp, public.avisos_whatsapp_itens TO authenticated;
GRANT ALL ON public.escolas_whatsapp_avisos, public.avisos_whatsapp, public.avisos_whatsapp_itens TO service_role;
