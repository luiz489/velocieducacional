import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Dumbbell, Clock, Users } from "lucide-react";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CATEGORIAS_SUGERIDAS = ["Esporte", "Arte", "Idioma", "Reforço", "Outro"];
const PERIODICIDADES = [
  { label: "Mensal", intervalo: 1 },
  { label: "Bimestral", intervalo: 2 },
  { label: "Trimestral", intervalo: 3 },
  { label: "Semestral", intervalo: 6 },
  { label: "Anual", intervalo: 12 },
];

type CursoExtra = {
  id: string; nome: string; categoria: string; sala: string | null; vagas: number | null;
  fornecedor_id: string | null; professor_nome: string | null; ano_letivo: number;
  valor: number; intervalo_meses: number; numero_parcelas: number; dia_vencimento: number; ativo: boolean;
};
type Horario = { id: string; dia_semana: number; hora_inicio: string; hora_fim: string; sala: string | null };
type Inscrito = {
  id: string; aluno_id: string; status: string; data_inicio: string; data_cancelamento: string | null;
  valor_negociado: number | null; alunos: { nome: string } | null;
};

function periodicidadeTexto(c: Pick<CursoExtra, "intervalo_meses" | "numero_parcelas">) {
  if (c.numero_parcelas <= 1) return "Valor único";
  const nome = PERIODICIDADES.find((p) => p.intervalo === c.intervalo_meses)?.label;
  const cada = nome ? nome.toLowerCase() : `a cada ${c.intervalo_meses} meses`;
  return `${c.numero_parcelas}x ${cada}`;
}
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CursosExtra() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const anoAtual = new Date().getFullYear();

  const [novoOpen, setNovoOpen] = useState(false);
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState<string | null>(null);
  const [inscreverOpen, setInscreverOpen] = useState(false);

  const emptyForm = {
    nome: "", categoria: "Esporte", professor_nome: "", fornecedor_id: "",
    ano_letivo: String(anoAtual), valor: "", intervalo_meses: "1", numero_parcelas: "12",
    dia_vencimento: "10", sala: "", vagas: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [inscForm, setInscForm] = useState({ aluno_id: "", data_inicio: "", valor: "" });
  const [novoHorario, setNovoHorario] = useState({ dia_semana: "1", hora_inicio: "", hora_fim: "", sala: "" });

  const { data: cursos } = useQuery({
    queryKey: ["cursos-extra", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos_extra").select("*")
        .eq("escola_id", escolaAtivaId!)
        .order("ativo", { ascending: false }).order("nome");
      if (error) throw error;
      return data as CursoExtra[];
    },
  });

  const { data: fornecedores } = useQuery({
    queryKey: ["parceiros-fornecedor", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros").select("id, nome")
        .eq("escola_id", escolaAtivaId!).eq("tipo", "Fornecedor").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const { data: alunos } = useQuery({
    queryKey: ["alunos-ativos-simples", escolaAtivaId],
    enabled: !!escolaAtivaId && inscreverOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos").select("id, nome").eq("escola_id", escolaAtivaId!).eq("status", "Ativo").order("nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const curso = cursos?.find((c) => c.id === cursoSelecionadoId) ?? null;

  const { data: horarios } = useQuery({
    queryKey: ["curso-extra-horarios", cursoSelecionadoId],
    enabled: !!cursoSelecionadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos_extra_horarios").select("id, dia_semana, hora_inicio, hora_fim, sala")
        .eq("curso_extra_id", cursoSelecionadoId!).order("dia_semana").order("hora_inicio");
      if (error) throw error;
      return data as Horario[];
    },
  });

  const { data: inscritos } = useQuery({
    queryKey: ["curso-extra-inscritos", cursoSelecionadoId],
    enabled: !!cursoSelecionadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos_extra_inscricoes")
        .select("id, aluno_id, status, data_inicio, data_cancelamento, valor_negociado, alunos(nome)")
        .eq("curso_extra_id", cursoSelecionadoId!).order("created_at");
      if (error) throw error;
      return data as unknown as Inscrito[];
    },
  });

  const criarCurso = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cursos_extra").insert({
        escola_id: escolaAtivaId,
        nome: form.nome.trim(),
        categoria: form.categoria.trim() || "Outro",
        professor_nome: form.professor_nome.trim() || null,
        fornecedor_id: form.fornecedor_id || null,
        ano_letivo: Number(form.ano_letivo),
        valor: Number(form.valor || 0),
        intervalo_meses: Number(form.intervalo_meses),
        numero_parcelas: Number(form.numero_parcelas),
        dia_vencimento: Number(form.dia_vencimento),
        sala: form.sala.trim() || null,
        vagas: form.vagas ? Number(form.vagas) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Curso criado.");
      setNovoOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["cursos-extra"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const toggleAtivo = useMutation({
    mutationFn: async (c: CursoExtra) => {
      const { error } = await supabase.from("cursos_extra").update({ ativo: !c.ativo }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cursos-extra"] }),
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const addHorario = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cursos_extra_horarios").insert({
        curso_extra_id: cursoSelecionadoId,
        escola_id: escolaAtivaId,
        dia_semana: Number(novoHorario.dia_semana),
        hora_inicio: novoHorario.hora_inicio,
        hora_fim: novoHorario.hora_fim,
        sala: novoHorario.sala.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovoHorario({ dia_semana: "1", hora_inicio: "", hora_fim: "", sala: "" });
      qc.invalidateQueries({ queryKey: ["curso-extra-horarios", cursoSelecionadoId] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const removerHorario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cursos_extra_horarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["curso-extra-horarios", cursoSelecionadoId] }),
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const inscrever = useMutation({
    mutationFn: async () => {
      if (!curso) return;
      const { data: mats, error: mErr } = await supabase
        .from("matriculas")
        .select("id, turmas!inner(ano_letivo)")
        .eq("aluno_id", inscForm.aluno_id)
        .eq("turmas.ano_letivo", curso.ano_letivo)
        .order("created_at", { ascending: false })
        .limit(1);
      if (mErr) throw mErr;
      const matriculaId = (mats as any[])?.[0]?.id;
      if (!matriculaId) throw new Error(`O aluno não tem matrícula em ${curso.ano_letivo}.`);

      const { error } = await supabase.from("cursos_extra_inscricoes").insert({
        curso_extra_id: curso.id,
        aluno_id: inscForm.aluno_id,
        matricula_id: matriculaId,
        escola_id: escolaAtivaId,
        data_inicio: inscForm.data_inicio,
        valor_negociado: inscForm.valor ? Number(inscForm.valor) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aluno inscrito — parcelas geradas no financeiro.");
      setInscreverOpen(false);
      setInscForm({ aluno_id: "", data_inicio: "", valor: "" });
      qc.invalidateQueries({ queryKey: ["curso-extra-inscritos", cursoSelecionadoId] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const cancelarInscricao = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("cancelar_inscricao_curso_extra", { p_inscricao_id: id });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (removidas) => {
      toast.success(`Inscrição cancelada. ${removidas ?? 0} parcela(s) futura(s) removida(s).`);
      qc.invalidateQueries({ queryKey: ["curso-extra-inscritos", cursoSelecionadoId] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Dumbbell className="h-6 w-6" /> Cursos Extracurriculares
          </h1>
          <p className="text-sm text-muted-foreground">Esporte, artes e outros — cobrados à parte da mensalidade</p>
        </div>
        <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo curso</Button></DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo curso</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Futebol, Ballet, Violão" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Input list="cat-cursos" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                  <datalist id="cat-cursos">{CATEGORIAS_SUGERIDAS.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <Label>Ano letivo</Label>
                  <Input type="number" value={form.ano_letivo} onChange={(e) => setForm({ ...form, ano_letivo: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Valor da parcela</Label>
                  <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                </div>
                <div>
                  <Label>Periodicidade</Label>
                  <Select value={form.intervalo_meses} onValueChange={(v) => setForm({ ...form, intervalo_meses: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODICIDADES.map((p) => <SelectItem key={p.intervalo} value={String(p.intervalo)}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nº de parcelas</Label>
                  <Input type="number" min="1" value={form.numero_parcelas} onChange={(e) => setForm({ ...form, numero_parcelas: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                1 parcela = valor único. Ex: mensal + 10 parcelas = cobra 10 meses; semestral + 2 = cobra 2 vezes no ano.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Dia venc.</Label>
                  <Input type="number" min="1" max="28" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} />
                </div>
                <div>
                  <Label>Sala</Label>
                  <Input value={form.sala} onChange={(e) => setForm({ ...form, sala: e.target.value })} />
                </div>
                <div>
                  <Label>Vagas</Label>
                  <Input type="number" value={form.vagas} onChange={(e) => setForm({ ...form, vagas: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Professor (nome)</Label>
                  <Input value={form.professor_nome} onChange={(e) => setForm({ ...form, professor_nome: e.target.value })} />
                </div>
                <div>
                  <Label>Fornecedor (contrato)</Label>
                  <Select value={form.fornecedor_id || "nenhum"} onValueChange={(v) => setForm({ ...form, fornecedor_id: v === "nenhum" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Nenhum</SelectItem>
                      {fornecedores?.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => criarCurso.mutate()}
                disabled={!form.nome.trim() || !form.valor || Number(form.numero_parcelas) < 1 || criarCurso.isPending}
              >
                {criarCurso.isPending ? "Salvando..." : "Criar curso"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Cobrança</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!cursos?.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum curso cadastrado.</TableCell></TableRow>
              )}
              {cursos?.map((c) => (
                <TableRow
                  key={c.id}
                  className={`cursor-pointer ${cursoSelecionadoId === c.id ? "bg-muted/50" : ""}`}
                  onClick={() => setCursoSelecionadoId(cursoSelecionadoId === c.id ? null : c.id)}
                >
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                  <TableCell>{c.ano_letivo}</TableCell>
                  <TableCell className="text-sm">{brl(Number(c.valor))} · {periodicidadeTexto(c)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => toggleAtivo.mutate(c)}>
                      <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {curso && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Horários — {curso.nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {horarios?.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                  <span>{DIAS[h.dia_semana]} · {h.hora_inicio?.slice(0, 5)}–{h.hora_fim?.slice(0, 5)}{h.sala ? ` · ${h.sala}` : ""}</span>
                  <Button size="sm" variant="ghost" onClick={() => removerHorario.mutate(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              {!horarios?.length && <p className="text-xs text-muted-foreground">Nenhum horário.</p>}
              <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
                <div>
                  <Label className="text-xs">Dia</Label>
                  <Select value={novoHorario.dia_semana} onValueChange={(v) => setNovoHorario({ ...novoHorario, dia_semana: v })}>
                    <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{DIAS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Início</Label><Input type="time" className="w-[110px]" value={novoHorario.hora_inicio} onChange={(e) => setNovoHorario({ ...novoHorario, hora_inicio: e.target.value })} /></div>
                <div><Label className="text-xs">Fim</Label><Input type="time" className="w-[110px]" value={novoHorario.hora_fim} onChange={(e) => setNovoHorario({ ...novoHorario, hora_fim: e.target.value })} /></div>
                <div><Label className="text-xs">Sala</Label><Input className="w-[100px]" value={novoHorario.sala} onChange={(e) => setNovoHorario({ ...novoHorario, sala: e.target.value })} /></div>
                <Button size="sm" onClick={() => addHorario.mutate()} disabled={!novoHorario.hora_inicio || !novoHorario.hora_fim || addHorario.isPending}>Adicionar</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Inscritos ({inscritos?.filter((i) => i.status === "Ativa").length ?? 0}{curso.vagas ? `/${curso.vagas}` : ""})</CardTitle>
              <Dialog open={inscreverOpen} onOpenChange={setInscreverOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Inscrever</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Inscrever aluno em {curso.nome}</DialogTitle></DialogHeader>
                  <DialogDescription>As parcelas são geradas no financeiro do aluno automaticamente.</DialogDescription>
                  <div className="space-y-3">
                    <div>
                      <Label>Aluno</Label>
                      <Select value={inscForm.aluno_id} onValueChange={(v) => setInscForm({ ...inscForm, aluno_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{alunos?.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Início da cobrança</Label>
                        <Input type="date" value={inscForm.data_inicio} onChange={(e) => setInscForm({ ...inscForm, data_inicio: e.target.value })} />
                      </div>
                      <div>
                        <Label>Valor (opcional)</Label>
                        <Input type="number" step="0.01" placeholder={String(curso.valor)} value={inscForm.valor} onChange={(e) => setInscForm({ ...inscForm, valor: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => inscrever.mutate()} disabled={!inscForm.aluno_id || !inscForm.data_inicio || inscrever.isPending}>
                      {inscrever.isPending ? "Inscrevendo..." : "Inscrever"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Aluno</TableHead><TableHead>Desde</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
                </TableHeader>
                <TableBody>
                  {!inscritos?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum inscrito.</TableCell></TableRow>}
                  {inscritos?.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.alunos?.nome ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(i.data_inicio + "T12:00").toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-sm">{brl(Number(i.valor_negociado ?? curso.valor))}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === "Ativa" ? "default" : "secondary"}>{i.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {i.status === "Ativa" && (
                          <Button
                            size="sm" variant="ghost" className="text-destructive"
                            onClick={() => {
                              if (confirm(`Cancelar a inscrição de ${i.alunos?.nome}? As parcelas dos próximos meses ainda não faturadas serão removidas.`)) {
                                cancelarInscricao.mutate(i.id);
                              }
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
