-- Avisos por WhatsApp: permite escolher o destino "por turma" (uma turma específica ou todas),
-- além de "um aluno" e "todos os alunos ativos" que já existiam. Pedido da DM Núcleo em 20/11/2026.

ALTER TABLE public.avisos_whatsapp
  ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS turma_nome text; -- snapshot: "Todas as turmas" ou o nome da turma escolhida

ALTER TABLE public.avisos_whatsapp DROP CONSTRAINT IF EXISTS avisos_whatsapp_destino_tipo_check;
ALTER TABLE public.avisos_whatsapp
  ADD CONSTRAINT avisos_whatsapp_destino_tipo_check CHECK (destino_tipo IN ('aluno', 'turma', 'todos'));
