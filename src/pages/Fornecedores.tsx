import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Ban, Truck } from "lucide-react";
import { FornecedorFormDialog, type FornecedorCompleto } from "@/components/FornecedorFormDialog";

export default function Fornecedores() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FornecedorCompleto | null>(null);

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
      return data as FornecedorCompleto[];
    },
  });

  const abrirNovo = () => { setEditing(null); setOpen(true); };
  const abrirEdicao = (f: FornecedorCompleto) => { setEditing(f); setOpen(true); };

  const aoSalvar = () => {
    qc.invalidateQueries({ queryKey: ["fornecedores-cadastro", escolaAtivaId] });
    qc.invalidateQueries({ queryKey: ["fornecedores", escolaAtivaId] });
  };

  const desativar = async (f: FornecedorCompleto) => {
    if (!confirm(`Desativar "${f.nome}"? Ele deixa de aparecer nas listas, mas o histórico é mantido.`)) return;
    const { error } = await supabase.from("fornecedores").update({ ativo: false }).eq("id", f.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Fornecedor desativado.");
    aoSalvar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6" /> Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastro pra pagamentos esporádicos (não recorrentes). Pra despesas recorrentes com
            fornecedor, use a Gestão de Contratos.
          </p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Novo Fornecedor</Button>
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
                <TableHead>Dados Bancários</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !data?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum fornecedor cadastrado.</TableCell></TableRow>
              ) : (
                data.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      {f.nome}
                      {f.razao_social && <div className="text-xs text-muted-foreground">{f.razao_social}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{f.categoria || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{f.cnpj_cpf || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {f.telefone && <div>{f.telefone}</div>}
                      {f.email && <div>{f.email}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {f.chave_pix ? <div>Pix: {f.chave_pix}</div> : (f.banco ? <div>{f.banco} Ag.{f.agencia}/Cc.{f.conta}</div> : "—")}
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

      <FornecedorFormDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={aoSalvar} />
    </div>
  );
}
