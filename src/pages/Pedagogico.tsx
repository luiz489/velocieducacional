import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GraduationCap, BookOpen, Users, Search, UserCheck, CalendarRange, FileDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { gerarBoletim } from "@/lib/relatorios";
import { avaliaPorConceito, fecharBoletim, type SituacaoBoletim } from "@/lib/boletim";

const ANO_TODO = "ano";

function getSituacaoBadge(s: SituacaoBoletim) {
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

const corDaNota = (n: number | null) =>
  n === null ? "text-muted-foreground" : n >= 7 ? "text-success" : n >= 5 ? "text-warning" : "text-destructive";

/** Célula de nota: clique, digita 0 a 10, Enter ou sair salva. Vazio apaga a nota. */
function CelulaNota({ value, onCommit }: { value: number | null; onCommit: (v: number | null) => void }) {
  const [editando, setEditando] = useState(false);
  const [temp, setTemp] = useState(value !== null ? String(value) : "");

  useEffect(() => { setTemp(value !== null ? String(value) : ""); }, [value]);

  const commit = () => {
    setEditando(false);
    if (temp === "" || temp === "-") { onCommit(null); return; }
    const n = parseFloat(temp.replace(",", "."));
    if (!isNaN(n) && n >= 0 && n <= 10) onCommit(n);
    else setTemp(value !== null ? String(value) : "");
  };

  if (editando) {
    return (
      <Input
        autoFocus
        className="h-8 w-16 text-center text-sm p-1"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditando(false); setTemp(value !== null ? String(value) : ""); }
        }}
      />
    );
  }

  return (
    <button
      className="h-8 w-16 rounded border border-transparent text-sm hover:border-input hover:bg-muted/50 transition-colors cursor-text flex items-center justify-center mx-auto"
      onClick={() => { setEditando(true); setTemp(value !== null ? String(value) : ""); }}
    >
      {value !== null ? value.toFixed(1) : <span className="text-muted-foreground">—</span>}
    </button>
  );
}

/** Célula de conceito: texto curto (A, S, Satisfatório...), para disciplina sem nota. */
function CelulaConceito({ value, onCommit }: { value: string | null; onCommit: (v: string | null) => void }) {
  const [editando, setEditando] = useState(false);
  const [temp, setTemp] = useState(value ?? "");

  useEffect(() => { setTemp(value ?? ""); }, [value]);

  const commit = () => {
    setEditando(false);
    const limpo = temp.trim();
    onCommit(limpo === "" ? null : limpo.slice(0, 20));
  };

  if (editando) {
    return (
      <Input
        autoFocus
        className="h-8 w-24 text-center text-sm p-1"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditando(false); setTemp(value ?? ""); }
        }}
      />
    );
  }

  return (
    <button
      className="h-8 w-24 rounded border border-transparent text-sm hover:border-input hover:bg-muted/50 transition-colors cursor-text flex items-center justify-center mx-auto"
      onClick={() => setEditando(true)}
    >
      {value ?? <span className="text-muted-foreground">—</span>}
    </button>
  );
}

