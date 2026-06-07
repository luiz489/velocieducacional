import { useState } from "react";
import {
  Search, Receipt, AlertTriangle, CheckCircle, Clock, MoreHorizontal, Plus, Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Link } from "react-router-dom";

interface ContaPagar {
  id: string;
  fornecedor: string;
  fornecedor_id: string | null;
  descricao: string;
  valor: number;
  categoria: string;
  data_vencimento: string;
  data_pagamento: string | null;
  status: "Pendente" | "Pago" | "Vencido";
}

const mockContas: ContaPagar[] = [
  { id: "1", fornecedor: "Papelaria ABC", fornecedor_id: null, descricao: "Material de escritório", valor: 350.00, categoria: "Material", data_vencimento: "2026-04-15", data_pagamento: null, status: "Pendente" },
  { id: "2", fornecedor: "Energia Elétrica S/A", fornecedor_id: null, descricao: "Conta de luz - Março", valor: 1850.00, categoria: "Utilidades", data_vencimento: "2026-04-10", data_pagamento: null, status: "Vencido" },
  { id: "3", fornecedor: "Limpeza Total", fornecedor_id: null, descricao: "Serviço de limpeza mensal", valor: 2400.00, categoria: "Serviços", data_vencimento: "2026-04-20", data_pagamento: null, status: "Pendente" },
  { id: "4", fornecedor: "Editora Saber", fornecedor_id: null, descricao: "Livros didáticos 2026", valor: 5200.00, categoria: "Material Didático", data_vencimento: "2026-03-30", data_pagamento: "2026-03-28", status: "Pago" },
  { id: "5", fornecedor: "Manutenção Predial", fornecedor_id: null, descricao: "Reparo na quadra esportiva", valor: 3800.00, categoria: "Manutenção", data_vencimento: "2026-04-25", data_pagamento: null, status: "Pendente" },
  { id: "6", fornecedor: "Água e Saneamento", fornecedor_id: null, descricao: "Conta de água - Março", valor: 680.00, categoria: "Utilidades", data_vencimento: "2026-04-05", data_pagamento: "2026-04-04", status: "Pago" },
];

const categorias = ["Material", "Utilidades", "Serviços", "Material Didático", "Manutenção", "Salários", "Impostos", "Outros"];

export default function ContasPagar() {
  const [contas, setContas] = useState<ContaPagar[]>(mockContas);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCat, setFiltroCat] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ fornecedor_id: "", descricao: "", valor: "", categoria: "Outros", data_vencimento: "" });
  const { data: fornecedores = [], isLoading: loadingForn } = useFornecedores();

  const filtered = contas.filter((c) => {
    const matchBusca = c.fornecedor.toLowerCase().includes(busca.toLowerCase()) || c.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
    const matchCat = filtroCat === "todos" || c.categoria === filtroCat;
    return matchBusca && matchStatus && matchCat;
  });

  const totalPendente = contas.filter(c => c.status === "Pendente").reduce((s, c) => s + c.valor, 0);
  const totalVencido = contas.filter(c => c.status === "Vencido").reduce((s, c) => s + c.valor, 0);
  const totalPago = contas.filter(c => c.status === "Pago").reduce((s, c) => s + c.valor, 0);

  const statusBadge = (status: string) => {
    switch (status) {
      case "Pago": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
      case "Vencido": return <Badge className="bg-red-100 text-red-700 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  const handleSave = () => {
    if (!form.fornecedor_id || !form.descricao || !form.valor || !form.data_vencimento) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const forn = fornecedores.find(f => f.id === form.fornecedor_id);
    const nova: ContaPagar = {
      id: String(Date.now()),
      fornecedor: forn?.nome || "",
      fornecedor_id: form.fornecedor_id,
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      categoria: form.categoria,
      data_vencimento: form.data_vencimento,
      data_pagamento: null,
      status: "Pendente",
    };
    setContas([nova, ...contas]);
    setForm({ fornecedor_id: "", descricao: "", valor: "", categoria: "Outros", data_vencimento: "" });
    setDialogOpen(false);
    toast.success("Conta registrada com sucesso!");
  };

  const marcarPago = (id: string) => {
    setContas(contas.map(c => c.id === id ? { ...c, status: "Pago" as const, data_pagamento: new Date().toISOString().split("T")[0] } : c));
    toast.success("Conta marcada como paga!");
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas a Pagar</h1>
          <p className="text-muted-foreground text-sm">Gerencie as despesas e contas da instituição</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Conta
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{fmt(totalPendente)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencido</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{fmt(totalVencido)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago este mês</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{fmt(totalPago)}</p></CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar fornecedor ou descrição..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Vencido">Vencido</SelectItem>
            <SelectItem value="Pago">Pago</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroCat} onValueChange={setFiltroCat}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.fornecedor}</TableCell>
                  <TableCell className="text-muted-foreground">{c.descricao}</TableCell>
                  <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">{fmt(c.valor)}</TableCell>
                  <TableCell>{new Date(c.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {c.status !== "Pago" && <DropdownMenuItem onClick={() => marcarPago(c.id)}>Marcar como Pago</DropdownMenuItem>}
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Nova Conta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Conta a Pagar</DialogTitle>
            <DialogDescription>Registre uma nova despesa ou conta.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Fornecedor *</Label>
              {fornecedores.length === 0 && !loadingForn ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum fornecedor cadastrado. <Link to="/parceiros" className="text-primary underline">Cadastrar parceiro do tipo Fornecedor →</Link>
                </p>
              ) : (
                <Select value={form.fornecedor_id} onValueChange={v => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder={loadingForn ? "Carregando..." : "Selecione o fornecedor"} /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome} <span className="text-muted-foreground text-xs">({f.categoria})</span></SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Descrição *</Label>
              <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição da despesa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
              </div>
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Data de Vencimento *</Label>
              <Input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} />
            </div>
            <Button onClick={handleSave} className="w-full mt-2">Salvar Conta</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
