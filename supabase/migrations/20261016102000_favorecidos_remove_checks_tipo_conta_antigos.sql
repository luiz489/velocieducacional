-- As restrições antigas de tipo_conta ("Corrente"/"Poupança") conflitam com a padronização
-- (corrente | poupanca | pagamento), que já é garantida por *_dados_bancarios_chk.
alter table public.professores drop constraint if exists professores_tipo_conta_check;
alter table public.funcionarios drop constraint if exists funcionarios_tipo_conta_check;
alter table public.fornecedores drop constraint if exists fornecedores_tipo_conta_check;
