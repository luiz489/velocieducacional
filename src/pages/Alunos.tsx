import { useState } from "react";
import { Search, Plus, MoreHorizontal, Filter, FileText, BookOpen, Pencil, GraduationCap, UserX } from "lucide-react";
import { gerarFichaAluno, gerarBoletim } from "@/lib/relatorios";
import { limparCPF, mascaraCPF } from "@/lib/masks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAlunos, type Aluno } from "@/hooks/useAlunos";
import { AlunoCamposFieldset, lerAlunoCamposDeFormData } from "@/components/AlunoCamposFieldset";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function Alunos() {
  const { alunos, turmas, loading, createAluno, updateAluno, inativarAluno, matricularAluno } = useAlunos();
  const { escolaAtivaId } = useEscolaAtiva();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Edit state
  const [editAluno, setEditAluno] = useState<Aluno | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Matrícula state
  const [matriculaAluno, setMatriculaAluno] = useState<Aluno | null>(null);
  const [matriculaOpen, setMatriculaOpen] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState("");

  // Inativar state
  const [inativarTarget, setInativarTarget] = useState<Aluno | null>(null);

  const filtered = alunos.filter((a) => {
    const matchSearch =
      a.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.cpf.includes(search) ||
      a.responsavel_financeiro.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!escolaAtivaId) {
      return;
    }
    const fd = new FormData(e.currentTarget);
    const campos = lerAlunoCamposDeFormData(fd);
    const ok = await createAluno({
      escola_id: escolaAtivaId,
      ...campos,
      cpf: limparCPF(campos.cpf),
      responsavel_cpf: campos.responsavel_cpf ? limparCPF(campos.responsavel_cpf) : null,
    });
    if (ok) setDialogOpen(false);
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editAluno) return;
    const fd = new FormData(e.currentTarget);
    const campos = lerAlunoCamposDeFormData(fd);
    const ok = await updateAluno(editAluno.id, {
      ...campos,
      cpf: limparCPF(campos.cpf),
      responsavel_cpf: campos.responsavel_cpf ? limparCPF(campos.responsavel_cpf) : null,
    });
    if (ok) {
      setEditOpen(false);
      setEditAluno(null);
    }
  };

  const handleMatricula = async () => {
    if (!matriculaAluno || !selectedTurma || !escolaAtivaId) return;
    const ok = await matricularAluno(matriculaAluno.id, selectedTurma, escolaAtivaId);
    if (ok) {
      setMatriculaOpen(false);
      setMatriculaAluno(null);
      setSelectedTurma("");
    }
  };

  const handleInativar = async () => {
    if (!inativarTarget) return;
    await inativarAluno(inativarTarget.id);
    setInativarTarget(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
          <p className="text-sm text-muted-foreground">Gerencie o cadastro de alunos da instituição</p>
          {!escolaAtivaId && (
            <p className="text-xs text-destructive mt-1">
              Nenhuma escola vinculada ao seu usuário — fale com o administrador antes de cadastrar alunos.
            </p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!escolaAtivaId}><Plus className="h-4 w-4 mr-2" />Novo Aluno</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
              <DialogDescription>Preencha os dados do aluno para cadastrá-lo no sistema.</DialogDescription>
            </DialogHeader>
            <AlunoForm onSubmit={handleCreate} onCancel={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF ou responsável..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Ativo">Ativos</SelectItem>
            <SelectItem value="Inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead className="hidden md:table-cell">Nascimento</TableHead>
              <TableHead className="hidden lg:table-cell">Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((aluno) => (
              <TableRow key={aluno.id}>
                <TableCell className="font-medium">{aluno.nome}</TableCell>
                <TableCell className="text-muted-foreground">{aluno.cpf}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {new Date(aluno.data_nascimento).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{aluno.responsavel_financeiro}</TableCell>
                <TableCell>
                  <Badge variant={aluno.status === "Ativo" ? "default" : "secondary"}>{aluno.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => gerarFichaAluno({
                        nome: aluno.nome, cpf: aluno.cpf, data_nascimento: aluno.data_nascimento,
                        endereco: aluno.endereco || "Não informado", responsavel: aluno.responsavel_financeiro,
                        turma: "", status: aluno.status,
                      })}>
                        <FileText className="h-4 w-4 mr-2" />Gerar Ficha (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setEditAluno(aluno); setEditOpen(true); }}>
                        <Pencil className="h-4 w-4 mr-2" />Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setMatriculaAluno(aluno); setSelectedTurma(""); setMatriculaOpen(true); }}>
                        <GraduationCap className="h-4 w-4 mr-2" />Matrícula
                      </DropdownMenuItem>
                      {aluno.status === "Ativo" && (
                        <DropdownMenuItem className="text-destructive" onClick={() => setInativarTarget(aluno)}>
                          <UserX className="h-4 w-4 mr-2" />Inativar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Mostrando {filtered.length} de {alunos.length} alunos</span>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditAluno(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>Atualize os dados do aluno.</DialogDescription>
          </DialogHeader>
          {editAluno && (
            <AlunoForm
              defaultValues={editAluno}
              onSubmit={handleEdit}
              onCancel={() => { setEditOpen(false); setEditAluno(null); }}
              submitLabel="Atualizar"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Matrícula Dialog */}
      <Dialog open={matriculaOpen} onOpenChange={(open) => { setMatriculaOpen(open); if (!open) setMatriculaAluno(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Matricular Aluno</DialogTitle>
            <DialogDescription>Selecione a turma para {matriculaAluno?.nome}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Turma</Label>
              <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma turma" /></SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome} - {t.turno} ({t.ano_letivo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setMatriculaOpen(false); setMatriculaAluno(null); }}>Cancelar</Button>
              <Button onClick={handleMatricula} disabled={!selectedTurma}>Matricular</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inativar Confirmation */}
      <AlertDialog open={!!inativarTarget} onOpenChange={(open) => { if (!open) setInativarTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar aluno</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar <strong>{inativarTarget?.nome}</strong>? O aluno não aparecerá mais na lista de ativos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleInativar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* Reusable form for create/edit - envolve o fieldset compartilhado com o <form> e os botões */
function AlunoForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: {
  defaultValues?: React.ComponentProps<typeof AlunoCamposFieldset>["defaultValues"];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <form className="space-y-5 mt-2 max-h-[70vh] overflow-y-auto pr-1" onSubmit={onSubmit}>
      <AlunoCamposFieldset defaultValues={defaultValues} />
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
