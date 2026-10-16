import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Plus, Download, FileCode2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { dataBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Remessa = {
  id: string; numero: number; conta_bancaria_id: string | null; data_pagamento: string; status: string;
  qtde: number; total: number; observacoes: string | null; created_at: string;
  enviada_em: string | null; concluida_em: string | null; cancelada_em: string | null;
};
type Item = {
  id: string; origem: string; favorecido_nome: string; documento: string | null; forma_pagamento: string; valor: number;
  banco_codigo: string | null; banco_nome: string | null; agencia: string | null; agencia_dv: string | null;
  conta: string | null; conta_dv: string | null; tipo_conta: string | null; tipo_chave_pix: string | null;
  chave_pix: string | null; codigo_barras: string | null; status: string;
};
type ContaPagar = {
  id: string; descricao: string; valor: number; data_vencimento: string; fornecedor: string;
  professor_id: string | null; funcionario_id: string | null; fornecedor_id: string | null;
  forma_pagamento: string | null; codigo_barras: string | null;
};
type Favorecido = { id: string; origem: string; nome: string; pronto_para_pagar: boolean; pendencias: string | null };

const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ORIGEM: Record<string, string> = { funcionario: "Funcionário", professor: "Professor (PJ)", fornecedor: "Fornecedor" };
const FORMA: Record<string, string> = { pix: "Pix", ted: "TED", credito_conta: "Crédito em conta", boleto: "Boleto" };
const STATUS: Record<string, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "" },
  enviada: { rotulo: "Enviada ao banco", classe: "border-info text-info" },
  concluida: { rotulo: "Concluída", classe: "border-success text-success" },
  cancelada: { rotulo: "Cancelada", classe: "border-destructive text-destructive" },
};

const origemDaConta = (c: ContaPagar) =>
  c.professor_id ? "professor" : c.funcionario_id ? "funcionario" : c.fornecedor_id ? "fornecedor" : "";
const favorecidoIdDaConta = (c: ContaPagar) => c.professor_id ?? c.funcionario_id ?? c.fornecedor_id ?? "";

function destino(i: Item) {
  if (i.forma_pagamento === "pix") return `Pix (${i.tipo_chave_pix ?? "?"}): ${i.chave_pix ?? ""}`;
  if (i.forma_pagamento === "boleto") return `Código de barras: ${i.codigo_barras ?? ""}`;
  const ag = `${i.agencia ?? ""}${i.agencia_dv ? "-" + i.agencia_dv : ""}`;
  const cc = `${i.conta ?? ""}${i.conta_dv ? "-" + i.conta_dv : ""}`;
  return `${i.banco_codigo ?? ""} ${i.banco_nome ?? ""} · Ag ${ag} · Conta ${cc}`.trim();
}

