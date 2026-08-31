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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GraduationCap, Upload, User } from "lucide-react";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

type Professor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  foto_url: string | null;
  formacao: string | null;
  disciplinas: string[];
  data_admissao: string | null;
  observacoes: string | null;
  ativo: boolean;
  tipo_contratacao: string;
  cnpj: string | null;
  razao_social: string | null;
  banco_codigo: string | null;
  banco_nome: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  chave_pix: string | null;
  valor_mensal: number | null;
  dia_pagamento: number | null;
};

const emptyForm = {
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  rg: "",
  data_nascimento: "",
  endereco: "",
  foto_url: "",
  formacao: "",
  disciplinas: "",
  data_admissao: "",
  observacoes: "",
  ativo: true,
  tipo_contratacao: "CLT",
  cnpj: "",
  razao_social: "",
  banco_codigo: "",
  banco_nome: "",
  agencia: "",
  conta: "",
  tipo_conta: "Corrente",
  chave_pix: "",
  valor_mensal: "",
  dia_pagamento: "5",
};

export default function Professores() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [novoId, setNovoId] = useState<string>("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["professores", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("professores").select("*").eq("escola_id", escolaAtivaId!).order("nome");
      if (error) throw error;
      return data as Professor[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setNovoId(crypto.randomUUID());
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Professor) => {
    setEditing(p);
    setNovoId(p.id);
    setForm({
      nome: p.nome,
      email: p.email ?? "",
      telefone: p.telefone ?? "",
      cpf: p.cpf ?? "",
      rg: p.rg ?? "",
      data_nascimento: p.data_nascimento ?? "",
      endereco: p.endereco ?? "",
      foto_url: p.foto_url ?? "",
      formacao: p.formacao ?? "",
      disciplinas: (p.disciplinas ?? []).join(", "),
      data_admissao: p.data_admissao ?? "",
      observacoes: p.observacoes ?? "",
      ativo: p.ativo,
      tipo_contratacao: p.tipo_contratacao ?? "CLT",
      cnpj: p.cnpj ?? "",
      razao_social: p.razao_social ?? "",
      banco_codigo: p.banco_codigo ?? "",
      banco_nome: p.banco_nome ?? "",
      agencia: p.agencia ?? "",
      conta: p.conta ?? "",
      tipo_conta: p.tipo_conta ?? "Corrente",
      chave_pix: p.chave_pix ?? "",
      valor_mensal: p.valor_mensal != null ? String(p.valor_mensal) : "",
      dia_pagamento: p.dia_pagamento != null ? String(p.dia_pagamento) : "5",
    });
    setOpen(true);
  };

  const enviarFoto = async (file: File) => {
    if (!escolaAtivaId || !novoId) return;
    setEnviandoFoto(true);
    const extensao = file.name.split(".").pop();
    const caminho = `${escolaAtivaId}/professores/${novoId}/foto.${extensao}`;
    const { error: erroUpload } = await supabase.storage.from("pessoas-fotos").upload(caminho, file, { upsert: true });
    if (erroUpload) {
      setEnviandoFoto(false);
      toast.error("Erro ao enviar foto: " + erroUpload.message);
      return;
    }
    const { data: urlPublica } = supabase.storage.from("pessoas-fotos").getPublicUrl(caminho);
    const urlComVersao = `${urlPublica.publicUrl}?v=${Date.now()}`;
    setForm((f) => ({ ...f, foto_url: urlComVersao }));
    setEnviandoFoto(false);
    toast.success("Foto enviada! Clique em Salvar para confirmar.");
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        email: form.email || null,
        telefone: form.telefone || null,
        cpf: form.cpf || null,
        rg: form.rg || null,
        data_nascimento: form.data_nascimento || null,
        endereco: form.endereco || null,
        foto_url: form.foto_url || null,
        formacao: form.formacao || null,
        disciplinas: form.disciplinas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        data_admissao: form.data_admissao || null,
        observacoes: form.observacoes || null,
        ativo: form.ativo,
        tipo_contratacao: form.tipo_contratacao,
        cnpj: form.tipo_contratacao === "PJ" ? (form.cnpj || null) : null,
        razao_social: form.tipo_contratacao === "PJ" ? (form.razao_social || null) : null,
        banco_codigo: form.banco_codigo || null,
        banco_nome: form.banco_nome || null,
        agencia: form.agencia || null,
        conta: form.conta || null,
        tipo_conta: form.tipo_conta || null,
        chave_pix: form.chave_pix || null,
        valor_mensal: form.tipo_contratacao === "PJ" && form.valor_mensal ? Number(form.valor_mensal) : null,
        dia_pagamento: form.tipo_contratacao === "PJ" && form.dia_pagamento ? Number(form.dia_pagamento) : null,
      };
      if (editing) {
        const { error } = await supabase.from("professores").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professores").insert({ ...payload, id: novoId, escola_id: escolaAtivaId });
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

  const isPJ = form.tipo_contratacao === "PJ";

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
                <TableHead>Contratação</TableHead>
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
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      {p.nome}
                    </div>
                  </TableCell>
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
                  <TableCell>
                    <Badge variant={p.tipo_contratacao === "PJ" ? "outline" : "secondary"}>
                      {p.tipo_contratacao}
                    </Badge>
                    {p.tipo_contratacao === "PJ" && p.valor_mensal && (
                      <div className="text-xs text-muted-foreground mt-1">
                        R$ {Number(p.valor_mensal).toFixed(2)}/mês
                      </div>
                    )}
                  </TableCell>
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar professor" : "Novo professor"}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4 pb-2">
            <div className="h-20 w-20 rounded-full border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {form.foto_url ? (
                <img src={form.foto_url} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label htmlFor="foto-professor" className="cursor-pointer inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted">
                <Upload className="h-4 w-4" /> {enviandoFoto ? "Enviando..." : "Enviar foto"}
              </Label>
              <input
                id="foto-professor"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={enviandoFoto}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) enviarFoto(file);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou WEBP</p>
            </div>
          </div>

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
              <Label>RG</Label>
              <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
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
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
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
          </div>

          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Contratação e dados financeiros</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Tipo de Contratação</Label>
                <Select value={form.tipo_contratacao} onValueChange={(v) => setForm({ ...form, tipo_contratacao: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT (folha de pagamento)</SelectItem>
                    <SelectItem value="PJ">Pessoa Jurídica (conta a pagar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isPJ && (
                <>
                  <div>
                    <Label>CNPJ</Label>
                    <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
                  </div>
                  <div>
                    <Label>Razão Social</Label>
                    <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
                  </div>
                  <div>
                    <Label>Valor Mensal (R$)</Label>
                    <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Dia de Pagamento</Label>
                    <Select value={form.dia_pagamento} onValueChange={(v) => setForm({ ...form, dia_pagamento: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[5, 10, 15, 20, 25].map((d) => (
                          <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="col-span-2 text-xs text-muted-foreground -mb-1">Dados bancários (para depósito/PIX)</div>
              <div>
                <Label>Banco</Label>
                <Input value={form.banco_nome} onChange={(e) => setForm({ ...form, banco_nome: e.target.value })} placeholder="Ex: Banco do Brasil" />
              </div>
              <div>
                <Label>Código do Banco</Label>
                <Input value={form.banco_codigo} onChange={(e) => setForm({ ...form, banco_codigo: e.target.value })} placeholder="Ex: 001" />
              </div>
              <div>
                <Label>Agência</Label>
                <Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} />
              </div>
              <div>
                <Label>Conta</Label>
                <Input value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} />
              </div>
              <div>
                <Label>Tipo de Conta</Label>
                <Select value={form.tipo_conta} onValueChange={(v) => setForm({ ...form, tipo_conta: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corrente">Corrente</SelectItem>
                    <SelectItem value="Poupança">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chave PIX</Label>
                <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} placeholder="CPF, e-mail, telefone ou aleatória" />
              </div>
            </div>
          </div>

          <div className="col-span-2 mt-3">
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2 mt-3">
            <Checkbox
              id="ativo"
              checked={form.ativo}
              onCheckedChange={(v) => setForm({ ...form, ativo: !!v })}
            />
            <Label htmlFor="ativo" className="cursor-pointer">
              Professor ativo
            </Label>
          </div>

          <DialogFooter className="mt-2">
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
