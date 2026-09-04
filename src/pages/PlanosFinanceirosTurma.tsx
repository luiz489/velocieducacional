import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Plus, Wallet, AlertCircle, Trash2, ListPlus } from "lucide-react";
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
import { toast } from "sonner";

export default function PlanosFinanceirosTurma() {
  const { turmas, loading, salvarPlano } = usePlanosFinanceirosTurma();
  const { escolaAtivaId } = useEscolaAtiva();
  const qc = useQueryClient();

  const [editando, setEditando] = useState<TurmaComPlano | null>(null);
  const [valorMensalidade, setValorMensalidade] = useState("");
  const [numeroParcelas, setNumeroParcelas] = useState("12");
  const [diaVencimento, setDiaVencimento] = useState("10");
  const [salvando, setSalvando] = useState(false);

  const [modalidadesDe, setModalidadesDe] = useState<TurmaComPlano | null>(null);
  const [novaModNome, setNovaModNome] = useState("");
  const [novaModValor, setNovaModValor] = useState("");

  const { data: modalidades } = useQuery({
    queryKey: ["modalidades-turma", modalidadesDe?.turma_id],
    enabled: !!modalidadesDe,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modalidades_financeiras_turma")
        .select("*")
        .eq("turma_id", modalidadesDe!.turma_id)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const criarModalidade = useMutation({
    mutationFn: async () => {
      if (!modalidadesDe || !escolaAtivaId) return;
      const { error } = await supabase.from("modalidades_financeiras_turma").insert({
        turma_id: modalidadesDe.turma_id,
        escola_id: escolaAtivaId,
        nome: novaModNome,
        valor_mensalidade: Number(novaModValor),
        ordem: modalidades?.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modalidade adicionada!");
      setNovaModNome("");
      setNovaModValor("");
      qc.invalidateQueries({ queryKey: ["modalidades-turma", modalidadesDe?.turma_id] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const excluirModalidade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modalidades_financeiras_turma").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modalidade removida.");
      qc.invalidateQueries({ queryKey: ["modalidades-turma", modalidadesDe?.turma_id] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const abrirEdicao = (t: TurmaComPlano) => {
    setEditando(t);
    setValorMensalidade(t.valor_mensalidade != null ? String(t.valor_mensalidade) : "");
    setNumeroParcelas(t.numero_parcelas != null ? String(t.numero_parcelas) : "12");
    setDiaVencimento(t.dia_vencimento != null ? String(t.dia_vencimento) : "10");
  };

  const handleSalvar = async () => {
    if (!editando || !escolaAtivaId) return;
    if (!valorMensalidade || Number(valorMensalidade) <= 0) return;

    setSalvando(true);
    const ok = await salvarPlano(editando.turma_id, escolaAtivaId, {
      valor_mensalidade: Number(valorMensalidade),
      numero_parcelas: Number(numeroParcelas),
      dia_vencimento: Number(diaVencimento),
      taxa_matricula: 0,
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
                    <div className="flex items-center gap-1">
                      {t.plano_id ? (
                        <Button variant="ghost" size="icon" onClick={() => abrirEdicao(t)} title="Editar plano">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => abrirEdicao(t)}>
                          <Plus className="h-4 w-4 mr-1" /> Configurar
                        </Button>
                      )}
                      {t.plano_id && (
                        <Button variant="ghost" size="icon" onClick={() => setModalidadesDe(t)} title="Modalidades (Integral, Com Almoço etc.)">
                          <ListPlus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
              A Taxa de Matrícula é calculada automaticamente (valor de uma mensalidade, já com desconto) - não
              precisa configurar separadamente.
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando || !valorMensalidade}>
              {salvando ? "Salvando..." : "Salvar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!modalidadesDe} onOpenChange={(open) => !open && setModalidadesDe(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modalidades — {modalidadesDe?.turma_nome}</DialogTitle>
            <DialogDescription>
              Variações de valor pra essa turma (ex: Mensal R$ {modalidadesDe?.valor_mensalidade}, Integral, Com
              Almoço). Na matrícula, a família escolhe uma delas; se nenhuma for escolhida, usa o valor padrão
              do plano acima.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {modalidades?.length ? (
              <div className="space-y-2">
                {modalidades.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>{m.nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">R$ {Number(m.valor_mensalidade).toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluirModalidade.mutate(m.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma modalidade cadastrada ainda.</p>
            )}

            <div className="border-t pt-3 space-y-2">
              <Label>Nova modalidade</Label>
              <div className="flex gap-2">
                <Input placeholder="Ex: Integral com Almoço" value={novaModNome} onChange={(e) => setNovaModNome(e.target.value)} />
                <Input
                  type="number" step="0.01" min="0" placeholder="R$" className="w-28"
                  value={novaModValor} onChange={(e) => setNovaModValor(e.target.value)}
                />
              </div>
              <Button
                size="sm" className="w-full" onClick={() => criarModalidade.mutate()}
                disabled={!novaModNome || !novaModValor || criarModalidade.isPending}
              >
                {criarModalidade.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
