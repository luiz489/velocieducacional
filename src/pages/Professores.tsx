import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

type Professor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  formacao: string | null;
  disciplinas: string[];
  data_admissao: string | null;
  observacoes: string | null;
  ativo: boolean;
};

const emptyForm = {
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  formacao: "",
  disciplinas: "",
  data_admissao: "",
  observacoes: "",
  ativo: true,
};

export default function Professores() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["professores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professores").select("*").order("nome");
      if (error) throw error;
      return data as Professor[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Professor) => {
    setEditing(p);
    setForm({
      nome: p.nome,
      email: p.email ?? "",
      telefone: p.telefone ?? "",
      cpf: p.cpf ?? "",
      formacao: p.formacao ?? "",
      disciplinas: (p.disciplinas ?? []).join(", "),
      data_admissao: p.data_admissao ?? "",
      observacoes: p.observacoes ?? "",
      ativo: p.ativo,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        email: form.email || null,
        telefone: form.telefone || null,
        cpf: form.cpf || null,
        formacao: form.formacao || null,
        disciplinas: form.disciplinas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        data_admissao: form.data_admissao || null,
        observacoes: form.observacoes || null,
        ativo: form.ativo,
      };
      if (editing) {
        const { error } = await supabase.from("professores").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professores").insert({ ...payload, escola_id: escolaAtivaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Professor atualizado" : "Professor cadastrado");
      qc.invalidateQueries({ queryKey: ["professores"] });
      qc.invalidateQueries({ queryKey: ["professores-ativos"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("professores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Professor removido");
      qc.invalidateQueries({ queryKey: ["professores"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" /> Professores
          </h1>
          <p className="text-muted-foreground">
            Cadastre os docentes para vincular em horários, disciplinas e demais módulos.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo professor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Disciplinas</TableHead>
                <TableHead>Formação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[110px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !data?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum professor cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.email && <div>{p.email}</div>}
                    {p.telefone && <div>{p.telefone}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.disciplinas?.map((d) => (
                        <Badge key={d} variant="secondary">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.formacao}</TableCell>
                  <TableCell>
                    <Badge variant={p.ativo ? "default" : "outline"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Remover ${p.nome}?`)) remove.mutate(p.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar professor" : "Novo professor"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome completo *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </div>
            <div>
              <Label>Data de admissão</Label>
              <Input
                type="date"
                value={form.data_admissao}
                onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Formação</Label>
              <Input value={form.formacao} onChange={(e) => setForm({ ...form, formacao: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Disciplinas (separadas por vírgula)</Label>
              <Input
                placeholder="Matemática, Física"
                value={form.disciplinas}
                onChange={(e) => setForm({ ...form, disciplinas: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: !!v })}
              />
              <Label htmlFor="ativo" className="cursor-pointer">
                Professor ativo
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={!form.nome || save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
