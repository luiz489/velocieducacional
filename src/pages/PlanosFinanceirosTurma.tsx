import { useState } from "react";
import { Pencil, Plus, Wallet, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanosFinanceirosTurma, type TurmaComPlano } from "@/hooks/usePlanosFinanceirosTurma";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

export default function PlanosFinanceirosTurma() {
  const { turmas, loading, salvarPlano } = usePlanosFinanceirosTurma();
  const { escolaAtivaId } = useEscolaAtiva();

  const [editando, setEditando] = useState<TurmaComPlano | null>(null);
  const [valorMensalidade, setValorMensalidade] = useState("");
  const [numeroParcelas, setNumeroParcelas] = useState("12");
  const [diaVencimento, setDiaVencimento] = useState("10");
  const [taxaMatricula, setTaxaMatricula] = useState("0");
  const [salvando, setSalvando] = useState(false);

  const abrirEdicao = (t: TurmaComPlano) => {
    setEditando(t);
    setValorMensalidade(t.valor_mensalidade != null ? String(t.valor_mensalidade) : "");
    setNumeroParcelas(t.numero_parcelas != null ? String(t.numero_parcelas) : "12");
    setDiaVencimento(t.dia_vencimento != null ? String(t.dia_vencimento) : "10");
    setTaxaMatricula(t.taxa_matricula != null ? String(t.taxa_matricula) : "0");
  };

  const handleSalvar = async () => {
    if (!editando || !escolaAtivaId) return;
    if (!valorMensalidade || Number(valorMensalidade) <= 0) return;

    setSalvando(true);
    const ok = await salvarPlano(editando.turma_id, escolaAtivaId, {
      valor_mensalidade: Number(valorMensalidade),
      numero_parcelas: Number(numeroParcelas),
      dia_vencimento: Number(diaVencimento),
      taxa_matricula: Number(taxaMatricula || 0),
    });
    setSalvando(false);
    if (ok) setEditando(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const semPlano = turmas.filter((t) => !t.plano_id).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Planos Financeiros por Turma
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o valor da mensalidade, número de parcelas e vencimento de cada turma.
          Sem isso, novas matrículas não geram parcelas automaticamente.
        </p>
      </div>

      {semPlano > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {semPlano} turma(s) ainda sem plano financeiro configurado. Matrículas nessas turmas
            não vão gerar carnê automaticamente até que você configure.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Turma</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Ano Letivo</TableHead>
                <TableHead>Mensalidade</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {turmas.map((t) => (
                <TableRow key={t.turma_id}>
                  <TableCell className="font-medium">{t.turma_nome}</TableCell>
                  <TableCell>{t.turno}</TableCell>
                  <TableCell>{t.ano_letivo}</TableCell>
                  <TableCell>
                    {t.valor_mensalidade != null ? `R$ ${Number(t.valor_mensalidade).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>{t.numero_parcelas ?? "—"}</TableCell>
                  <TableCell>{t.dia_vencimento ? `Dia ${t.dia_vencimento}` : "—"}</TableCell>
                  <TableCell>
                    {t.plano_id ? (
                      <Badge className="bg-success text-success-foreground">Configurado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/40">Não configurado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.plano_id ? (
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(t)} title="Editar plano">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => abrirEdicao(t)}>
                        <Plus className="h-4 w-4 mr-1" /> Configurar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {turmas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma turma cadastrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plano Financeiro — {editando?.turma_nome}</DialogTitle>
            <DialogDescription>
              Esses valores serão usados para gerar automaticamente o carnê de cada aluno matriculado nesta turma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Valor da Mensalidade (R$)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={valorMensalidade} onChange={(e) => setValorMensalidade(e.target.value)}
                placeholder="Ex: 850.00" className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número de Parcelas</Label>
                <Select value={numeroParcelas} onValueChange={setNumeroParcelas}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dia de Vencimento</Label>
                <Select value={diaVencimento} onValueChange={setDiaVencimento}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5,10,15,20,25].map((d) => (
                      <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Taxa de Matrícula (R$, opcional)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={taxaMatricula} onChange={(e) => setTaxaMatricula(e.target.value)}
                placeholder="0.00" className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cobrada como parcela extra apenas na primeira matrícula do aluno na turma.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando || !valorMensalidade}>
              {salvando ? "Salvando..." : "Salvar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