export default function Pedagogico() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [searchParams] = useSearchParams();
  const [aba, setAba] = useState(searchParams.get("tab") === "frequencia" ? "frequencia" : "notas");
  const [turmaId, setTurmaId] = useState<string>("");
  const [disciplinaId, setDisciplinaId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [bimestreFreq, setBimestreFreq] = useState<string>(ANO_TODO);

  const { data: turmas } = useQuery({
    queryKey: ["turmas-pedagogico", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, ano_letivo")
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
        .select("id, nome, tipo_avaliacao")
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

  const turma = turmas?.find((t) => t.id === turmaId);
  const disciplina = disciplinas?.find((d) => d.id === disciplinaId);
  const porConceito = avaliaPorConceito(disciplina?.tipo_avaliacao);

  // Períodos letivos: sem eles não existe recorte por bimestre na frequência.
  const { data: periodos } = useQuery({
    queryKey: ["periodos-letivos", escolaAtivaId, turma?.ano_letivo],
    enabled: !!escolaAtivaId && !!turma?.ano_letivo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodos_letivos")
        .select("bimestre, data_inicio, data_fim")
        .eq("escola_id", escolaAtivaId!)
        .eq("ano_letivo", turma!.ano_letivo)
        .order("bimestre");
      if (error) throw error;
      return data;
    },
  });

  const periodosConfigurados = (periodos?.length ?? 0) === 4;

  useEffect(() => {
    if (!periodosConfigurados && bimestreFreq !== ANO_TODO) setBimestreFreq(ANO_TODO);
  }, [periodosConfigurados]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: registros, isLoading } = useQuery({
    queryKey: ["pedagogico-registros", turmaId, disciplinaId],
    enabled: !!turmaId && !!disciplinaId,
    queryFn: async () => {
      const { data: matriculas, error: errMat } = await supabase
        .from("matriculas")
        .select("id, aluno_id, alunos(nome)")
        .eq("turma_id", turmaId);
      if (errMat) throw errMat;

      const ids = (matriculas ?? []).map((m) => m.id);

      const [notas, recuperacoes, freq, legado] = await Promise.all([
        supabase
          .from("avaliacoes_bimestrais")
          .select("matricula_id, bimestre, nota, conceito")
          .eq("disciplina_id", disciplinaId)
          .in("matricula_id", ids),
        supabase
          .from("recuperacoes_semestrais")
          .select("matricula_id, semestre, nota")
          .eq("disciplina_id", disciplinaId)
          .in("matricula_id", ids),
        supabase
          .from("v_frequencia_chamada")
          .select("matricula_id, disciplina_id, bimestre, aulas, presencas, faltas, faltas_justificadas")
          .in("matricula_id", ids),
        // Reserva: escola que ainda não lança chamada e tinha o percentual digitado.
        supabase
          .from("pedagogico")
          .select("matricula_id, frequencia_percentual")
          .eq("disciplina_id", disciplinaId)
          .in("matricula_id", ids),
      ]);
      for (const r of [notas, recuperacoes, freq, legado]) if (r.error) throw r.error;

      const legadoPorMatricula = new Map(
        (legado.data ?? []).map((l) => [l.matricula_id, l.frequencia_percentual]),
      );

      return (matriculas ?? [])
        .map((m) => {
          const minhasNotas = (notas.data ?? []).filter((n) => n.matricula_id === m.id);
          const notaDo = (b: number) => minhasNotas.find((n) => n.bimestre === b)?.nota ?? null;
          const conceitoDo = (b: number) => minhasNotas.find((n) => n.bimestre === b)?.conceito ?? null;
          const recDo = (s: number) =>
            (recuperacoes.data ?? []).find((r) => r.matricula_id === m.id && r.semestre === s)?.nota ?? null;

          // Chamada do dia inteiro (disciplina_id null) vale para esta disciplina também.
          const minhaFreq = (freq.data ?? []).filter(
            (f) => f.matricula_id === m.id && (f.disciplina_id === null || f.disciplina_id === disciplinaId),
          );

          return {
            matricula_id: m.id,
            aluno_nome: m.alunos?.nome ?? "—",
            nota_b1: notaDo(1), nota_b2: notaDo(2), nota_b3: notaDo(3), nota_b4: notaDo(4),
            conceito_b1: conceitoDo(1), conceito_b2: conceitoDo(2),
            conceito_b3: conceitoDo(3), conceito_b4: conceitoDo(4),
            recuperacao_1sem: recDo(1),
            recuperacao_2sem: recDo(2),
            frequencia: minhaFreq,
            frequencia_legado: legadoPorMatricula.get(m.id) ?? null,
          };
        })
        .sort((a, b) => a.aluno_nome.localeCompare(b.aluno_nome));
    },
  });

  const salvarNota = useMutation({
    mutationFn: async (vars: { matriculaId: string; bimestre: number; nota?: number | null; conceito?: string | null }) => {
      const { error } = await supabase.from("avaliacoes_bimestrais").upsert(
        {
          matricula_id: vars.matriculaId,
          disciplina_id: disciplinaId,
          escola_id: escolaAtivaId ?? "",
          bimestre: vars.bimestre,
          ...(vars.nota !== undefined ? { nota: vars.nota } : {}),
          ...(vars.conceito !== undefined ? { conceito: vars.conceito } : {}),
        },
        { onConflict: "matricula_id,disciplina_id,bimestre" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedagogico-registros", turmaId, disciplinaId] }),
    onError: (e: Error) => toast.error("Erro ao salvar a nota: " + e.message),
  });

  const salvarRecuperacao = useMutation({
    mutationFn: async (vars: { matriculaId: string; semestre: number; nota: number | null }) => {
      const { error } = await supabase.from("recuperacoes_semestrais").upsert(
        {
          matricula_id: vars.matriculaId,
          disciplina_id: disciplinaId,
          escola_id: escolaAtivaId ?? "",
          semestre: vars.semestre,
          nota: vars.nota,
        },
        { onConflict: "matricula_id,disciplina_id,semestre" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedagogico-registros", turmaId, disciplinaId] }),
    onError: (e: Error) => toast.error("Erro ao salvar a recuperação: " + e.message),
  });

  const filtrados = (registros ?? []).filter((r) =>
    r.aluno_nome.toLowerCase().includes(search.toLowerCase()),
  );

  const comFechamento = filtrados.map((r) => ({ ...r, ...fecharBoletim(r) }));

  // Percentual de frequência do recorte escolhido (bimestre ou ano todo).
  const frequenciaDo = (r: (typeof filtrados)[number]) => {
    const linhas = bimestreFreq === ANO_TODO
      ? r.frequencia
      : r.frequencia.filter((f) => f.bimestre === Number(bimestreFreq));
    const aulas = linhas.reduce((s, f) => s + (f.aulas ?? 0), 0);
    const presencas = linhas.reduce((s, f) => s + (f.presencas ?? 0), 0);
    const faltas = linhas.reduce((s, f) => s + (f.faltas ?? 0), 0);
    const justificadas = linhas.reduce((s, f) => s + (f.faltas_justificadas ?? 0), 0);
    const percentual = aulas > 0
      ? Math.round((1000 * presencas) / aulas) / 10
      : bimestreFreq === ANO_TODO ? r.frequencia_legado : null;
    return { aulas, faltas, justificadas, percentual };
  };

  const comFrequencia = filtrados.map((r) => ({ ...r, ...frequenciaDo(r) }));

  const notasLancadas = comFechamento.flatMap((r) =>
    [r.nota_b1, r.nota_b2, r.nota_b3, r.nota_b4].filter((n): n is number => n !== null),
  );
  const mediaLancada = notasLancadas.length
    ? notasLancadas.reduce((s, n) => s + n, 0) / notasLancadas.length
    : 0;
  const fechados = comFechamento.filter((r) => r.media_final !== null);
  const aprovados = comFechamento.filter((r) => r.situacao === "Aprovado").length;
  const freqValidas = comFrequencia.filter((r) => r.percentual !== null);
  const freqMedia = freqValidas.length
    ? freqValidas.reduce((s, r) => s + (r.percentual ?? 0), 0) / freqValidas.length
    : 0;

  const turmaNome = turma?.nome ?? "";
  const turmaAnoLetivo = turma?.ano_letivo;
  const disciplinaNome = disciplina?.nome ?? "";

  const [gerandoBoletimId, setGerandoBoletimId] = useState<string | null>(null);

  const handleGerarBoletim = async (matriculaId: string, alunoNome: string) => {
    setGerandoBoletimId(matriculaId);
    try {
      // A view já traz todas as disciplinas do aluno, com notas por bimestre,
      // recuperações e a frequência vinda da chamada.
      const { data: linhas, error } = await supabase
        .from("v_boletim_bimestral")
        .select("*")
        .eq("matricula_id", matriculaId)
        .order("disciplina");
      if (error) throw error;

      if (!linhas?.length) {
        toast.error("Este aluno ainda não tem nenhuma nota lançada em nenhuma disciplina.");
        return;
      }

      const notas = linhas.map((l) => {
        const f = fecharBoletim(l);
        return {
          disciplina: l.disciplina ?? "—",
          tipo_avaliacao: l.tipo_avaliacao ?? "nota",
          nota_b1: l.nota_b1, nota_b2: l.nota_b2, nota_b3: l.nota_b3, nota_b4: l.nota_b4,
          conceito_b1: l.conceito_b1, conceito_b2: l.conceito_b2,
          conceito_b3: l.conceito_b3, conceito_b4: l.conceito_b4,
          recuperacao_1sem: l.recuperacao_1sem,
          recuperacao_2sem: l.recuperacao_2sem,
          faltas_b1: l.faltas_b1, faltas_b2: l.faltas_b2,
          faltas_b3: l.faltas_b3, faltas_b4: l.faltas_b4,
          resultado_1sem: f.resultado_1sem,
          resultado_2sem: f.resultado_2sem,
          media_final: f.media_final,
          situacao: f.situacao,
          frequencia: l.frequencia_percentual ?? 0,
        };
      });

      gerarBoletim({ nome: alunoNome, turma: turmaNome, ano_letivo: turmaAnoLetivo }, notas);
      toast.success("Boletim gerado!");
    } catch (e) {
      toast.error("Erro ao gerar boletim: " + (e as Error).message);
    } finally {
      setGerandoBoletimId(null);
    }
  };

  if (!escolaAtivaId) return null;

  const botaoBoletim = (matriculaId: string, nome: string) => (
    <Button
      variant="ghost" size="icon" className="h-8 w-8"
      title="Gerar boletim (todas as disciplinas)"
      disabled={gerandoBoletimId === matriculaId}
      onClick={() => handleGerarBoletim(matriculaId, nome)}
    >
      <FileDown className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> Pedagógico — Notas e Frequência
        </h1>
        <p className="text-sm text-muted-foreground">
          Notas por bimestre, recuperação semestral e frequência vinda da chamada, por turma e disciplina.
        </p>
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

      {!periodosConfigurados && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 flex items-start justify-between gap-3">
          <p className="text-sm">
            Os <strong>períodos letivos de {turmaAnoLetivo ?? "—"}</strong> não estão configurados, então a
            frequência não pode ser separada por bimestre — só o acumulado do ano.
          </p>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/periodos-letivos"><CalendarRange className="h-4 w-4 mr-2" /> Configurar</Link>
          </Button>
        </div>
      )}

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
                  <p className="text-xs text-muted-foreground">Média das notas lançadas</p>
                  <p className="text-xl font-bold">{porConceito ? "—" : mediaLancada.toFixed(1)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aprovados (ano fechado)</p>
                  <p className="text-xl font-bold">{aprovados}/{fechados.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                  <BookOpen className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Frequência média</p>
                  <p className="text-xl font-bold">{freqMedia.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={aba} onValueChange={setAba} className="space-y-4">
            <TabsList>
              <TabsTrigger value="notas">Notas</TabsTrigger>
              <TabsTrigger value="frequencia">Frequência</TabsTrigger>
            </TabsList>

            <TabsContent value="notas" className="space-y-4">
              <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-sm font-medium">{turmaNome} — {disciplinaNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {porConceito
                      ? "Disciplina avaliada por conceito: clique na célula e escreva o conceito do bimestre."
                      : "Clique na célula para lançar a nota do bimestre (0 a 10). A recuperação do semestre substitui a média quando for maior."}
                  </p>
                </div>

                {porConceito ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Aluno</TableHead>
                        <TableHead className="text-center">1º bim</TableHead>
                        <TableHead className="text-center">2º bim</TableHead>
                        <TableHead className="text-center">3º bim</TableHead>
                        <TableHead className="text-center">4º bim</TableHead>
                        <TableHead className="text-center w-10">Boletim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comFechamento.map((a) => (
                        <TableRow key={a.matricula_id}>
                          <TableCell className="font-medium">{a.aluno_nome}</TableCell>
                          {([1, 2, 3, 4] as const).map((b) => (
                            <TableCell key={b} className="text-center">
                              <CelulaConceito
                                value={[a.conceito_b1, a.conceito_b2, a.conceito_b3, a.conceito_b4][b - 1]}
                                onCommit={(v) => salvarNota.mutate({ matriculaId: a.matricula_id, bimestre: b, conceito: v })}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center">{botaoBoletim(a.matricula_id, a.aluno_nome)}</TableCell>
                        </TableRow>
                      ))}
                      {comFechamento.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum aluno matriculado nesta turma.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px] sticky left-0 bg-card">Aluno</TableHead>
                        <TableHead className="text-center w-20">1º bim</TableHead>
                        <TableHead className="text-center w-20">2º bim</TableHead>
                        <TableHead className="text-center w-20">Rec. 1º</TableHead>
                        <TableHead className="text-center w-20 bg-muted/30">1º sem</TableHead>
                        <TableHead className="text-center w-20">3º bim</TableHead>
                        <TableHead className="text-center w-20">4º bim</TableHead>
                        <TableHead className="text-center w-20">Rec. 2º</TableHead>
                        <TableHead className="text-center w-20 bg-muted/30">2º sem</TableHead>
                        <TableHead className="text-center w-20 bg-muted/30">Final</TableHead>
                        <TableHead className="text-center">Situação</TableHead>
                        <TableHead className="text-center w-10">Boletim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comFechamento.map((a) => (
                        <TableRow key={a.matricula_id}>
                          <TableCell className="font-medium sticky left-0 bg-card">{a.aluno_nome}</TableCell>
                          <TableCell className="text-center">
                            <CelulaNota value={a.nota_b1} onCommit={(v) => salvarNota.mutate({ matriculaId: a.matricula_id, bimestre: 1, nota: v })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <CelulaNota value={a.nota_b2} onCommit={(v) => salvarNota.mutate({ matriculaId: a.matricula_id, bimestre: 2, nota: v })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <CelulaNota value={a.recuperacao_1sem} onCommit={(v) => salvarRecuperacao.mutate({ matriculaId: a.matricula_id, semestre: 1, nota: v })} />
                          </TableCell>
                          <TableCell className={`text-center font-bold bg-muted/30 ${corDaNota(a.resultado_1sem)}`}>
                            {a.resultado_1sem !== null ? a.resultado_1sem.toFixed(1) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <CelulaNota value={a.nota_b3} onCommit={(v) => salvarNota.mutate({ matriculaId: a.matricula_id, bimestre: 3, nota: v })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <CelulaNota value={a.nota_b4} onCommit={(v) => salvarNota.mutate({ matriculaId: a.matricula_id, bimestre: 4, nota: v })} />
                          </TableCell>
                          <TableCell className="text-center">
                            <CelulaNota value={a.recuperacao_2sem} onCommit={(v) => salvarRecuperacao.mutate({ matriculaId: a.matricula_id, semestre: 2, nota: v })} />
                          </TableCell>
                          <TableCell className={`text-center font-bold bg-muted/30 ${corDaNota(a.resultado_2sem)}`}>
                            {a.resultado_2sem !== null ? a.resultado_2sem.toFixed(1) : "—"}
                          </TableCell>
                          <TableCell className={`text-center font-bold bg-muted/30 ${corDaNota(a.media_final)}`}>
                            {a.media_final !== null ? a.media_final.toFixed(1) : "—"}
                          </TableCell>
                          <TableCell className="text-center">{getSituacaoBadge(a.situacao)}</TableCell>
                          <TableCell className="text-center">{botaoBoletim(a.matricula_id, a.aluno_nome)}</TableCell>
                        </TableRow>
                      ))}
                      {comFechamento.length === 0 && (
                        <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Nenhum aluno matriculado nesta turma.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="frequencia" className="space-y-4">
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="p-3 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{turmaNome} — {disciplinaNome}</p>
                    <p className="text-xs text-muted-foreground">
                      Calculado a partir da chamada. Falta justificada não conta como presença.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={bimestreFreq} onValueChange={setBimestreFreq} disabled={!periodosConfigurados}>
                      <SelectTrigger className="w-[150px]">
                        <CalendarRange className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANO_TODO}>Ano todo</SelectItem>
                        {(periodos ?? []).map((p) => (
                          <SelectItem key={p.bimestre} value={String(p.bimestre)}>{p.bimestre}º bimestre</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/chamada"><UserCheck className="h-4 w-4 mr-2" /> Lançar chamada</Link>
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Aluno</TableHead>
                      <TableHead className="min-w-[200px]">Frequência (%)</TableHead>
                      <TableHead className="text-center w-20">Aulas</TableHead>
                      <TableHead className="text-center w-20">Faltas</TableHead>
                      <TableHead className="text-center w-24">Justif.</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comFrequencia.map((a) => (
                      <TableRow key={a.matricula_id}>
                        <TableCell className="font-medium">{a.aluno_nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={a.percentual ?? 0} className="h-2 flex-1" />
                            <span className="text-xs w-12 shrink-0 text-right">
                              {a.percentual !== null ? `${a.percentual.toFixed(0)}%` : "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {a.aulas > 0 ? a.aulas : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center text-sm">{a.faltas}</TableCell>
                        <TableCell className="text-center text-sm">{a.justificadas}</TableCell>
                        <TableCell className="text-center">
                          {a.percentual !== null
                            ? getFrequenciaBadge(a.percentual)
                            : <Badge variant="secondary">Sem chamada</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {comFrequencia.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum aluno matriculado nesta turma.</TableCell></TableRow>
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
