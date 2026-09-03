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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";

type Disciplina = {
  id: string;
  nome: string;
  codigo: string | null;
  carga_horaria: number;
  descricao: string | null;
  ativo: boolean;
};

type Matriz = {
  id: string;
  nome: string;
  serie: string;
  ano_letivo: number;
  turno: string;
  descricao: string | null;
  ativo: boolean;
  categoria_id: string | null;
  base_curricular: string | null;
  coordenador_responsavel: string | null;
  carga_horaria_total: number | null;
  categorias?: { nome: string } | null;
};

type Categoria = { id: string; nome: string };

type MatrizDisc = {
  id: string;
  matriz_id: string;
  disciplina_id: string;
  carga_horaria: number;
  ordem: number;
};

export default function MatrizesCurriculares() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Matriz | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "", serie: "", ano_letivo: new Date().getFullYear(),
    turno: "Manhã", descricao: "", ativo: true, categoria_id: "",
    base_curricular: "", coordenador_responsavel: "", carga_horaria_total: "",
  });

  const { data: categorias } = useQuery({
    queryKey: ["categorias-matriz", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("id, nome").eq("escola_id", escolaAtivaId!).order("ordem");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["matrizes", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("matrizes_curriculares").select("*, categorias(nome)")
        .eq("escola_id", escolaAtivaId!)
        .order("ano_letivo", { ascending: false }).order("nome");
      if (error) throw error;
      return data as Matriz[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        descricao: form.descricao || null,
        categoria_id: form.categoria_id || null,
        base_curricular: form.base_curricular || null,
        coordenador_responsavel: form.coordenador_responsavel || null,
        carga_horaria_total: form.carga_horaria_total ? Number(form.carga_horaria_total) : null,
      };
      if (editing) {
        const { error } = await supabase.from("matrizes_curriculares").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("matrizes_curriculares").insert({ ...payload, escola_id: escolaAtivaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Matriz atualizada" : "Matriz criada");
      qc.invalidateQueries({ queryKey: ["matrizes"] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("matrizes_curriculares").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Matriz removida");
      qc.invalidateQueries({ queryKey: ["matrizes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function reset() {
    setEditing(null);
    setForm({
      nome: "", serie: "", ano_letivo: new Date().getFullYear(), turno: "Manhã", descricao: "", ativo: true, categoria_id: "",
      base_curricular: "", coordenador_responsavel: "", carga_horaria_total: "",
    });
  }

  function openEdit(m: Matriz) {
    setEditing(m);
    setForm({
      nome: m.nome, serie: m.serie, ano_letivo: m.ano_letivo,
      turno: m.turno, descricao: m.descricao ?? "", ativo: m.ativo,
      categoria_id: m.categoria_id ?? "",
      base_curricular: m.base_curricular ?? "", coordenador_responsavel: m.coordenador_responsavel ?? "",
      carga_horaria_total: m.carga_horaria_total ? String(m.carga_horaria_total) : "",
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Matrizes Curriculares</h1>
        <p className="text-muted-foreground">Defina matrizes por série e vincule disciplinas.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Matrizes</CardTitle>
            <CardDescription>Conjunto de disciplinas por série e ano letivo.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Matriz</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Matriz" : "Nova Matriz"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: 5º Ano - Fundamental" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Série *</Label>
                    <Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })}
                      placeholder="Ex: 5º Ano" />
                  </div>
                  <div>
                    <Label>Ano letivo *</Label>
                    <Input type="number" value={form.ano_letivo}
                      onChange={(e) => setForm({ ...form, ano_letivo: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Turno</Label>
                    <Select value={form.turno} onValueChange={(v) => setForm({ ...form, turno: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manhã">Manhã</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                        <SelectItem value="Noite">Noite</SelectItem>
                        <SelectItem value="Integral">Integral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria/Segmento</Label>
                  <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {categorias?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Base Curricular</Label>
                    <Input value={form.base_curricular} onChange={(e) => setForm({ ...form, base_curricular: e.target.value })}
                      placeholder="Ex: BNCC" />
                  </div>
                  <div>
                    <Label>Carga Horária Total (h)</Label>
                    <Input type="number" value={form.carga_horaria_total} onChange={(e) => setForm({ ...form, carga_horaria_total: e.target.value })}
                      placeholder="Opcional - soma das disciplinas" />
                  </div>
                </div>
                <div>
                  <Label>Coordenador(a) Responsável</Label>
                  <Input value={form.coordenador_responsavel} onChange={(e) => setForm({ ...form, coordenador_responsavel: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: !!v })} />
                  <Label>Ativa</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => save.mutate()}
                  disabled={!form.nome || !form.serie || save.isPending}>Salvar</Button>
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
                  <TableHead>Série</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell>
                      {m.serie}
                      {m.base_curricular && <div className="text-xs text-muted-foreground">{m.base_curricular}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.categorias?.nome ?? "—"}</TableCell>
                    <TableCell>{m.ano_letivo}</TableCell>
                    <TableCell>{m.turno}</TableCell>
                    <TableCell>
                      <Badge variant={m.ativo ? "default" : "secondary"}>{m.ativo ? "Ativa" : "Inativa"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setManageId(m.id)}>
                        <BookOpen className="h-3 w-3 mr-1" />Disciplinas
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => { if (confirm("Excluir matriz?")) remove.mutate(m.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.length && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma matriz.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {manageId && (
        <ManageDisciplinasDialog matrizId={manageId} onClose={() => setManageId(null)} />
      )}
    </div>
  );
}

function ManageDisciplinasDialog({ matrizId, onClose }: { matrizId: string; onClose: () => void }) {
  const { escolaAtivaId } = useEscolaAtiva();
  const qc = useQueryClient();
  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas-ativas", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("disciplinas").select("*").eq("escola_id", escolaAtivaId!).eq("ativo", true).order("nome");
      if (error) throw error;
      return data as Disciplina[];
    },
  });

  const { data: vinculos } = useQuery({
    queryKey: ["matriz-disciplinas", matrizId, escolaAtivaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("matriz_disciplinas").select("*").eq("matriz_id", matrizId).eq("escola_id", escolaAtivaId!);
      if (error) throw error;
      return data as MatrizDisc[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ disciplinaId, vinculo, carga }: { disciplinaId: string; vinculo?: MatrizDisc; carga?: number }) => {
      if (vinculo && carga === undefined) {
        const { error } = await supabase.from("matriz_disciplinas").delete().eq("id", vinculo.id);
        if (error) throw error;
      } else if (vinculo && carga !== undefined) {
        const { error } = await supabase.from("matriz_disciplinas").update({ carga_horaria: carga }).eq("id", vinculo.id);
        if (error) throw error;
      } else {
        const disc = disciplinas?.find((d) => d.id === disciplinaId);
        const { error } = await supabase.from("matriz_disciplinas").insert({
          matriz_id: matrizId, disciplina_id: disciplinaId, carga_horaria: disc?.carga_horaria ?? 0, escola_id: escolaAtivaId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matriz-disciplinas", matrizId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Disciplinas da Matriz</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="w-32">Carga (h)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disciplinas?.map((d) => {
                const v = vinculos?.find((x) => x.disciplina_id === d.id);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Checkbox
                        checked={!!v}
                        onCheckedChange={() => toggle.mutate({ disciplinaId: d.id, vinculo: v })}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{d.nome}</TableCell>
                    <TableCell>{d.codigo || "-"}</TableCell>
                    <TableCell>
                      {v ? (
                        <Input
                          type="number"
                          defaultValue={v.carga_horaria}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (n !== v.carga_horaria) toggle.mutate({ disciplinaId: d.id, vinculo: v, carga: n });
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">{d.carga_horaria}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!disciplinas?.length && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">
                  Cadastre disciplinas primeiro.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
