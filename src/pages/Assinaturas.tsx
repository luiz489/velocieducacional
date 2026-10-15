import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Eye, MoreHorizontal, PenLine, Search, Send } from "lucide-react";
import { usePermissoes } from "@/hooks/usePermissoes";
import { AssinarPelaEscolaDialog } from "@/components/AssinarPelaEscolaDialog";
import { toast } from "sonner";
import {
  formatarDataHoraBrasilia, linkWhatsapp, situacaoAssinatura, urlAssinatura, type SituacaoAssinatura,
} from "@/lib/assinaturas";

type Linha = {
  id: string;
  titulo: string;
  token: string;
  template_id: string | null;
  aluno_id: string | null;
  criado_em: string;
  assinado_em: string | null;
  cancelado_em: string | null;
  expira_em: string | null;
  tentativas_invalidas: number;
  escola_assinou_em: string | null;
  escola_assinante_nome: string | null;
  assinante_nome: string | null;
  alunos: { nome: string; telefone_responsavel: string | null } | null;
};

const ROTULO: Record<SituacaoAssinatura, string> = {
  aguardando_escola: "Aguardando a escola",
  aguardando_familia: "Aguardando o responsável",
  assinado: "Assinado",
  cancelado: "Cancelado",
  expirado: "Link expirado",
  bloqueado: "Bloqueado (CPF incorreto)",
};

function BadgeSituacao({ s }: { s: SituacaoAssinatura }) {
  if (s === "assinado") return <Badge className="bg-success text-success-foreground">{ROTULO[s]}</Badge>;
  if (s === "cancelado") return <Badge variant="outline">{ROTULO[s]}</Badge>;
  if (s === "aguardando_escola" || s === "bloqueado") return <Badge variant="destructive">{ROTULO[s]}</Badge>;
  if (s === "expirado") return <Badge variant="outline" className="border-amber-500 text-amber-600">{ROTULO[s]}</Badge>;
  return <Badge variant="secondary">{ROTULO[s]}</Badge>;
}

