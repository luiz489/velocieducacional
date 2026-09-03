import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, FileSignature, Printer, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { gerarContratoSaas } from "@/lib/contratoSaas";

function formatCurrency(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Ativo: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    Suspenso: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    Encerrado: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

const emptyForm = {
  numero_contrato: "", razao_social_contratante: "", cnpj_contratante: "",
  endereco_contratante: "", cidade_contratante: "", uf_contratante: "",
  responsavel_nome: "", responsavel_cpf: "",
  plano_id: "", valor_implantacao: "", parcelas_implantacao: "1",
  valor_mensal: "", dia_vencimento: "10", data_inicio: new Date().toISOString().slice(0, 10),
  escola_id: "",
};

export default function ContratosSaas() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [openConfig, setOpenConfig] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [configForm, setConfigForm] = useState({
    nome_empresa: "", razao_social: "", cnpj: "", endereco: "", cidade: "", uf: "", cep: "", telefone: "", email: "",
  });
  const [textoContrato, setTextoContrato] = useState<string | null>(null);

  const { data: plataformaConfig } = useQuery({
    queryKey: ["plataforma-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plataforma_configuracoes").select("*").limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  const abrirConfig = () => {
    if (plataformaConfig) {
      setConfigForm({
        nome_empresa: plataformaConfig.nome_empresa ?? "",
        razao_social: plataformaConfig.razao_social ?? "",
        cnpj: plataformaConfig.cnpj ?? "",
        endereco: plataformaConfig.endereco ?? "",
        cidade: plataformaConfig.cidade ?? "",
        uf: plataformaConfig.uf ?? "",
        cep: plataformaConfig.cep ?? "",
        telefone: plataformaConfig.telefone ?? "",
        email: plataformaConfig.email ?? "",
      });
    }
    setOpenConfig(true);
  };

  const salvarConfig = useMutation({
    mutationFn: async () => {
      if (!plataformaConfig) return;
      const { error } = await supabase.from("plataforma_configuracoes").update(configForm).eq("id", plataformaConfig.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Dados da contratada salvos!" });
      qc.invalidateQueries({ queryKey: ["plataforma-config"] });
      setOpenConfig(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const { data: planos } = useQuery({
    queryKey: ["planos-saas-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planos_saas").select("id, nome, valor_mensal").eq("ativo", true).order("valor_mensal");
      if (error) throw error;
      return data;
    },
  });

  const { data: escolas } = useQuery({
    queryKey: ["escolas-select-saas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("escolas").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: contratos, isLoading } = useQuery({
    queryKey: ["saas-contratos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_contratos")
        .select("*, planos_saas(nome), escolas(nome)")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const planoSelecionado = planos?.find((p) => p.id === form.plano_id);

  const criar = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("saas_contratos").insert({
        numero_contrato: form.numero_contrato || null,
        razao_social_contratante: form.razao_social_contratante,
        cnpj_contratante: form.cnpj_contratante || null,
        endereco_contratante: form.endereco_contratante || null,
        cidade_contratante: form.cidade_contratante || null,
        uf_contratante: form.uf_contratante || null,
        responsavel_nome: form.responsavel_nome || null,
        responsavel_cpf: form.responsavel_cpf || null,
        plano_id: form.plano_id || null,
        valor_implantacao: Number(form.valor_implantacao || 0),
        parcelas_implantacao: Number(form.parcelas_implantacao || 1),
        valor_mensal: Number(form.valor_mensal || planoSelecionado?.valor_mensal || 0),
        dia_vencimento: Number(form.dia_vencimento || 10),
        data_inicio: form.data_inicio,
        escola_id: form.escola_id || null,
        criado_por: userData.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Contrato criado!" });
      qc.invalidateQueries({ queryKey: ["saas-contratos"] });
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const atualizarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("saas_contratos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status atualizado" });
      qc.invalidateQueries({ queryKey: ["saas-contratos"] });
    },
  });

  const handleGerarContrato = async (contrato: any) => {
    if (!plataformaConfig) {
      toast({ title: "Erro", description: "Configure os dados da plataforma primeiro.", variant: "destructive" });
      return;
    }
    const texto = gerarContratoSaas(
      {
        numero_contrato: contrato.numero_contrato,
        razao_social_contratante: contrato.razao_social_contratante,
        cnpj_contratante: contrato.cnpj_contratante,
        endereco_contratante: contrato.endereco_contratante,
        cidade_contratante: contrato.cidade_contratante,
        uf_contratante: contrato.uf_contratante,
        responsavel_nome: contrato.responsavel_nome,
        valor_implantacao: Number(contrato.valor_implantacao),
        parcelas_implantacao: contrato.parcelas_implantacao,
        valor_mensal: Number(contrato.valor_mensal),
        dia_vencimento: contrato.dia_vencimento,
        data_inicio: contrato.data_inicio,
        plano_nome: contrato.planos_saas?.nome ?? null,
      },
      {
        nome_empresa: plataformaConfig.nome_empresa,
        razao_social: plataformaConfig.razao_social,
        cnpj: plataformaConfig.cnpj,
        endereco: plataformaConfig.endereco,
        cidade: plataformaConfig.cidade,
        uf: plataformaConfig.uf,
        telefone: plataformaConfig.telefone,
        email: plataformaConfig.email,
      }
    );
    setTextoContrato(texto);
  };

  const handleImprimir = () => {
    const janela = window.open("", "_blank");
    if (!janela || !textoContrato) return;
    janela.document.write(`<html><head><title>Contrato</title></head><body>${textoContrato}</body></html>`);
    janela.document.close();
    janela.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6" /> Contratos</h1>
          <p className="text-muted-foreground text-sm">Contratos de licença de uso do Veloci Educacional (SaaS) com cada cliente.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirConfig}><Settings className="h-4 w-4 mr-2" />Dados da Contratada</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Contrato</Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Contrato SaaS</DialogTitle>
              <DialogDescription>Dados do cliente contratante.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Número do Contrato</Label>
                  <Input value={form.numero_contrato} onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })} />
                </div>
                <div>
                  <Label>Vincular a uma Escola (opcional)</Label>
                  <Select value={form.escola_id} onValueChange={(v) => setForm({ ...form, escola_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      {escolas?.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Razão Social do Contratante *</Label>
                <Input value={form.razao_social_contratante} onChange={(e) => setForm({ ...form, razao_social_contratante: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj_contratante} onChange={(e) => setForm({ ...form, cnpj_contratante: e.target.value })} />
                </div>
                <div>
                  <Label>Responsável (assinante)</Label>
                  <Input value={form.responsavel_nome} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={form.endereco_contratante} onChange={(e) => setForm({ ...form, endereco_contratante: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input value={form.cidade_contratante} onChange={(e) => setForm({ ...form, cidade_contratante: e.target.value })} />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input value={form.uf_contratante} maxLength={2} onChange={(e) => setForm({ ...form, uf_contratante: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Plano</Label>
                <Select value={form.plano_id} onValueChange={(v) => {
                  const p = planos?.find((pl) => pl.id === v);
                  setForm({ ...form, plano_id: v, valor_mensal: p ? String(p.valor_mensal) : form.valor_mensal });
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {planos?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} ({formatCurrency(p.valor_mensal)}/mês)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor Mensal (R$) *</Label>
                  <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} />
                </div>
                <div>
                  <Label>Dia de Vencimento</Label>
                  <Input type="number" min="1" max="28" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor de Implantação (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_implantacao} onChange={(e) => setForm({ ...form, valor_implantacao: e.target.value })} />
                </div>
                <div>
                  <Label>Parcelas da Implantação</Label>
                  <Input type="number" min="1" value={form.parcelas_implantacao} onChange={(e) => setForm({ ...form, parcelas_implantacao: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Data de Início</Label>
                <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <Button
                onClick={() => criar.mutate()}
                disabled={!form.razao_social_contratante || !form.valor_mensal || criar.isPending}
                className="w-full"
              >
                {criar.isPending ? "Salvando..." : "Criar Contrato"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>

          <Dialog open={openConfig} onOpenChange={setOpenConfig}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Dados da Contratada (Veloci Educacional)</DialogTitle>
                <DialogDescription>Usados como CONTRATADA em todo contrato gerado.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome Fantasia</Label>
                  <Input value={configForm.nome_empresa} onChange={(e) => setConfigForm({ ...configForm, nome_empresa: e.target.value })} />
                </div>
                <div>
                  <Label>Razão Social</Label>
                  <Input value={configForm.razao_social} onChange={(e) => setConfigForm({ ...configForm, razao_social: e.target.value })} />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={configForm.cnpj} onChange={(e) => setConfigForm({ ...configForm, cnpj: e.target.value })} />
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input value={configForm.endereco} onChange={(e) => setConfigForm({ ...configForm, endereco: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cidade</Label>
                    <Input value={configForm.cidade} onChange={(e) => setConfigForm({ ...configForm, cidade: e.target.value })} />
                  </div>
                  <div>
                    <Label>UF</Label>
                    <Input value={configForm.uf} maxLength={2} onChange={(e) => setConfigForm({ ...configForm, uf: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={configForm.telefone} onChange={(e) => setConfigForm({ ...configForm, telefone: e.target.value })} />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input type="email" value={configForm.email} onChange={(e) => setConfigForm({ ...configForm, email: e.target.value })} />
                  </div>
                </div>
                <Button onClick={() => salvarConfig.mutate()} disabled={salvarConfig.isPending} className="w-full">
                  {salvarConfig.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contratante</TableHead>
                <TableHead>Escola vinculada</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Mensal</TableHead>
                <TableHead>Implantação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !contratos?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum contrato cadastrado.</TableCell></TableRow>
              ) : (
                contratos.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.razao_social_contratante}
                      {c.numero_contrato && <div className="text-xs text-muted-foreground">Nº {c.numero_contrato}</div>}
                    </TableCell>
                    <TableCell>{c.escolas?.nome ?? "—"}</TableCell>
                    <TableCell>{c.planos_saas?.nome ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(c.valor_mensal)}</TableCell>
                    <TableCell>{formatCurrency(c.valor_implantacao)}{c.parcelas_implantacao > 1 ? ` (${c.parcelas_implantacao}x)` : ""}</TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(v) => atualizarStatus.mutate({ id: c.id, status: v })}>
                        <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Suspenso">Suspenso</SelectItem>
                          <SelectItem value="Encerrado">Encerrado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleGerarContrato(c)}>
                        <FileSignature className="h-4 w-4 mr-1" /> Gerar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!textoContrato} onOpenChange={(open) => !open && setTextoContrato(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contrato Gerado</DialogTitle>
            <DialogDescription>Confira o texto antes de imprimir ou enviar para assinatura.</DialogDescription>
          </DialogHeader>
          {textoContrato && (
            <>
              <div className="border rounded-md p-4 bg-white" dangerouslySetInnerHTML={{ __html: textoContrato }} />
              <Button onClick={handleImprimir} className="w-full">
                <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
