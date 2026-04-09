import { useState } from "react";
import { Search, Plus, MoreHorizontal, ClipboardList, DollarSign, CheckCircle } from "lucide-react";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Matricula {
  id: string;
  aluno_nome: string;
  turma_nome: string;
  data_ingresso: string;
  status_pagamento: "Pendente" | "Pago" | "Atrasado";
  parcelas_geradas: number;
  parcelas_pagas: number;
  valor_mensal: number;
}

const mockMatriculas: Matricula[] = [
  { id: "1", aluno_nome: "Ana Carolina Silva", turma_nome: "5º Ano A", data_ingresso: "2026-02-01", status_pagamento: "Pago", parcelas_geradas: 12, parcelas_pagas: 3, valor_mensal: 850 },
  { id: "2", aluno_nome: "João Pedro Souza", turma_nome: "6º Ano B", data_ingresso: "2026-02-01", status_pagamento: "Pago", parcelas_geradas: 12, parcelas_pagas: 3, valor_mensal: 950 },
  { id: "3", aluno_nome: "Maria Fernanda Costa", turma_nome: "4º Ano A", data_ingresso: "2026-02-01", status_pagamento: "Atrasado", parcelas_geradas: 12, parcelas_pagas: 1, valor_mensal: 780 },
  { id: "4", aluno_nome: "Pedro Henrique Santos", turma_nome: "7º Ano B", data_ingresso: "2026-03-15", status_pagamento: "Pendente", parcelas_geradas: 10, parcelas_pagas: 0, valor_mensal: 1050 },
  { id: "5", aluno_nome: "Laura Beatriz Oliveira", turma_nome: "5º Ano B", data_ingresso: "2026-02-01", status_pagamento: "Pago", parcelas_geradas: 12, parcelas_pagas: 3, valor_mensal: 850 },
  { id: "6", aluno_nome: "Gabriel Almeida", turma_nome: "6º Ano A", data_ingresso: "2026-02-01", status_pagamento: "Pago", parcelas_geradas: 12, parcelas_pagas: 2, valor_mensal: 950 },
  { id: "7", aluno_nome: "Isabela Rodrigues", turma_nome: "4º Ano B", data_ingresso: "2026-04-01", status_pagamento: "Pendente", parcelas_geradas: 9, parcelas_pagas: 0, valor_mensal: 780 },
];

const mockAlunos = [
  { id: "a1", nome: "Carlos Eduardo Lima" },
  { id: "a2", nome: "Beatriz Mendes" },
  { id: "a3", nome: "Rafael Ferreira" },
];

const mockTurmas = [
  { id: "t1", nome: "1º Ano A", vagas_disponiveis: 2 },
  { id: "t2", nome: "3º Ano A", vagas_disponiveis: 0 },
  { id: "t3", nome: "5º Ano A", vagas_disponiveis: 5 },
  { id: "t4", nome: "7º Ano B", vagas_disponiveis: 23 },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "Pago": return <Badge className="bg-success text-success-foreground">Em dia</Badge>;
    case "Atrasado": return <Badge variant="destructive">Atrasado</Badge>;
    default: return <Badge variant="secondary">Pendente</Badge>;
  }
}

