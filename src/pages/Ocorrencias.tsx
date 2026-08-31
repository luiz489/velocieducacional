import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Plus, Filter, AlertTriangle, ThumbsUp, Eye, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

type TipoOcorrencia = "Advertência" | "Elogio" | "Observação";

interface OcorrenciaRow {
  id: string;
  aluno_id: string;
  professor_id: string | null;
  tipo: string;
  descricao: string;
  data_ocorrencia: string;
  registrado_por: string;
}

const tipoConfig: Record<TipoOcorrencia, { icon: typeof AlertTriangle; color: string; badgeVariant: "destructive" | "default" | "secondary" }> = {
  "Advertência": { icon: AlertTriangle, color: "text-destructive", badgeVariant: "destructive" },
  "Elogio": { icon: ThumbsUp, color: "text-emerald-600", badgeVariant: "default" },
  "Observação": { icon: Eye, color: "text-amber-600", badgeVariant: "secondary" },
};

export default function Ocorrencias() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    aluno_id: "",
    tipo: "Observação" as TipoOcorrencia,
    descricao: "",
    data: new Date().toISOString().split("T")[0],
    professor_id: "",
  });

  // Cadastros
  const { data: alunos = [] } = useQuery({
    queryKey: ["alunos-lista", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, nome")
        .eq("escola_id", escolaAtivaId!)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: professores = [] } = useQuery({
    queryKey: ["professores-ativos", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professores")
        .select("id, nome")
        .eq("escola_id", escolaAtivaId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Mapa aluno_id -> turma (via matriculas)
  const { data: matriculas = [] } = useQuery({
    queryKey: ["matriculas-com-turma", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select("aluno_id, turmas(nome)")
        .eq("escola_id", escolaAtivaId!);
      if (error) throw error;
      return data || [];
    },
  });
  const turmaMap = useMemo(() => {
    const m = new Map<string, string>();
    matriculas.forEach((mt: any) => {
      if (mt.aluno_id && mt.turmas?.nome) m.set(mt.aluno_id, mt.turmas.nome);
    });
    return m;
  }, [matriculas]);

  const alunoMap = useMemo(() => {
    const m = new Map<string, string>();
    alunos.forEach(a => m.set(a.id, a.nome));
    return m;
  }, [alunos]);

  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey: ["ocorrencias", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("*")
        .eq("escola_id", escolaAtivaId!)
        .order("data_ocorrencia", { ascending: false });
      if (error) throw error;
      return (data || []) as OcorrenciaRow[];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const prof = professores.find(p => p.id === form.professor_id);
      const { error } = await supabase.from("ocorrencias").insert({
        aluno_id: form.aluno_id,
        tipo: form.tipo,
        descricao: form.descricao,
        data_ocorrencia: form.data,
        registrado_por: prof?.nome || "—",
        professor_id: form.professor_id || null,
        escola_id: escolaAtivaId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ocorrencias"] });
      toast.success("Ocorrência registrada!");
      setDialogOpen(false);
      setForm({ aluno_id: "", tipo: "Observação", descricao: "", data: new Date().toISOString().split("T")[0], professor_id: "" });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar"),
  });

  const filtered = useMemo(() => ocorrencias.filter((o) => {
    const alunoNome = alunoMap.get(o.aluno_id) || "";
    const matchSearch =
      alunoNome.toLowerCase().includes(search.toLowerCase()) ||
      o.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (o.registrado_por || "").toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFilter === "todos" || o.tipo === tipoFilter;
    return matchSearch && matchTipo;
  }), [ocorrencias, search, tipoFilter, alunoMap]);

  const totalAdv = ocorrencias.filter((o) => o.tipo === "Advertência").length;
  const totalElo = ocorrencias.filter((o) => o.tipo === "Elogio").length;
  const totalObs = ocorrencias.filter((o) => o.tipo === "Observação").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ocorrências</h1>
          <p className="text-sm text-muted-foreground">Registre advertências, elogios e observações dos alunos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Ocorrência</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Nova Ocorrência</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 mt-2" onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Aluno *</Label>
                  {alunos.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nenhum aluno. <Link to="/alunos" className="text-primary underline">Cadastrar →</Link>
                    </p>
                  ) : (
                    <Select value={form.aluno_id} onValueChange={v => setForm({ ...form, aluno_id: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                      <SelectContent>
                        {alunos.map(a => {
                          const turma = turmaMap.get(a.id);
                          return (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nome}{turma ? ` — ${turma}` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v: TipoOcorrencia) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Advertência">Advertência</SelectItem>
                      <SelectItem value="Elogio">Elogio</SelectItem>
                      <SelectItem value="Observação">Observação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Descrição *</Label>
                  <Textarea
                    required
                    value={form.descricao}
                    onChange={e => setForm({ ...form, descricao: e.target.value })}
                    placeholder="Descreva a ocorrência com detalhes..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Registrado por (Professor) *</Label>
                  {professores.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nenhum professor. <Link to="/professores" className="text-primary underline">Cadastrar →</Link>
                    </p>
                  ) : (
                    <Select value={form.professor_id} onValueChange={v => setForm({ ...form, professor_id: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {professores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!form.aluno_id || !form.professor_id || !form.descricao || criar.isPending}>
                  {criar.isPending ? "Salvando..." : "Registrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Advertências</p>
              <p className="text-2xl font-bold text-foreground">{totalAdv}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <ThumbsUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Elogios</p>
              <p className="text-2xl font-bold text-foreground">{totalElo}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <Eye className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="text-2xl font-bold text-foreground">{totalObs}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por aluno, descrição ou autor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Advertência">Advertências</SelectItem>
            <SelectItem value="Elogio">Elogios</SelectItem>
            <SelectItem value="Observação">Observações</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead className="hidden md:table-cell">Turma</TableHead>
              <TableHead className="w-[130px]">Tipo</TableHead>
              <TableHead className="hidden lg:table-cell">Descrição</TableHead>
              <TableHead className="hidden md:table-cell">Registrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : filtered.map((oc) => {
              const cfg = tipoConfig[oc.tipo as TipoOcorrencia] || tipoConfig["Observação"];
              const Icon = cfg.icon;
              return (
                <TableRow key={oc.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(oc.data_ocorrencia).toLocaleDateString("pt-BR")}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{alunoMap.get(oc.aluno_id) || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{turmaMap.get(oc.aluno_id) || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={cfg.badgeVariant} className="gap-1">
                      <Icon className="h-3 w-3" />
                      {oc.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-[300px] truncate">
                    {oc.descricao}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{oc.registrado_por}</TableCell>
                </TableRow>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma ocorrência encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Mostrando {filtered.length} de {ocorrencias.length} ocorrências</span>
      </div>
    </div>
  );
}
