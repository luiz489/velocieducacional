-- CPF do aluno: opcional e único POR ESCOLA (não mais global)
--
-- Motivo: crianças sem CPF próprio faziam a secretaria digitar o CPF do
-- responsável no campo do aluno; ao matricular um irmão o valor colidia com a
-- trava global "UNIQUE (cpf)" e a matrícula era barrada ("CPF já cadastrado").
--
-- Agora:
--  - cpf pode ficar vazio (vários alunos sem CPF convivem);
--  - quando preenchido, é único dentro da mesma escola;
--  - some a unicidade global (que também vazava existência entre inquilinos).

-- 1. Deixa a coluna aceitar nulo
ALTER TABLE public.alunos ALTER COLUMN cpf DROP NOT NULL;

-- 2. Normaliza strings vazias existentes para NULL
UPDATE public.alunos SET cpf = NULL WHERE cpf = '';

-- 3. Remove as travas globais redundantes de CPF único
ALTER TABLE public.alunos DROP CONSTRAINT IF EXISTS alunos_cpf_unique;
ALTER TABLE public.alunos DROP CONSTRAINT IF EXISTS alunos_cpf_key;

-- 4. Trava nova: CPF único por escola, ignorando quem está sem CPF
DROP INDEX IF EXISTS public.alunos_cpf_por_escola;
CREATE UNIQUE INDEX alunos_cpf_por_escola
  ON public.alunos (escola_id, cpf)
  WHERE cpf IS NOT NULL;