export default function RemessaPagamentos() {
  const { escolaAtivaId } = useEscolaAtiva();
  const qc = useQueryClient();
  const [novaAberta, setNovaAberta] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const { data: remessas, isLoading } = useQuery({
    queryKey: ["remessas-pagamento", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("remessas_pagamento").select("*").eq("escola_id", escolaAtivaId!).order("numero", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Remessa[];
    },
  });

  const { data: contasBancarias } = useQuery({
    queryKey: ["contas-bancarias-remessa", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_bancarias").select("id, nome, banco, agencia, conta").eq("escola_id", escolaAtivaId!).eq("ativo", true).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const nomeConta = (id: string | null) => {
    const c = contasBancarias?.find((x) => x.id === id);
    return c ? `${c.nome}` : "—";
  };

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["remessas-pagamento", escolaAtivaId] });
    qc.invalidateQueries({ queryKey: ["remessa-candidatas", escolaAtivaId] });
    qc.invalidateQueries({ queryKey: ["remessa-itens"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Send className="h-6 w-6" /> Remessa de Pagamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reúne os pagamentos de folha, professores PJ e fornecedores em um lote para enviar ao banco. Só entram favorecidos com dados bancários completos.
          </p>
        </div>
        <Button onClick={() => setNovaAberta(true)}><Plus className="h-4 w-4 mr-2" />Nova remessa</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Pagamento em</TableHead>
              <TableHead className="hidden md:table-cell">Conta de débito</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )}
            {(remessas ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.numero}</TableCell>
                <TableCell>{dataBR(r.data_pagamento)}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{nomeConta(r.conta_bancaria_id)}</TableCell>
                <TableCell className="text-right">{r.qtde}</TableCell>
                <TableCell className="text-right font-medium">{brl(r.total)}</TableCell>
                <TableCell><Badge variant="outline" className={STATUS[r.status]?.classe}>{STATUS[r.status]?.rotulo ?? r.status}</Badge></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setDetalheId(r.id)}>Detalhes</Button></TableCell>
              </TableRow>
            ))}
            {!isLoading && (remessas ?? []).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Nenhuma remessa criada ainda.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <NovaRemessaDialog
        aberto={novaAberta}
        onClose={() => setNovaAberta(false)}
        escolaId={escolaAtivaId}
        contasBancarias={contasBancarias ?? []}
        onCriada={(id) => { recarregar(); setNovaAberta(false); setDetalheId(id); }}
      />
      <DetalheRemessaDialog
        remessa={(remessas ?? []).find((r) => r.id === detalheId) ?? null}
        nomeConta={nomeConta}
        onClose={() => setDetalheId(null)}
        onMudou={recarregar}
      />
    </div>
  );
}

