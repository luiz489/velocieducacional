import { useState } from "react";
import { Search, Plus, MoreHorizontal, ClipboardList, DollarSign, CheckCircle, UserPlus, UserCheck } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAlunos } from "@/hooks/useAlunos";
import { useMatriculas } from "@/hooks/useMatriculas";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { limparCPF } from "@/lib/masks";
import { AlunoCamposFieldset, lerAlunoCamposDeFormData } from "@/components/AlunoCamposFieldset";
import { validarCPF } from "@/lib/validations";
import { Skeleton } from "@/components/ui/skeleton";

function getStatusBadge(status: string) {
  switch (status) {
    case "Pago": return <Badge className="bg-success text-success-foreground">Em dia</Badge>;
    case "Atrasado": return <Badge variant="destructive">Atrasado</Badge>;
    case "Sem cobrança": return <Badge variant="outline">Sem cobrança</Badge>;
    default: return <Badge variant="secondary">Pendente</Badge>;
  }
}

export default function Matriculas() {
  const { alunos, matricularAluno } = useAlunos();
  const { matriculas, turmasComVagas, loading, refetch } = useMatriculas();
  const { escolaAtivaId } = useEscolaAtiva();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [carneDialogOpen, setCarneDialogOpen] = useState(false);
  const [selectedMatricula, setSelectedMatricula] = useState<typeof matriculas[number] | null>(null);
  const [carneParcelas, setCarneParcelas] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [abaAluno, setAbaAluno] = useState<"existente" | "novo">("existente");
  const [formAlunoId, setFormAlunoId] = useState("");

  const [formTurmaId, setFormTurmaId] = useState("");
  const [formDataIngresso, setFormDataIngresso] = useState(new Date().toISOString().split("T")[0]);
  const [formDesconto, setFormDesconto] = useState("0");
  const [formBolsa, setFormBolsa] = useState(false);

  const filtered = matriculas.filter((m) => {
    const matchSearch =
      m.aluno_nome.toLowerCase().includes(search.toLowerCase()) ||
      m.turma_nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || m.status_pagamento === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalMatriculas = matriculas.length;
  const emDia = matriculas.filter((m) => m.status_pagamento === "Pago").length;
  const atrasados = matriculas.filter((m) => m.status_pagamento === "Atrasado").length;

  const resetForm = () => {
    setAbaAluno("existente");
    setFormAlunoId("");
    setFormTurmaId("");
    setFormDataIngresso(new Date().toISOString().split("T")[0]);
    setFormDesconto("0");
    setFormBolsa(false);
  };

  const handleSubmitMatricula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaAtivaId) {
      toast.error("Nenhuma escola vinculada ao seu usuário.");
      return;
    }
    if (!formTurmaId) {
      toast.error("Selecione a turma.");
      return;
    }

    setSubmitting(true);
    try {
      let alunoId = formAlunoId;

      if (abaAluno === "novo") {
        const fd = new FormData(e.currentTarget);
        const campos = lerAlunoCamposDeFormData(fd);

        if (!campos.nome || !campos.cpf || !campos.data_nascimento || !campos.responsavel_financeiro) {
          toast.error("Preencha nome, CPF, data de nascimento e responsável do novo aluno.");
          return;
        }
        const cpfLimpo = limparCPF(campos.cpf);
        const cpfErro = validarCPF(cpfLimpo);
        if (cpfErro) {
          toast.error(cpfErro);
          return;
        }

        const { data: novoAluno, error } = await supabase
          .from("alunos")
          .insert({
            escola_id: escolaAtivaId,
            ...campos,
            cpf: cpfLimpo,
          })
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505" || error.message.toLowerCase().includes("alunos_cpf_unique")) {
            toast.error("CPF já cadastrado no sistema.");
          } else {
            toast.error("Erro ao cadastrar aluno: " + error.message);
          }
          return;
        }
        alunoId = novoAluno.id;
      }

      if (!alunoId) {
        toast.error("Selecione ou cadastre o aluno.");
        return;
      }

      const ok = await matricularAluno(alunoId, formTurmaId, escolaAtivaId, {
        data_ingresso: formDataIngresso,
        percentual_desconto: formBolsa ? 0 : Number(formDesconto || 0),
        bolsa_100: formBolsa,
      });

      if (ok) {
        toast.success("Matrícula realizada! As parcelas são geradas automaticamente se a turma já tiver um plano financeiro configurado.");
        setDialogOpen(false);
        resetForm();
        await refetch();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCarne = async (m: typeof matriculas[number]) => {
    setSelectedMatricula(m);
    const { data } = await supabase
      .from("financeiro")
      .select("descricao, valor, data_vencimento, status")
      .eq("matricula_id", m.id)
      .order("data_vencimento");
    setCarneParcelas(data ?? []);
    setCarneDialogOpen(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matrículas</h1>
          <p className="text-sm text-muted-foreground">Gerencie matrículas e carnês de mensalidade</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button disabled={!escolaAtivaId}><Plus className="h-4 w-4 mr-2" />Nova Matrícula</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Matrícula</DialogTitle>
              <DialogDescription>
                Uma matrícula nova geralmente é de um aluno que ainda não existe no sistema — escolha
                "Novo aluno" se for o caso, ou "Aluno existente" para casos de mudança de turma/reingresso.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitMatricula} className="space-y-4 mt-2">
              <Tabs value={abaAluno} onValueChange={(v) => setAbaAluno(v as "existente" | "novo")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="existente"><UserCheck className="h-4 w-4 mr-1.5" />Aluno existente</TabsTrigger>
                  <TabsTrigger value="novo"><UserPlus className="h-4 w-4 mr-1.5" />Novo aluno</TabsTrigger>
                </TabsList>

                <TabsContent value="existente" className="mt-3">
                  <Label>Aluno</Label>
                  <Select value={formAlunoId} onValueChange={setFormAlunoId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                    <SelectContent>
                      {alunos.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>

                <TabsContent value="novo" className="mt-3">
                  <AlunoCamposFieldset />
                </TabsContent>
              </Tabs>

              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label>Turma</Label>
                  <Select value={formTurmaId} onValueChange={setFormTurmaId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                    <SelectContent>
                      {turmasComVagas.map((t) => {
                        const disponiveis = t.vagas_totais - t.vagas_ocupadas;
                        return (
                          <SelectItem key={t.id} value={t.id} disabled={disponiveis <= 0}>
                            {t.nome} - {t.turno} ({t.ano_letivo}) {disponiveis <= 0 ? "— sem vagas" : `— ${disponiveis} vaga(s)`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data de Ingresso</Label>
                  <Input type="date" value={formDataIngresso} onChange={(e) => setFormDataIngresso(e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <Label>Desconto (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.01"
                      value={formDesconto} onChange={(e) => setFormDesconto(e.target.value)}
                      disabled={formBolsa} className="mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Checkbox id="bolsa" checked={formBolsa} onCheckedChange={(v) => setFormBolsa(!!v)} />
                    <Label htmlFor="bolsa" className="cursor-pointer">Bolsa 100%</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />{submitting ? "Matriculando..." : "Confirmar Matrícula"}
                  </span>
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            <SelectItem value="Sem cobrança">Sem cobrança</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                  {m.valor_mensal != null ? `R$ ${m.valor_mensal.toFixed(2)}` : "—"}
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
        Mostrando {filtered.length} de {matriculas.length} matrículas
      </div>

      <Dialog open={carneDialogOpen} onOpenChange={setCarneDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carnê de Mensalidades</DialogTitle>
            <DialogDescription>
              {selectedMatricula && `${selectedMatricula.aluno_nome} — ${selectedMatricula.turma_nome}`}
            </DialogDescription>
          </DialogHeader>
          {carneParcelas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma parcela gerada para esta matrícula ainda — configure um plano financeiro para a turma.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carneParcelas.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{p.descricao}</TableCell>
                    <TableCell>{new Date(p.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>R$ {Number(p.valor).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
