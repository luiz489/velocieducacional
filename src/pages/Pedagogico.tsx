import { useEffect, useState } from "react";
import { GraduationCap, BookOpen, Users, Save, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface NotaAluno {
  id: string;
  aluno_nome: string;
  av1: number | null;
  av2: number | null;
  recuperacao: number | null;
  media: number | null;
  situacao: "Aprovado" | "Recuperação" | "Reprovado" | "Cursando";
}

interface FrequenciaAluno {
  id: string;
  aluno_nome: string;
  total_aulas: number;
  presencas: number;
  faltas: number;
  percentual: number;
}

const turmas = [
  { id: "t1", nome: "5º Ano A" },
  { id: "t2", nome: "6º Ano A" },
  { id: "t3", nome: "6º Ano B" },
  { id: "t4", nome: "7º Ano A" },
  { id: "t5", nome: "7º Ano B" },
];

const disciplinasFallback = [
  "Matemática", "Português", "Ciências", "História", "Geografia", "Inglês", "Artes", "Ed. Física",
];

const gerarNotas = (): NotaAluno[] => [
  { id: "1", aluno_nome: "Ana Carolina Silva", av1: 8.5, av2: 7.0, recuperacao: null, media: 7.75, situacao: "Aprovado" },
  { id: "2", aluno_nome: "João Pedro Souza", av1: 6.0, av2: 5.5, recuperacao: 7.0, media: 6.17, situacao: "Recuperação" },
  { id: "3", aluno_nome: "Maria Fernanda Costa", av1: 9.0, av2: 9.5, recuperacao: null, media: 9.25, situacao: "Aprovado" },
  { id: "4", aluno_nome: "Pedro Henrique Santos", av1: 4.0, av2: 3.5, recuperacao: 5.0, media: 4.17, situacao: "Reprovado" },
  { id: "5", aluno_nome: "Laura Beatriz Oliveira", av1: 7.5, av2: 8.0, recuperacao: null, media: 7.75, situacao: "Aprovado" },
  { id: "6", aluno_nome: "Gabriel Almeida", av1: 6.5, av2: null, recuperacao: null, media: null, situacao: "Cursando" },
  { id: "7", aluno_nome: "Isabela Rodrigues", av1: 8.0, av2: 7.5, recuperacao: null, media: 7.75, situacao: "Aprovado" },
  { id: "8", aluno_nome: "Lucas Martins", av1: 5.0, av2: 4.5, recuperacao: null, media: 4.75, situacao: "Recuperação" },
];

const gerarFrequencia = (): FrequenciaAluno[] => [
  { id: "1", aluno_nome: "Ana Carolina Silva", total_aulas: 60, presencas: 58, faltas: 2, percentual: 96.7 },
  { id: "2", aluno_nome: "João Pedro Souza", total_aulas: 60, presencas: 52, faltas: 8, percentual: 86.7 },
  { id: "3", aluno_nome: "Maria Fernanda Costa", total_aulas: 60, presencas: 60, faltas: 0, percentual: 100 },
  { id: "4", aluno_nome: "Pedro Henrique Santos", total_aulas: 60, presencas: 42, faltas: 18, percentual: 70.0 },
  { id: "5", aluno_nome: "Laura Beatriz Oliveira", total_aulas: 60, presencas: 56, faltas: 4, percentual: 93.3 },
  { id: "6", aluno_nome: "Gabriel Almeida", total_aulas: 60, presencas: 55, faltas: 5, percentual: 91.7 },
  { id: "7", aluno_nome: "Isabela Rodrigues", total_aulas: 60, presencas: 57, faltas: 3, percentual: 95.0 },
  { id: "8", aluno_nome: "Lucas Martins", total_aulas: 60, presencas: 44, faltas: 16, percentual: 73.3 },
];

function getSituacaoBadge(s: string) {
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

function EditableCell({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value !== null ? String(value) : "");

  const commit = () => {
    setEditing(false);
    if (temp === "" || temp === "-") { onChange(null); return; }
    const n = parseFloat(temp);
    if (!isNaN(n) && n >= 0 && n <= 10) onChange(n);
    else { setTemp(value !== null ? String(value) : ""); }
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
  const [turmaId, setTurmaId] = useState("t1");
  const [disciplina, setDisciplina] = useState("Matemática");

  const { data: disciplinasDB = [] } = useQuery({
    queryKey: ["disciplinas-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disciplinas")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });
  const disciplinas = disciplinasDB.length > 0 ? disciplinasDB.map(d => d.nome) : disciplinasFallback;

  useEffect(() => {
    if (disciplinas.length > 0 && !disciplinas.includes(disciplina)) {
      setDisciplina(disciplinas[0]);
    }
  }, [disciplinasDB]); // eslint-disable-line react-hooks/exhaustive-deps
  const [notas, setNotas] = useState<NotaAluno[]>(gerarNotas);
  const [frequencia] = useState<FrequenciaAluno[]>(gerarFrequencia);
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);

  const updateNota = (id: string, field: "av1" | "av2" | "recuperacao", value: number | null) => {
    setNotas((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const updated = { ...n, [field]: value };
        // Recalculate
        const { av1, av2, recuperacao } = updated;
        if (av1 !== null && av2 !== null) {
          const base = (av1 + av2) / 2;
          if (recuperacao !== null) {
            updated.media = parseFloat(((av1 + av2 + recuperacao) / 3).toFixed(2));
          } else {
            updated.media = parseFloat(base.toFixed(2));
          }
          if (updated.media >= 7) updated.situacao = "Aprovado";
          else if (updated.media >= 5) updated.situacao = "Recuperação";
          else updated.situacao = "Reprovado";
        } else {
          updated.media = null;
          updated.situacao = "Cursando";
        }
        return updated;
      })
    );
    setDirty(true);
  };

  const handleSave = () => {
    toast.success("Notas salvas com sucesso!");
    setDirty(false);
  };

  const filteredNotas = notas.filter((n) => n.aluno_nome.toLowerCase().includes(search.toLowerCase()));
  const filteredFreq = frequencia.filter((f) => f.aluno_nome.toLowerCase().includes(search.toLowerCase()));

  const mediaGeral = notas.filter((n) => n.media !== null).reduce((s, n) => s + (n.media ?? 0), 0) / (notas.filter((n) => n.media !== null).length || 1);
  const aprovados = notas.filter((n) => n.situacao === "Aprovado").length;
  const freqMedia = frequencia.reduce((s, f) => s + f.percentual, 0) / (frequencia.length || 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pedagógico</h1>
          <p className="text-sm text-muted-foreground">Gestão de notas e frequência dos alunos</p>
        </div>
        {dirty && (
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />Salvar Alterações
          </Button>
        )}
      </div>

      {/* Selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={turmaId} onValueChange={(v) => { setTurmaId(v); setDirty(false); }}>
          <SelectTrigger className="w-[160px]">
            <BookOpen className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={disciplina} onValueChange={(v) => { setDisciplina(v); setDirty(false); }}>
          <SelectTrigger className="w-[160px]">
            <GraduationCap className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* KPIs */}
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
              <p className="text-xl font-bold">{aprovados}/{notas.length}</p>
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

      {/* Tabs */}
      <Tabs defaultValue="notas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notas">Notas</TabsTrigger>
          <TabsTrigger value="frequencia">Frequência</TabsTrigger>
        </TabsList>

        {/* Notas Tab */}
        <TabsContent value="notas" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="p-3 border-b bg-muted/30">
              <p className="text-sm font-medium">
                {turmas.find((t) => t.id === turmaId)?.nome} — {disciplina}
              </p>
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
                {filteredNotas.map((aluno) => (
                  <TableRow key={aluno.id}>
                    <TableCell className="font-medium">{aluno.aluno_nome}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <EditableCell value={aluno.av1} onChange={(v) => updateNota(aluno.id, "av1", v)} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <EditableCell value={aluno.av2} onChange={(v) => updateNota(aluno.id, "av2", v)} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <EditableCell value={aluno.recuperacao} onChange={(v) => updateNota(aluno.id, "recuperacao", v)} />
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
                {filteredNotas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Frequência Tab */}
        <TabsContent value="frequencia" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="p-3 border-b bg-muted/30">
              <p className="text-sm font-medium">
                {turmas.find((t) => t.id === turmaId)?.nome} — {disciplina}
              </p>
              <p className="text-xs text-muted-foreground">Resumo de presença dos alunos no período</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Aluno</TableHead>
                  <TableHead className="text-center">Total Aulas</TableHead>
                  <TableHead className="text-center">Presenças</TableHead>
                  <TableHead className="text-center">Faltas</TableHead>
                  <TableHead className="min-w-[160px]">Frequência</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFreq.map((aluno) => (
                  <TableRow key={aluno.id}>
                    <TableCell className="font-medium">{aluno.aluno_nome}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{aluno.total_aulas}</TableCell>
                    <TableCell className="text-center">{aluno.presencas}</TableCell>
                    <TableCell className="text-center">
                      <span className={aluno.faltas > 10 ? "text-destructive font-medium" : ""}>{aluno.faltas}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={aluno.percentual} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-12 text-right">{aluno.percentual.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getFrequenciaBadge(aluno.percentual)}</TableCell>
                  </TableRow>
                ))}
                {filteredFreq.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
