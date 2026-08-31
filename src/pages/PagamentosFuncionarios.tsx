import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw, Download, Wallet, AlertCircle } from "lucide-react";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type PagamentoRow = {
  conta_id: string;
  funcionario_id: string;
  funcionario_nome: string;
  cargo: string;
  cpf: string | null;
  banco_codigo: string | null;
  banco_nome: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  chave_pix: string | null;
  valor: number;
  data_vencimento: string;
  competencia_mes: number;
  competencia_ano: number;
  status: string;
};

export default function PagamentosFuncionarios() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1));
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const { data: pagamentos, isLoading } = useQuery({
    queryKey: ["pagamentos-funcionarios", mes, ano, escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_pagamentos_funcionarios_export")
        .select("*")
        .eq("escola_id", escolaAtivaId!)
        .eq("competencia_mes", Number(mes))
        .eq("competencia_ano", Number(ano))
        .order("funcionario_nome");
      if (error) throw error;
      return (data ?? []) as PagamentoRow[];
    },
  });

  const gerar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("gerar_pagamentos_funcionarios", {
        p_escola_id: escolaAtivaId!,
        p_mes: Number(mes),
        p_ano: Number(ano),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data?.length ?? 0} pagamento(s) gerado(s) para ${MESES[Number(mes) - 1]}/${ano}`);
      qc.invalidateQueries({ queryKey: ["pagamentos-funcionarios"] });
    },
    onError: (e: any) => toast.error("Erro ao gerar pagamentos: " + e.message),
  });

  const marcarPago = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("contas_a_pagar")
        .update({ status: "Pago", data_pagamento: new Date().toISOString().slice(0, 10) })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento(s) confirmado(s)");
      setSelecionados(new Set());
      qc.invalidateQueries({ queryKey: ["pagamentos-funcionarios"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const semDadosBancarios = (pagamentos ?? []).filter((p) => !p.banco_codigo && !p.chave_pix);

  const toggleSelecionado = (id: string) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setSelecionados(novo);
  };

  const toggleTodos = () => {
    if (selecionados.size === (pagamentos ?? []).length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set((pagamentos ?? []).map((p) => p.conta_id)));
    }
  };

  const exportarCSV = () => {
    const linhas = (pagamentos ?? []).filter((p) => selecionados.size === 0 || selecionados.has(p.conta_id));
    if (linhas.length === 0) {
      toast.error("Nenhum pagamento para exportar.");
      return;
    }

    const cabecalho = [
      "Favorecido", "CPF", "Cargo", "Banco", "Codigo_Banco", "Agencia", "Conta",
      "Tipo_Conta", "Chave_PIX", "Valor", "Data_Vencimento",
    ];
    const linhasCSV = linhas.map((p) => [
      p.funcionario_nome,
      p.cpf || "",
      p.cargo || "",
      p.banco_nome || "",
      p.banco_codigo || "",
      p.agencia || "",
      p.conta || "",
      p.tipo_conta || "",
      p.chave_pix || "",
      p.valor.toFixed(2).replace(".", ","),
      new Date(p.data_vencimento).toLocaleDateString("pt-BR"),
    ]);

    const csv = [cabecalho, ...linhasCSV]
      .map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagamentos_funcionarios_${mes}_${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${linhas.length} pagamento(s) exportado(s)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Pagamentos de Funcionários (CLT)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gera o registro simplificado do salário base do mês. O cálculo de INSS, IRRF, FGTS e
            demais tributos deve ser conferido/apurado pela contabilidade responsável.
          </p>
        </div>
        <Button onClick={() => gerar.mutate()} disabled={gerar.isPending}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {gerar.isPending ? "Gerando..." : "Gerar Folha do Mês"}
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
        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((a) => (
              <SelectItem key={a} value={String(a)}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={exportarCSV}
          disabled={!pagamentos || pagamentos.length === 0}
          className="ml-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar {selecionados.size > 0 ? `(${selecionados.size})` : "Todos"} para o Banco
        </Button>
        <Button
          variant="secondary"
          disabled={selecionados.size === 0 || marcarPago.isPending}
          onClick={() => marcarPago.mutate(Array.from(selecionados))}
        >
          Marcar Selecionados como Pagos
        </Button>
      </div>

      {semDadosBancarios.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {semDadosBancarios.length} funcionário(s) sem dados bancários ou chave PIX cadastrados —
            complete o cadastro na tela de Funcionários antes de exportar para o banco.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={!!pagamentos?.length && selecionados.size === pagamentos.length}
                      onChange={toggleTodos}
                    />
                  </TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Dados Bancários</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!pagamentos || pagamentos.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento gerado para {MESES[Number(mes) - 1]}/{ano} ainda. Clique em
                      "Gerar Folha do Mês" para criar o pagamento dos funcionários ativos.
                    </TableCell>
                  </TableRow>
                )}
                {pagamentos?.map((p) => (
                  <TableRow key={p.conta_id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selecionados.has(p.conta_id)}
                        onChange={() => toggleSelecionado(p.conta_id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.funcionario_nome}
                      <div className="text-xs text-muted-foreground">{p.cpf}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.cargo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.chave_pix ? (
                        <span>PIX: {p.chave_pix}</span>
                      ) : p.banco_nome ? (
                        <span>{p.banco_nome} Ag.{p.agencia} CC.{p.conta}</span>
                      ) : (
                        <span className="text-destructive">Sem dados</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">R$ {Number(p.valor).toFixed(2)}</TableCell>
                    <TableCell>{new Date(p.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "Pago" ? "default" : "secondary"}>{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
