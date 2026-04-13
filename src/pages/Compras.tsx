import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ShoppingCart, UserCheck, FileText, CheckCircle, XCircle, Eye, ClipboardList } from "lucide-react";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800",
  "Em Cotação": "bg-blue-100 text-blue-800",
  Aprovada: "bg-green-100 text-green-800",
  Rejeitada: "bg-red-100 text-red-800",
  Concluída: "bg-gray-200 text-gray-800",
};

const URGENCIA_COLORS: Record<string, string> = {
  Baixa: "bg-slate-100 text-slate-700",
  Normal: "bg-blue-100 text-blue-700",
  Alta: "bg-orange-100 text-orange-700",
  Urgente: "bg-red-100 text-red-700",
};

// ─── Hooks ──────────────────────────────────────────────────────────

function useAprovadores() {
  return useQuery({
    queryKey: ["aprovadores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("aprovadores").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
}

function useSolicitacoes() {
  return useQuery({
    queryKey: ["solicitacoes_compra"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes_compra")
        .select("*, aprovadores(nome, cargo)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useCotacoes(solicitacaoId?: string) {
  return useQuery({
    queryKey: ["cotacoes", solicitacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*")
        .eq("solicitacao_id", solicitacaoId!)
        .order("valor_total");
      if (error) throw error;
      return data;
    },
    enabled: !!solicitacaoId,
  });
}

// ─── Aprovadores Tab ────────────────────────────────────────────────

function AprovadoresTab() {
  const qc = useQueryClient();
  const { data: aprovadores = [], isLoading } = useAprovadores();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", cargo: "", email: "", valor_max_aprovacao: "" });

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("aprovadores").insert({
        nome: form.nome,
        cargo: form.cargo,
        email: form.email || null,
        valor_max_aprovacao: Number(form.valor_max_aprovacao) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aprovadores"] });
      toast.success("Aprovador cadastrado!");
      setOpen(false);
      setForm({ nome: "", cargo: "", email: "", valor_max_aprovacao: "" });
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("aprovadores").update({ ativo: !ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aprovadores"] });
      toast.success("Status atualizado!");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Cadastro de aprovadores com alçada por valor</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Novo Aprovador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Aprovador</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div><Label>Cargo *</Label><Input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Diretor, Coordenador" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Valor Máximo de Aprovação (R$) *</Label><Input type="number" value={form.valor_max_aprovacao} onChange={e => setForm(f => ({ ...f, valor_max_aprovacao: e.target.value }))} placeholder="0,00" /></div>
              <Button className="w-full" onClick={() => salvar.mutate()} disabled={!form.nome || !form.cargo || salvar.isPending}>
                {salvar.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Alçada Máxima</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : aprovadores.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum aprovador cadastrado</TableCell></TableRow>
            ) : aprovadores.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.nome}</TableCell>
                <TableCell>{a.cargo}</TableCell>
                <TableCell>{a.email || "—"}</TableCell>
                <TableCell className="text-right font-mono">{fmt(Number(a.valor_max_aprovacao))}</TableCell>
                <TableCell><Badge variant={a.ativo ? "default" : "secondary"}>{a.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => toggleAtivo.mutate({ id: a.id, ativo: a.ativo })}>
                    {a.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Solicitações Tab ───────────────────────────────────────────────

function SolicitacoesTab() {
  const qc = useQueryClient();
  const { data: solicitacoes = [], isLoading } = useSolicitacoes();
  const { data: aprovadores = [] } = useAprovadores();
  const [open, setOpen] = useState(false);
  const [detalhes, setDetalhes] = useState<any>(null);
  const [form, setForm] = useState({
    solicitante: "", departamento: "Geral", descricao: "", justificativa: "", valor_estimado: "", urgencia: "Normal", data_necessidade: "",
  });

  const criar = useMutation({
    mutationFn: async () => {
      const valor = Number(form.valor_estimado) || 0;
      // Encontrar aprovador adequado pela alçada
      const aprovadoresAtivos = aprovadores.filter(a => a.ativo);
      const aprovadorAdequado = aprovadoresAtivos
        .filter(a => Number(a.valor_max_aprovacao) >= valor)
        .sort((a, b) => Number(a.valor_max_aprovacao) - Number(b.valor_max_aprovacao))[0];

      const { error } = await supabase.from("solicitacoes_compra").insert({
        solicitante: form.solicitante,
        departamento: form.departamento,
        descricao: form.descricao,
        justificativa: form.justificativa || null,
        valor_estimado: valor,
        urgencia: form.urgencia,
        data_necessidade: form.data_necessidade || null,
        aprovador_id: aprovadorAdequado?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes_compra"] });
      toast.success("Solicitação criada!");
      setOpen(false);
      setForm({ solicitante: "", departamento: "Geral", descricao: "", justificativa: "", valor_estimado: "", urgencia: "Normal", data_necessidade: "" });
    },
    onError: () => toast.error("Erro ao criar solicitação"),
  });

  const atualizarStatus = useMutation({
    mutationFn: async ({ id, status, motivo }: { id: string; status: string; motivo?: string }) => {
      const updates: any = { status };
      if (status === "Aprovada") updates.data_aprovacao = new Date().toISOString();
      if (status === "Rejeitada" && motivo) updates.motivo_rejeicao = motivo;
      const { error } = await supabase.from("solicitacoes_compra").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes_compra"] });
      toast.success("Status atualizado!");
      setDetalhes(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Gerencie solicitações de compra</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova Solicitação</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nova Solicitação de Compra</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div><Label>Solicitante *</Label><Input value={form.solicitante} onChange={e => setForm(f => ({ ...f, solicitante: e.target.value }))} /></div>
              <div>
                <Label>Departamento</Label>
                <Select value={form.departamento} onValueChange={v => setForm(f => ({ ...f, departamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Geral", "Administrativo", "Pedagógico", "TI", "Manutenção", "Limpeza"].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição *</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} /></div>
              <div><Label>Justificativa</Label><Textarea value={form.justificativa} onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor Estimado (R$) *</Label><Input type="number" value={form.valor_estimado} onChange={e => setForm(f => ({ ...f, valor_estimado: e.target.value }))} /></div>
                <div>
                  <Label>Urgência</Label>
                  <Select value={form.urgencia} onValueChange={v => setForm(f => ({ ...f, urgencia: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Baixa", "Normal", "Alta", "Urgente"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Data de Necessidade</Label><Input type="date" value={form.data_necessidade} onChange={e => setForm(f => ({ ...f, data_necessidade: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => criar.mutate()} disabled={!form.solicitante || !form.descricao || !form.valor_estimado || criar.isPending}>
                {criar.isPending ? "Criando..." : "Criar Solicitação"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Depto</TableHead>
              <TableHead className="text-right">Valor Est.</TableHead>
              <TableHead>Urgência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aprovador</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : solicitacoes.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma solicitação</TableCell></TableRow>
            ) : solicitacoes.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">#{s.numero_solicitacao}</TableCell>
                <TableCell className="font-medium">{s.solicitante}</TableCell>
                <TableCell className="max-w-[200px] truncate">{s.descricao}</TableCell>
                <TableCell>{s.departamento}</TableCell>
                <TableCell className="text-right font-mono">{fmt(Number(s.valor_estimado))}</TableCell>
                <TableCell><Badge className={URGENCIA_COLORS[s.urgencia] || ""}>{s.urgencia}</Badge></TableCell>
                <TableCell><Badge className={STATUS_COLORS[s.status] || ""}>{s.status}</Badge></TableCell>
                <TableCell className="text-sm">{s.aprovadores?.nome ? `${s.aprovadores.nome} (${s.aprovadores.cargo})` : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetalhes(s)} title="Ver detalhes">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {s.status === "Pendente" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => atualizarStatus.mutate({ id: s.id, status: "Aprovada" })} title="Aprovar">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => {
                          const motivo = prompt("Motivo da rejeição:");
                          if (motivo) atualizarStatus.mutate({ id: s.id, status: "Rejeitada", motivo });
                        }} title="Rejeitar">
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {s.status === "Aprovada" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => atualizarStatus.mutate({ id: s.id, status: "Em Cotação" })} title="Enviar p/ cotação">
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detalhes Dialog */}
      <Dialog open={!!detalhes} onOpenChange={() => setDetalhes(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Solicitação #{detalhes?.numero_solicitacao}</DialogTitle></DialogHeader>
          {detalhes && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Solicitante:</span> <strong>{detalhes.solicitante}</strong></div>
                <div><span className="text-muted-foreground">Departamento:</span> <strong>{detalhes.departamento}</strong></div>
                <div><span className="text-muted-foreground">Valor Estimado:</span> <strong>{fmt(Number(detalhes.valor_estimado))}</strong></div>
                <div><span className="text-muted-foreground">Urgência:</span> <Badge className={URGENCIA_COLORS[detalhes.urgencia]}>{detalhes.urgencia}</Badge></div>
                <div className="col-span-2"><span className="text-muted-foreground">Descrição:</span><p className="mt-1">{detalhes.descricao}</p></div>
                {detalhes.justificativa && <div className="col-span-2"><span className="text-muted-foreground">Justificativa:</span><p className="mt-1">{detalhes.justificativa}</p></div>}
                {detalhes.motivo_rejeicao && <div className="col-span-2"><span className="text-muted-foreground text-red-600">Motivo da Rejeição:</span><p className="mt-1 text-red-700">{detalhes.motivo_rejeicao}</p></div>}
                <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_COLORS[detalhes.status]}>{detalhes.status}</Badge></div>
                <div><span className="text-muted-foreground">Aprovador:</span> <strong>{detalhes.aprovadores?.nome || "—"}</strong></div>
              </div>
              {(detalhes.status === "Em Cotação" || detalhes.status === "Aprovada") && (
                <CotacoesSection solicitacaoId={detalhes.id} status={detalhes.status} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Cotações Section ───────────────────────────────────────────────

function CotacoesSection({ solicitacaoId, status }: { solicitacaoId: string; status: string }) {
  const qc = useQueryClient();
  const { data: cotacoes = [], isLoading } = useCotacoes(solicitacaoId);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    fornecedor: "", valor_unitario: "", quantidade: "1", prazo_entrega: "", condicao_pagamento: "", observacoes: "",
  });

  const addCotacao = useMutation({
    mutationFn: async () => {
      const vu = Number(form.valor_unitario) || 0;
      const qt = Number(form.quantidade) || 1;
      const { error } = await supabase.from("cotacoes").insert({
        solicitacao_id: solicitacaoId,
        fornecedor: form.fornecedor,
        valor_unitario: vu,
        quantidade: qt,
        valor_total: vu * qt,
        prazo_entrega: form.prazo_entrega || null,
        condicao_pagamento: form.condicao_pagamento || null,
        observacoes: form.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cotacoes", solicitacaoId] });
      toast.success("Cotação adicionada!");
      setFormOpen(false);
      setForm({ fornecedor: "", valor_unitario: "", quantidade: "1", prazo_entrega: "", condicao_pagamento: "", observacoes: "" });
    },
    onError: () => toast.error("Erro ao adicionar cotação"),
  });

  const selecionarCotacao = useMutation({
    mutationFn: async (cotacaoId: string) => {
      // Desmarcar todas
      await supabase.from("cotacoes").update({ selecionada: false }).eq("solicitacao_id", solicitacaoId);
      // Marcar a escolhida
      const { error } = await supabase.from("cotacoes").update({ selecionada: true }).eq("id", cotacaoId);
      if (error) throw error;
      // Atualizar status da solicitação
      await supabase.from("solicitacoes_compra").update({ status: "Concluída" }).eq("id", solicitacaoId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cotacoes", solicitacaoId] });
      qc.invalidateQueries({ queryKey: ["solicitacoes_compra"] });
      toast.success("Cotação selecionada! Compra concluída.");
    },
  });

  return (
    <div className="border-t pt-4 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-sm">Cotações</h4>
        {status === "Em Cotação" && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setFormOpen(!formOpen)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar Cotação
          </Button>
        )}
      </div>

      {formOpen && (
        <Card className="p-4">
          <div className="space-y-3">
            <div><Label>Fornecedor *</Label><Input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Unitário *</Label><Input type="number" value={form.valor_unitario} onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))} /></div>
              <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prazo de Entrega</Label><Input value={form.prazo_entrega} onChange={e => setForm(f => ({ ...f, prazo_entrega: e.target.value }))} placeholder="Ex: 5 dias úteis" /></div>
              <div><Label>Condição de Pagamento</Label><Input value={form.condicao_pagamento} onChange={e => setForm(f => ({ ...f, condicao_pagamento: e.target.value }))} placeholder="Ex: 30/60 dias" /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
            <Button size="sm" onClick={() => addCotacao.mutate()} disabled={!form.fornecedor || !form.valor_unitario || addCotacao.isPending}>
              {addCotacao.isPending ? "Salvando..." : "Salvar Cotação"}
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando cotações...</p>
      ) : cotacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma cotação registrada</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Vlr Unit.</TableHead>
              <TableHead className="text-right">Qtde</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cotacoes.map((c: any) => (
              <TableRow key={c.id} className={c.selecionada ? "bg-green-50" : ""}>
                <TableCell className="font-medium">{c.fornecedor}</TableCell>
                <TableCell className="text-right font-mono">{fmt(Number(c.valor_unitario))}</TableCell>
                <TableCell className="text-right">{c.quantidade}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{fmt(Number(c.valor_total))}</TableCell>
                <TableCell>{c.prazo_entrega || "—"}</TableCell>
                <TableCell>{c.condicao_pagamento || "—"}</TableCell>
                <TableCell>
                  {c.selecionada ? (
                    <Badge className="bg-green-600 text-white">Selecionada</Badge>
                  ) : status === "Em Cotação" ? (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => selecionarCotacao.mutate(c.id)}>
                      Selecionar
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function Compras() {
  const { data: solicitacoes = [] } = useSolicitacoes();

  const pendentes = solicitacoes.filter((s: any) => s.status === "Pendente").length;
  const emCotacao = solicitacoes.filter((s: any) => s.status === "Em Cotação").length;
  const aprovadas = solicitacoes.filter((s: any) => s.status === "Aprovada").length;
  const concluidas = solicitacoes.filter((s: any) => s.status === "Concluída").length;

  const kpis = [
    { title: "Pendentes", value: pendentes, icon: ClipboardList, color: "text-yellow-600" },
    { title: "Aprovadas", value: aprovadas, icon: CheckCircle, color: "text-green-600" },
    { title: "Em Cotação", value: emCotacao, icon: FileText, color: "text-blue-600" },
    { title: "Concluídas", value: concluidas, icon: ShoppingCart, color: "text-gray-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Compras</h1>
        <p className="text-sm text-muted-foreground">Solicitações, cotações e alçadas de aprovação</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => (
          <Card key={k.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.title}</CardTitle>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{k.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="solicitacoes">
        <TabsList>
          <TabsTrigger value="solicitacoes" className="gap-1.5"><ShoppingCart className="h-4 w-4" /> Solicitações</TabsTrigger>
          <TabsTrigger value="aprovadores" className="gap-1.5"><UserCheck className="h-4 w-4" /> Aprovadores</TabsTrigger>
        </TabsList>
        <TabsContent value="solicitacoes" className="mt-4"><SolicitacoesTab /></TabsContent>
        <TabsContent value="aprovadores" className="mt-4"><AprovadoresTab /></TabsContent>
      </Tabs>
    </div>
  );
}
