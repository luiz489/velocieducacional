import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Receipt, CalendarClock, Undo2 } from "lucide-react";

type Titulo = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  aluno_nome: string;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function competenciaDe(dataVencimento: string) {
  const [ano, mes] = dataVencimento.split("-");
  return { mes: Number(mes), ano: Number(ano), rotulo: `${mes}/${ano}` };
}

export default function CentralFaturamento() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [selecionadosFaturados, setSelecionadosFaturados] = useState<Set<string>>(new Set());

  const hoje = new Date();
  const [filtroMes, setFiltroMes] = useState(String(hoje.getMonth() + 1));
  const [filtroAno, setFiltroAno] = useState(String(hoje.getFullYear()));

  const { data: titulos, isLoading } = useQuery({
    queryKey: ["titulos-nao-faturados", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("id, descricao, valor, data_vencimento, status, matriculas(alunos(nome))")
        .eq("escola_id", escolaAtivaId!)
        .eq("faturado", false)
        .eq("tipo", "Mensalidade")
        .order("data_vencimento");
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        id: t.id, descricao: t.descricao, valor: Number(t.valor),
        data_vencimento: t.data_vencimento, status: t.status,
        aluno_nome: t.matriculas?.alunos?.nome ?? "—",
      })) as Titulo[];
    },
  });

  const { data: faturados, isLoading: loadingFaturados } = useQuery({
    queryKey: ["titulos-faturados-central", escolaAtivaId, filtroMes, filtroAno],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const inicio = `${filtroAno}-${String(filtroMes).padStart(2, "0")}-01`;
      const fim = new Date(Number(filtroAno), Number(filtroMes), 1).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("financeiro")
        .select("id, descricao, valor, data_vencimento, status, matriculas(alunos(nome))")
        .eq("escola_id", escolaAtivaId!)
        .eq("faturado", true)
        .eq("tipo", "Mensalidade")
        .gte("data_vencimento", inicio)
        .lt("data_vencimento", fim)
        .order("data_vencimento");
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        id: t.id, descricao: t.descricao, valor: Number(t.valor),
        data_vencimento: t.data_vencimento, status: t.status,
        aluno_nome: t.matriculas?.alunos?.nome ?? "—",
      })) as Titulo[];
    },
  });

  // Filtra os pendentes pelo mesmo período selecionado no filtro
  const pendentesFiltrados = useMemo(() => {
    return (titulos ?? []).filter((t) => {
      const c = competenciaDe(t.data_vencimento);
      return c.mes === Number(filtroMes) && c.ano === Number(filtroAno);
    });
  }, [titulos, filtroMes, filtroAno]);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>([hoje.getFullYear(), hoje.getFullYear() + 1]);
    (titulos ?? []).forEach((t) => anos.add(competenciaDe(t.data_vencimento).ano));
    return Array.from(anos).sort();
  }, [titulos]);

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const novo = new Set(set);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    setSet(novo);
  };

  const toggleTodos = (lista: Titulo[], set: Set<string>, setSet: (s: Set<string>) => void) => {
    const todosMarcados = lista.every((t) => set.has(t.id));
    const novo = new Set(set);
    lista.forEach((t) => { if (todosMarcados) novo.delete(t.id); else novo.add(t.id); });
    setSet(novo);
  };

  const faturar = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.rpc("faturar_titulos", { p_ids: ids });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (qtd) => {
      toast.success(`${qtd} título(s) faturado(s) - já aparecem em Contas a Receber.`);
      qc.invalidateQueries({ queryKey: ["titulos-nao-faturados"] });
      qc.invalidateQueries({ queryKey: ["titulos-faturados-central"] });
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      setSelecionados(new Set());
    },
    onError: (e: any) => toast.error("Erro ao faturar: " + e.message),
  });

  const estornar = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.rpc("estornar_faturamento_titulos", { p_ids: ids });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (qtd) => {
      toast.success(`${qtd} título(s) estornado(s) - voltaram para pendente de faturamento.`);
      qc.invalidateQueries({ queryKey: ["titulos-nao-faturados"] });
      qc.invalidateQueries({ queryKey: ["titulos-faturados-central"] });
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      setSelecionadosFaturados(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalPendente = pendentesFiltrados.reduce((s, t) => s + t.valor, 0);
  const totalFaturado = (faturados ?? []).reduce((s, t) => s + t.valor, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6" /> Central de Faturamento
        </h1>
        <p className="text-sm text-muted-foreground">
          Mensalidades geradas na matrícula ficam pendentes até serem faturadas. Só depois de faturado o
          título aparece em Contas a Receber.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-primary shrink-0" />
          Você pode configurar um dia do mês para isso acontecer sozinho, em
          Configurações → Parâmetros → Faturamento Automático.
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Mês</label>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Ano</label>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setFiltroMes(String(hoje.getMonth() + 1)); setFiltroAno(String(hoje.getFullYear())); }}>
            Mês atual
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({pendentesFiltrados.length})</TabsTrigger>
          <TabsTrigger value="faturados">Faturados ({faturados?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : pendentesFiltrados.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Nenhum título pendente de faturamento neste mês.
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{MESES[Number(filtroMes) - 1]}/{filtroAno}</CardTitle>
                  <CardDescription>{pendentesFiltrados.length} título(s) — R$ {totalPendente.toFixed(2)}</CardDescription>
                </div>
                <Button size="sm" onClick={() => faturar.mutate(pendentesFiltrados.map((t) => t.id))} disabled={faturar.isPending}>
                  Faturar todo o mês
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={pendentesFiltrados.every((t) => selecionados.has(t.id))}
                          onCheckedChange={() => toggleTodos(pendentesFiltrados, selecionados, setSelecionados)}
                        />
                      </TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendentesFiltrados.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox checked={selecionados.has(t.id)} onCheckedChange={() => toggle(selecionados, setSelecionados, t.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{t.aluno_nome}</TableCell>
                        <TableCell className="text-muted-foreground">{t.descricao}</TableCell>
                        <TableCell>{new Date(t.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-right">R$ {t.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {selecionados.size > 0 && (
            <div className="sticky bottom-4 flex justify-center">
              <Card className="shadow-lg border-primary">
                <CardContent className="py-3 px-5 flex items-center gap-4">
                  <span className="text-sm">
                    <strong>{selecionados.size}</strong> selecionado(s) — R$ {pendentesFiltrados.filter(t => selecionados.has(t.id)).reduce((s, t) => s + t.valor, 0).toFixed(2)}
                  </span>
                  <Button onClick={() => faturar.mutate(Array.from(selecionados))} disabled={faturar.isPending}>
                    {faturar.isPending ? "Faturando..." : "Faturar Selecionados"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="faturados" className="space-y-4">
          {loadingFaturados ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !faturados?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Nenhum título faturado neste mês.
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{MESES[Number(filtroMes) - 1]}/{filtroAno}</CardTitle>
                <CardDescription>{faturados.length} título(s) — R$ {totalFaturado.toFixed(2)}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={faturados.filter(t => t.status !== "Pago").every((t) => selecionadosFaturados.has(t.id)) && faturados.some(t => t.status !== "Pago")}
                          onCheckedChange={() => toggleTodos(faturados.filter(t => t.status !== "Pago"), selecionadosFaturados, setSelecionadosFaturados)}
                        />
                      </TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faturados.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {t.status !== "Pago" ? (
                            <Checkbox checked={selecionadosFaturados.has(t.id)} onCheckedChange={() => toggle(selecionadosFaturados, setSelecionadosFaturados, t.id)} />
                          ) : (
                            <span className="text-xs text-muted-foreground" title="Já pago, não pode ser estornado">🔒</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{t.aluno_nome}</TableCell>
                        <TableCell className="text-muted-foreground">{t.descricao}</TableCell>
                        <TableCell>{new Date(t.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>{t.status}</TableCell>
                        <TableCell className="text-right">R$ {t.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {selecionadosFaturados.size > 0 && (
            <div className="sticky bottom-4 flex justify-center">
              <Card className="shadow-lg border-destructive">
                <CardContent className="py-3 px-5 flex items-center gap-4">
                  <span className="text-sm">
                    <strong>{selecionadosFaturados.size}</strong> selecionado(s) pra estornar
                  </span>
                  <Button variant="destructive" onClick={() => estornar.mutate(Array.from(selecionadosFaturados))} disabled={estornar.isPending}>
                    <Undo2 className="h-4 w-4 mr-2" />
                    {estornar.isPending ? "Estornando..." : "Estornar Selecionados"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
