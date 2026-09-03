import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MoreHorizontal, ClipboardList, DollarSign, CheckCircle, UserPlus, UserCheck, FileSignature } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
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
  const { matriculas, turmasComVagas, loading, refetch, updateMatricula, deleteMatricula, recalcularFinanceiro } = useMatriculas();
  const navigate = useNavigate();
  const [alunoParaContrato, setAlunoParaContrato] = useState<string | null>(null);

  const { data: templatesContrato } = useQuery({
    queryKey: ["templates-contrato"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, nome")
        .eq("ativo", true)
        .like("codigo", "contrato_%")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const emitirContrato = (templateId: string) => {
    if (!alunoParaContrato) return;
    navigate("/documentos/gerar", { state: { templateId, alunoId: alunoParaContrato } });
  };

  const { escolaAtivaId } = useEscolaAtiva();

  const { data: camposVisiveis } = useQuery({
    queryKey: ["campos-matricula-visiveis", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escolas")
        .select("campos_matricula_visiveis")
        .eq("id", escolaAtivaId!)
        .single();
      if (error) throw error;
      return (data?.campos_matricula_visiveis ?? {}) as Record<string, boolean>;
    },
  });

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
  const [formDataVencimentoMatricula, setFormDataVencimentoMatricula] = useState("");
  const [formParcelasTaxa, setFormParcelasTaxa] = useState("1");
  const [formDesconto, setFormDesconto] = useState("0");
  const [formBolsa, setFormBolsa] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingMatricula, setEditingMatricula] = useState<typeof matriculas[number] | null>(null);
  const [editTurmaId, setEditTurmaId] = useState("");
  const [editDataIngresso, setEditDataIngresso] = useState("");
  const [editDataVencimentoMatricula, setEditDataVencimentoMatricula] = useState("");
  const [editParcelasTaxa, setEditParcelasTaxa] = useState("1");
  const [editDesconto, setEditDesconto] = useState("0");
  const [editBolsa, setEditBolsa] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const { data: planoTurma } = useQuery({
    queryKey: ["plano-financeiro-turma", formTurmaId],
    enabled: !!formTurmaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos_financeiros_turma")
        .select("valor_mensalidade, numero_parcelas, dia_vencimento, taxa_matricula")
        .eq("turma_id", formTurmaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const valorBase = planoTurma?.valor_mensalidade ?? null;
  const valorDesconto = valorBase != null
    ? (formBolsa ? valorBase : valorBase * (Number(formDesconto || 0) / 100))
    : null;
  const valorFinal = valorBase != null && valorDesconto != null ? valorBase - valorDesconto : null;

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
    setFormDataVencimentoMatricula("");
    setFormParcelasTaxa("1");
    setFormDesconto("0");
    setFormBolsa(false);
  };

  const handleSubmitMatricula = async (e: React.FormEvent<HTMLFormElement>) => {
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
            responsavel_cpf: campos.responsavel_cpf ? limparCPF(campos.responsavel_cpf) : null,
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
        data_vencimento_matricula: formDataVencimentoMatricula || undefined,
        percentual_desconto: formBolsa ? 0 : Number(formDesconto || 0),
        bolsa_100: formBolsa,
        parcelas_taxa_matricula: Number(formParcelasTaxa || 1),
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

  const openEditMatricula = (m: typeof matriculas[number]) => {
    setEditingMatricula(m);
    setEditTurmaId(m.turma_id);
    setEditDataIngresso(m.data_ingresso);
    setEditDataVencimentoMatricula(m.data_vencimento_matricula ?? "");
    setEditParcelasTaxa(String(m.parcelas_taxa_matricula ?? 1));
    setEditDesconto(String(m.percentual_desconto ?? 0));
    setEditBolsa(m.bolsa_100);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMatricula) return;
    setSavingEdit(true);
    const dadosAlteraramFinanceiro =
      editDataIngresso !== editingMatricula.data_ingresso ||
      editTurmaId !== editingMatricula.turma_id ||
      Number(editDesconto || 0) !== (editingMatricula.percentual_desconto ?? 0) ||
      editBolsa !== editingMatricula.bolsa_100;

    const ok = await updateMatricula(editingMatricula.id, {
      turma_id: editTurmaId,
      data_ingresso: editDataIngresso,
      data_vencimento_matricula: editDataVencimentoMatricula || null,
      percentual_desconto: Number(editDesconto || 0),
      bolsa_100: editBolsa,
      parcelas_taxa_matricula: Number(editParcelasTaxa || 1),
    });
    setSavingEdit(false);
    if (ok) {
      setEditOpen(false);
      toast.success("Matrícula atualizada!");

      if (dadosAlteraramFinanceiro) {
        const quer = confirm(
          "Você alterou dados que afetam o valor/vencimento das parcelas (turma, data de ingresso, desconto ou bolsa).\n\n" +
          "Quer recalcular as parcelas financeiras com os dados novos agora?\n\n" +
          "Parcelas já pagas serão mantidas como estão - só as pendentes/atrasadas são recriadas."
        );
        if (quer) {
          await recalcularFinanceiro(editingMatricula.id);
        }
      }
      setEditingMatricula(null);
    }
  };

  const handleDeleteMatricula = async (m: typeof matriculas[number]) => {
    if (!confirm(`Excluir a matrícula de "${m.aluno_nome}" na turma "${m.turma_nome}"? As parcelas pendentes também serão removidas.`)) return;
    await deleteMatricula(m.id);
  };

  const handleOpenCarne = async (m: typeof matriculas[number]) => {
    setSelectedMatricula(m);
    const { data } = await supabase
      .from("financeiro")
      .select("descricao, valor, valor_integral, data_vencimento, status")
      .eq("matricula_id", m.id)
      .eq("escola_id", escolaAtivaId!)
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
                  <AlunoCamposFieldset camposVisiveis={camposVisiveis} />
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Pode ser no ano letivo seguinte - a matrícula pode ser paga antes do ingresso de fato.
                  </p>
                </div>
                <div>
                  <Label>Vencimento da Taxa de Matrícula (opcional)</Label>
                  <Input type="date" value={formDataVencimentoMatricula} onChange={(e) => setFormDataVencimentoMatricula(e.target.value)} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Se não preencher, usa a mesma data de ingresso.
                  </p>
                </div>
                <div>
                  <Label>Parcelas da Taxa de Matrícula</Label>
                  <Input type="number" min="1" value={formParcelasTaxa} onChange={(e) => setFormParcelasTaxa(e.target.value)} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">
                    1 = à vista. Mais de 1 divide o valor em parcelas mensais.
                  </p>
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

                {formTurmaId && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                    {valorBase == null ? (
                      <p className="text-muted-foreground">
                        Esta turma ainda não tem um plano financeiro configurado — nenhuma parcela será gerada automaticamente.
                      </p>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mensalidade da turma</span>
                          <span className="font-medium">R$ {valorBase.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor do desconto</span>
                          <span className="font-medium text-destructive">- R$ {(valorDesconto ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="font-medium">Mensalidade após desconto</span>
                          <span className="font-bold text-success">R$ {(valorFinal ?? 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
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
                      <DropdownMenuItem onClick={() => setAlunoParaContrato(m.aluno_id)}>
                        <FileSignature className="h-4 w-4 mr-2" /> Emitir Contrato
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditMatricula(m)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMatricula(m)}>Excluir</DropdownMenuItem>
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

      <Dialog open={!!alunoParaContrato} onOpenChange={(open) => !open && setAlunoParaContrato(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Escolha o modelo de contrato</DialogTitle>
            <DialogDescription>Você vai poder conferir e preencher os dados antes de gerar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {!templatesContrato?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum modelo de contrato cadastrado.</p>
            ) : (
              templatesContrato.map((t) => (
                <Button key={t.id} variant="outline" className="w-full justify-start" onClick={() => emitirContrato(t.id)}>
                  <FileSignature className="h-4 w-4 mr-2" /> {t.nome}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Matrícula</DialogTitle>
            <DialogDescription>
              {editingMatricula && `${editingMatricula.aluno_nome}`}. Se você mudar turma, data de ingresso,
              desconto ou bolsa, vamos perguntar se quer recalcular as parcelas ao salvar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Turma</Label>
              <Select value={editTurmaId} onValueChange={setEditTurmaId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {turmasComVagas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome} - {t.turno} ({t.ano_letivo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de Ingresso</Label>
              <Input type="date" value={editDataIngresso} onChange={(e) => setEditDataIngresso(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Vencimento da Taxa de Matrícula (opcional)</Label>
              <Input type="date" value={editDataVencimentoMatricula} onChange={(e) => setEditDataVencimentoMatricula(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Parcelas da Taxa de Matrícula</Label>
              <Input type="number" min="1" value={editParcelasTaxa} onChange={(e) => setEditParcelasTaxa(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label>Desconto (%)</Label>
                <Input
                  type="number" min="0" max="100" step="0.01"
                  value={editDesconto} onChange={(e) => setEditDesconto(e.target.value)}
                  disabled={editBolsa} className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Checkbox id="edit-bolsa" checked={editBolsa} onCheckedChange={(v) => setEditBolsa(!!v)} />
                <Label htmlFor="edit-bolsa" className="cursor-pointer">Bolsa 100%</Label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    <TableCell>
                      R$ {Number(p.valor).toFixed(2)}
                      {p.valor_integral != null && Number(p.valor_integral) > Number(p.valor) && (
                        <div className="text-xs text-muted-foreground">
                          R$ {Number(p.valor_integral).toFixed(2)} se pago após o vencimento
                        </div>
                      )}
                    </TableCell>
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
