# EduFlow Suite

Atue como um Engenheiro de Software Sênior especializado em Sistemas Educacionais. 

Crie um ERP Escolar (SaaS) inspirado nas melhores práticas da TOTVS, iScholar e Proesc. 

O sistema deve ser focado em usabilidade, segurança de dados e automação de processos.

### 1. ARQUITETURA DE DADOS (Supabase)

Crie as seguintes tabelas e relacionamentos:

- Alunos: Nome, CPF, Data de Nascimento, Endereço, Responsável Financeiro, Status (Ativo/Inativo).

- Turmas: Nome, Ano Letivo, Turno, Sala, Vagas Totais.

- Matrículas: Relacionamento Aluno-Turma, Data de Ingresso, Status de Pagamento.

- Financeiro: Lançamentos de mensalidades, taxas extras, status (Pendente, Pago, Atrasado), Data de Vencimento.

- Pedagógico: Notas (AV1, AV2, Recuperação), Frequência, Ocorrências.

### 2. INTERFACE E UX (Dashboard Estilo SaaS Moderno)

- Sidebar de Navegação: Dashboard, Secretaria (Alunos/Turmas), Financeiro (Contas a Receber), Pedagógico (Notas/Faltas).

- Dashboard Principal: Cards com KPIs (Total de Alunos, Inadimplência %, Aniversariantes do Mês).

- Design System: Use cores sóbrias (Azul marinho e branco), componentes de tabela com filtros e busca rápida.

### 3. FUNCIONALIDADES CRÍTICAS (Melhores Práticas)

- Módulo de Matrícula: Fluxo para cadastrar aluno e já gerar o carnê de mensalidades automaticamente.

- Gestão de Notas: Planilha editável para professores lançarem notas por turma/disciplina.

- Relatórios: Botão para gerar "Ficha do Aluno" e "Boletim Escolar".

### 4. REQUISITOS TÉCNICOS

- Use Tailwind CSS para responsividade total.

- Implemente Shadcn/UI para componentes de interface.

- Garanta que as tabelas do Supabase tenham RLS (Row Level Security) habilitadas.

Comece criando a estrutura da Dashboard e o módulo de Gestão de Alunos.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://velocieducacional.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/455d8e97-f7b6-4e7c-8724-401fa7756612).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
