ALTER TABLE public.alunos ADD CONSTRAINT alunos_cpf_unique UNIQUE (cpf);
ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_aluno_turma_unique UNIQUE (aluno_id, turma_id);