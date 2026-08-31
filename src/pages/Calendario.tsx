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
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { format } from "date-fns";

type Tipo = "anual" | "academico";
type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  tipo: Tipo;
  publico_alvo: string;
  cor: string;
};

export default function Calendario() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [tipo, setTipo] = useState<Tipo>("anual");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Evento | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: "",
    tipo: "anual" as Tipo,
    publico_alvo: "Todos",
    cor: "#3b82f6",
  });

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["eventos", tipo, escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos_calendario")
        .select("*")
        .eq("escola_id", escolaAtivaId!)
        .eq("tipo", tipo)
        .order("data_inicio");
      if (error) throw error;
      return data as Evento[];
    },
  });

  const reset = () => {
    setEditing(null);
    setForm({ titulo: "", descricao: "", data_inicio: format(new Date(), "yyyy-MM-dd"), data_fim: "", tipo, publico_alvo: "Todos", cor: "#3b82f6" });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, descricao: form.descricao || null, data_fim: form.data_fim || null };
      if (editing) {
        const { error } = await supabase.from("eventos_calendario").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("eventos_calendario").insert({ ...payload, escola_id: escolaAtivaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Evento atualizado" : "Evento criado");
      qc.invalidateQueries({ queryKey: ["eventos"] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos_calendario").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento removido");
      qc.invalidateQueries({ queryKey: ["eventos"] });
    },
  });

  const startEdit = (e: Evento) => {
    setEditing(e);
    setForm({
      titulo: e.titulo,
      descricao: e.descricao ?? "",
      data_inicio: e.data_inicio,
      data_fim: e.data_fim ?? "",
      tipo: e.tipo,
      publico_alvo: e.publico_alvo,
      cor: e.cor,
    });
    setOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" /> Calendários
          </h1>
          <p className="text-muted-foreground">Gerencie o calendário anual e o calendário acadêmico do colégio.</p>
        </div>
        <Button onClick={() => { reset(); setForm((f) => ({ ...f, tipo })); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo evento
        </Button>
      </div>

      <Tabs value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
        <TabsList>
          <TabsTrigger value="anual">Calendário Anual</TabsTrigger>
          <TabsTrigger value="academico">Calendário Acadêmico</TabsTrigger>
        </TabsList>
        {(["anual", "academico"] as Tipo[]).map((t) => (
          <TabsContent key={t} value={t}>
            <Card>
              <CardHeader>
                <CardTitle>{t === "anual" ? "Eventos do ano" : "Datas acadêmicas"}</CardTitle>
                <CardDescription>
                  {t === "anual" ? "Feriados, eventos gerais e datas comemorativas." : "Provas, conselhos, entrega de notas e períodos letivos."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : !eventos?.length ? (
                  <p className="text-muted-foreground">Nenhum evento cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Fim</TableHead>
                        <TableHead>Público</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventos.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell><div className="h-4 w-4 rounded-full" style={{ background: e.cor }} /></TableCell>
                          <TableCell className="font-medium">{e.titulo}</TableCell>
                          <TableCell>{format(new Date(e.data_inicio), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{e.data_fim ? format(new Date(e.data_fim), "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell><Badge variant="secondary">{e.publico_alvo}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(e)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => remove.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div>
                <Label>Fim (opcional)</Label>
                <Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Tipo })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="academico">Acadêmico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Público</Label>
                <Input value={form.publico_alvo} onChange={(e) => setForm({ ...form, publico_alvo: e.target.value })} />
              </div>
              <div>
                <Label>Cor</Label>
                <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!form.titulo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
