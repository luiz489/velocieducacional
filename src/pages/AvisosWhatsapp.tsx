import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, MessageCircle, Search, Send, WifiOff, X } from "lucide-react";

type Persona = "responsavel" | "pai" | "mae" | "ambos";
const PERSONAS: { value: Persona; label: string }[] = [
  { value: "responsavel", label: "Responsável financeiro" },
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "ambos", label: "Pai e mãe (ambos)" },
];
function personasParaEnviar(p: Persona): string[] {
  return p === "ambos" ? ["pai", "mae"] : [p];
}

type Contato = { parentesco: "pai" | "mae" | "responsavel"; nome: string | null; telefone: string | null };
type AlunoBusca = { id: string; nome: string; contatos: Contato[] };
type Aviso = {
  id: string; mensagem: string; destino_tipo: "aluno" | "todos"; aluno_nome: string | null;
  personas: string[]; status: "pendente" | "enviando" | "concluido" | "erro"; erro: string | null;
  total_destinatarios: number; total_enviados: number; total_erros: number; total_sem_telefone: number;
  criado_por_nome: string | null; created_at: string;
};
type EstadoWhatsapp =
  | { habilitado: false }
  | { habilitado: true; status: "STARTING" | "SCAN_QR_CODE" | "WORKING" | "STOPPED" | "FAILED" | "INDISPONIVEL"; erro?: string };

const STATUS_LABEL: Record<Aviso["status"], string> = { pendente: "Pendente", enviando: "Enviando…", concluido: "Concluído", erro: "Erro" };
const STATUS_VARIANT: Record<Aviso["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "outline", enviando: "secondary", concluido: "default", erro: "destructive",
};

async function chamar<T = any>(acao: string, extra: Record<string, unknown> = {}, escolaId?: string | null) {
  const { data, error } = await supabase.functions.invoke("avisos-whatsapp", { body: { acao, escola_id: escolaId, ...extra } });
  if (error) throw new Error(error.message);
  if (data && data.ok === false) throw new Error(data.erro ?? "Falha na operação.");
  return data as T;
}

