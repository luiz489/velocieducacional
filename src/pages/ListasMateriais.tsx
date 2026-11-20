import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ListChecks, MessageCircle, Loader2 } from "lucide-react";
import { chamarAvisosWhatsapp, personasParaEnviar, PERSONAS, type Persona } from "@/lib/avisosWhatsapp";

/** Monta a mensagem do WhatsApp a partir dos campos da lista, pulando os que estão vazios. */
function montarMensagemLista(l: ListaMateriais): string {
  const partes = [l.titulo];
  if (l.orientacoes) partes.push(l.orientacoes);
  partes.push("Itens:\n" + l.itens);
  if (l.material_didatico_texto) partes.push("Material didático: " + l.material_didatico_texto);
  if (l.material_didatico_url) partes.push(l.material_didatico_url);
  if (l.mochila_texto) partes.push("Mochila diária: " + l.mochila_texto);
  if (l.uniforme_texto) partes.push("Uniforme: " + l.uniforme_texto);
  return partes.join("\n\n");
}

type ListaMateriais = {
  id: string;
  turma_id: string;
  ano_letivo: number;
  titulo: string;
  orientacoes: string | null;
  itens: string;
  material_didatico_texto: string | null;
  material_didatico_url: string | null;
  mochila_texto: string | null;
  uniforme_texto: string | null;
  ativo: boolean;
};

const FORM_VAZIO = {
  turma_id: "",
  ano_letivo: new Date().getFullYear(),
  titulo: "",
  orientacoes: "",
  itens: "",
  material_didatico_texto: "",
  material_didatico_url: "",
  mochila_texto: "",
  uniforme_texto: "",
  ativo: true,
};

