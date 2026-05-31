import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { format } from "date-fns";

type Canal = "secretaria" | "cobranca" | "coordenacao" | "bullying";
type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  canal: Canal;
  prioridade: string;
  autor: string | null;
  anonimo: boolean;
  publicado: boolean;
  publicado_em: string;
};

const CANAIS: { value: Canal; label: string }[] = [
  { value: "secretaria", label: "Secretaria" },
  { value: "cobranca", label: "Cobrança" },
  { value: "coordenacao", label: "Coordenação" },
  { value: "bullying", label: "Bullying" },
];

const PRIORIDADE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Baixa: "outline",
  Normal: "secondary",
  Alta: "default",
  Urgente: "destructive",
};

export default function Avisos() {
  const qc = useQueryClient();
  const [canal, setCanal] = useState<Canal>("secretaria");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Aviso | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    mensagem: "",
    canal: "secretaria" as Canal,
    prioridade: "Normal",
    autor: "",
    anonimo: false,
    publicado: true,
  });

  const { data: avisos, isLoading } = useQuery({
    queryKey: ["avisos", canal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avisos")
        .select("*")
        .eq("canal", canal)
        .order("publicado_em", { ascending: false });
      if (error) throw error;
      return data as Aviso[];
    },
  });

  const reset = () => {
    setEditing(null);
    setForm({ titulo: "", mensagem: "", canal, prioridade: "Normal", autor: "", anonimo: false, publicado: true });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, autor: form.autor || null };
      if (editing) {
        const { error } = await supabase.from("avisos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("avisos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Aviso atualizado" : "Aviso publicado");
      qc.invalidateQueries({ queryKey: ["avisos"] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("avisos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso removido");
      qc.invalidateQueries({ queryKey: ["avisos"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (a: Aviso) => {
    setEditing(a);
    setForm({
      titulo: a.titulo,
      mensagem: a.mensagem,
      canal: a.canal,
      prioridade: a.prioridade,
      autor: a.autor ?? "",
      anonimo: a.anonimo,
      publicado: a.publicado,
    });
    setOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" /> Avisos & Comunicação
          </h1>
          <p className="text-muted-foreground">Publique comunicados para os canais do app dos responsáveis.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <Button onClick={() => { reset(); setForm((f) => ({ ...f, canal })); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo aviso
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar aviso" : "Novo aviso"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Canal</Label>
                <Select value={form.canal} onValueChange={(v) => setForm({ ...form, canal: v as Canal })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CANAIS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea rows={5} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Baixa", "Normal", "Alta", "Urgente"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Autor</Label>
                  <Input value={form.autor} onChange={(e) => setForm({ ...form, autor: e.target.value })} placeholder="Ex.: Direção" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.publicado} onCheckedChange={(v) => setForm({ ...form, publicado: !!v })} />
                  Publicado
                </label>
                {form.canal === "bullying" && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.anonimo} onCheckedChange={(v) => setForm({ ...form, anonimo: !!v })} />
                    Anônimo
                  </label>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={!form.titulo || !form.mensagem}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={canal} onValueChange={(v) => setCanal(v as Canal)}>
        <TabsList>
          {CANAIS.map((c) => <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>)}
        </TabsList>
        {CANAIS.map((c) => (
          <TabsContent key={c.value} value={c.value}>
            <Card>
              <CardHeader>
                <CardTitle>Canal: {c.label}</CardTitle>
                <CardDescription>Avisos visíveis no tile correspondente do app.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : !avisos?.length ? (
                  <p className="text-muted-foreground">Nenhum aviso publicado neste canal.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Autor</TableHead>
                        <TableHead>Publicado em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {avisos.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.titulo}</TableCell>
                          <TableCell><Badge variant={PRIORIDADE_VARIANT[a.prioridade] ?? "secondary"}>{a.prioridade}</Badge></TableCell>
                          <TableCell>{a.anonimo ? <em className="text-muted-foreground">Anônimo</em> : (a.autor ?? "—")}</TableCell>
                          <TableCell>{format(new Date(a.publicado_em), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>{a.publicado ? <Badge variant="default">Ativo</Badge> : <Badge variant="outline">Rascunho</Badge>}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(a)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => remove.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
