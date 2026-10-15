import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, ExternalLink, PenLine, Search, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  formatarDataHoraBrasilia, linkWhatsapp, situacaoAssinatura, urlAssinatura, type SituacaoAssinatura,
} from "@/lib/assinaturas";

type Linha = {
  id: string;
  titulo: string;
  token: string;
  criado_em: string;
  assinado_em: string | null;
  cancelado_em: string | null;
  assinante_nome: string | null;
  alunos: { nome: string; telefone_responsavel: string | null } | null;
};

const ROTULO: Record<SituacaoAssinatura, string> = { pendente: "Aguardando assinatura", assinado: "Assinado", cancelado: "Cancelado" };

function BadgeSituacao({ s }: { s: SituacaoAssinatura }) {
  if (s === "assinado") return <Badge className="bg-success text-success-foreground">{ROTULO[s]}</Badge>;
  if (s === "cancelado") return <Badge variant="outline">{ROTULO[s]}</Badge>;
  return <Badge variant="secondary">{ROTULO[s]}</Badge>;
}

export default function Assinaturas() {
  const { escolaAtivaId } = useEscolaAtiva();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");

  const { data: linhas, isLoading } = useQuery({
    queryKey: ["assinaturas-documentos", escolaAtivaId],
    enabled: !!escolaAtivaId,
    refetchInterval: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("assinaturas_documentos")
        .select("id, titulo, token, criado_em, assinado_em, cancelado_em, assinante_nome, alunos(nome, telefone_responsavel)")
        .eq("escola_id", escolaAtivaId!)
        .order("criado_em", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Linha[];
    },
  });

  const cancelar = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("cancelar_assinatura_documento", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido cancelado. O link deixou de funcionar.");
      qc.invalidateQueries({ queryKey: ["assinaturas-documentos"] });
    },
    onError: (e: Error) => toast.error("Não foi possível cancelar: " + e.message),
  });

  const copiar = async (token: string) => {
    await navigator.clipboard.writeText(urlAssinatura(token));
    toast.success("Link copiado");
  };

  const termo = busca.trim().toLowerCase();
  const filtradas = (linhas ?? []).filter(
    (l) => !termo || (l.alunos?.nome ?? "").toLowerCase().includes(termo) || l.titulo.toLowerCase().includes(termo),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <PenLine className="h-6 w-6" /> Assinaturas Digitais
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Documentos enviados para o responsável assinar pelo celular ou computador. Para enviar um novo, use
          Matrículas → Emitir Contrato → Assinatura digital.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por aluno ou documento" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="hidden md:table-cell">Enviado em</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && filtradas.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum documento enviado para assinatura ainda.</TableCell></TableRow>
              )}
              {filtradas.map((l) => {
                const s = situacaoAssinatura(l);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.alunos?.nome ?? "—"}</TableCell>
                    <TableCell>{l.titulo}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{formatarDataHoraBrasilia(l.criado_em).slice(0, 16)}</TableCell>
                    <TableCell>
                      <BadgeSituacao s={s} />
                      {s === "assinado" && l.assinado_em && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {l.assinante_nome} · {formatarDataHoraBrasilia(l.assinado_em).slice(0, 16)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {s !== "cancelado" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir (ver e imprimir)" asChild>
                            <a href={urlAssinatura(l.token)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                        )}
                        {s === "pendente" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Copiar link" onClick={() => void copiar(l.token)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Enviar pelo WhatsApp" asChild>
                              <a
                                href={linkWhatsapp(l.alunos?.telefone_responsavel, `Olá! Segue o documento "${l.titulo}" para assinatura digital: ${urlAssinatura(l.token)}`)}
                                target="_blank" rel="noreferrer"
                              ><Send className="h-4 w-4" /></a>
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Cancelar pedido"
                              disabled={cancelar.isPending}
                              onClick={() => { if (confirm(`Cancelar o pedido de assinatura de "${l.alunos?.nome ?? "aluno"}"? O link deixará de funcionar.`)) cancelar.mutate(l.id); }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
