import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function formatCurrency(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pago: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    pendente: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    atrasado: "bg-destructive/15 text-destructive border-destructive/30",
    cancelado: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

export default function Faturamento() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [mes, setMes] = useState<string>(String(now.getMonth() + 1));
  const [status, setStatus] = useState<string>("todos");

  const { data: faturas, isLoading } = useQuery({
    queryKey: ["plataforma-faturas", mes, status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("plataforma_faturas", {
        p_mes: mes ? Number(mes) : undefined,
        p_ano: now.getFullYear(),
        p_status: status !== "todos" ? status : undefined,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const gerarFaturas = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("gerar_faturas_do_mes", {});
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: `${data?.length ?? 0} fatura(s) gerada(s) para o mês atual` });
      queryClient.invalidateQueries({ queryKey: ["plataforma-faturas"] });
    },
    onError: (err: any) => toast({ title: "Erro ao gerar faturas", description: err.message, variant: "destructive" }),
  });

  const totalMes = (faturas ?? []).reduce((acc, f) => acc + Number(f.valor), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturamento</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cobranças emitidas para os clientes do seu SaaS.
          </p>
        </div>
        <Button onClick={() => gerarFaturas.mutate()} disabled={gerarFaturas.isPending}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {gerarFaturas.isPending ? "Gerando…" : "Gerar Faturas do Mês"}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESES.map((nome, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          Total do filtro: <strong>{formatCurrency(totalMes)}</strong>
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escola</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && (!faturas || faturas.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma fatura encontrada para este filtro.</TableCell></TableRow>
              )}
              {faturas?.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.escola_nome}</TableCell>
                  <TableCell>{MESES[f.competencia_mes - 1]}/{f.competencia_ano}</TableCell>
                  <TableCell>{formatCurrency(f.valor)}</TableCell>
                  <TableCell>{statusBadge(f.status)}</TableCell>
                  <TableCell>{new Date(f.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{f.data_pagamento ? new Date(f.data_pagamento).toLocaleDateString("pt-BR") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
