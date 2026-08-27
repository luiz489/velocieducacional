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
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

type Funcionario = {
  id: string;
  nome: string;
  cpf: string;
  rg: string | null;
  rg_orgao_emissor: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  estado_civil: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  naturalidade_cidade: string | null;
  naturalidade_uf: string | null;
  cor_raca: string | null;
  grau_instrucao: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  pis_pasep: string | null;
  ctps_numero: string | null;
  ctps_serie: string | null;
  categoria_esocial: string;
  cargo: string;
  funcao: string | null;
  codigo_cbo: string | null;
  departamento: string | null;
  data_inicio_funcao: string | null;
  tipo_contrato: string;
  data_admissao: string;
  jornada_semanal_horas: number | null;
  horario_trabalho: string | null;
  salario_base: number;
  data_vigencia_salario: string | null;
  dia_pagamento: number | null;
  vale_transporte: number | null;
  vale_refeicao: number | null;
  plano_saude: number | null;
  banco_codigo: string | null;
  banco_nome: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  chave_pix: string | null;
  ativo: boolean;
  observacoes: string | null;
};

const emptyForm = {
  nome: "", cpf: "", rg: "", rg_orgao_emissor: "", data_nascimento: "", sexo: "",
  estado_civil: "", nome_mae: "", nome_pai: "", naturalidade_cidade: "", naturalidade_uf: "",
  cor_raca: "", grau_instrucao: "", endereco: "", telefone: "", email: "",
  pis_pasep: "", ctps_numero: "", ctps_serie: "", categoria_esocial: "CLT",
  cargo: "", funcao: "", codigo_cbo: "", departamento: "", data_inicio_funcao: "",
  tipo_contrato: "Indeterminado", data_admissao: "", jornada_semanal_horas: "44",
  horario_trabalho: "", salario_base: "", data_vigencia_salario: "", dia_pagamento: "5",
  vale_transporte: "0", vale_refeicao: "0", plano_saude: "0",
  banco_codigo: "", banco_nome: "", agencia: "", conta: "", tipo_conta: "Corrente", chave_pix: "",
  ativo: true, observacoes: "",
};

