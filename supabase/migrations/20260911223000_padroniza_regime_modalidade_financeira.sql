-- Padroniza o "regime" (Parcial/Integral/etc.) das modalidades financeiras
-- por turma. Hoje `nome` é texto livre e já virou bagunça de grafia
-- (INTEGRAL / integral / "INTEGRAL " como registros diferentes) - e não dá
-- pra usar isso em nenhum relatório porque não é um valor padronizado.
--
-- Passo 1: normaliza os dados existentes pros 4 nomes canônicos
-- confirmados com o dono (checado antes: sem colisão de (turma_id, nome)
-- normalizado, então é update simples, sem merge de linha).
update public.modalidades_financeiras_turma
set nome = case trim(upper(nome))
  when 'INTEGRAL' then 'Integral'
  when 'PARCIAL' then 'Parcial'
  when 'PARCIAL ESTENDIDO' then 'Parcial Estendido'
  when 'SEMI INTEGRAL' then 'Semi Integral'
  else nome
end
where trim(upper(nome)) in ('INTEGRAL', 'PARCIAL', 'PARCIAL ESTENDIDO', 'SEMI INTEGRAL');

-- Passo 2: trava numa lista fixa dali pra frente (mesmo padrão que
-- turmas.turno já usa - Select fixo, não mais texto livre).
alter table public.modalidades_financeiras_turma
  add constraint modalidades_financeiras_turma_nome_check
  check (nome in ('Parcial', 'Parcial Estendido', 'Semi Integral', 'Integral'));
