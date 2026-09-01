import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  Clock,
  PauseCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Link } from "react-router-dom";

type Contrato = {
  id: string;
  fornecedor: string;
  descricao: string;
  valor_mensal: number;
  categoria: string;
  data_inicio: string;
  data_fim: string | null;
  dia_vencimento: number;
  status: string;
  observacoes: string | null;
  numero_contrato: string | null;
  renovacao_automatica: boolean;
  created_at: string;
  updated_at: string;
};

const categorias = [
  "Aluguel",
  "Serviços",
  "Tecnologia",
  "Manutenção",
  "Segurança",
  "Limpeza",
  "Alimentação",
  "Outros",
];

const statusColors: Record<string, string> = {
  Ativo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  Encerrado: "bg-muted text-muted-foreground",
  Suspenso: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function Contratos() {
  const queryClient = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [form, setForm] = useState({
    fornecedor_id: "",
    descricao: "",
    valor_mensal: "",
    categoria: "Outros",
    data_inicio: "",
    data_fim: "",
    dia_vencimento: "10",
    observacoes: "",
    numero_contrato: "",
    renovacao_automatica: false,
  });
  const { data: fornecedores = [], isLoading: loadingForn } = useFornecedores();

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("escola_id", escolaAtivaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contrato[];
    },
  });

  const emptyForm = {
    fornecedor_id: "",
    descricao: "",
    valor_mensal: "",
    categoria: "Outros",
    data_inicio: "",
    data_fim: "",
    dia_vencimento: "10",
    observacoes: "",
    numero_contrato: "",
    renovacao_automatica: false,
  };

  const abrirNovo = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const abrirEdicao = (c: Contrato) => {
    setEditing(c);
    setForm({
      fornecedor_id: "",
      descricao: c.descricao,
      valor_mensal: String(c.valor_mensal),
      categoria: c.categoria,
      data_inicio: c.data_inicio,
      data_fim: c.data_fim ?? "",
      dia_vencimento: String(c.dia_vencimento),
      observacoes: c.observacoes ?? "",
      numero_contrato: c.numero_contrato ?? "",
      renovacao_automatica: c.renovacao_automatica,
    });
    setOpen(true);
  };

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        descricao: form.descricao,
        valor_mensal: parseFloat(form.valor_mensal),
        categoria: form.categoria,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        dia_vencimento: parseInt(form.dia_vencimento),
        numero_contrato: form.numero_contrato || null,
        renovacao_automatica: form.renovacao_automatica,
        observacoes: form.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from("contratos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const forn = fornecedores.find(f => f.id === form.fornecedor_id);
        const { error } = await supabase.from("contratos").insert({
          ...payload,
          fornecedor: forn?.nome || "",
          fornecedor_id: form.fornecedor_id || null,
          escola_id: escolaAtivaId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success(editing ? "Contrato atualizado!" : "Contrato cadastrado com sucesso!");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("Erro ao salvar contrato."),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contratos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato excluído.");
    },
    onError: (e: any) => toast.error("Erro ao excluir: " + e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("contratos")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Status atualizado!");
    },
  });

  const filtrados = contratos.filter((c) => {
    const matchBusca =
      c.fornecedor.toLowerCase().includes(busca.toLowerCase()) ||
      c.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "Todos" || c.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const ativos = contratos.filter((c) => c.status === "Ativo");
  const totalMensal = ativos.reduce((s, c) => s + Number(c.valor_mensal), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Controle de fornecedores e contratos recorrentes
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={abrirNovo}>
              <Plus className="mr-2 h-4 w-4" /> Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Contrato" : "Cadastrar Contrato"}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                salvarMutation.mutate();
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Fornecedor *</Label>
                  {editing ? (
                    <p className="text-sm py-2 text-muted-foreground">{editing.fornecedor} (não editável aqui)</p>
                  ) : fornecedores.length === 0 && !loadingForn ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Nenhum fornecedor. <Link to="/parceiros" className="text-primary underline">Cadastrar →</Link>
                    </p>
                  ) : (
                    <Select value={form.fornecedor_id} onValueChange={v => setForm({ ...form, fornecedor_id: v })}>
                      <SelectTrigger><SelectValue placeholder={loadingForn ? "Carregando..." : "Selecione"} /></SelectTrigger>
                      <SelectContent>
                        {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => setForm({ ...form, categoria: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input
                  required
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Valor Mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={form.valor_mensal}
                    onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Dia Vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={form.dia_vencimento}
                    onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Início</Label>
                  <Input
                    type="date"
                    required
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Número do Contrato</Label>
                  <Input
                    value={form.numero_contrato}
                    onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="renovacao_automatica"
                  checked={form.renovacao_automatica}
                  onCheckedChange={(v) => setForm({ ...form, renovacao_automatica: !!v })}
                />
                <Label htmlFor="renovacao_automatica" className="cursor-pointer">Renovação automática</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Fim (opcional)</Label>
                  <Input
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={salvarMutation.isPending}>
                {salvarMutation.isPending ? "Salvando..." : editing ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ativos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo Mensal Total</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalMensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo Anual Estimado</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(totalMensal * 12).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por fornecedor ou descrição..."
            className="pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Suspenso">Suspenso</SelectItem>
            <SelectItem value="Encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor Mensal</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum contrato encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.fornecedor}
                      {c.numero_contrato && <div className="text-xs text-muted-foreground">Nº {c.numero_contrato}</div>}
                      {c.renovacao_automatica && <Badge variant="outline" className="text-[10px] mt-1">Renovação automática</Badge>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.descricao}</TableCell>
                    <TableCell>{c.categoria}</TableCell>
                    <TableCell className="text-right">
                      {Number(c.valor_mensal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell>Dia {c.dia_vencimento}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(c.data_inicio + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      {c.data_fim
                        ? ` — ${format(new Date(c.data_fim + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}`
                        : " — Indeterminado"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[c.status] || ""} variant="secondary">
                        {c.status}
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
                          <DropdownMenuItem onClick={() => abrirEdicao(c)}>Editar</DropdownMenuItem>
                          {c.status !== "Ativo" && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: c.id, status: "Ativo" })}>
                              <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Ativar
                            </DropdownMenuItem>
                          )}
                          {c.status !== "Suspenso" && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: c.id, status: "Suspenso" })}>
                              <PauseCircle className="mr-2 h-4 w-4 text-amber-500" /> Suspender
                            </DropdownMenuItem>
                          )}
                          {c.status !== "Encerrado" && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: c.id, status: "Encerrado" })}>
                              <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Encerrar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { if (confirm(`Excluir o contrato de "${c.fornecedor}"?`)) excluirMutation.mutate(c.id); }}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
