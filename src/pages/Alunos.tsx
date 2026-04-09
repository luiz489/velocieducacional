import { useState } from "react";
import { Search, Plus, MoreHorizontal, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Aluno {
  id: string;
  nome: string;
  cpf: string;
  data_nascimento: string;
  responsavel: string;
  turma: string;
  status: "Ativo" | "Inativo";
}

const mockAlunos: Aluno[] = [
  { id: "1", nome: "Ana Carolina Silva", cpf: "123.456.789-00", data_nascimento: "2012-03-15", responsavel: "Maria Silva", turma: "5º Ano A", status: "Ativo" },
  { id: "2", nome: "João Pedro Souza", cpf: "234.567.890-11", data_nascimento: "2011-07-22", responsavel: "Carlos Souza", turma: "6º Ano B", status: "Ativo" },
  { id: "3", nome: "Maria Fernanda Costa", cpf: "345.678.901-22", data_nascimento: "2013-01-10", responsavel: "Patrícia Costa", turma: "4º Ano A", status: "Ativo" },
  { id: "4", nome: "Pedro Henrique Santos", cpf: "456.789.012-33", data_nascimento: "2010-11-05", responsavel: "Roberto Santos", turma: "7º Ano B", status: "Inativo" },
  { id: "5", nome: "Laura Beatriz Oliveira", cpf: "567.890.123-44", data_nascimento: "2012-09-18", responsavel: "Juliana Oliveira", turma: "5º Ano B", status: "Ativo" },
  { id: "6", nome: "Gabriel Almeida", cpf: "678.901.234-55", data_nascimento: "2011-05-30", responsavel: "Marcos Almeida", turma: "6º Ano A", status: "Ativo" },
  { id: "7", nome: "Isabela Rodrigues", cpf: "789.012.345-66", data_nascimento: "2013-12-02", responsavel: "Fernanda Rodrigues", turma: "4º Ano B", status: "Ativo" },
  { id: "8", nome: "Lucas Martins", cpf: "890.123.456-77", data_nascimento: "2010-08-14", responsavel: "André Martins", turma: "7º Ano A", status: "Inativo" },
];

export default function Alunos() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = mockAlunos.filter((a) => {
    const matchSearch =
      a.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.cpf.includes(search) ||
      a.responsavel.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
          <p className="text-sm text-muted-foreground">Gerencie o cadastro de alunos da instituição</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Aluno
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 mt-2" onSubmit={(e) => { e.preventDefault(); setDialogOpen(false); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input id="nome" placeholder="Nome do aluno" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" placeholder="000.000.000-00" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="nascimento">Data de Nascimento</Label>
                  <Input id="nascimento" type="date" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" placeholder="Endereço completo" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="responsavel">Responsável Financeiro</Label>
                  <Input id="responsavel" placeholder="Nome do responsável" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select defaultValue="Ativo">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Ativo">Ativos</SelectItem>
            <SelectItem value="Inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead className="hidden md:table-cell">Nascimento</TableHead>
              <TableHead className="hidden lg:table-cell">Responsável</TableHead>
              <TableHead>Turma</TableHead>
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
                <TableCell className="hidden lg:table-cell text-muted-foreground">{aluno.responsavel}</TableCell>
                <TableCell>{aluno.turma}</TableCell>
                <TableCell>
                  <Badge variant={aluno.status === "Ativo" ? "default" : "secondary"}>
                    {aluno.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Ver Ficha</DropdownMenuItem>
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Matrícula</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Inativar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum aluno encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Mostrando {filtered.length} de {mockAlunos.length} alunos</span>
      </div>
    </div>
  );
}
