import { useState } from "react";
import { Search, AlertTriangle, CheckCircle, Clock, TrendingUp, MoreHorizontal, Download, Filter } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useFinanceiro, type LancamentoRow } from "@/hooks/useFinanceiro";
import { exportarFinanceiroPDF } from "@/lib/relatorios";

function getStatusBadge(status: string) {
  switch (status) {
    case "Pago": return <Badge className="bg-success text-success-foreground">Pago</Badge>;
    case "Atrasado": return <Badge variant="destructive">Atrasado</Badge>;
    case "Cancelado": return <Badge variant="outline">Cancelado</Badge>;
    default: return <Badge variant="secondary">Pendente</Badge>;
  }
}

function getTipoBadge(tipo: string) {
  switch (tipo) {
    case "Mensalidade": return <Badge variant="outline">Mensalidade</Badge>;
    case "Material": return <Badge variant="outline" className="border-info text-info">Material</Badge>;
    case "Taxa Extra": return <Badge variant="outline" className="border-warning text-warning">Taxa Extra</Badge>;
    default: return <Badge variant="outline">Outros</Badge>;
  }
}

interface Inadimplente {
  responsavel: string;
  aluno_nome: string;
  total_devido: number;
  parcelas_atrasadas: number;
  dias_atraso_max: number;
}

function getInadimplentes(lancamentos: LancamentoRow[]): Inadimplente[] {
  const atrasados = lancamentos.filter((l) => l.status === "Atrasado");
  const grouped: Record<string, Inadimplente> = {};
  const hoje = new Date();
  atrasados.forEach((l) => {
    const key = l.aluno_nome;
    if (!grouped[key]) {
      grouped[key] = { responsavel: l.responsavel, aluno_nome: l.aluno_nome, total_devido: 0, parcelas_atrasadas: 0, dias_atraso_max: 0 };
    }
    grouped[key].total_devido += l.valor;
    grouped[key].parcelas_atrasadas += 1;
    const dias = Math.floor((hoje.getTime() - new Date(l.data_vencimento).getTime()) / 86400000);
    if (dias > grouped[key].dias_atraso_max) grouped[key].dias_atraso_max = dias;
  });
  return Object.values(grouped).sort((a, b) => b.total_devido - a.total_devido);
}

export default function Financeiro() {
  const { lancamentos, loading, confirmarPagamento } = useFinanceiro();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [confirmDialog, setConfirmDialog] = useState<LancamentoRow | null>(null);

  const filtered = lancamentos.filter((l) => {
    const matchSearch =
      l.aluno_nome.toLowerCase().includes(search.toLowerCase()) ||
      l.responsavel.toLowerCase().includes(search.toLowerCase()) ||
      l.descricao.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || l.status === statusFilter;
    const matchTipo = tipoFilter === "todos" || l.tipo === tipoFilter;
    return matchSearch && matchStatus && matchTipo;
  });

  const totalRecebido = lancamentos.filter((l) => l.status === "Pago").reduce((s, l) => s + l.valor, 0);
  const totalPendente = lancamentos.filter((l) => l.status === "Pendente").reduce((s, l) => s + l.valor, 0);
  const totalAtrasado = lancamentos.filter((l) => l.status === "Atrasado").reduce((s, l) => s + l.valor, 0);
  const totalGeral = totalRecebido + totalPendente + totalAtrasado;
  const inadimplencia = totalGeral > 0 ? ((totalAtrasado / totalGeral) * 100) : 0;

  const inadimplentes = getInadimplentes(lancamentos);

  const handleConfirmPagamento = async () => {
    if (confirmDialog) {
      const ok = await confirmarPagamento(confirmDialog.id);
      if (ok) setConfirmDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Contas a receber e gestão de inadimplência</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (filtered.length === 0) {
              toast.error("Nenhum lançamento pra exportar com os filtros atuais.");
              return;
            }
            exportarFinanceiroPDF(filtered, {
              recebido: totalRecebido,
              pendente: totalPendente,
              atrasado: totalAtrasado,
              inadimplencia,
            });
            toast.success("Relatório exportado!");
          }}
        >
          <Download className="h-4 w-4 mr-2" />Exportar Relatório
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="text-lg font-bold">R$ {totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A Receber</p>
              <p className="text-lg font-bold">R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Atraso</p>
              <p className="text-lg font-bold">R$ {totalAtrasado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa de Inadimplência</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{inadimplencia.toFixed(1)}%</p>
              </div>
              <Progress value={inadimplencia} className="h-1.5 mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lancamentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="inadimplentes">
            Inadimplentes
            {inadimplentes.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-[10px]">{inadimplentes.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por aluno, responsável..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Pago">Pagos</SelectItem>
                <SelectItem value="Pendente">Pendentes</SelectItem>
                <SelectItem value="Atrasado">Atrasados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="Mensalidade">Mensalidade</SelectItem>
                <SelectItem value="Taxa Extra">Taxa Extra</SelectItem>
                <SelectItem value="Material">Material</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="hidden lg:table-cell">Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{l.aluno_nome}</p>
                        <p className="text-xs text-muted-foreground">{l.responsavel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {l.descricao}
                    </TableCell>
                    <TableCell>{getTipoBadge(l.tipo)}</TableCell>
                    <TableCell className="font-medium">R$ {l.valor.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(l.data_vencimento).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{getStatusBadge(l.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {l.status !== "Pago" && (
                            <DropdownMenuItem onClick={() => setConfirmDialog(l)}>
                              Confirmar Pagamento
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum lançamento encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-muted-foreground">
            Mostrando {filtered.length} de {lancamentos.length} lançamentos
          </div>
        </TabsContent>

        <TabsContent value="inadimplentes" className="space-y-4">
          {inadimplentes.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="text-lg font-medium">Nenhum inadimplente!</p>
                <p className="text-sm text-muted-foreground">Todos os pagamentos estão em dia.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="shadow-sm border-destructive/20 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Resumo de Inadimplência
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-destructive">{inadimplentes.length}</p>
                      <p className="text-xs text-muted-foreground">Alunos inadimplentes</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">
                        R$ {totalAtrasado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">Total em atraso</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">
                        {inadimplentes.reduce((s, i) => s + i.parcelas_atrasadas, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Parcelas atrasadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-lg border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Parcelas Atrasadas</TableHead>
                      <TableHead>Total Devido</TableHead>
                      <TableHead>Dias em Atraso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inadimplentes.map((inad) => (
                      <TableRow key={inad.aluno_nome}>
                        <TableCell className="font-medium">{inad.aluno_nome}</TableCell>
                        <TableCell className="text-muted-foreground">{inad.responsavel}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{inad.parcelas_atrasadas}</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-destructive">
                          R$ {inad.total_devido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{inad.dias_atraso_max} dias</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>Deseja confirmar o recebimento deste pagamento?</DialogDescription>
          </DialogHeader>
          {confirmDialog && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm"><span className="text-muted-foreground">Aluno:</span> <span className="font-medium">{confirmDialog.aluno_nome}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">Descrição:</span> <span className="font-medium">{confirmDialog.descricao}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">Valor:</span> <span className="font-bold text-lg">R$ {confirmDialog.valor.toFixed(2)}</span></p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
                <Button onClick={handleConfirmPagamento}>
                  <CheckCircle className="h-4 w-4 mr-2" />Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
