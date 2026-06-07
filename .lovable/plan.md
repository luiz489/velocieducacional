# Plano: Amarração de Cadastros

## Diagnóstico
Auditoria anterior identificou campos com dados mock ou inputs livres. Vou criar os cadastros faltantes e amarrar todos os campos aos cadastros existentes/novos.

## Mudanças

### 1. Banco de dados (1 migration)
- **`parceiros`**: adicionar coluna `tipo` (`Fornecedor` | `Cliente` | `Outro`), default `Outro`.
- **`contas_a_pagar`**: adicionar `fornecedor_id` (FK → parceiros, ON DELETE SET NULL).
- **`solicitacoes_compra`**: adicionar `fornecedor_id` (FK → parceiros).
- **`contratos`**: adicionar `fornecedor_id` (FK → parceiros).
- **`ocorrencias`**: adicionar `professor_id` (FK → professores, ON DELETE SET NULL). Já tem `aluno_id`.
- **`pedagogico`**: adicionar `disciplina_id` (FK → disciplinas, ON DELETE SET NULL). Manter campo `disciplina` (texto) para retro-compat.

### 2. Frontend — trocar inputs livres por Selects dos cadastros

| Arquivo | Mudança |
|---|---|
| `src/pages/Parceiros.tsx` | Adicionar Select `tipo` (Fornecedor/Cliente/Outro) no form + coluna na tabela + filtro |
| `src/pages/Ocorrencias.tsx` | Migrar de mock para tabela `ocorrencias`. Select de `alunos` (auto-preenche turma), Select de `professores` para "Registrado por". CRUD via supabase + TanStack Query |
| `src/pages/Pedagogico.tsx` | Trocar lista hardcoded de disciplinas por Select de `disciplinas` cadastradas |
| `src/pages/ContasPagar.tsx` | Trocar input "Fornecedor" por Select de `parceiros` filtrados `tipo=Fornecedor` |
| `src/pages/Compras.tsx` | Trocar input "Fornecedor" por Select de `parceiros` filtrados `tipo=Fornecedor` |
| `src/pages/Contratos.tsx` | Trocar input "Fornecedor" por Select de `parceiros` filtrados `tipo=Fornecedor` |

### 3. Padrão de implementação
- Todos os Selects usam `useQuery` para carregar opções do cadastro correspondente.
- Em todos os formulários: salvar o `*_id` (FK) **e** o nome textual (snapshot) para retro-compat e exibição rápida.
- Link "Cadastrar novo" abre página do cadastro respectivo quando a lista está vazia.

## Detalhes técnicos
- RLS herda das policies existentes em cada tabela (authenticated read/write).
- Sem breaking changes: campos textuais antigos permanecem populados.
- Migration única para reduzir aprovações.
