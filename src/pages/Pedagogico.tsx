import { useEffect, useState } from "react";
import { GraduationCap, BookOpen, Users, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

type Situacao = "Aprovado" | "Recuperação" | "Reprovado" | "Cursando";

function calcularSituacao(av1: number | null, av2: number | null): { media: number | null; situacao: Situacao } {
  if (av1 === null || av2 === null) return { media: null, situacao: "Cursando" };
  const media = parseFloat(((av1 + av2) / 2).toFixed(2));
  if (media >= 7) return { media, situacao: "Aprovado" };
  if (media >= 5) return { media, situacao: "Recuperação" };
  return { media, situacao: "Reprovado" };
}

function getSituacaoBadge(s: Situacao) {
  switch (s) {
    case "Aprovado": return <Badge className="bg-success text-success-foreground">Aprovado</Badge>;
    case "Recuperação": return <Badge className="bg-warning text-warning-foreground">Recuperação</Badge>;
    case "Reprovado": return <Badge variant="destructive">Reprovado</Badge>;
    default: return <Badge variant="secondary">Cursando</Badge>;
  }
}

function getFrequenciaBadge(p: number) {
  if (p >= 90) return <Badge className="bg-success text-success-foreground">{p.toFixed(1)}%</Badge>;
  if (p >= 75) return <Badge className="bg-warning text-warning-foreground">{p.toFixed(1)}%</Badge>;
  return <Badge variant="destructive">{p.toFixed(1)}%</Badge>;
}

function EditableCell({ value, onCommit }: { value: number | null; onCommit: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value !== null ? String(value) : "");

  useEffect(() => { setTemp(value !== null ? String(value) : ""); }, [value]);

  const commit = () => {
    setEditing(false);
    if (temp === "" || temp === "-") { onCommit(null); return; }
    const n = parseFloat(temp.replace(",", "."));
    if (!isNaN(n) && n >= 0 && n <= 10) onCommit(n);
    else setTemp(value !== null ? String(value) : "");
  };

  if (editing) {
    return (
      <Input
        autoFocus
        className="h-8 w-16 text-center text-sm p-1"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setTemp(value !== null ? String(value) : ""); } }}
      />
    );
  }

  return (
    <button
      className="h-8 w-16 rounded border border-transparent text-sm hover:border-input hover:bg-muted/50 transition-colors cursor-text flex items-center justify-center"
      onClick={() => { setEditing(true); setTemp(value !== null ? String(value) : ""); }}
    >
      {value !== null ? value.toFixed(1) : <span className="text-muted-foreground">—</span>}
    </button>
  );
}