export default function AvisosWhatsapp() {
  const { escolaAtivaId } = useEscolaAtiva();
  const qc = useQueryClient();

  // --- Conexão do WhatsApp (QR) ---
  const [qr, setQr] = useState<string | null>(null);
  const statusAnterior = useRef<string | null>(null);

  const { data: estado } = useQuery({
    queryKey: ["avisos-whatsapp-status", escolaAtivaId],
    enabled: !!escolaAtivaId,
    refetchInterval: (q) => {
      const s = q.state.data as EstadoWhatsapp | undefined;
      if (!s?.habilitado) return false;
      return s.status === "STARTING" || s.status === "SCAN_QR_CODE" ? 3000 : 10000;
    },
    queryFn: () => chamar<EstadoWhatsapp>("status", {}, escolaAtivaId),
  });
  const status = estado?.habilitado ? estado.status : null;

  useEffect(() => {
    if (status === "WORKING" && statusAnterior.current && statusAnterior.current !== "WORKING") {
      toast.success("WhatsApp conectado!");
      setQr(null);
    }
    statusAnterior.current = status;
  }, [status]);

  useEffect(() => {
    if (status !== "SCAN_QR_CODE") { setQr(null); return; }
    let ativo = true;
    const buscar = async () => {
      try {
        const r = await chamar<{ imagem?: string }>("qr", {}, escolaAtivaId);
        if (ativo && r.imagem) setQr(r.imagem);
      } catch { /* o QR se renova no próximo ciclo */ }
    };
    void buscar();
    const t = setInterval(buscar, 12000);
    return () => { ativo = false; clearInterval(t); };
  }, [status, escolaAtivaId]);

  const conectarMut = useMutation({
    mutationFn: () => chamar("conectar", {}, escolaAtivaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avisos-whatsapp-status", escolaAtivaId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const desconectarMut = useMutation({
    mutationFn: () => chamar("desconectar", {}, escolaAtivaId),
    onSuccess: () => { toast.success("Número desconectado."); qc.invalidateQueries({ queryKey: ["avisos-whatsapp-status", escolaAtivaId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Composição do aviso ---
  const [destino, setDestino] = useState<"aluno" | "todos">("aluno");
  const [termo, setTermo] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoBusca | null>(null);
  const [persona, setPersona] = useState<Persona>("responsavel");
  const [mensagem, setMensagem] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  const { data: resultadoBusca, isFetching: buscando } = useQuery({
    queryKey: ["avisos-whatsapp-buscar", escolaAtivaId, termo],
    enabled: !!escolaAtivaId && destino === "aluno" && termo.trim().length >= 2 && !alunoSelecionado,
    queryFn: () => chamar<{ alunos: AlunoBusca[] }>("buscar_alunos", { termo }, escolaAtivaId),
  });

  const enviarMut = useMutation({
    mutationFn: () => chamar<{ total_destinatarios: number; total_sem_telefone: number }>("criar_envio", {
      mensagem,
      destino_tipo: destino,
      aluno_id: destino === "aluno" ? alunoSelecionado?.id : undefined,
      personas: personasParaEnviar(persona),
    }, escolaAtivaId),
    onSuccess: (r) => {
      toast.success(`Envio iniciado para ${r.total_destinatarios} destinatário(s)${r.total_sem_telefone ? ` (${r.total_sem_telefone} sem telefone cadastrado, não recebem)` : ""}.`);
      setMensagem(""); setAlunoSelecionado(null); setTermo(""); setConfirmar(false);
      qc.invalidateQueries({ queryKey: ["avisos-whatsapp-lista", escolaAtivaId] });
    },
    onError: (e: Error) => { toast.error(e.message); setConfirmar(false); },
  });

  const podeEnviar = mensagem.trim().length > 0 && (destino === "todos" || !!alunoSelecionado) && status === "WORKING";

  // --- Histórico ---
  const { data: avisos } = useQuery({
    queryKey: ["avisos-whatsapp-lista", escolaAtivaId],
    enabled: !!escolaAtivaId,
    refetchInterval: (q) => ((q.state.data as Aviso[] | undefined)?.some((a) => a.status === "enviando") ? 4000 : false),
    queryFn: async () => {
      const { data, error } = await supabase.from("avisos_whatsapp" as any)
        .select("*").eq("escola_id", escolaAtivaId!).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data as unknown as Aviso[];
    },
  });

  const contatoSelecionado = alunoSelecionado?.contatos.filter((c) => personasParaEnviar(persona).includes(c.parentesco));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Avisos por WhatsApp</h1>
        <p className="text-muted-foreground">Mande um aviso por WhatsApp para o responsável, pai, mãe ou ambos — de um aluno ou de todos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Conexão do WhatsApp</CardTitle>
          <CardDescription>Número usado para disparar os avisos. Se a conexão cair, reconecte aqui.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!estado?.habilitado && <p className="text-sm text-muted-foreground">Este recurso ainda não foi liberado para esta escola.</p>}

          {status === "WORKING" && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div className="flex-1 text-sm"><p className="font-semibold">WhatsApp conectado</p></div>
              <AlertDialog>
                <Button variant="outline" size="sm" disabled={desconectarMut.isPending} onClick={(e) => { e.preventDefault(); desconectarMut.mutate(); }}>
                  Desconectar
                </Button>
              </AlertDialog>
            </div>
          )}

          {status === "SCAN_QR_CODE" && (
            <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
              <div className="flex h-56 w-56 items-center justify-center rounded-xl border bg-white p-2">
                {qr ? <img src={qr} alt="QR code" className="h-full w-full" /> : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
              </div>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                <li>No celular, abra o <strong>WhatsApp</strong>.</li>
                <li>Toque em <strong>Configurações › Aparelhos conectados</strong>.</li>
                <li>Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para o QR code.</li>
                <li>Aguarde: esta tela muda sozinha quando conectar.</li>
              </ol>
            </div>
          )}

          {status === "STARTING" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Iniciando a conexão…</p>}

          {(status === "STOPPED" || status === "FAILED" || status === "INDISPONIVEL") && (
            <div className="space-y-3">
              <Badge variant="outline" className="gap-1.5 border-destructive/40 text-destructive"><WifiOff className="h-3 w-3" /> WhatsApp desconectado</Badge>
              <Button disabled={conectarMut.isPending} onClick={() => conectarMut.mutate()}>
                {conectarMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar WhatsApp"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novo aviso</CardTitle>
          <CardDescription>Escolha o destino, quem recebe e escreva a mensagem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2">
            <Button variant={destino === "aluno" ? "default" : "outline"} onClick={() => { setDestino("aluno"); }}>Um aluno</Button>
            <Button variant={destino === "todos" ? "default" : "outline"} onClick={() => { setDestino("todos"); setAlunoSelecionado(null); setTermo(""); }}>Todos os alunos ativos</Button>
          </div>

          {destino === "aluno" && (
            <div className="space-y-2">
              <Label>Aluno</Label>
              {alunoSelecionado ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="font-medium">{alunoSelecionado.nome}</span>
                  <Button variant="ghost" size="sm" onClick={() => setAlunoSelecionado(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Buscar aluno pelo nome…" value={termo} onChange={(e) => setTermo(e.target.value)} />
                  </div>
                  {buscando && <p className="text-sm text-muted-foreground">Buscando…</p>}
                  {resultadoBusca && (
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
                      {resultadoBusca.alunos.length === 0 && <p className="p-2 text-sm text-muted-foreground">Nenhum aluno encontrado.</p>}
                      {resultadoBusca.alunos.map((a) => (
                        <button key={a.id} type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setAlunoSelecionado(a)}>
                          {a.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Quem recebe</Label>
            <RadioGroup value={persona} onValueChange={(v) => setPersona(v as Persona)} className="flex flex-wrap gap-4">
              {PERSONAS.map((p) => (
                <div key={p.value} className="flex items-center gap-2">
                  <RadioGroupItem value={p.value} id={`persona-${p.value}`} />
                  <Label htmlFor={`persona-${p.value}`} className="font-normal">{p.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {alunoSelecionado && contatoSelecionado && contatoSelecionado.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {contatoSelecionado.map((c) => `${c.nome ?? c.parentesco}: ${c.telefone ? "telefone cadastrado" : "sem telefone cadastrado"}`).join(" · ")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Escreva o aviso…" />
          </div>

          {status !== "WORKING" && <p className="text-sm text-amber-600 dark:text-amber-400">Conecte o WhatsApp acima antes de enviar.</p>}

          <Button className="gap-2" disabled={!podeEnviar || enviarMut.isPending} onClick={() => setConfirmar(true)}>
            <Send className="h-4 w-4" /> Enviar aviso
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio?</AlertDialogTitle>
            <AlertDialogDescription>
              {destino === "aluno"
                ? `A mensagem será enviada para ${PERSONAS.find((p) => p.value === persona)?.label.toLowerCase()} de ${alunoSelecionado?.nome}.`
                : `A mensagem será enviada para ${PERSONAS.find((p) => p.value === persona)?.label.toLowerCase()} de todos os alunos ativos da escola.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={enviarMut.isPending} onClick={() => enviarMut.mutate()}>
              {enviarMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Enviados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(avisos ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-sm">{a.destino_tipo === "aluno" ? a.aluno_nome : "Todos os alunos"}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm" title={a.mensagem}>{a.mensagem}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge></TableCell>
                  <TableCell className="text-right text-sm">
                    {a.total_enviados}/{a.total_destinatarios}{a.total_erros ? ` · ${a.total_erros} erro(s)` : ""}{a.total_sem_telefone ? ` · ${a.total_sem_telefone} sem telefone` : ""}
                  </TableCell>
                </TableRow>
              ))}
              {(!avisos || avisos.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhum aviso enviado ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