export default function ListasMateriais() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ListaMateriais | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const { data: turmas } = useQuery({
    queryKey: ["turmas_para_listas_materiais", escolaAtivaId],
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

  const { data: listas, isLoading } = useQuery({
    queryKey: ["listas_materiais", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listas_materiais")
        .select("*")
        .eq("escola_id", escolaAtivaId!)
        .order("ano_letivo", { ascending: false })
        .order("titulo");
      if (error) throw error;
      return data as ListaMateriais[];
    },
  });

  const reset = () => {
    setEditing(null);
    setForm(FORM_VAZIO);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        turma_id: form.turma_id,
        ano_letivo: form.ano_letivo,
        titulo: form.titulo,
        orientacoes: form.orientacoes || null,
        itens: form.itens,
        material_didatico_texto: form.material_didatico_texto || null,
        material_didatico_url: form.material_didatico_url || null,
        mochila_texto: form.mochila_texto || null,
        uniforme_texto: form.uniforme_texto || null,
        ativo: form.ativo,
      };
      if (editing) {
        const { error } = await supabase.from("listas_materiais").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("listas_materiais").insert({ ...payload, escola_id: escolaAtivaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Lista atualizada" : "Lista publicada");
      qc.invalidateQueries({ queryKey: ["listas_materiais"] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listas_materiais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lista removida");
      qc.invalidateQueries({ queryKey: ["listas_materiais"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (l: ListaMateriais) => {
    setEditing(l);
    setForm({
      turma_id: l.turma_id,
      ano_letivo: l.ano_letivo,
      titulo: l.titulo,
      orientacoes: l.orientacoes ?? "",
      itens: l.itens,
      material_didatico_texto: l.material_didatico_texto ?? "",
      material_didatico_url: l.material_didatico_url ?? "",
      mochila_texto: l.mochila_texto ?? "",
      uniforme_texto: l.uniforme_texto ?? "",
      ativo: l.ativo,
    });
    setOpen(true);
  };

  const nomeTurma = (id: string) => {
    const t = turmas?.find((x) => x.id === id);
    return t ? `${t.nome} (${t.ano_letivo})` : "Turma";
  };

  // --- Enviar por WhatsApp ---
  const [enviarAlvo, setEnviarAlvo] = useState<ListaMateriais | null>(null);
  const [persona, setPersona] = useState<Persona>("responsavel");
  const [mensagemEnvio, setMensagemEnvio] = useState("");

  const abrirEnvio = (l: ListaMateriais) => {
    setEnviarAlvo(l);
    setPersona("responsavel");
    setMensagemEnvio(montarMensagemLista(l));
  };

  const { data: statusWhatsapp } = useQuery({
    queryKey: ["listas-materiais-whatsapp-status", escolaAtivaId],
    enabled: !!escolaAtivaId && !!enviarAlvo,
    queryFn: () => chamarAvisosWhatsapp<{ habilitado: boolean; status?: string }>("status", {}, escolaAtivaId),
  });
  const conectado = statusWhatsapp?.habilitado && statusWhatsapp.status === "WORKING";

  const enviarMut = useMutation({
    mutationFn: () => chamarAvisosWhatsapp<{ total_destinatarios: number; total_sem_telefone: number }>("criar_envio", {
      mensagem: mensagemEnvio,
      destino_tipo: "turma",
      turma_id: enviarAlvo?.turma_id,
      personas: personasParaEnviar(persona),
    }, escolaAtivaId),
    onSuccess: (r) => {
      toast.success(`Envio iniciado para ${r.total_destinatarios} destinatário(s)${r.total_sem_telefone ? ` (${r.total_sem_telefone} sem telefone cadastrado, não recebem)` : ""}.`);
      setEnviarAlvo(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ListChecks className="h-7 w-7 text-primary" /> Listas de materiais
          </h1>
          <p className="text-muted-foreground">
            Lista de material escolar, material didático e uniforme por turma, exibida no app dos responsáveis.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <Button onClick={() => { reset(); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova lista
          </Button>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar lista" : "Nova lista"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Turma</Label>
                  <Select value={form.turma_id} onValueChange={(v) => setForm({ ...form, turma_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                    <SelectContent>
                      {turmas?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano letivo</Label>
                  <Input
                    type="number"
                    value={form.ano_letivo}
                    onChange={(e) => setForm({ ...form, ano_letivo: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Título</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex.: 1º Ano"
                />
              </div>
              <div>
                <Label>Orientações (datas, onde entregar)</Label>
                <Textarea
                  rows={2}
                  value={form.orientacoes}
                  onChange={(e) => setForm({ ...form, orientacoes: e.target.value })}
                />
              </div>
              <div>
                <Label>Itens (um por linha)</Label>
                <Textarea
                  rows={10}
                  value={form.itens}
                  onChange={(e) => setForm({ ...form, itens: e.target.value })}
                  placeholder={"2 Cadernos (96 folhas) capa dura\n1 Régua de 30 cm\n..."}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Material didático (texto)</Label>
                  <Textarea
                    rows={2}
                    value={form.material_didatico_texto}
                    onChange={(e) => setForm({ ...form, material_didatico_texto: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Material didático (link, opcional)</Label>
                  <Input
                    value={form.material_didatico_url}
                    onChange={(e) => setForm({ ...form, material_didatico_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <Label>Mochila diária (texto)</Label>
                <Textarea
                  rows={2}
                  value={form.mochila_texto}
                  onChange={(e) => setForm({ ...form, mochila_texto: e.target.value })}
                />
              </div>
              <div>
                <Label>Uniforme (texto)</Label>
                <Textarea
                  rows={2}
                  value={form.uniforme_texto}
                  onChange={(e) => setForm({ ...form, uniforme_texto: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: !!v })} />
                Visível para os responsáveis
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={!form.turma_id || !form.titulo || !form.itens}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listas cadastradas</CardTitle>
          <CardDescription>Os pais veem isso na aba Escola do app, conforme a turma atual do filho.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !listas?.length ? (
            <p className="text-muted-foreground">Nenhuma lista cadastrada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.titulo}</TableCell>
                    <TableCell>{nomeTurma(l.turma_id)}</TableCell>
                    <TableCell>{l.ano_letivo}</TableCell>
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
              Vai para todos os alunos ativos da turma "{enviarAlvo ? nomeTurma(enviarAlvo.turma_id) : ""}".
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
              <Textarea rows={8} value={mensagemEnvio} onChange={(e) => setMensagemEnvio(e.target.value)} />
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
