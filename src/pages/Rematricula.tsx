import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ClipboardEdit } from "lucide-react";
import { format } from "date-fns";

type Status = "Aberta" | "Em andamento" | "Concluída" | "Cancelada";
const STATUSES: Status[] = ["Aberta", "Em andamento", "Concluída", "Cancelada"];

type Rematricula = {
  id: string;
  aluno_id: string;
  ano_letivo_destino: number;
  turma_destino_id: string | null;
  status: Status;
  observacoes: string | null;
  data_abertura: string;
  data_conclusao: string | null;
};

type Aluno = { id: string; nome: string };
type Turma = { id: string; nome: string; ano_letivo: number };

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
  "Aberta": "secondary",
  "Em andamento": "default",
  "Concluída": "outline",
  "Cancelada": "destructive",
};

export default function Rematricula() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    aluno_id: "",
    ano_letivo_destino: new Date().getFullYear() + 1,
    turma_destino_id: "",
    status: "Aberta" as Status,
    observacoes: "",
  });

  const { data: rematriculas } = useQuery({
    queryKey: ["rematriculas", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("rematriculas").select("*").eq("escola_id", escolaAtivaId!).order("data_abertura", { ascending: false });
      if (error) throw error;
      return data as Rematricula[];
    },
  });

  const { data: alunos } = useQuery({
    queryKey: ["alunos-min", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("alunos").select("id, nome").eq("escola_id", escolaAtivaId!).order("nome");
      if (error) throw error;
      return data as Aluno[];
    },
  });

  const { data: turmas } = useQuery({
    queryKey: ["turmas-min", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("turmas").select("id, nome, ano_letivo").eq("escola_id", escolaAtivaId!).order("nome");
      if (error) throw error;
      return data as Turma[];
    },
  });

  const alunoMap = new Map(alunos?.map((a) => [a.id, a.nome]));
  const turmaMap = new Map(turmas?.map((t) => [t.id, `${t.nome} (${t.ano_letivo})`]));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rematriculas").insert({
        aluno_id: form.aluno_id,
        ano_letivo_destino: form.ano_letivo_destino,
        turma_destino_id: form.turma_destino_id || null,
        status: form.status,
        observacoes: form.observacoes || null,
        escola_id: escolaAtivaId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rematrícula registrada");
      qc.invalidateQueries({ queryKey: ["rematriculas"] });
      setOpen(false);
      setForm({ aluno_id: "", ano_letivo_destino: new Date().getFullYear() + 1, turma_destino_id: "", status: "Aberta", observacoes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const payload: any = { status };
      if (status === "Concluída") payload.data_conclusao = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("rematriculas").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rematriculas"] });
    },
  });

  const grouped = STATUSES.map((s) => ({
    status: s,
    items: rematriculas?.filter((r) => r.status === s) ?? [],
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardEdit className="h-7 w-7 text-primary" /> (Re)matrícula
          </h1>
          <p className="text-muted-foreground">Acompanhe o processo de rematrícula dos alunos.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova rematrícula</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {grouped.map(({ status, items }) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{status}</span>
                <Badge variant={STATUS_VARIANT[status]}>{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
              {items.map((r) => (
                <div key={r.id} className="rounded-md border p-3 text-sm space-y-1">
                  <div className="font-medium">{alunoMap.get(r.aluno_id) ?? "Aluno"}</div>
                  <div className="text-xs text-muted-foreground">Ano {r.ano_letivo_destino}</div>
                  {r.turma_destino_id && <div className="text-xs">{turmaMap.get(r.turma_destino_id)}</div>}
                  <div className="text-xs text-muted-foreground">Aberta em {format(new Date(r.data_abertura), "dd/MM/yyyy")}</div>
                  <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v as Status })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova rematrícula</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Aluno</Label>
              <Select value={form.aluno_id} onValueChange={(v) => setForm({ ...form, aluno_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{alunos?.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ano letivo destino</Label>
                <Input type="number" value={form.ano_letivo_destino} onChange={(e) => setForm({ ...form, ano_letivo_destino: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Turma destino (opcional)</Label>
              <Select value={form.turma_destino_id} onValueChange={(v) => setForm({ ...form, turma_destino_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{turmas?.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!form.aluno_id}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
