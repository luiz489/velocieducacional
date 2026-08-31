import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

type Categoria = {
  id: string;
  nome: string;
  nome_padrao_documento: string | null;
  ordem: number | null;
  diretor_nome: string | null;
  diretor_cargo: string | null;
};

const emptyForm = { nome: "", nome_padrao_documento: "", ordem: "0", diretor_nome: "", diretor_cargo: "" };

export default function Categorias() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["categorias-admin", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("escola_id", escolaAtivaId!)
        .order("ordem");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, ordem: String((data?.length ?? 0) + 1) });
    setOpen(true);
  };

  const openEdit = (c: Categoria) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      nome_padrao_documento: c.nome_padrao_documento ?? "",
      ordem: String(c.ordem ?? 0),
      diretor_nome: c.diretor_nome ?? "",
      diretor_cargo: c.diretor_cargo ?? "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        nome_padrao_documento: form.nome_padrao_documento || null,
        ordem: Number(form.ordem) || 0,
        diretor_nome: form.diretor_nome || null,
        diretor_cargo: form.diretor_cargo || null,
      };
      if (editing) {
        const { error } = await supabase.from("categorias").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categorias").insert({ ...payload, escola_id: escolaAtivaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Categoria atualizada" : "Categoria criada");
      qc.invalidateQueries({ queryKey: ["categorias-admin"] });
      qc.invalidateQueries({ queryKey: ["categorias"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria removida");
      qc.invalidateQueries({ queryKey: ["categorias-admin"] });
    },
    onError: (e: any) => {
      if (e.code === "23503") {
        toast.error("Não é possível remover: existem turmas vinculadas a essa categoria.");
      } else {
        toast.error(e.message);
      }
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" /> Categorias / Segmentos
          </h1>
          <p className="text-muted-foreground">
            Agrupam turmas por segmento (Educação Infantil, Fundamental I/II, Médio...) e definem
            o texto padrão usado nos documentos e o diretor responsável por assinar.
          </p>
        </div>
        <Button onClick={openNew} disabled={!escolaAtivaId}>
          <Plus className="h-4 w-4 mr-2" /> Nova Categoria
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Texto nos Documentos</TableHead>
                <TableHead>Diretor(a) Responsável</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead className="w-[110px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && !data?.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada.</TableCell></TableRow>
              )}
              {data?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.nome_padrao_documento ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {c.diretor_nome ?? "—"}
                    {c.diretor_cargo && <div className="text-xs text-muted-foreground">{c.diretor_cargo}</div>}
                  </TableCell>
                  <TableCell>{c.ordem}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { if (confirm(`Remover ${c.nome}?`)) remove.mutate(c.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription>
              Ex: "Educação Infantil", "Ensino Fundamental I", "Ensino Fundamental II", "Ensino Médio".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Ensino Fundamental" />
            </div>
            <div>
              <Label>Texto usado nos documentos</Label>
              <Input
                value={form.nome_padrao_documento}
                onChange={(e) => setForm({ ...form, nome_padrao_documento: e.target.value })}
                placeholder='Ex: "do Ensino Fundamental" (aparece em declarações)'
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Diretor(a) Responsável</Label>
                <Input value={form.diretor_nome} onChange={(e) => setForm({ ...form, diretor_nome: e.target.value })} />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input value={form.diretor_cargo} onChange={(e) => setForm({ ...form, diretor_cargo: e.target.value })} placeholder="Ex: Diretora Pedagógica" />
              </div>
            </div>
            <div>
              <Label>Ordem de exibição</Label>
              <Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!form.nome || save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