export default function Assinaturas() {
  const { escolaAtivaId } = useEscolaAtiva();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermissoes();
  const podeAssinarPelaEscola = can("relatorios_documentos", "assinar");
  const podeCriar = can("relatorios_documentos", "criar");
  const podeEditar = can("relatorios_documentos", "editar");
  const podeExcluir = can("relatorios_documentos", "excluir");
  const [busca, setBusca] = useState("");
  const [assinando, setAssinando] = useState<{ id: string; titulo: string; alunoNome?: string } | null>(null);

  const { data: linhas, isLoading } = useQuery({
    queryKey: ["assinaturas-documentos", escolaAtivaId],
    enabled: !!escolaAtivaId,
    refetchInterval: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("assinaturas_documentos")
        .select("id, titulo, token, template_id, aluno_id, criado_em, assinado_em, cancelado_em, expira_em, tentativas_invalidas, escola_assinou_em, escola_assinante_nome, assinante_nome, alunos(nome, telefone_responsavel)")
        .eq("escola_id", escolaAtivaId!)
        .order("criado_em", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Linha[];
    },
  });

  const atualizar = () => qc.invalidateQueries({ queryKey: ["assinaturas-documentos"] });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = (nome: string, args: Record<string, unknown>) => (supabase as any).rpc(nome, args);

  const cancelar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc("cancelar_assinatura_documento", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pedido cancelado. O link deixou de funcionar."); atualizar(); },
    onError: (e: Error) => toast.error("Não foi possível cancelar: " + e.message),
  });

  const renovar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc("renovar_prazo_assinatura", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Prazo renovado por 15 dias. O link voltou a funcionar."); atualizar(); },
    onError: (e: Error) => toast.error("Não foi possível renovar: " + e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc("excluir_assinatura_documento", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Documento excluído."); atualizar(); },
    onError: (e: Error) => toast.error("Não foi possível excluir: " + e.message),
  });

  const reemitir = useMutation({
    mutationFn: async (l: Linha) => {
      const { data, error } = await rpc("solicitar_assinatura_documento", { p_template_id: l.template_id, p_aluno_id: l.aluno_id });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as { assinatura_id: string };
    },
    onSuccess: (novo, l) => {
      atualizar();
      if (podeAssinarPelaEscola) {
        toast.success("Contrato reemitido com os dados atuais. Assine pela escola para liberar o link.");
        setAssinando({ id: novo.assinatura_id, titulo: l.titulo, alunoNome: l.alunos?.nome });
      } else {
        toast.success("Contrato reemitido com os dados atuais. Falta a assinatura da escola para liberar o link.");
      }
    },
    onError: (e: Error) => toast.error("Não foi possível reemitir: " + e.message),
  });

  const copiar = async (token: string) => {
    await navigator.clipboard.writeText(urlAssinatura(token));
    toast.success("Link copiado");
  };

  const confirmarReemitir = (l: Linha) => {
    const aviso = l.assinado_em
      ? "Este contrato JÁ FOI ASSINADO e continua guardado. O novo contrato será gerado com os dados atuais e precisará ser assinado de novo."
      : "O texto será gerado de novo com os dados atuais do aluno e o pedido atual deixará de valer.";
    if (confirm(`Reemitir o contrato de "${l.alunos?.nome ?? "aluno"}"?\n\n${aviso}`)) reemitir.mutate(l);
  };

  const confirmarExcluir = (l: Linha) => {
    const nome = l.alunos?.nome ?? "aluno";
    if (l.assinado_em) {
      const resp = window.prompt(
        `O contrato de "${nome}" JÁ FOI ASSINADO. Excluir apaga o texto e as assinaturas, e não pode ser desfeito (fica só um registro de que foi excluído).\n\nPara confirmar, digite EXCLUIR:`,
      );
      if (resp?.trim().toUpperCase() === "EXCLUIR") excluir.mutate(l.id);
      else if (resp !== null) toast.error("Confirmação incorreta. Nada foi excluído.");
      return;
    }
    if (confirm(`Excluir o pedido de assinatura de "${nome}"? Isso não pode ser desfeito.`)) excluir.mutate(l.id);
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
          Documentos enviados para assinatura. O link vale 15 dias (renovável) e só abre para a família depois da
          assinatura da escola. Para enviar um novo, use Matrículas → Emitir Contrato → Assinatura digital.
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
                const aberto = s === "aguardando_escola" || s === "aguardando_familia" || s === "expirado" || s === "bloqueado";
                const escolaPendente = !l.escola_assinou_em && !l.cancelado_em && !l.assinado_em;
                const podeReemitir = podeCriar && !!l.template_id && !!l.aluno_id;
                const podeExcluirEste = podeExcluir && (!l.assinado_em || podeAssinarPelaEscola);
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
                      {s === "aguardando_familia" && l.escola_assinou_em && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Escola: {l.escola_assinante_nome} · válido até {l.expira_em ? formatarDataHoraBrasilia(l.expira_em).slice(0, 10) : "—"}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver o documento completo (imprimir)" onClick={() => navigate(`/assinaturas/ver?id=${l.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {escolaPendente && podeAssinarPelaEscola && (
                          <Button size="sm" className="h-8 gap-1" onClick={() => setAssinando({ id: l.id, titulo: l.titulo, alunoNome: l.alunos?.nome })}>
                            <PenLine className="h-4 w-4" /> Assinar pela escola
                          </Button>
                        )}
                        {s === "aguardando_familia" && (
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
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Mais ações"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {aberto && podeEditar && (
                              <DropdownMenuItem onClick={() => renovar.mutate(l.id)}>Renovar prazo (+15 dias)</DropdownMenuItem>
                            )}
                            {podeReemitir && (
                              <DropdownMenuItem onClick={() => confirmarReemitir(l)}>Reemitir contrato</DropdownMenuItem>
                            )}
                            {aberto && podeEditar && (
                              <DropdownMenuItem onClick={() => { if (confirm(`Cancelar o pedido de assinatura de "${l.alunos?.nome ?? "aluno"}"? O link deixará de funcionar.`)) cancelar.mutate(l.id); }}>
                                Cancelar pedido
                              </DropdownMenuItem>
                            )}
                            {podeExcluirEste && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => confirmarExcluir(l)}>Excluir</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssinarPelaEscolaDialog
        assinaturaId={assinando?.id ?? null}
        titulo={assinando?.titulo ?? ""}
        alunoNome={assinando?.alunoNome}
        onClose={() => setAssinando(null)}
        onAssinado={() => { setAssinando(null); atualizar(); }}
      />
    </div>
  );
}
