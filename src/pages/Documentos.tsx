import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Template = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  corpo_html: string;
  ativo: boolean;
  categoria_id: string | null;
};

type Campo = {
  id: string;
  chave: string;
  rotulo: string;
  tipo_dado: string;
  origem: string;
  obrigatorio: boolean;
  ordem: number;
  visivel: boolean;
};

export default function Documentos() {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<Template | null>(null);
  const [corpoEdit, setCorpoEdit] = useState("");
  const [novoCampo, setNovoCampo] = useState({ chave: "", rotulo: "", tipo_dado: "texto", origem: "manual" });

  const { data: categorias } = useQuery({
    queryKey: ["document-categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_categorias").select("id, nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, codigo, nome, descricao, corpo_html, ativo, categoria_id")
        .order("nome");
      if (error) throw error;
      return data as Template[];
    },
  });

  const { data: campos } = useQuery({
    queryKey: ["document-template-campos", editando?.id],
    enabled: !!editando,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_template_campos")
        .select("id, chave, rotulo, tipo_dado, origem, obrigatorio, ordem, visivel")
        .eq("template_id", editando!.id)
        .order("ordem");
      if (error) throw error;
      return data as Campo[];
    },
  });

  const categoriaNome = (id: string | null) => categorias?.find((c) => c.id === id)?.nome ?? "—";

  const salvarCorpo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("document_templates")
        .update({ corpo_html: corpoEdit, atualizado_em: new Date().toISOString() })
        .eq("id", editando!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Texto do documento salvo");
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
  });

  const adicionarCampo = useMutation({
    mutationFn: async () => {
      const maxOrdem = Math.max(0, ...(campos?.map((c) => c.ordem) ?? [0]));
      const { error } = await supabase.from("document_template_campos").insert({
        template_id: editando!.id,
        chave: novoCampo.chave,
        rotulo: novoCampo.rotulo,
        tipo_dado: novoCampo.tipo_dado,
        origem: novoCampo.origem,
        ordem: maxOrdem + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campo adicionado");
      setNovoCampo({ chave: "", rotulo: "", tipo_dado: "texto", origem: "manual" });
      queryClient.invalidateQueries({ queryKey: ["document-template-campos", editando?.id] });
    },
    onError: (err: any) => toast.error("Erro ao adicionar campo: " + err.message),
  });

  const excluirCampo = useMutation({
    mutationFn: async (campoId: string) => {
      const { error } = await supabase.from("document_template_campos").delete().eq("id", campoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campo removido");
      queryClient.invalidateQueries({ queryKey: ["document-template-campos", editando?.id] });
    },
    onError: (err: any) => toast.error("Erro ao remover campo: " + err.message),
  });

  const abrirEdicao = (t: Template) => {
    setEditando(t);
    setCorpoEdit(t.corpo_html);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6" /> Documentos e Declarações
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure o texto e os campos de cada documento. Use <code className="text-xs bg-muted px-1 rounded">{"{{grupo.campo}}"}</code> no
          texto para inserir dados automáticos ou preenchidos na hora de gerar.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {templates?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.nome}</div>
                    {t.descricao && <div className="text-xs text-muted-foreground">{t.descricao}</div>}
                  </TableCell>
                  <TableCell>{categoriaNome(t.categoria_id)}</TableCell>
                  <TableCell>
                    <Badge variant={t.ativo ? "default" : "outline"}>{t.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editando: {editando?.nome}</DialogTitle></DialogHeader>

          <div className="space-y-2">
            <Label>Texto do documento (HTML simples)</Label>
            <Textarea
              value={corpoEdit}
              onChange={(e) => setCorpoEdit(e.target.value)}
              rows={14}
              className="font-mono text-xs"
            />
            <Button size="sm" onClick={() => salvarCorpo.mutate()} disabled={salvarCorpo.isPending}>
              {salvarCorpo.isPending ? "Salvando…" : "Salvar texto"}
            </Button>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label>Campos deste documento</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chave</TableHead>
                  <TableHead>Rótulo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {campos?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{"{{" + c.chave + "}}"}</TableCell>
                    <TableCell>{c.rotulo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.origem === "manual" ? "Digitado ao gerar" : "Automático"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => excluirCampo.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid grid-cols-4 gap-2 items-end pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Chave (ex: manual.observacao)</Label>
                <Input
                  value={novoCampo.chave}
                  onChange={(e) => setNovoCampo({ ...novoCampo, chave: e.target.value })}
                  placeholder="manual.campo"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rótulo</Label>
                <Input
                  value={novoCampo.rotulo}
                  onChange={(e) => setNovoCampo({ ...novoCampo, rotulo: e.target.value })}
                  placeholder="Nome exibido"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Origem</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={novoCampo.origem}
                  onChange={(e) => setNovoCampo({ ...novoCampo, origem: e.target.value })}
                >
                  <option value="manual">Digitado ao gerar</option>
                  <option value="automatico">Automático (do banco)</option>
                </select>
              </div>
              <Button
                size="sm"
                onClick={() => adicionarCampo.mutate()}
                disabled={!novoCampo.chave || !novoCampo.rotulo || adicionarCampo.isPending}
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
