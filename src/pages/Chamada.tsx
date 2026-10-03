import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserCheck, Users, Save, CheckCheck, CalendarDays, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { usePermissoes } from "@/hooks/usePermissoes";
import { cn } from "@/lib/utils";

type Situacao = "Presente" | "Falta" | "Falta Justificada";

const SITUACOES: { valor: Situacao; curto: string; classe: string }[] = [
  { valor: "Presente", curto: "P", classe: "bg-success text-success-foreground hover:bg-success/90" },
  { valor: "Falta", curto: "F", classe: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
  { valor: "Falta Justificada", curto: "FJ", classe: "bg-warning text-warning-foreground hover:bg-warning/90" },
];

// horarios_aulas.dia_semana: 1=Segunda ... 6=Sábado (mesma convenção da tela de Horários).
const DIAS_EXTENSO = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const DIA_INTEIRO = "dia-inteiro";

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Não usar new Date(iso): a string yyyy-mm-dd é lida como UTC e volta um dia atrás no Brasil.
function diaSemanaDe(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

type Marcacao = { situacao: Situacao; observacao: string };

export default function Chamada() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const { can } = usePermissoes();
  const podeEditar = can("pedagogico", "editar");

  const [data, setData] = useState(hojeISO());
  const [turmaId, setTurmaId] = useState("");
  const [aulaId, setAulaId] = useState(DIA_INTEIRO);
  const [marcacoes, setMarcacoes] = useState<Record<string, Marcacao>>({});

  const diaSemana = diaSemanaDe(data);
  const horarioAulaId = aulaId === DIA_INTEIRO ? null : aulaId;

  const { data: turmas } = useQuery({
    queryKey: ["turmas-chamada", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, ano_letivo, turno")
        .eq("escola_id", escolaAtivaId!)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (turmas?.length && !turmaId) setTurmaId(turmas[0].id);
  }, [turmas]); // eslint-disable-line react-hooks/exhaustive-deps

  const turma = turmas?.find((t) => t.id === turmaId);

  // Aulas da grade naquele dia da semana. Domingo (0) nunca tem aula cadastrada.
  const { data: aulas } = useQuery({
    queryKey: ["aulas-do-dia", turmaId, diaSemana, turma?.ano_letivo],
    enabled: !!turmaId && !!turma?.ano_letivo && diaSemana >= 1 && diaSemana <= 6,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horarios_aulas")
        .select("id, hora_inicio, hora_fim, disciplina_texto_legado, professor, disciplinas(nome)")
        .eq("turma_id", turmaId)
        .eq("dia_semana", diaSemana)
        .eq("ano_letivo", turma!.ano_letivo)
        .order("hora_inicio");
      if (error) throw error;
      return data;
    },
  });

  // Aula selecionada que não existe mais na grade do dia escolhido volta pro dia inteiro.
  useEffect(() => {
    if (aulaId !== DIA_INTEIRO && aulas && !aulas.some((a) => a.id === aulaId)) setAulaId(DIA_INTEIRO);
  }, [aulas]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: alunos, isLoading: carregandoAlunos } = useQuery({
    queryKey: ["alunos-da-turma-chamada", turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select("id, alunos(nome)")
        .eq("turma_id", turmaId);
      if (error) throw error;
      return (data ?? [])
        .map((m) => ({ matricula_id: m.id, nome: m.alunos?.nome ?? "—" }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });

  // Chamada já lançada para turma + data + aula (ou dia inteiro).
  const { data: chamada, isLoading: carregandoChamada } = useQuery({
    queryKey: ["chamada", turmaId, data, horarioAulaId],
    enabled: !!turmaId && !!data,
    queryFn: async () => {
      let q = supabase
        .from("chamadas")
        .select("id, observacao, updated_at, chamada_presencas(matricula_id, situacao, observacao)")
        .eq("turma_id", turmaId)
        .eq("data_aula", data);
      q = horarioAulaId ? q.eq("horario_aula_id", horarioAulaId) : q.is("horario_aula_id", null);
      const { data: linhas, error } = await q.maybeSingle();
      if (error) throw error;
      return linhas;
    },
  });

  // Carrega o que já foi lançado; o que não tem registro entra como Presente.
  useEffect(() => {
    if (carregandoAlunos || carregandoChamada || !alunos) return;
    const salvas = new Map(
      (chamada?.chamada_presencas ?? []).map((p) => [
        p.matricula_id,
        { situacao: p.situacao as Situacao, observacao: p.observacao ?? "" },
      ] as const),
    );
    setMarcacoes(
      Object.fromEntries(
        alunos.map((a) => [a.matricula_id, salvas.get(a.matricula_id) ?? { situacao: "Presente" as Situacao, observacao: "" }]),
      ),
    );
  }, [alunos, chamada, carregandoAlunos, carregandoChamada]);

  const salvar = useMutation({
    mutationFn: async () => {
      const presencas = (alunos ?? []).map((a) => ({
        matricula_id: a.matricula_id,
        situacao: marcacoes[a.matricula_id]?.situacao ?? "Presente",
        observacao: marcacoes[a.matricula_id]?.observacao ?? "",
      }));
      const { error } = await supabase.rpc("salvar_chamada", {
        p_turma_id: turmaId,
        p_data: data,
        p_presencas: presencas,
        p_horario_aula_id: horarioAulaId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamada salva!");
      qc.invalidateQueries({ queryKey: ["chamada", turmaId, data, horarioAulaId] });
      qc.invalidateQueries({ queryKey: ["pedagogico-registros"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar a chamada: " + e.message),
  });

  const marcarTodosPresentes = () =>
    setMarcacoes((atual) =>
      Object.fromEntries(Object.entries(atual).map(([id, m]) => [id, { ...m, situacao: "Presente" as Situacao }])),
    );

  const resumo = useMemo(() => {
    const vals = Object.values(marcacoes);
    return {
      presentes: vals.filter((m) => m.situacao === "Presente").length,
      faltas: vals.filter((m) => m.situacao === "Falta").length,
      justificadas: vals.filter((m) => m.situacao === "Falta Justificada").length,
      total: vals.length,
    };
  }, [marcacoes]);

  const rotuloAula = (a: NonNullable<typeof aulas>[number]) =>
    `${a.hora_inicio.slice(0, 5)}–${a.hora_fim.slice(0, 5)} · ${a.disciplinas?.nome ?? a.disciplina_texto_legado}`;

  if (!escolaAtivaId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UserCheck className="h-6 w-6" /> Chamada
        </h1>
        <p className="text-sm text-muted-foreground">
          Presença por data. Lance o dia inteiro ou escolha uma aula da grade — a frequência do Pedagógico é calculada daqui.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="pl-9 w-[180px]" />
        </div>
        <Select value={turmaId} onValueChange={setTurmaId}>
          <SelectTrigger className="w-[220px]">
            <Users className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            {turmas?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.nome} — {t.turno}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={aulaId} onValueChange={setAulaId}>
          <SelectTrigger className="w-[260px]">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Aula" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DIA_INTEIRO}>Dia inteiro</SelectItem>
            {aulas?.map((a) => (
              <SelectItem key={a.id} value={a.id}>{rotuloAula(a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={marcarTodosPresentes} disabled={!podeEditar || !alunos?.length}>
            <CheckCheck className="h-4 w-4 mr-2" /> Todos presentes
          </Button>
          <Button onClick={() => salvar.mutate()} disabled={!podeEditar || salvar.isPending || !alunos?.length}>
            <Save className="h-4 w-4 mr-2" /> {salvar.isPending ? "Salvando..." : "Salvar chamada"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-3">
        {DIAS_EXTENSO[diaSemana]}
        {aulaId === DIA_INTEIRO
          ? " · chamada do dia inteiro (vale para todas as disciplinas da turma)"
          : " · chamada de uma aula (vale só para a disciplina dela)"}
        {chamada ? " · já lançada, você está editando" : ""}
      </p>

      {diaSemana === 0 && (
        <p className="text-sm text-warning">Domingo — confirme se é mesmo dia letivo antes de salvar.</p>
      )}

      {!turmas?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma turma cadastrada ainda.</p>
      ) : carregandoAlunos || carregandoChamada ? (
        <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { rotulo: "Alunos", valor: resumo.total, cor: "text-foreground" },
              { rotulo: "Presentes", valor: resumo.presentes, cor: "text-success" },
              { rotulo: "Faltas", valor: resumo.faltas, cor: "text-destructive" },
              { rotulo: "Justificadas", valor: resumo.justificadas, cor: "text-warning" },
            ].map((c) => (
              <Card key={c.rotulo} className="shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">{c.rotulo}</p>
                  <p className={cn("text-xl font-bold", c.cor)}>{c.valor}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Aluno</TableHead>
                  <TableHead className="w-[220px] text-center">Presença</TableHead>
                  <TableHead className="min-w-[200px]">Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(alunos ?? []).map((a) => {
                  const m = marcacoes[a.matricula_id] ?? { situacao: "Presente" as Situacao, observacao: "" };
                  return (
                    <TableRow key={a.matricula_id}>
                      <TableCell className="font-medium">{a.nome}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          {SITUACOES.map((s) => (
                            <Button
                              key={s.valor}
                              size="sm"
                              variant={m.situacao === s.valor ? "default" : "outline"}
                              className={cn("h-8 w-12", m.situacao === s.valor && s.classe)}
                              title={s.valor}
                              disabled={!podeEditar}
                              onClick={() =>
                                setMarcacoes((atual) => ({ ...atual, [a.matricula_id]: { ...m, situacao: s.valor } }))
                              }
                            >
                              {s.curto}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          placeholder={m.situacao === "Presente" ? "" : "Motivo (opcional)"}
                          value={m.observacao}
                          disabled={!podeEditar}
                          onChange={(e) =>
                            setMarcacoes((atual) => ({ ...atual, [a.matricula_id]: { ...m, observacao: e.target.value } }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!alunos?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhum aluno matriculado nesta turma.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {chamada?.updated_at && (
            <p className="text-xs text-muted-foreground">
              Última alteração desta chamada: {new Date(chamada.updated_at).toLocaleString("pt-BR")}
            </p>
          )}
          {!podeEditar && (
            <Badge variant="secondary">Você tem acesso só de leitura ao módulo pedagógico.</Badge>
          )}
        </>
      )}
    </div>
  );
}
