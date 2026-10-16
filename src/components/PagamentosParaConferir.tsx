import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dataBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Candidato = { id: string; aluno: string | null; valor: number; valor_integral: number | null };
type Linha = {
  id: string; nosso_numero: string; data_pagamento: string | null; valor_pago: number | null; tipo_liquidacao: string | null;
  pagador_nome: string | null; pagador_doc_final: string | null; vencimento: string | null; valor_nominal: number | null;
  resultado: string; motivo: string | null; candidatos: Candidato[];
};

const brl = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

export function PagamentosParaConferir({ escolaId }: { escolaId: string | null }) {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [agindo, setAgindo] = useState<string | null>(null);

  const { data: linhas } = useQuery({
    queryKey: ["liquidacoes-externas", escolaId],
    enabled: !!escolaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidacoes_externas")
        .select("id, nosso_numero, data_pagamento, valor_pago, tipo_liquidacao, pagador_nome, pagador_doc_final, vencimento, valor_nominal, resultado, motivo, candidatos")
        .eq("escola_id", escolaId!).eq("situacao", "conferir").order("data_pagamento", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Linha[];
    },
  });

  const agir = async (l: Linha, acao: "baixar" | "resolvida" | "ignorar", financeiroId?: string) => {
    setAgindo(l.id + acao + (financeiroId ?? ""));
    const { error } = await supabase.rpc("resolver_liquidacao_externa", { p_id: l.id, p_acao: acao, p_financeiro_id: financeiroId ?? null });
    setAgindo(null);
    if (error) { toast.error(error.message); return; }
    toast.success(acao === "baixar" ? "Parcela baixada." : "Pagamento tratado.");
    qc.invalidateQueries({ queryKey: ["liquidacoes-externas", escolaId] });
    qc.invalidateQueries({ queryKey: ["financeiro"] });
  };

  if (!linhas || linhas.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-md border border-warning/50 bg-warning/10 p-3">
        <div className="flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
          <span>
            <strong>{linhas.length}</strong> pagamento(s) de boletos emitidos no banco não puderam ser ligados a uma parcela sozinhos e aguardam sua conferência.
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAberto(true)}>Conferir</Button>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagamentos para conferir</DialogTitle>
            <DialogDescription>
              O banco avisou que estes boletos foram pagos, mas o sistema não achou com segurança a parcela de cada um (CPF, vencimento e valor).
              Escolha a parcela certa, ou marque como resolvido se você já deu a baixa por outro caminho.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {linhas.map((l) => (
              <div key={l.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium">
                      {l.pagador_nome ?? "Pagador não informado"} {l.pagador_doc_final && <span className="text-xs text-muted-foreground">(CPF/CNPJ final {l.pagador_doc_final})</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pago em {l.data_pagamento ? dataBR(l.data_pagamento) : "—"}: {brl(l.valor_pago)} · boleto vencia em {l.vencimento ? dataBR(l.vencimento) : "—"} · valor do boleto {brl(l.valor_nominal)} · nosso número {l.nosso_numero}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-warning text-warning">
                    {l.resultado === "ambiguo" ? "Mais de uma parcela" : l.resultado === "api_sem_parcela" ? "Boleto do sistema sem parcela" : "Sem parcela segura"}
                  </Badge>
                </div>
                {l.motivo && <p className="text-xs text-muted-foreground">{l.motivo}</p>}

                {l.candidatos.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Dar baixa em:</p>
                    {l.candidatos.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-sm">
                        <span>{c.aluno ?? "Aluno"} · {brl(c.valor_integral ?? c.valor)}</span>
                        <Button size="sm" disabled={agindo !== null} onClick={() => agir(l, "baixar", c.id)}>
                          {agindo === l.id + "baixar" + c.id ? "Baixando…" : "Dar baixa"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap pt-1">
                  <Button size="sm" variant="outline" disabled={agindo !== null} onClick={() => agir(l, "resolvida")}>Já resolvi por outro caminho</Button>
                  <Button size="sm" variant="ghost" disabled={agindo !== null} onClick={() => agir(l, "ignorar")}>Ignorar</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
