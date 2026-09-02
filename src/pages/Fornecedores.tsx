import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Ban, Truck } from "lucide-react";

type Fornecedor = {
  id: string;
  nome: string;
  cnpj_cpf: string | null;
  telefone: string | null;
  email: string | null;
  categoria: string | null;
  ativo: boolean;
};

const emptyForm = { nome: "", cnpj_cpf: "", telefone: "", email: "", categoria: "" };

export default function Fornecedores() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["fornecedores-cadastro", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("escola_id", escolaAtivaId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Fornecedor[];
    },
  });

  const abrirNovo = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const abrirEdicao = (f: Fornecedor) => {
    setEditing(f);
    setForm({ nome: f.nome, cnpj_cpf: f.cnpj_cpf ?? "", telefone: f.telefone ?? "", email: f.email ?? "", categoria: f.categoria ?? "" });
    setOpen(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      cnpj_cpf: form.cnpj_cpf || null,
      telefone: form.telefone || null,
      email: form.email || null,
      categoria: form.categoria || null,
    };
    const { error } = editing
      ? await supabase.from("fornecedores").update(payload).eq("id", editing.id)
      : await supabase.from("fornecedores").insert({ ...payload, escola_id: escolaAtivaId });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(editing ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["fornecedores-cadastro", escolaAtivaId] });
    qc.invalidateQueries({ queryKey: ["fornecedores", escolaAtivaId] });
  };

  const desativar = async (f: Fornecedor) => {
    if (!confirm(`Desativar "${f.nome}"? Ele deixa de aparecer nas listas, mas o histórico é mantido.`)) return;
    const { error } = await supabase.from("fornecedores").update({ ativo: false }).eq("id", f.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Fornecedor desativado.");
    qc.invalidateQueries({ queryKey: ["fornecedores-cadastro", escolaAtivaId] });
    qc.invalidateQueries({ queryKey: ["fornecedores", escolaAtivaId] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6" /> Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastro simples pra pagamentos esporádicos (não recorrentes). Pra despesas recorrentes com
            fornecedor, use a Gestão de Contratos.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Novo Fornecedor</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Fornecedor" : "Cadastrar Fornecedor"}</DialogTitle>
              <DialogDescription>Dados básicos, suficientes pra um pagamento avulso.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <Label>CNPJ/CPF</Label>
                <Input value={form.cnpj_cpf} onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Material, Serviço, Manutenção" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <Button onClick={salvar} disabled={saving} className="w-full">
                {saving ? "Salvando…" : editing ? "Salvar Alterações" : "Cadastrar"}
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
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>CNPJ/CPF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !data?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum fornecedor cadastrado.</TableCell></TableRow>
              ) : (
                data.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{f.categoria || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{f.cnpj_cpf || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {f.telefone && <div>{f.telefone}</div>}
                      {f.email && <div>{f.email}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrirEdicao(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => desativar(f)}><Ban className="h-4 w-4" /></Button>
                      </div>
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