export default function Matriculas() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [carneDialogOpen, setCarneDialogOpen] = useState(false);
  const [selectedMatricula, setSelectedMatricula] = useState<Matricula | null>(null);

  // New enrollment form state
  const [formAlunoId, setFormAlunoId] = useState("");
  const [formTurmaId, setFormTurmaId] = useState("");
  const [formValorMensal, setFormValorMensal] = useState("850.00");
  const [formParcelas, setFormParcelas] = useState("12");
  const [formDiaVencimento, setFormDiaVencimento] = useState("10");
  const [step, setStep] = useState<1 | 2>(1);

  const filtered = mockMatriculas.filter((m) => {
    const matchSearch =
      m.aluno_nome.toLowerCase().includes(search.toLowerCase()) ||
      m.turma_nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || m.status_pagamento === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalMatriculas = mockMatriculas.length;
  const emDia = mockMatriculas.filter((m) => m.status_pagamento === "Pago").length;
  const atrasados = mockMatriculas.filter((m) => m.status_pagamento === "Atrasado").length;

  const selectedTurma = mockTurmas.find((t) => t.id === formTurmaId);
  const selectedAluno = mockAlunos.find((a) => a.id === formAlunoId);

  const handleSubmitMatricula = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formAlunoId || !formTurmaId) {
        toast.error("Selecione o aluno e a turma.");
        return;
      }
      if (selectedTurma && selectedTurma.vagas_disponiveis <= 0) {
        toast.error("Esta turma não possui vagas disponíveis.");
        return;
      }
      setStep(2);
      return;
    }
    // Step 2: confirm and generate
    toast.success(`Matrícula realizada! Carnê com ${formParcelas} parcelas de R$ ${parseFloat(formValorMensal).toFixed(2)} gerado automaticamente.`);
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setFormAlunoId("");
    setFormTurmaId("");
    setFormValorMensal("850.00");
    setFormParcelas("12");
    setFormDiaVencimento("10");
  };

  const handleOpenCarne = (matricula: Matricula) => {
    setSelectedMatricula(matricula);
    setCarneDialogOpen(true);
  };

  const generateParcelas = (m: Matricula) => {
    const parcelas = [];
    const baseDate = new Date(m.data_ingresso);
    for (let i = 0; i < m.parcelas_geradas; i++) {
      const vencimento = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 10);
      const isPago = i < m.parcelas_pagas;
      const isAtrasado = !isPago && vencimento < new Date();
      parcelas.push({
        numero: i + 1,
        vencimento,
        valor: m.valor_mensal,
        status: isPago ? "Pago" : isAtrasado ? "Atrasado" : "Pendente",
      });
    }
    return parcelas;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matrículas</h1>
          <p className="text-sm text-muted-foreground">Gerencie matrículas e carnês de mensalidade</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Matrícula</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {step === 1 ? "Nova Matrícula — Dados" : "Nova Matrícula — Carnê de Mensalidades"}
              </DialogTitle>
              <DialogDescription>
                {step === 1 ? "Selecione o aluno e a turma para iniciar a matrícula." : "Configure o carnê de mensalidades que será gerado automaticamente."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitMatricula} className="space-y-4 mt-2">
              {step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <Label>Aluno</Label>
                    <Select value={formAlunoId} onValueChange={setFormAlunoId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                      <SelectContent>
                        {mockAlunos.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Turma</Label>
                    <Select value={formTurmaId} onValueChange={setFormTurmaId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                      <SelectContent>
                        {mockTurmas.map((t) => (
                          <SelectItem key={t.id} value={t.id} disabled={t.vagas_disponiveis <= 0}>
                            {t.nome} {t.vagas_disponiveis <= 0 ? "(sem vagas)" : `(${t.vagas_disponiveis} vagas)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data de Ingresso</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} className="mt-1" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <p className="text-sm"><span className="text-muted-foreground">Aluno:</span> <span className="font-medium">{selectedAluno?.nome}</span></p>
                    <p className="text-sm"><span className="text-muted-foreground">Turma:</span> <span className="font-medium">{selectedTurma?.nome}</span></p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor da Mensalidade (R$)</Label>
                      <Input type="number" step="0.01" value={formValorMensal} onChange={(e) => setFormValorMensal(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Nº de Parcelas</Label>
                      <Select value={formParcelas} onValueChange={setFormParcelas}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Dia de Vencimento</Label>
                      <Select value={formDiaVencimento} onValueChange={setFormDiaVencimento}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20, 25].map((d) => (
                            <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className="rounded-lg border bg-muted/50 p-3 w-full text-center">
                        <p className="text-xs text-muted-foreground">Total do Carnê</p>
                        <p className="text-lg font-bold">R$ {(parseFloat(formValorMensal || "0") * parseInt(formParcelas)).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-between pt-2">
                {step === 2 ? (
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                )}
                <Button type="submit">
                  {step === 1 ? "Próximo: Configurar Carnê" : (
                    <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />Confirmar e Gerar Carnê</span>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Matrículas</p>
              <p className="text-xl font-bold">{totalMatriculas}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagamentos em Dia</p>
              <p className="text-xl font-bold">{emDia}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <DollarSign className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagamentos Atrasados</p>
              <p className="text-xl font-bold">{atrasados}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por aluno ou turma..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Pago">Em dia</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead className="hidden md:table-cell">Ingresso</TableHead>
              <TableHead>Mensalidade</TableHead>
              <TableHead className="hidden lg:table-cell">Parcelas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.aluno_nome}</TableCell>
                <TableCell>{m.turma_nome}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {new Date(m.data_ingresso).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="font-medium">
                  R$ {m.valor_mensal.toFixed(2)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {m.parcelas_pagas}/{m.parcelas_geradas}
                </TableCell>
                <TableCell>{getStatusBadge(m.status_pagamento)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenCarne(m)}>Ver Carnê</DropdownMenuItem>
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Cancelar Matrícula</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma matrícula encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {filtered.length} de {mockMatriculas.length} matrículas
      </div>

      {/* Carnê Dialog */}
      <Dialog open={carneDialogOpen} onOpenChange={setCarneDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carnê de Mensalidades</DialogTitle>
            <DialogDescription>
              {selectedMatricula && `${selectedMatricula.aluno_nome} — ${selectedMatricula.turma_nome}`}
            </DialogDescription>
          </DialogHeader>
          {selectedMatricula && (
            <div className="space-y-3 mt-2">
              <div className="rounded-lg border bg-muted/50 p-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Mensalidade</p>
                  <p className="font-bold">R$ {selectedMatricula.valor_mensal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold">R$ {(selectedMatricula.valor_mensal * selectedMatricula.parcelas_geradas).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pagas</p>
                  <p className="font-bold">{selectedMatricula.parcelas_pagas}/{selectedMatricula.parcelas_geradas}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generateParcelas(selectedMatricula).map((p) => (
                    <TableRow key={p.numero}>
                      <TableCell className="text-muted-foreground">{p.numero}</TableCell>
                      <TableCell>{p.vencimento.toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>R$ {p.valor.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