function NovaRemessaDialog({
  aberto, onClose, escolaId, contasBancarias, onCriada,
}: {
  aberto: boolean; onClose: () => void; escolaId: string | null;
  contasBancarias: { id: string; nome: string; banco: string | null; agencia: string | null; conta: string | null }[];
  onCriada: (id: string) => void;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [contaId, setContaId] = useState("");
  const [data, setData] = useState(hoje);
  const [obs, setObs] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [criando, setCriando] = useState(false);

  const { data: candidatas, isLoading } = useQuery({
    queryKey: ["remessa-candidatas", escolaId],
    enabled: !!escolaId && aberto,
    queryFn: async () => {
      const [cp, fav, itens] = await Promise.all([
        supabase.from("contas_a_pagar")
          .select("id, descricao, valor, data_vencimento, fornecedor, professor_id, funcionario_id, fornecedor_id, forma_pagamento, codigo_barras")
          .eq("escola_id", escolaId!).eq("status", "Pendente").order("data_vencimento").limit(1000),
        supabase.from("v_favorecidos_pagamento").select("id, origem, nome, pronto_para_pagar, pendencias").eq("escola_id", escolaId!),
        supabase.from("remessas_pagamento_itens").select("conta_a_pagar_id").eq("escola_id", escolaId!).neq("status", "cancelado"),
      ]);
      if (cp.error) throw cp.error;
      return {
        contas: (cp.data ?? []) as ContaPagar[],
        favoritos: new Map(((fav.data ?? []) as Favorecido[]).map((f) => [f.id, f])),
        emRemessa: new Set((itens.data ?? []).map((i) => i.conta_a_pagar_id as string)),
      };
    },
  });

  const linhas = useMemo(() => {
    return (candidatas?.contas ?? []).map((c) => {
      const origem = origemDaConta(c);
      const fav = candidatas?.favoritos.get(favorecidoIdDaConta(c));
      const boleto = c.forma_pagamento === "boleto" || !!c.codigo_barras;
      const emRemessa = candidatas?.emRemessa.has(c.id) ?? false;
      let motivo: string | null = null;
      if (emRemessa) motivo = "Já está em uma remessa";
      else if (!origem) motivo = "Sem favorecido cadastrado";
      else if (boleto) motivo = c.codigo_barras ? null : "Boleto sem código de barras";
      else if (!fav) motivo = "Sem permissão para ver os dados deste favorecido";
      else if (!fav.pronto_para_pagar) motivo = `Falta: ${fav.pendencias ?? "dados bancários"}`;
      return { c, origem, nome: fav?.nome ?? c.fornecedor, motivo };
    });
  }, [candidatas]);

  const visiveis = linhas.filter((l) => filtro === "todos" || l.origem === filtro);
  const prontas = visiveis.filter((l) => !l.motivo);
  const total = linhas.filter((l) => marcadas.has(l.c.id)).reduce((s, l) => s + Number(l.c.valor), 0);

  const alternar = (id: string) => {
    const novo = new Set(marcadas);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    setMarcadas(novo);
  };

  const criar = async () => {
    if (!escolaId) return;
    if (!contaId) { toast.error("Escolha a conta de débito."); return; }
    if (marcadas.size === 0) { toast.error("Marque ao menos um pagamento."); return; }
    setCriando(true);
    const { data: id, error } = await supabase.rpc("criar_remessa_pagamento", {
      p_escola_id: escolaId, p_conta_bancaria_id: contaId, p_data_pagamento: data,
      p_contas: [...marcadas], p_observacoes: obs || null,
    });
    setCriando(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Remessa criada.");
    setMarcadas(new Set());
    setObs("");
    onCriada(id as string);
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova remessa de pagamentos</DialogTitle>
          <DialogDescription>Marque os pagamentos pendentes que vão neste lote. Quem está sem dados bancários completos não pode ser incluído.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Conta de débito</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Escolher a conta" /></SelectTrigger>
              <SelectContent>
                {contasBancarias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data do pagamento</Label>
            <Input type="date" value={data} min={hoje} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <Label>Observação (opcional)</Label>
            <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: folha de novembro" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Tabs value={filtro} onValueChange={setFiltro}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="funcionario">Funcionários</TabsTrigger>
              <TabsTrigger value="professor">Professores PJ</TabsTrigger>
              <TabsTrigger value="fornecedor">Fornecedores</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => setMarcadas(new Set([...marcadas, ...prontas.map((l) => l.c.id)]))} disabled={prontas.length === 0}>
            Marcar todos os prontos ({prontas.length})
          </Button>
        </div>

        <div className="rounded-md border max-h-[40vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Favorecido</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>}
              {visiveis.map(({ c, origem, nome, motivo }) => (
                <TableRow key={c.id} className={motivo ? "opacity-60" : ""}>
                  <TableCell><Checkbox disabled={!!motivo} checked={marcadas.has(c.id)} onCheckedChange={() => alternar(c.id)} /></TableCell>
                  <TableCell>
                    <div className="font-medium">{nome}</div>
                    <div className="text-xs text-muted-foreground">{ORIGEM[origem] ?? "—"}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.descricao}</TableCell>
                  <TableCell>{dataBR(c.data_vencimento)}</TableCell>
                  <TableCell className="text-right">{brl(c.valor)}</TableCell>
                  <TableCell>
                    {motivo ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5 shrink-0" />{motivo}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Pronto</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && visiveis.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum pagamento pendente nesta lista.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm">
            <strong>{marcadas.size}</strong> selecionado(s) · Total <strong>{brl(total)}</strong>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={criar} disabled={criando || marcadas.size === 0}>{criando ? "Criando…" : "Criar remessa"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetalheRemessaDialog({
  remessa, nomeConta, onClose, onMudou,
}: {
  remessa: Remessa | null; nomeConta: (id: string | null) => string; onClose: () => void; onMudou: () => void;
}) {
  const [agindo, setAgindo] = useState(false);

  const { data: itens, isLoading } = useQuery({
    queryKey: ["remessa-itens", remessa?.id],
    enabled: !!remessa,
    queryFn: async () => {
      const { data, error } = await supabase.from("remessas_pagamento_itens").select("*").eq("remessa_id", remessa!.id).order("favorecido_nome");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const agir = async (acao: "enviar" | "concluir" | "cancelar", confirmacao?: string) => {
    if (!remessa) return;
    if (confirmacao && !window.confirm(confirmacao)) return;
    setAgindo(true);
    const { error } = await supabase.rpc("atualizar_status_remessa", { p_remessa_id: remessa.id, p_acao: acao });
    setAgindo(false);
    if (error) { toast.error(error.message); return; }
    toast.success(acao === "enviar" ? "Remessa marcada como enviada." : acao === "concluir" ? "Remessa concluída." : "Remessa cancelada.");
    onMudou();
  };

  const exportarConferencia = () => {
    if (!remessa || !itens) return;
    const cab = ["Favorecido", "Origem", "Documento", "Forma", "Codigo_Banco", "Agencia", "Agencia_DV", "Conta", "Conta_DV",
      "Tipo_Conta", "Tipo_Chave_PIX", "Chave_PIX", "Codigo_Barras", "Valor", "Data_Pagamento"];
    const linhas = itens.filter((i) => i.status !== "cancelado").map((i) => [
      i.favorecido_nome, ORIGEM[i.origem] ?? i.origem, i.documento ?? "", FORMA[i.forma_pagamento] ?? i.forma_pagamento,
      i.banco_codigo ?? "", i.agencia ?? "", i.agencia_dv ?? "", i.conta ?? "", i.conta_dv ?? "", i.tipo_conta ?? "",
      i.tipo_chave_pix ?? "", i.chave_pix ?? "", i.codigo_barras ?? "", Number(i.valor).toFixed(2).replace(".", ","), dataBR(remessa.data_pagamento),
    ]);
    const csv = [cab, ...linhas].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `remessa_${remessa.numero}_conferencia.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!remessa} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {remessa && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Remessa nº {remessa.numero}
                <Badge variant="outline" className={STATUS[remessa.status]?.classe}>{STATUS[remessa.status]?.rotulo ?? remessa.status}</Badge>
              </DialogTitle>
              <DialogDescription>
                Pagamento em {dataBR(remessa.data_pagamento)} · conta de débito: {nomeConta(remessa.conta_bancaria_id)} · {remessa.qtde} item(ns) · {brl(remessa.total)}
                {remessa.observacoes ? ` · ${remessa.observacoes}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border max-h-[45vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Favorecido</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead className="hidden md:table-cell">Destino</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Item</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>}
                  {(itens ?? []).map((i) => (
                    <TableRow key={i.id} className={i.status === "cancelado" ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="font-medium">{i.favorecido_nome}</div>
                        <div className="text-xs text-muted-foreground">{ORIGEM[i.origem] ?? i.origem}</div>
                      </TableCell>
                      <TableCell>{FORMA[i.forma_pagamento] ?? i.forma_pagamento}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground break-all">{destino(i)}</TableCell>
                      <TableCell className="text-right">{brl(i.valor)}</TableCell>
                      <TableCell className="text-xs capitalize">{i.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              A baixa financeira das contas continua em Contas a Pagar. Esta tela controla o envio ao banco.
            </p>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={exportarConferencia} disabled={!itens?.length}><Download className="h-4 w-4 mr-2" />Exportar conferência (CSV)</Button>
                <Button variant="outline" disabled title="Depende do layout CNAB 240 do Sicredi, ainda não recebido"><FileCode2 className="h-4 w-4 mr-2" />Gerar arquivo CNAB</Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(remessa.status === "rascunho" || remessa.status === "enviada") && (
                  <Button variant="outline" disabled={agindo} onClick={() => agir("cancelar", "Cancelar esta remessa? Os pagamentos voltam a ficar livres para outra remessa.")}>Cancelar remessa</Button>
                )}
                {remessa.status === "rascunho" && (
                  <Button disabled={agindo} onClick={() => agir("enviar")}>Marcar como enviada ao banco</Button>
                )}
                {remessa.status === "enviada" && (
                  <Button disabled={agindo} onClick={() => agir("concluir", "Confirmar que o banco processou os pagamentos desta remessa?")}>Marcar como concluída</Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
