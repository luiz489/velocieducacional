import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShoppingBag, MessageCircle, Loader2 } from "lucide-react";
import { chamarAvisosWhatsapp, personasParaEnviar, PERSONAS, type Persona } from "@/lib/avisosWhatsapp";

type Tipo = "material" | "uniforme" | "outro";
type LinkCompra = {
  id: string;
  titulo: string;
  url: string;
  tipo: Tipo;
  turma_id: string | null;
  ativo: boolean;
};

const TIPOS: { value: Tipo; label: string }[] = [
  { value: "material", label: "Material escolar" },
  { value: "uniforme", label: "Uniforme" },
  { value: "outro", label: "Outro" },
];

const TODA_ESCOLA = "__toda_escola__";

export default function LinksCompra() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LinkCompra | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    url: "",
    tipo: "material" as Tipo,
    turma_id: TODA_ESCOLA,
    ativo: true,
  });

  const { data: turmas } = useQuery({
    queryKey: ["turmas_para_links", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, ano_letivo")
        .eq("escola_id", escolaAtivaId!)
        .order("ano_letivo", { ascending: false })
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: links, isLoading } = useQuery({
    queryKey: ["escola_links_compras", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escola_links_compras")
        .select("*")
        .eq("escola_id", escolaAtivaId!)
        .order("tipo")
        .order("ordem");
      if (error) throw error;
      return data as LinkCompra[];
    },
  });

  const reset = () => {
    setEditing(null);
    setForm({ titulo: "", url: "", tipo: "material", turma_id: TODA_ESCOLA, ativo: true });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        titulo: form.titulo,
        url: form.url,
        tipo: form.tipo,
        turma_id: form.turma_id === TODA_ESCOLA ? null : form.turma_id,
        ativo: form.ativo,
      };
      if (editing) {
        const { error } = await supabase.from("escola_links_compras").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("escola_links_compras").insert({ ...payload, escola_id: escolaAtivaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Link atualizado" : "Link publicado");
      qc.invalidateQueries({ queryKey: ["escola_links_compras"] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("escola_links_compras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Link removido");
      qc.invalidateQueries({ queryKey: ["escola_links_compras"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // --- Enviar por WhatsApp ---
  const [enviarAlvo, setEnviarAlvo] = useState<LinkCompra | null>(null);
  const [persona, setPersona] = useState<Persona>("responsavel");
  const [mensagemEnvio, setMensagemEnvio] = useState("");

  const abrirEnvio = (l: LinkCompra) => {
    setEnviarAlvo(l);
    setPersona("responsavel");
    setMensagemEnvio(`${l.titulo}: ${l.url}`);
  };

  const { data: statusWhatsapp } = useQuery({
    queryKey: ["links-compra-whatsapp-status", escolaAtivaId],
    enabled: !!escolaAtivaId && !!enviarAlvo,
    queryFn: () => chamarAvisosWhatsapp<{ habilitado: boolean; status?: string }>("status", {}, escolaAtivaId),
  });
  const conectado = statusWhatsapp?.habilitado && statusWhatsapp.status === "WORKING";

  const enviarMut = useMutation({
    mutationFn: () => chamarAvisosWhatsapp<{ total_destinatarios: number; total_sem_telefone: number }>("criar_envio", {
      mensagem: mensagemEnvio,
      destino_tipo: enviarAlvo?.turma_id ? "turma" : "todos",
      turma_id: enviarAlvo?.turma_id ?? undefined,
      personas: personasParaEnviar(persona),
    }, escolaAtivaId),
    onSuccess: (r) => {
      toast.success(`Envio iniciado para ${r.total_destinatarios} destinatário(s)${r.total_sem_telefone ? ` (${r.total_sem_telefone} sem telefone cadastrado, não recebem)` : ""}.`);
      setEnviarAlvo(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (l: LinkCompra) => {
    setEditing(l);
    setForm({
      titulo: l.titulo,
      url: l.url,
      tipo: l.tipo,
      turma_id: l.turma_id ?? TODA_ESCOLA,
      ativo: l.ativo,
    });
    setOpen(true);
  };

  const nomeTurma = (id: string | null) => {
    if (!id) return "Toda a escola";
    const t = turmas?.find((x) => x.id === id);
    return t ? `${t.nome} (${t.ano_letivo})` : "Turma";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-7 w-7 text-primary" /> Links de compra
          </h1>
          <p className="text-muted-foreground">
            Links de material escolar e uniforme que aparecem na aba Escola do app dos responsáveis.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <Button onClick={() => { reset(); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo link
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar link" : "Novo link"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex.: Lista de material 2027"
                />
              </div>
              <div>
                <Label>Link (URL)</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Tipo })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vale para</Label>
                  <Select value={form.turma_id} onValueChange={(v) => setForm({ ...form, turma_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODA_ESCOLA}>Toda a escola</SelectItem>
                      {turmas?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: !!v })} />
                Visível para os responsáveis
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={!form.titulo || !form.url}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Links cadastrados</CardTitle>
          <CardDescription>Os pais veem isso na aba Escola do app, filtrado pela turma do filho.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !links?.length ? (
            <p className="text-muted-foreground">Nenhum link cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vale para</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <a href={l.url} target="_blank" rel="noreferrer" className="underline">{l.titulo}</a>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{TIPOS.find((t) => t.value === l.tipo)?.label ?? l.tipo}</Badge></TableCell>
                    <TableCell>{nomeTurma(l.turma_id)}</TableCell>
                    <TableCell>{l.ativo ? <Badge variant="default">Ativo</Badge> : <Badge variant="outline">Oculto</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title="Enviar por WhatsApp" onClick={() => abrirEnvio(l)}><MessageCircle className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(l)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!enviarAlvo} onOpenChange={(o) => { if (!o) setEnviarAlvo(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar por WhatsApp</AlertDialogTitle>
            <AlertDialogDescription>
              Vai para {nomeTurma(enviarAlvo?.turma_id ?? null) === "Toda a escola" ? "todos os alunos ativos da escola" : `todos os alunos ativos da turma "${nomeTurma(enviarAlvo?.turma_id ?? null)}"`}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {statusWhatsapp && !conectado && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                O WhatsApp desta escola não está conectado. Conecte na tela "Avisos por WhatsApp" antes de enviar.
              </p>
            )}

            <div className="space-y-2">
              <Label>Quem recebe</Label>
              <RadioGroup value={persona} onValueChange={(v) => setPersona(v as Persona)} className="flex flex-wrap gap-4">
                {PERSONAS.map((p) => (
                  <div key={p.value} className="flex items-center gap-2">
                    <RadioGroupItem value={p.value} id={`envio-persona-${p.value}`} />
                    <Label htmlFor={`envio-persona-${p.value}`} className="font-normal">{p.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea rows={3} value={mensagemEnvio} onChange={(e) => setMensagemEnvio(e.target.value)} />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!mensagemEnvio.trim() || !conectado || enviarMut.isPending}
              onClick={(e) => { e.preventDefault(); enviarMut.mutate(); }}
            >
              {enviarMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
