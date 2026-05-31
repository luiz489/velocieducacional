# Módulos do App do Responsável — Painel Admin

Vou criar as rotinas administrativas para alimentar os 12 tiles do app. Como **Notas Escolares** e **Financeiro** já existem (páginas Pedagógico e Financeiro), reaproveito-as e crio o restante.

## Novas tabelas no banco

1. **horarios_aulas** — turma_id, dia_semana (1-6), hora_inicio, hora_fim, disciplina, professor, sala. Atende "Horário Escolar" e "Horário 2026" (filtro por ano).
2. **eventos_calendario** — titulo, descricao, data_inicio, data_fim, tipo (`anual` | `academico`), publico_alvo, cor. Atende "Calendário Anual" e "Calendários Acadêmicos".
3. **avisos** — titulo, mensagem, canal (`secretaria` | `cobranca` | `coordenacao` | `bullying`), prioridade, publicado_em, autor, anexo_url, destinatario_aluno_id (opcional para avisos direcionados). Atende os 4 canais de avisos/comunicação.
4. **rematriculas** — aluno_id, ano_letivo_destino, status (`Aberta` | `Em andamento` | `Concluída` | `Cancelada`), turma_destino_id, observacoes, data_abertura, data_conclusao.
5. **carteirinhas** — aluno_id, codigo, validade, foto_url, qr_data, status (`Ativa` | `Bloqueada` | `Vencida`). Geração automática a partir do aluno.

Todas com RLS `is_staff(auth.uid())` e GRANTs padrão.

## Novas páginas (rotas)

- `/horarios` — grade semanal por turma com CRUD de aulas
- `/calendario` — calendário visual (mensal) + lista, abas Anual / Acadêmico
- `/avisos` — lista com filtro por canal (4 tabs: Secretaria, Cobrança, Coordenação, Bullying), criar/editar
- `/rematricula` — kanban de status + criação em lote por turma
- `/carteirinhas` — lista de alunos com botão "Gerar/Reemitir" e preview da carteirinha

## Menu lateral (AppSidebar)

Reorganização em grupos:
- **Acadêmico**: Alunos, Turmas, Matrizes, Disciplinas, Notas (Pedagógico), **Horários**, **Calendário**, **(Re)matrícula**, **Carteirinhas**
- **Comunicação** *(novo grupo)*: **Avisos** (com sub-filtros por canal)
- **Financeiro**: Financeiro, Contas a Pagar, Contratos, Inadimplentes
- **Compras**: Solicitações, Aprovadores
- **Parceiros**: Parceiros

## Detalhes técnicos

- Stack: páginas React + shadcn/ui, TanStack Query, react-hook-form + zod.
- "Carteirinha" gera PDF/PNG vetorial com jsPDF (skill já usada no projeto) com QR e foto.
- "Calendário" usa `react-day-picker` (já no projeto via shadcn Calendar) com marcadores por tipo.
- "Horários" usa grid CSS (linhas = horários, colunas = dias).
- Avisos: campo `canal` controla qual tile do app exibe; bullying com flag `anonimo`.

## Ordem de execução

1. Migration única com as 5 tabelas + RLS + GRANTs.
2. Sidebar reorganizada com novos grupos/itens.
3. Páginas em paralelo: Avisos → Horários → Calendário → Rematrícula → Carteirinha.

Confirma para eu seguir?