import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarRange, Save, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { usePermissoes } from "@/hooks/usePermissoes";

type Linha = { bimestre: number; data_inicio: string; data_fim: string };

const VAZIO: Linha[] = [1, 2, 3, 4].map((b) => ({ bimestre: b, data_inicio: "", data_fim: "" }));

const diasCorridos = (de: string, ate: string) => {
  if (!de || !ate) return null;
  const ms = new Date(ate).getTime() - new Date(de).getTime();
  if (isNaN(ms) || ms < 0) return null;
  return Math.round(ms / 86400000) + 1;
};

export default function PeriodosLetivos() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const { can } = usePermissoes();
  const podeEditar = can("pedagogico", "editar");

  const [ano, setAno] = useState(new Date().getFullYear());
  const [linhas, setLinhas] = useState<Linha[]>(VAZIO);

  const { data: salvos, isLoading } = useQuery({
    queryKey: ["periodos-letivos-config", escolaAtivaId, ano],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodos_letivos")
        .select("bimestre, data_inicio, data_fim")
        .eq("escola_id", escolaAtivaId!)
        .eq("ano_letivo", ano)
        .order("bimestre");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (isLoading) return;
    setLinhas(
      VAZIO.map((v) => {
        const s = salvos?.find((x) => x.bimestre === v.bimestre);
        return s ? { bimestre: v.bimestre, data_inicio: s.data_inicio, data_fim: s.data_fim } : v;
      }),
    );
  }, [salvos, isLoading]);

  // Anos que já têm configuração, pra oferecer a cópia do ano anterior.
  const { data: anosConfigurados } = useQuery({
    queryKey: ["periodos-letivos-anos", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodos_letivos")
        .select("ano_letivo")
        .eq("escola_id", escolaAtivaId!);
      if (error) throw error;
      return [...new Set((data ?? []).map((r) => r.ano_letivo))].sort((a, b) => b - a);
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("salvar_periodos_letivos", {
        p_escola_id: escolaAtivaId!,
        p_ano_letivo: ano,
        p_periodos: linhas,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Períodos letivos de ${ano} salvos!`);
      qc.invalidateQueries({ queryKey: ["periodos-letivos-config", escolaAtivaId, ano] });
      qc.invalidateQueries({ queryKey: ["periodos-letivos-anos", escolaAtivaId] });
      // A frequência por bimestre depende disso.
      qc.invalidateQueries({ queryKey: ["periodos-letivos"] });
      qc.invalidateQueries({ queryKey: ["pedagogico-registros"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Desloca as datas do ano anterior em +1 ano, como ponto de partida.
  const copiarDoAnoAnterior = async () => {
    const { data, error } = await supabase
      .from("periodos_letivos")
      .select("bimestre, data_inicio, data_fim")
      .eq("escola_id", escolaAtivaId!)
      .eq("ano_letivo", ano - 1)
      .order("bimestre");
    if (error) { toast.error(error.message); return; }
    if (!data?.length) { toast.error(`Não há períodos configurados em ${ano - 1}.`); return; }

    const maisUmAno = (iso: string) => `${Number(iso.slice(0, 4)) + 1}${iso.slice(4)}`;
    setLinhas(
      VAZIO.map((v) => {
        const s = data.find((x) => x.bimestre === v.bimestre);
        return s
          ? { bimestre: v.bimestre, data_inicio: maisUmAno(s.data_inicio), data_fim: maisUmAno(s.data_fim) }
          : v;
      }),
    );
    toast.success(`Datas de ${ano - 1} copiadas. Ajuste e salve.`);
  };

  const completo = linhas.every((l) => l.data_inicio && l.data_fim);
  const atualizar = (bimestre: number, campo: "data_inicio" | "data_fim", valor: string) =>
    setLinhas((atual) => atual.map((l) => (l.bimestre === bimestre ? { ...l, [campo]: valor } : l)));

  if (!escolaAtivaId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarRange className="h-6 w-6" /> Períodos Letivos
        </h1>
        <p className="text-sm text-muted-foreground">
          Início e fim de cada bimestre. É o que permite separar notas e frequência por bimestre —
          sem isso, a chamada só soma no acumulado do ano.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="ano">Ano letivo</Label>
          <Input
            id="ano"
            type="number"
            className="mt-1 w-[140px]"
            value={ano}
            min={2000}
            max={2100}
            onChange={(e) => setAno(Number(e.target.value) || new Date().getFullYear())}
          />
        </div>
        {anosConfigurados?.length ? (
          <div className="flex flex-wrap items-center gap-1 pb-2">
            <span className="text-xs text-muted-foreground mr-1">Já configurados:</span>
            {anosConfigurados.map((a) => (
              <Button key={a} variant={a === ano ? "default" : "outline"} size="sm" className="h-7"
                      onClick={() => setAno(a)}>
                {a}
              </Button>
            ))}
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={copiarDoAnoAnterior} disabled={!podeEditar}>
            <Copy className="h-4 w-4 mr-2" /> Copiar de {ano - 1}
          </Button>
          <Button onClick={() => salvar.mutate()} disabled={!podeEditar || !completo || salvar.isPending}>
            <Save className="h-4 w-4 mr-2" /> {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-3 border-b bg-muted/30 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Bimestres de {ano}</p>
            {salvos?.length === 4
              ? <Badge className="bg-success text-success-foreground">Configurado</Badge>
              : <Badge variant="secondary">{salvos?.length ? "Incompleto" : "Não configurado"}</Badge>}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Bimestre</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-center w-28">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => {
                const dias = diasCorridos(l.data_inicio, l.data_fim);
                return (
                  <TableRow key={l.bimestre}>
                    <TableCell className="font-medium">{l.bimestre}º bimestre</TableCell>
                    <TableCell>
                      <Input type="date" className="h-9 w-[180px]" value={l.data_inicio} disabled={!podeEditar}
                             onChange={(e) => atualizar(l.bimestre, "data_inicio", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="date" className="h-9 w-[180px]" value={l.data_fim} disabled={!podeEditar}
                             onChange={(e) => atualizar(l.bimestre, "data_fim", e.target.value)} />
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {dias !== null ? dias : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="p-3 border-t text-xs text-muted-foreground">
            Os quatro bimestres são obrigatórios e não podem se sobrepor. O recesso de julho fica
            naturalmente no intervalo entre o fim do 2º e o início do 3º bimestre.
          </div>
        </div>
      )}

      {!podeEditar && <Badge variant="secondary">Você tem acesso só de leitura ao módulo pedagógico.</Badge>}
    </div>
  );
}
