import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Clock } from "lucide-react";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Turma = { id: string; nome: string; ano_letivo: number; turno: string };
type Aula = {
  id: string;
  turma_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  disciplina: string;
  professor: string | null;
  professor_id: string | null;
  sala: string | null;
  ano_letivo: number;
};

type ProfessorOpt = { id: string; nome: string; ativo: boolean };

export default function Horarios() {
  const qc = useQueryClient();
  const [turmaId, setTurmaId] = useState<string>("");
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    dia_semana: 1,
    hora_inicio: "07:00",
    hora_fim: "07:50",
    disciplina: "",
    professor_id: "",
    sala: "",
  });

  const { data: turmas } = useQuery({
    queryKey: ["turmas-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("turmas").select("*").order("nome");
      if (error) throw error;
      return data as Turma[];
    },
  });

  const { data: aulas } = useQuery({
    queryKey: ["horarios", turmaId, ano],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horarios_aulas")
        .select("*")
        .eq("turma_id", turmaId)
        .eq("ano_letivo", ano)
        .order("hora_inicio");
      if (error) throw error;
      return data as Aula[];
    },
  });

  const { data: professores } = useQuery({
    queryKey: ["professores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professores")
        .select("id, nome, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as ProfessorOpt[];
    },
  });

  const profMap = useMemo(() => {
    const m = new Map<string, string>();
    professores?.forEach((p) => m.set(p.id, p.nome));
    return m;
  }, [professores]);

  const save = useMutation({
    mutationFn: async () => {
      const profNome = form.professor_id ? profMap.get(form.professor_id) ?? null : null;
      const { error } = await supabase.from("horarios_aulas").insert({
        dia_semana: form.dia_semana,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        disciplina: form.disciplina,
        turma_id: turmaId,
        ano_letivo: ano,
        professor_id: form.professor_id || null,
        professor: profNome,
        sala: form.sala || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aula adicionada");
      qc.invalidateQueries({ queryKey: ["horarios"] });
      setOpen(false);
      setForm({ dia_semana: 1, hora_inicio: "07:00", hora_fim: "07:50", disciplina: "", professor_id: "", sala: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("horarios_aulas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aula removida");
      qc.invalidateQueries({ queryKey: ["horarios"] });
    },
  });

  const grade = useMemo(() => {
    const map: Record<number, Aula[]> = {};
    aulas?.forEach((a) => {
      map[a.dia_semana] = [...(map[a.dia_semana] ?? []), a];
    });
    return map;
  }, [aulas]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-7 w-7 text-primary" /> Horário Escolar
          </h1>
          <p className="text-muted-foreground">Monte a grade semanal de cada turma.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">Turma</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
              <SelectContent>
                {turmas?.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome} — {t.ano_letivo} ({t.turno})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ano letivo</Label>
            <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-[110px]" />
          </div>
          <Button disabled={!turmaId} onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Adicionar aula</Button>
        </div>
      </div>

      {!turmaId ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Selecione uma turma para visualizar a grade.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Grade — {ano}</CardTitle>
            <CardDescription>Clique no X para remover uma aula.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="grid grid-cols-6 gap-2 min-w-[700px]">
              {DIAS.map((d, idx) => (
                <div key={d} className="space-y-2">
                  <div className="text-center text-sm font-semibold border-b pb-2">{d}</div>
                  {(grade[idx + 1] ?? []).map((a) => (
                    <div key={a.id} className="rounded-md border bg-card p-2 text-xs space-y-1 relative">
                      <div className="font-semibold">{a.disciplina}</div>
                      <div className="text-muted-foreground">{a.hora_inicio.slice(0,5)} - {a.hora_fim.slice(0,5)}</div>
                      {a.professor && <div className="text-muted-foreground">Prof. {a.professor}</div>}
                      {a.sala && <div className="text-muted-foreground">Sala {a.sala}</div>}
                      <button onClick={() => remove.mutate(a.id)} className="absolute top-1 right-1 opacity-50 hover:opacity-100">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {!(grade[idx + 1]?.length) && <div className="text-center text-xs text-muted-foreground py-4">—</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova aula</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dia</Label>
                <Select value={String(form.dia_semana)} onValueChange={(v) => setForm({ ...form, dia_semana: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAS.map((d, i) => <SelectItem key={d} value={String(i + 1)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Disciplina</Label>
                <Input value={form.disciplina} onChange={(e) => setForm({ ...form, disciplina: e.target.value })} />
              </div>
              <div>
                <Label>Início</Label>
                <Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} />
              </div>
              <div>
                <Label>Professor</Label>
                <Select value={form.professor_id} onValueChange={(v) => setForm({ ...form, professor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {professores?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sala</Label>
                <Input value={form.sala} onChange={(e) => setForm({ ...form, sala: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!form.disciplina}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
