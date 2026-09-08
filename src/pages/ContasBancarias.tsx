import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Landmark, ArrowDownRight, ArrowUpRight } from "lucide-react";

const brl = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (s: string | null) => (s ? new Date(s + "T12:00").toLocaleDateString("pt-BR") : "—");
const hoje = () => new Date().toISOString().slice(0, 10);

type Conta = {
  id: string; nome: string; banco: string | null; agencia: string | null; conta: string | null;
  chave_pix: string | null; saldo_inicial: number; data_saldo_inicial: string; saldo_atual: number; ativo: boolean;
};
type Mov = {
  id: string; data: string; descricao: string | null; valor: number; natureza: "credito" | "debito";
  origem: string; identificada: boolean; financeiro_id: string | null; conta_a_pagar_id: string | null;
  receita_avulsa_id: string | null;
};

export default function ContasBancarias() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [contaSelId, setContaSelId] = useState<string | null>(null);
  const [novaContaOpen, setNovaContaOpen] = useState(false);
  const [lancOpen, setLancOpen] = useState(false);
  const [resolverMov, setResolverMov] = useState<Mov | null>(null);

  const [contaForm, setContaForm] = useState({ nome: "", banco: "", agencia: "", conta: "", chave_pix: "", saldo_inicial: "", data_saldo_inicial: hoje() });
  const [lanc, setLanc] = useState({ data: hoje(), descricao: "", valor: "", natureza: "credito" as "credito" | "debito", aClassificar: false });

  const { data: contas } = useQuery({
    queryKey: ["contas-bancarias", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_bancarias").select("*").eq("escola_id", escolaAtivaId!).order("nome");
      if (error) throw error;
      return data as Conta[];
    },
  });
  const conta = contas?.find((c) => c.id === contaSelId) ?? null;

  const { data: movs } = useQuery({
    queryKey: ["mov-bancarias", contaSelId],
    enabled: !!contaSelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_bancarias")
        .select("id, data, descricao, valor, natureza, origem, identificada, financeiro_id, conta_a_pagar_id, receita_avulsa_id")
        .eq("conta_bancaria_id", contaSelId!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as Mov[];
    },
  });

  const criarConta = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contas_bancarias").insert({
        escola_id: escolaAtivaId,
        nome: contaForm.nome.trim(),
        banco: contaForm.banco.trim() || null,
        agencia: contaForm.agencia.trim() || null,
        conta: contaForm.conta.trim() || null,
        chave_pix: contaForm.chave_pix.trim() || null,
        saldo_inicial: Number(contaForm.saldo_inicial || 0),
        data_saldo_inicial: contaForm.data_saldo_inicial,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta criada.");
      setNovaContaOpen(false);
      setContaForm({ nome: "", banco: "", agencia: "", conta: "", chave_pix: "", saldo_inicial: "", data_saldo_inicial: hoje() });
      qc.invalidateQueries({ queryKey: ["contas-bancarias"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const salvarSaldoInicial = useMutation({
    mutationFn: async ({ id, valor, data }: { id: string; valor: number; data: string }) => {
      const { error } = await supabase.from("contas_bancarias").update({ saldo_inicial: valor, data_saldo_inicial: data }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saldo inicial atualizado."); qc.invalidateQueries({ queryKey: ["contas-bancarias"] }); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const lancarMov = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("movimentacoes_bancarias").insert({
        conta_bancaria_id: contaSelId,
        escola_id: escolaAtivaId,
        data: lanc.data,
        descricao: lanc.descricao.trim() || null,
        valor: Number(lanc.valor),
        natureza: lanc.natureza,
        origem: "ajuste_manual",
        identificada: !lanc.aClassificar,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento registrado.");
      setLancOpen(false);
      setLanc({ data: hoje(), descricao: "", valor: "", natureza: "credito", aClassificar: false });
      qc.invalidateQueries({ queryKey: ["mov-bancarias", contaSelId] });
      qc.invalidateQueries({ queryKey: ["contas-bancarias"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const aClassificar = (movs ?? []).filter((m) => !m.identificada);
  const extrato = (movs ?? []).filter((m) => m.identificada);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="h-6 w-6" /> Contas Bancárias</h1>
          <p className="text-sm text-muted-foreground">Saldo espelho do banco. O faturamento não altera o saldo — só o retorno do banco ou ajuste manual.</p>
        </div>
        <Dialog open={novaContaOpen} onOpenChange={setNovaContaOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova conta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova conta bancária</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome / apelido</Label><Input value={contaForm.nome} onChange={(e) => setContaForm({ ...contaForm, nome: e.target.value })} placeholder="Ex: Sicredi Movimento" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Banco</Label><Input value={contaForm.banco} onChange={(e) => setContaForm({ ...contaForm, banco: e.target.value })} /></div>
                <div><Label>Agência</Label><Input value={contaForm.agencia} onChange={(e) => setContaForm({ ...contaForm, agencia: e.target.value })} /></div>
                <div><Label>Conta</Label><Input value={contaForm.conta} onChange={(e) => setContaForm({ ...contaForm, conta: e.target.value })} /></div>
              </div>
              <div><Label>Chave Pix</Label><Input value={contaForm.chave_pix} onChange={(e) => setContaForm({ ...contaForm, chave_pix: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Saldo inicial (do extrato do banco)</Label><Input type="number" step="0.01" value={contaForm.saldo_inicial} onChange={(e) => setContaForm({ ...contaForm, saldo_inicial: e.target.value })} /></div>
                <div><Label>Data do saldo</Label><Input type="date" value={contaForm.data_saldo_inicial} onChange={(e) => setContaForm({ ...contaForm, data_saldo_inicial: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => criarConta.mutate()} disabled={!contaForm.nome.trim() || criarConta.isPending}>
                {criarConta.isPending ? "Salvando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contas?.map((c) => (
          <Card key={c.id} className={`cursor-pointer ${contaSelId === c.id ? "ring-2 ring-primary" : ""}`} onClick={() => setContaSelId(c.id === contaSelId ? null : c.id)}>
            <CardContent className="pt-5 pb-4">
              <p className="font-medium">{c.nome}</p>
              <p className="text-xs text-muted-foreground">{[c.banco, c.agencia, c.conta].filter(Boolean).join(" · ") || "—"}</p>
              <p className="text-2xl font-bold mt-2">{brl(c.saldo_atual)}</p>
            </CardContent>
          </Card>
        ))}
        {!contas?.length && <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>}
      </div>

      {conta && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{conta.nome}</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Saldo inicial ({dt(conta.data_saldo_inicial)})</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" step="0.01" className="w-36 h-8"
                    defaultValue={conta.saldo_inicial}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== Number(conta.saldo_inicial)) salvarSaldoInicial.mutate({ id: conta.id, valor: v, data: conta.data_saldo_inicial });
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo atual</p>
                <p className="text-3xl font-bold">{brl(conta.saldo_atual)}</p>
              </div>
              <div className="ml-auto">
                <Dialog open={lancOpen} onOpenChange={setLancOpen}>
                  <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-1" />Lançamento manual</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Lançamento manual</DialogTitle></DialogHeader>
                    <DialogDescription>Tarifa de banco, rendimento, correção de saldo, ou um Pix avulso a classificar depois.</DialogDescription>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Data</Label><Input type="date" value={lanc.data} onChange={(e) => setLanc({ ...lanc, data: e.target.value })} /></div>
                        <div><Label>Valor</Label><Input type="number" step="0.01" value={lanc.valor} onChange={(e) => setLanc({ ...lanc, valor: e.target.value })} /></div>
                      </div>
                      <div><Label>Descrição</Label><Input value={lanc.descricao} onChange={(e) => setLanc({ ...lanc, descricao: e.target.value })} /></div>
                      <div>
                        <Label>Natureza</Label>
                        <Select value={lanc.natureza} onValueChange={(v) => setLanc({ ...lanc, natureza: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credito">Entrada (crédito)</SelectItem>
                            <SelectItem value="debito">Saída (débito)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={lanc.aClassificar} onCheckedChange={(v) => setLanc({ ...lanc, aClassificar: !!v })} />
                        Sem título — deixar em "A classificar"
                      </label>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => lancarMov.mutate()} disabled={!lanc.valor || Number(lanc.valor) <= 0 || lancarMov.isPending}>
                        {lancarMov.isPending ? "Salvando..." : "Lançar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {aClassificar.length > 0 && (
            <Card className="border-warning/40">
              <CardHeader className="pb-2"><CardTitle className="text-base text-warning">A classificar ({aClassificar.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Valor</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {aClassificar.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{dt(m.data)}</TableCell>
                        <TableCell>{m.descricao ?? "—"}</TableCell>
                        <TableCell className={m.natureza === "credito" ? "text-success" : "text-destructive"}>
                          {m.natureza === "credito" ? "+" : "−"}{brl(m.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setResolverMov(m)}>Resolver</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Extrato</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Origem</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  {!extrato.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem movimentações.</TableCell></TableRow>}
                  {extrato.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{dt(m.data)}</TableCell>
                      <TableCell>{m.descricao ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{m.origem === "ajuste_manual" ? "ajuste" : m.origem === "api_recebimento" ? "recebimento" : "pagamento"}</Badge></TableCell>
                      <TableCell className={`text-right font-medium ${m.natureza === "credito" ? "text-success" : "text-destructive"}`}>
                        <span className="inline-flex items-center gap-1">
                          {m.natureza === "credito" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {brl(m.valor)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <ResolverDialog
        mov={resolverMov}
        escolaId={escolaAtivaId}
        onClose={() => setResolverMov(null)}
        onDone={() => {
          setResolverMov(null);
          qc.invalidateQueries({ queryKey: ["mov-bancarias", contaSelId] });
          qc.invalidateQueries({ queryKey: ["contas-bancarias"] });
        }}
      />
    </div>
  );
}

function ResolverDialog({ mov, escolaId, onClose, onDone }: {
  mov: Mov | null; escolaId: string | null; onClose: () => void; onDone: () => void;
}) {
  const [modo, setModo] = useState<"vincular" | "criar">("vincular");
  const [tituloId, setTituloId] = useState("");
  const [criar, setCriar] = useState({ categoria: "Outros", descricao: "", terceiro: "" });
  const credito = mov?.natureza === "credito";

  const { data: titulos } = useQuery({
    queryKey: ["titulos-pendentes-resolver", escolaId, credito, mov?.id],
    enabled: !!mov && !!escolaId,
    queryFn: async () => {
      if (credito) {
        const [fin, rec] = await Promise.all([
          supabase.from("financeiro").select("id, descricao, valor, data_vencimento").eq("escola_id", escolaId!).neq("status", "Pago").eq("faturado", true).order("data_vencimento").limit(100),
          supabase.from("receitas_avulsas").select("id, descricao, valor, data").eq("escola_id", escolaId!).eq("status", "Pendente").order("data").limit(100),
        ]);
        return [
          ...(fin.data ?? []).map((t: any) => ({ id: t.id, tabela: "financeiro" as const, label: `${t.descricao} — ${brl(t.valor)} (venc ${dt(t.data_vencimento)})` })),
          ...(rec.data ?? []).map((t: any) => ({ id: t.id, tabela: "receita_avulsa" as const, label: `${t.descricao} — ${brl(t.valor)} (avulsa)` })),
        ];
      }
      const cap = await supabase.from("contas_a_pagar").select("id, descricao, fornecedor, valor, data_vencimento").eq("escola_id", escolaId!).neq("status", "Pago").order("data_vencimento").limit(100);
      return (cap.data ?? []).map((t: any) => ({ id: t.id, tabela: "conta_a_pagar" as const, label: `${t.fornecedor} — ${t.descricao} — ${brl(t.valor)}` }));
    },
  });

  const vincular = useMutation({
    mutationFn: async () => {
      const alvo = titulos?.find((t) => t.id === tituloId);
      if (!alvo) throw new Error("Selecione um título");
      const args: any = { p_mov_id: mov!.id };
      if (alvo.tabela === "financeiro") args.p_financeiro_id = alvo.id;
      else if (alvo.tabela === "receita_avulsa") args.p_receita_avulsa_id = alvo.id;
      else args.p_conta_a_pagar_id = alvo.id;
      const { error } = await supabase.rpc("mov_bancaria_vincular_titulo", args);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Movimento vinculado e título baixado."); onDone(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const criarVincular = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mov_bancaria_criar_e_vincular", {
        p_mov_id: mov!.id,
        p_categoria: criar.categoria.trim() || "Outros",
        p_descricao: criar.descricao.trim(),
        p_terceiro: criar.terceiro.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(credito ? "Receita avulsa criada e baixada." : "Conta a pagar criada e baixada."); onDone(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <Dialog open={!!mov} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Classificar movimento — {credito ? "entrada" : "saída"} de {brl(mov?.valor)}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Button size="sm" variant={modo === "vincular" ? "default" : "outline"} onClick={() => setModo("vincular")}>Vincular a título existente</Button>
          <Button size="sm" variant={modo === "criar" ? "default" : "outline"} onClick={() => setModo("criar")}>Criar {credito ? "receita avulsa" : "conta a pagar"}</Button>
        </div>

        {modo === "vincular" ? (
          <div className="space-y-3">
            <Label>{credito ? "Título a receber" : "Conta a pagar"} pendente</Label>
            <Select value={tituloId} onValueChange={setTituloId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {titulos?.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button onClick={() => vincular.mutate()} disabled={!tituloId || vincular.isPending}>
                {vincular.isPending ? "Vinculando..." : "Vincular e baixar"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div><Label>{credito ? "Pagador" : "Fornecedor"}</Label><Input value={criar.terceiro} onChange={(e) => setCriar({ ...criar, terceiro: e.target.value })} /></div>
            <div><Label>Descrição</Label><Input value={criar.descricao} onChange={(e) => setCriar({ ...criar, descricao: e.target.value })} placeholder={mov?.descricao ?? ""} /></div>
            <div><Label>Categoria</Label><Input value={criar.categoria} onChange={(e) => setCriar({ ...criar, categoria: e.target.value })} /></div>
            <DialogFooter>
              <Button onClick={() => criarVincular.mutate()} disabled={criarVincular.isPending}>
                {criarVincular.isPending ? "Salvando..." : "Criar e baixar"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
