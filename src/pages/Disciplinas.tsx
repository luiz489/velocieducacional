import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Disciplina = {
  id: string;
  nome: string;
  codigo: string | null;
  carga_horaria: number;
  descricao: string | null;
  area_conhecimento: string | null;
  ativo: boolean;
};

const AREAS_CONHECIMENTO = [
  "Linguagens", "Matemática", "Ciências da Natureza", "Ciências Humanas", "Ensino Religioso",
];

export default function Disciplinas() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [form, setForm] = useState({ nome: "", codigo: "", carga_horaria: 0, descricao: "", area_conhecimento: "", ativo: true });

  const { data, isLoading } = useQuery({
    queryKey: ["disciplinas", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("disciplinas").select("*").eq("escola_id", escolaAtivaId!).order("nome");
      if (error) throw error;
      return data as Disciplina[];
    },
  });

  const { data: usos } = useQuery({
    queryKey: ["disciplinas-usos", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriz_disciplinas")
        .select("disciplina_id, matrizes_curriculares(id, nome, serie, ano_letivo, turno)")
        .eq("escola_id", escolaAtivaId!);
      if (error) throw error;
      const map = new Map<string, { id: string; nome: string; serie: string; ano_letivo: number; turno: string }[]>();
      (data as any[])?.forEach((row) => {
        const m = row.matrizes_curriculares;
        if (!m) return;
        const arr = map.get(row.disciplina_id) ?? [];
        arr.push(m);
        map.set(row.disciplina_id, arr);
      });
      return map;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, codigo: form.codigo || null, descricao: form.descricao || null, area_conhecimento: form.area_conhecimento || null };
      if (editing) {
        const { error } = await supabase.from("disciplinas").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("disciplinas").insert({ ...payload, escola_id: escolaAtivaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Disciplina atualizada" : "Disciplina criada");
      qc.invalidateQueries({ queryKey: ["disciplinas"] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("disciplinas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Disciplina removida");
      qc.invalidateQueries({ queryKey: ["disciplinas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function reset() {
    setEditing(null);
    setForm({ nome: "", codigo: "", carga_horaria: 0, descricao: "", area_conhecimento: "", ativo: true });
  }

  function openEdit(d: Disciplina) {
    setEditing(d);
    setForm({
      nome: d.nome,
      codigo: d.codigo ?? "",
      carga_horaria: d.carga_horaria,
      descricao: d.descricao ?? "",
      area_conhecimento: d.area_conhecimento ?? "",
      ativo: d.ativo,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Disciplinas</h1>
        <p className="text-muted-foreground">Cadastro de disciplinas que compõem as matrizes curriculares.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Disciplinas</CardTitle>
            <CardDescription>Cadastro de disciplinas.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Disciplina</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Código</Label>
                    <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                  </div>
                  <div>
                    <Label>Carga horária (h)</Label>
                    <Input type="number" value={form.carga_horaria}
                      onChange={(e) => setForm({ ...form, carga_horaria: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div>
                  <Label>Área de Conhecimento</Label>
                  <Select value={form.area_conhecimento} onValueChange={(v) => setForm({ ...form, area_conhecimento: v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {AREAS_CONHECIMENTO.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: !!v })} />
                  <Label>Ativa</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => save.mutate()} disabled={!form.nome || save.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Carga (h)</TableHead>
                  <TableHead>Matrizes que usam</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((d) => {
                  const matrizes = usos?.get(d.id) ?? [];
                  return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {d.nome}
                      {d.area_conhecimento && <div className="text-xs text-muted-foreground">{d.area_conhecimento}</div>}
                    </TableCell>
                    <TableCell>{d.codigo || "-"}</TableCell>
                    <TableCell>{d.carga_horaria}</TableCell>
                    <TableCell>
                      {matrizes.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Nenhuma</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {matrizes.map((m) => (
                            <Badge key={m.id} variant="outline" className="text-xs">
                              {m.nome} · {m.ano_letivo} · {m.turno}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.ativo ? "default" : "secondary"}>{d.ativo ? "Ativa" : "Inativa"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => {
                          if (matrizes.length > 0) {
                            toast.error(`Disciplina vinculada a ${matrizes.length} matriz(es). Remova os vínculos primeiro.`);
                            return;
                          }
                          if (confirm("Excluir disciplina?")) remove.mutate(d.id);
                        }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {!data?.length && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma disciplina.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
