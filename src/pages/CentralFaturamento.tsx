import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Receipt, CalendarClock } from "lucide-react";

type TituloPendente = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  aluno_nome: string;
};

function competenciaDe(dataVencimento: string) {
  const [ano, mes] = dataVencimento.split("-");
  return `${mes}/${ano}`;
}

export default function CentralFaturamento() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const { data: titulos, isLoading } = useQuery({
    queryKey: ["titulos-nao-faturados", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("id, descricao, valor, data_vencimento, matriculas(alunos(nome))")
        .eq("escola_id", escolaAtivaId!)
        .eq("faturado", false)
        .eq("tipo", "Mensalidade")
        .order("data_vencimento");
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        id: t.id,
        descricao: t.descricao,
        valor: Number(t.valor),
        data_vencimento: t.data_vencimento,
        aluno_nome: t.matriculas?.alunos?.nome ?? "—",
      })) as TituloPendente[];
    },
  });

  const grupos = useMemo(() => {
    const mapa = new Map<string, TituloPendente[]>();
    (titulos ?? []).forEach((t) => {
      const chave = competenciaDe(t.data_vencimento);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(t);
    });
    return Array.from(mapa.entries()).sort(([a], [b]) => {
      const [ma, ya] = a.split("/"); const [mb, yb] = b.split("/");
      return `${ya}${ma}`.localeCompare(`${yb}${mb}`);
    });
  }, [titulos]);

  const toggleSelecionado = (id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  };

  const toggleGrupo = (grupo: TituloPendente[]) => {
    const todosMarcados = grupo.every((t) => selecionados.has(t.id));
    setSelecionados((atual) => {
      const novo = new Set(atual);
      grupo.forEach((t) => { if (todosMarcados) novo.delete(t.id); else novo.add(t.id); });
      return novo;
    });
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
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      setSelecionados(new Set());
    },
    onError: (e: any) => toast.error("Erro ao faturar: " + e.message),
  });

  const totalSelecionado = (titulos ?? [])
    .filter((t) => selecionados.has(t.id))
    .reduce((s, t) => s + t.valor, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6" /> Central de Faturamento
        </h1>
        <p className="text-sm text-muted-foreground">
          Mensalidades geradas na matrícula ficam aqui até serem faturadas. Só depois de faturado o título
          aparece em Contas a Receber.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-primary shrink-0" />
          Você pode configurar um dia do mês para isso acontecer sozinho, em
          Configurações → Parâmetros → Faturamento Automático.
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : grupos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum título pendente de faturamento. 🎉
        </CardContent></Card>
      ) : (
        grupos.map(([competencia, grupo]) => {
          const todosMarcados = grupo.every((t) => selecionados.has(t.id));
          const totalGrupo = grupo.reduce((s, t) => s + t.valor, 0);
          return (
            <Card key={competencia}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Competência {competencia}</CardTitle>
                  <CardDescription>{grupo.length} título(s) — R$ {totalGrupo.toFixed(2)}</CardDescription>
                </div>
                <Button size="sm" onClick={() => faturar.mutate(grupo.map((t) => t.id))} disabled={faturar.isPending}>
                  Faturar todo o mês
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={todosMarcados} onCheckedChange={() => toggleGrupo(grupo)} />
                      </TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox checked={selecionados.has(t.id)} onCheckedChange={() => toggleSelecionado(t.id)} />
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
          );
        })
      )}

      {selecionados.size > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <Card className="shadow-lg border-primary">
            <CardContent className="py-3 px-5 flex items-center gap-4">
              <span className="text-sm">
                <strong>{selecionados.size}</strong> selecionado(s) — R$ {totalSelecionado.toFixed(2)}
              </span>
              <Button onClick={() => faturar.mutate(Array.from(selecionados))} disabled={faturar.isPending}>
                {faturar.isPending ? "Faturando..." : "Faturar Selecionados"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
