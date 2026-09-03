import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function formatCurrency(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const emptyForm = {
  nome_prospect: "", contato_nome: "", contato_email: "", contato_telefone: "",
  plano_id: "", valor_implantacao: "", parcelas_implantacao: "1",
  valor_mensal_negociado: "", validade_ate: "", observacoes: "",
};

export default function Orcamentos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: planos } = useQuery({
    queryKey: ["planos-saas-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planos_saas").select("id, nome, valor_mensal").eq("ativo", true).order("valor_mensal");
      if (error) throw error;
      return data;
    },
  });

  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ["saas-orcamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_orcamentos")
        .select("*, planos_saas(nome, valor_mensal)")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("saas_orcamentos").insert({
        nome_prospect: form.nome_prospect,
        contato_nome: form.contato_nome || null,
        contato_email: form.contato_email || null,
        contato_telefone: form.contato_telefone || null,
        plano_id: form.plano_id || null,
        valor_implantacao: Number(form.valor_implantacao || 0),
        parcelas_implantacao: Number(form.parcelas_implantacao || 1),
        valor_mensal_negociado: form.valor_mensal_negociado ? Number(form.valor_mensal_negociado) : null,
        validade_ate: form.validade_ate || null,
        observacoes: form.observacoes || null,
        criado_por: userData.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Orçamento criado!" });
      qc.invalidateQueries({ queryKey: ["saas-orcamentos"] });
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const atualizarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("saas_orcamentos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status atualizado" });
      qc.invalidateQueries({ queryKey: ["saas-orcamentos"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Orçamentos</h1>
          <p className="text-muted-foreground text-sm">Propostas comerciais enviadas a escolas prospectivas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Orçamento</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Orçamento</DialogTitle>
              <DialogDescription>Proposta comercial para uma escola prospectiva.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome da Escola/Prospect *</Label>
                <Input value={form.nome_prospect} onChange={(e) => setForm({ ...form, nome_prospect: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contato</Label>
                  <Input value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.contato_telefone} onChange={(e) => setForm({ ...form, contato_telefone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.contato_email} onChange={(e) => setForm({ ...form, contato_email: e.target.value })} />
              </div>
              <div>
                <Label>Plano</Label>
                <Select value={form.plano_id} onValueChange={(v) => setForm({ ...form, plano_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {planos?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} ({formatCurrency(p.valor_mensal)}/mês)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Mensal Negociado (opcional, se diferente do plano)</Label>
                <Input type="number" step="0.01" value={form.valor_mensal_negociado} onChange={(e) => setForm({ ...form, valor_mensal_negociado: e.target.value })} />
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
                <Label>Válido Até</Label>
                <Input type="date" value={form.validade_ate} onChange={(e) => setForm({ ...form, validade_ate: e.target.value })} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <Button onClick={() => criar.mutate()} disabled={!form.nome_prospect || criar.isPending} className="w-full">
                {criar.isPending ? "Salvando..." : "Criar Orçamento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospect</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Implantação</TableHead>
                <TableHead>Mensal</TableHead>
                <TableHead>Válido até</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !orcamentos?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum orçamento cadastrado.</TableCell></TableRow>
              ) : (
                orcamentos.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      {o.nome_prospect}
                      {o.contato_nome && <div className="text-xs text-muted-foreground">{o.contato_nome}</div>}
                    </TableCell>
                    <TableCell>{o.planos_saas?.nome ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(o.valor_implantacao)}{o.parcelas_implantacao > 1 ? ` (${o.parcelas_implantacao}x)` : ""}</TableCell>
                    <TableCell>{formatCurrency(o.valor_mensal_negociado ?? o.planos_saas?.valor_mensal)}</TableCell>
                    <TableCell>{o.validade_ate ? new Date(o.validade_ate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={(v) => atualizarStatus.mutate({ id: o.id, status: v })}>
                        <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Aceito">Aceito</SelectItem>
                          <SelectItem value="Recusado">Recusado</SelectItem>
                          <SelectItem value="Expirado">Expirado</SelectItem>
                        </SelectContent>
                      </Select>
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