export default function Pedagogico() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [turmaId, setTurmaId] = useState<string>("");
  const [disciplinaId, setDisciplinaId] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: turmas } = useQuery({
    queryKey: ["turmas-pedagogico", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome")
        .eq("escola_id", escolaAtivaId!)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (turmas && turmas.length > 0 && !turmaId) setTurmaId(turmas[0].id);
  }, [turmas]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas-ativas", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disciplinas")
        .select("id, nome")
        .eq("escola_id", escolaAtivaId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (disciplinas && disciplinas.length > 0 && !disciplinaId) setDisciplinaId(disciplinas[0].id);
  }, [disciplinas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alunos matriculados na turma, com a nota/frequência já lançada (se houver) na disciplina selecionada
  const { data: registros, isLoading } = useQuery({
    queryKey: ["pedagogico-registros", turmaId, disciplinaId],
    enabled: !!turmaId && !!disciplinaId,
    queryFn: async () => {
      const { data: matriculas, error: errMat } = await supabase
        .from("matriculas")
        .select("id, aluno_id, alunos(nome)")
        .eq("turma_id", turmaId);
      if (errMat) throw errMat;

      const { data: notas, error: errNotas } = await supabase
        .from("pedagogico")
        .select("id, matricula_id, av1, av2, recuperacao, frequencia_percentual")
        .eq("disciplina_id", disciplinaId)
        .in("matricula_id", (matriculas ?? []).map((m) => m.id));
      if (errNotas) throw errNotas;

      const notasPorMatricula = new Map(notas?.map((n) => [n.matricula_id, n]));

      return (matriculas ?? [])
        .map((m: any) => {
          const nota = notasPorMatricula.get(m.id);
          return {
            matricula_id: m.id as string,
            aluno_nome: m.alunos?.nome ?? "—",
            av1: nota?.av1 ?? null,
            av2: nota?.av2 ?? null,
            recuperacao: nota?.recuperacao ?? null,
            frequencia_percentual: nota?.frequencia_percentual ?? null,
          };
        })
        .sort((a, b) => a.aluno_nome.localeCompare(b.aluno_nome));
    },
  });

  const salvarCampo = useMutation({
    mutationFn: async (vars: { matriculaId: string; campo: "av1" | "av2" | "recuperacao" | "frequencia_percentual"; valor: number | null }) => {
      const { error } = await supabase.from("pedagogico").upsert(
        {
          matricula_id: vars.matriculaId,
          disciplina_id: disciplinaId,
          escola_id: escolaAtivaId,
          disciplina: disciplinas?.find((d) => d.id === disciplinaId)?.nome ?? "",
          [vars.campo]: vars.valor,
        },
        { onConflict: "matricula_id,disciplina_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedagogico-registros", turmaId, disciplinaId] });
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  const filtrados = (registros ?? []).filter((r) => r.aluno_nome.toLowerCase().includes(search.toLowerCase()));

  const comMedia = filtrados.map((r) => ({ ...r, ...calcularSituacao(r.av1, r.av2) }));
  const aprovados = comMedia.filter((r) => r.situacao === "Aprovado").length;
  const mediaGeral = comMedia.filter((r) => r.media !== null).reduce((s, r, _i, arr) => s + (r.media ?? 0) / arr.length, 0);
  const comFrequencia = filtrados.filter((r) => r.frequencia_percentual !== null);
  const freqMedia = comFrequencia.length > 0
    ? comFrequencia.reduce((s, r) => s + (r.frequencia_percentual ?? 0), 0) / comFrequencia.length
    : 0;

  const turmaNome = turmas?.find((t) => t.id === turmaId)?.nome ?? "";
  const disciplinaNome = disciplinas?.find((d) => d.id === disciplinaId)?.nome ?? "";

  if (!escolaAtivaId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> Pedagógico — Notas e Frequência
        </h1>
        <p className="text-sm text-muted-foreground">Lançamento de notas (AV1, AV2, Recuperação) e frequência por turma e disciplina.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={turmaId} onValueChange={setTurmaId}>
          <SelectTrigger className="w-[180px]">
            <Users className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            {turmas?.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={disciplinaId} onValueChange={setDisciplinaId}>
          <SelectTrigger className="w-[180px]">
            <GraduationCap className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            {disciplinas?.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {!turmas?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma turma cadastrada ainda.</p>
      ) : !disciplinas?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma disciplina cadastrada ainda.</p>
      ) : isLoading ? (
        <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Média da Turma</p>
                  <p className="text-xl font-bold">{mediaGeral.toFixed(1)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aprovados</p>
                  <p className="text-xl font-bold">{aprovados}/{comMedia.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                  <BookOpen className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Frequência Média</p>
                  <p className="text-xl font-bold">{freqMedia.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="notas" className="space-y-4">
            <TabsList>
              <TabsTrigger value="notas">Notas</TabsTrigger>
              <TabsTrigger value="frequencia">Frequência</TabsTrigger>
            </TabsList>

            <TabsContent value="notas" className="space-y-4">
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-sm font-medium">{turmaNome} — {disciplinaNome}</p>
                  <p className="text-xs text-muted-foreground">Clique em uma célula para editar a nota (0 a 10)</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Aluno</TableHead>
                      <TableHead className="text-center w-20">AV1</TableHead>
                      <TableHead className="text-center w-20">AV2</TableHead>
                      <TableHead className="text-center w-20">Rec.</TableHead>
                      <TableHead className="text-center w-20">Média</TableHead>
                      <TableHead className="text-center">Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comMedia.map((aluno) => (
                      <TableRow key={aluno.matricula_id}>
                        <TableCell className="font-medium">{aluno.aluno_nome}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <EditableCell value={aluno.av1} onCommit={(v) => salvarCampo.mutate({ matriculaId: aluno.matricula_id, campo: "av1", valor: v })} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <EditableCell value={aluno.av2} onCommit={(v) => salvarCampo.mutate({ matriculaId: aluno.matricula_id, campo: "av2", valor: v })} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <EditableCell value={aluno.recuperacao} onCommit={(v) => salvarCampo.mutate({ matriculaId: aluno.matricula_id, campo: "recuperacao", valor: v })} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${aluno.media !== null ? (aluno.media >= 7 ? "text-success" : aluno.media >= 5 ? "text-warning" : "text-destructive") : "text-muted-foreground"}`}>
                            {aluno.media !== null ? aluno.media.toFixed(1) : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{getSituacaoBadge(aluno.situacao)}</TableCell>
                      </TableRow>
                    ))}
                    {comMedia.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum aluno matriculado nesta turma.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="frequencia" className="space-y-4">
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-sm font-medium">{turmaNome} — {disciplinaNome}</p>
                  <p className="text-xs text-muted-foreground">Clique para editar o percentual de frequência (0 a 100)</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Aluno</TableHead>
                      <TableHead className="min-w-[200px]">Frequência (%)</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((aluno) => (
                      <TableRow key={aluno.matricula_id}>
                        <TableCell className="font-medium">{aluno.aluno_nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={aluno.frequencia_percentual ?? 0} className="h-2 flex-1" />
                            <EditableCellFreq
                              value={aluno.frequencia_percentual}
                              onCommit={(v) => salvarCampo.mutate({ matriculaId: aluno.matricula_id, campo: "frequencia_percentual", valor: v })}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{getFrequenciaBadge(aluno.frequencia_percentual ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                    {filtrados.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum aluno matriculado nesta turma.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function EditableCellFreq({ value, onCommit }: { value: number | null; onCommit: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value !== null ? String(value) : "");

  useEffect(() => { setTemp(value !== null ? String(value) : ""); }, [value]);

  const commit = () => {
    setEditing(false);
    if (temp === "") { onCommit(null); return; }
    const n = parseFloat(temp.replace(",", "."));
    if (!isNaN(n) && n >= 0 && n <= 100) onCommit(n);
    else setTemp(value !== null ? String(value) : "");
  };

  if (editing) {
    return (
      <Input
        autoFocus
        className="h-8 w-16 text-center text-sm p-1"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      />
    );
  }
  return (
    <button
      className="h-8 w-16 rounded border border-transparent text-xs hover:border-input hover:bg-muted/50 flex items-center justify-center shrink-0"
      onClick={() => { setEditing(true); setTemp(value !== null ? String(value) : ""); }}
    >
      {value !== null ? `${value.toFixed(0)}%` : <span className="text-muted-foreground">—</span>}
    </button>
  );
}