export default function Funcionarios() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Funcionario | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("funcionarios").select("*").order("nome");
      if (error) throw error;
      return data as Funcionario[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (f: Funcionario) => {
    setEditing(f);
    setForm({
      nome: f.nome, cpf: f.cpf, rg: f.rg ?? "", rg_orgao_emissor: f.rg_orgao_emissor ?? "",
      data_nascimento: f.data_nascimento ?? "", sexo: f.sexo ?? "", estado_civil: f.estado_civil ?? "",
      nome_mae: f.nome_mae ?? "", nome_pai: f.nome_pai ?? "",
      naturalidade_cidade: f.naturalidade_cidade ?? "", naturalidade_uf: f.naturalidade_uf ?? "",
      cor_raca: f.cor_raca ?? "", grau_instrucao: f.grau_instrucao ?? "",
      endereco: f.endereco ?? "", telefone: f.telefone ?? "", email: f.email ?? "",
      pis_pasep: f.pis_pasep ?? "", ctps_numero: f.ctps_numero ?? "", ctps_serie: f.ctps_serie ?? "",
      categoria_esocial: f.categoria_esocial, cargo: f.cargo, funcao: f.funcao ?? "",
      codigo_cbo: f.codigo_cbo ?? "", departamento: f.departamento ?? "",
      data_inicio_funcao: f.data_inicio_funcao ?? "", tipo_contrato: f.tipo_contrato,
      data_admissao: f.data_admissao, jornada_semanal_horas: f.jornada_semanal_horas != null ? String(f.jornada_semanal_horas) : "44",
      horario_trabalho: f.horario_trabalho ?? "", salario_base: String(f.salario_base),
      data_vigencia_salario: f.data_vigencia_salario ?? "", dia_pagamento: f.dia_pagamento != null ? String(f.dia_pagamento) : "5",
      vale_transporte: f.vale_transporte != null ? String(f.vale_transporte) : "0",
      vale_refeicao: f.vale_refeicao != null ? String(f.vale_refeicao) : "0",
      plano_saude: f.plano_saude != null ? String(f.plano_saude) : "0",
      banco_codigo: f.banco_codigo ?? "", banco_nome: f.banco_nome ?? "", agencia: f.agencia ?? "",
      conta: f.conta ?? "", tipo_conta: f.tipo_conta ?? "Corrente", chave_pix: f.chave_pix ?? "",
      ativo: f.ativo, observacoes: f.observacoes ?? "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        cpf: form.cpf,
        rg: form.rg || null,
        rg_orgao_emissor: form.rg_orgao_emissor || null,
        data_nascimento: form.data_nascimento || null,
        sexo: form.sexo || null,
        estado_civil: form.estado_civil || null,
        nome_mae: form.nome_mae || null,
        nome_pai: form.nome_pai || null,
        naturalidade_cidade: form.naturalidade_cidade || null,
        naturalidade_uf: form.naturalidade_uf || null,
        cor_raca: form.cor_raca || null,
        grau_instrucao: form.grau_instrucao || null,
        endereco: form.endereco || null,
        telefone: form.telefone || null,
        email: form.email || null,
        pis_pasep: form.pis_pasep || null,
        ctps_numero: form.ctps_numero || null,
        ctps_serie: form.ctps_serie || null,
        categoria_esocial: form.categoria_esocial,
        cargo: form.cargo,
        funcao: form.funcao || null,
        codigo_cbo: form.codigo_cbo || null,
        departamento: form.departamento || null,
        data_inicio_funcao: form.data_inicio_funcao || null,
        tipo_contrato: form.tipo_contrato,
        data_admissao: form.data_admissao,
        jornada_semanal_horas: form.jornada_semanal_horas ? Number(form.jornada_semanal_horas) : null,
        horario_trabalho: form.horario_trabalho || null,
        salario_base: Number(form.salario_base) || 0,
        data_vigencia_salario: form.data_vigencia_salario || null,
        dia_pagamento: form.dia_pagamento ? Number(form.dia_pagamento) : null,
        vale_transporte: Number(form.vale_transporte) || 0,
        vale_refeicao: Number(form.vale_refeicao) || 0,
        plano_saude: Number(form.plano_saude) || 0,
        banco_codigo: form.banco_codigo || null,
        banco_nome: form.banco_nome || null,
        agencia: form.agencia || null,
        conta: form.conta || null,
        tipo_conta: form.tipo_conta || null,
        chave_pix: form.chave_pix || null,
        ativo: form.ativo,
        observacoes: form.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from("funcionarios").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("funcionarios").insert({ ...payload, escola_id: escolaAtivaId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Funcionário atualizado" : "Funcionário cadastrado");
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
      setOpen(false);
    },
    onError: (e: any) => {
      if (e.code === "23505") toast.error("Já existe um funcionário com esse CPF nesta escola.");
      else toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funcionarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Funcionário removido");
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Funcionários (CLT)
          </h1>
          <p className="text-muted-foreground">
            Cadastro de funcionários com vínculo CLT, cargo, função e dados para folha simplificada.
          </p>
        </div>
        <Button onClick={openNew} disabled={!escolaAtivaId}>
          <Plus className="h-4 w-4 mr-2" /> Novo funcionário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead>Salário Base</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[110px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && !data?.length && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum funcionário cadastrado.</TableCell></TableRow>
              )}
              {data?.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    {f.nome}
                    <div className="text-xs text-muted-foreground">{f.cpf}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.cargo}
                    {f.funcao && <div className="text-xs text-muted-foreground">{f.funcao}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.departamento ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(f.data_admissao + "T12:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium">R$ {Number(f.salario_base).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={f.ativo ? "default" : "outline"}>{f.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(f)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { if (confirm(`Remover ${f.nome}?`)) remove.mutate(f.id); }}
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Dados pessoais</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome completo *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
              </div>
              <div>
                <Label>RG</Label>
                <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
              </div>
              <div>
                <Label>Órgão Emissor (RG)</Label>
                <Input value={form.rg_orgao_emissor} onChange={(e) => setForm({ ...form, rg_orgao_emissor: e.target.value })} />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
              </div>
              <div>
                <Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado Civil</Label>
                <Input value={form.estado_civil} onChange={(e) => setForm({ ...form, estado_civil: e.target.value })} />
              </div>
              <div>
                <Label>Cor/Raça</Label>
                <Select value={form.cor_raca} onValueChange={(v) => setForm({ ...form, cor_raca: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Branca">Branca</SelectItem>
                    <SelectItem value="Preta">Preta</SelectItem>
                    <SelectItem value="Parda">Parda</SelectItem>
                    <SelectItem value="Amarela">Amarela</SelectItem>
                    <SelectItem value="Indígena">Indígena</SelectItem>
                    <SelectItem value="Não declarada">Não declarada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome da Mãe</Label>
                <Input value={form.nome_mae} onChange={(e) => setForm({ ...form, nome_mae: e.target.value })} />
              </div>
              <div>
                <Label>Nome do Pai</Label>
                <Input value={form.nome_pai} onChange={(e) => setForm({ ...form, nome_pai: e.target.value })} />
              </div>
              <div>
                <Label>Naturalidade (Cidade)</Label>
                <Input value={form.naturalidade_cidade} onChange={(e) => setForm({ ...form, naturalidade_cidade: e.target.value })} />
              </div>
              <div>
                <Label>Naturalidade (UF)</Label>
                <Input value={form.naturalidade_uf} maxLength={2} onChange={(e) => setForm({ ...form, naturalidade_uf: e.target.value })} />
              </div>
              <div>
                <Label>Grau de Instrução</Label>
                <Input value={form.grau_instrucao} onChange={(e) => setForm({ ...form, grau_instrucao: e.target.value })} placeholder="Ex: Superior completo" />
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Documentos trabalhistas</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>PIS/PASEP</Label>
                  <Input value={form.pis_pasep} onChange={(e) => setForm({ ...form, pis_pasep: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria (eSocial)</Label>
                  <Select value={form.categoria_esocial} onValueChange={(v) => setForm({ ...form, categoria_esocial: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                      <SelectItem value="Estagiário">Estagiário</SelectItem>
                      <SelectItem value="Intermitente">Intermitente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CTPS - Número</Label>
                  <Input value={form.ctps_numero} onChange={(e) => setForm({ ...form, ctps_numero: e.target.value })} />
                </div>
                <div>
                  <Label>CTPS - Série</Label>
                  <Input value={form.ctps_serie} onChange={(e) => setForm({ ...form, ctps_serie: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Cargo e contratação</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cargo *</Label>
                  <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Ex: Secretária Escolar" />
                </div>
                <div>
                  <Label>Função</Label>
                  <Input value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} placeholder="Ex: Atendimento e matrículas" />
                </div>
                <div>
                  <Label>Código CBO</Label>
                  <Input value={form.codigo_cbo} onChange={(e) => setForm({ ...form, codigo_cbo: e.target.value })} placeholder="Ex: 4110-05" />
                </div>
                <div>
                  <Label>Departamento/Setor</Label>
                  <Input value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo de Contrato</Label>
                  <Select value={form.tipo_contrato} onValueChange={(v) => setForm({ ...form, tipo_contrato: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indeterminado">Prazo Indeterminado</SelectItem>
                      <SelectItem value="Determinado">Prazo Determinado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data de Admissão *</Label>
                  <Input type="date" value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} />
                </div>
                <div>
                  <Label>Data Início na Função</Label>
                  <Input type="date" value={form.data_inicio_funcao} onChange={(e) => setForm({ ...form, data_inicio_funcao: e.target.value })} />
                </div>
                <div>
                  <Label>Jornada Semanal (horas)</Label>
                  <Input type="number" value={form.jornada_semanal_horas} onChange={(e) => setForm({ ...form, jornada_semanal_horas: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Horário de Trabalho</Label>
                  <Input value={form.horario_trabalho} onChange={(e) => setForm({ ...form, horario_trabalho: e.target.value })} placeholder="Ex: 08:00 às 17:00, seg. a sex." />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Salário e benefícios</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Salário Base (R$) *</Label>
                  <Input type="number" step="0.01" value={form.salario_base} onChange={(e) => setForm({ ...form, salario_base: e.target.value })} />
                </div>
                <div>
                  <Label>Data de Vigência do Salário</Label>
                  <Input type="date" value={form.data_vigencia_salario} onChange={(e) => setForm({ ...form, data_vigencia_salario: e.target.value })} />
                </div>
                <div>
                  <Label>Dia de Pagamento</Label>
                  <Select value={form.dia_pagamento} onValueChange={(v) => setForm({ ...form, dia_pagamento: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20, 25].map((d) => <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vale Transporte (R$)</Label>
                  <Input type="number" step="0.01" value={form.vale_transporte} onChange={(e) => setForm({ ...form, vale_transporte: e.target.value })} />
                </div>
                <div>
                  <Label>Vale Refeição (R$)</Label>
                  <Input type="number" step="0.01" value={form.vale_refeicao} onChange={(e) => setForm({ ...form, vale_refeicao: e.target.value })} />
                </div>
                <div>
                  <Label>Plano de Saúde (R$)</Label>
                  <Input type="number" step="0.01" value={form.plano_saude} onChange={(e) => setForm({ ...form, plano_saude: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Dados bancários (para depósito/PIX)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Banco</Label>
                  <Input value={form.banco_nome} onChange={(e) => setForm({ ...form, banco_nome: e.target.value })} />
                </div>
                <div>
                  <Label>Código do Banco</Label>
                  <Input value={form.banco_codigo} onChange={(e) => setForm({ ...form, banco_codigo: e.target.value })} />
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
                  <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: !!v })} />
              <Label htmlFor="ativo" className="cursor-pointer">Funcionário ativo</Label>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!form.nome || !form.cpf || !form.cargo || !form.data_admissao || save.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
