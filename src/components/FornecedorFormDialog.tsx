import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useCepLookup, mascaraCEP } from "@/hooks/useCepLookup";
import { useCnpjLookup, mascaraCNPJ } from "@/hooks/useCnpjLookup";
import { mascaraCPF, mascaraTelefone } from "@/lib/masks";
import { DadosBancariosFields } from "@/components/DadosBancariosFields";
import { DADOS_BANCARIOS_VAZIO, dadosBancariosDe, dadosBancariosParaSalvar, validarDadosBancarios } from "@/lib/dadosBancarios";

/** Aplica máscara de CPF (até 11 dígitos) ou CNPJ (12-14 dígitos), conforme o tamanho digitado. */
function mascaraCnpjOuCpf(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length > 11 ? mascaraCNPJ(valor) : mascaraCPF(valor);
}
import { toast } from "sonner";

export type FornecedorCompleto = {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj_cpf: string | null;
  categoria: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  chave_pix: string | null;
  banco_codigo: string | null;
  agencia_dv: string | null;
  conta_dv: string | null;
  tipo_chave_pix: string | null;
  observacoes: string | null;
};

const emptyForm = {
  nome: "", razao_social: "", cnpj_cpf: "", categoria: "", telefone: "", email: "",
  cep: "", endereco: "", bairro: "", cidade: "", uf: "",
  ...DADOS_BANCARIOS_VAZIO, observacoes: "",
};

export function FornecedorFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: FornecedorCompleto | null;
  onSaved?: (fornecedor: { id: string; nome: string; categoria: string }) => void;
}) {
  const { escolaAtivaId } = useEscolaAtiva();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { buscarCep, buscando: buscandoCep } = useCepLookup();
  const { buscarCnpj, buscando: buscandoCnpj } = useCnpjLookup();

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              nome: editing.nome, razao_social: editing.razao_social ?? "", cnpj_cpf: editing.cnpj_cpf ?? "",
              categoria: editing.categoria ?? "", telefone: editing.telefone ?? "", email: editing.email ?? "",
              cep: editing.cep ?? "", endereco: editing.endereco ?? "", bairro: editing.bairro ?? "",
              cidade: editing.cidade ?? "", uf: editing.uf ?? "",
              ...dadosBancariosDe(editing),
              observacoes: editing.observacoes ?? "",
            }
          : emptyForm
      );
    }
  }, [open, editing]);

  const handleCepBlur = async () => {
    const resultado = await buscarCep(form.cep);
    if (!resultado) return;
    setForm((f) => ({
      ...f,
      endereco: f.endereco || resultado.logradouro,
      bairro: resultado.bairro,
      cidade: resultado.cidade,
      uf: resultado.uf,
    }));
  };

  const handleCnpjBlur = async () => {
    const digitos = form.cnpj_cpf.replace(/\D/g, "");
    if (digitos.length !== 14) return; // só busca se for CNPJ (14 dígitos) - CPF não tem consulta pública
    const { dados: resultado, erro } = await buscarCnpj(form.cnpj_cpf);
    if (erro) { toast.error(erro); return; }
    if (!resultado) return;
    setForm((f) => ({
      ...f,
      nome: f.nome || resultado.nomeFantasia || resultado.razaoSocial,
      razao_social: f.razao_social || resultado.razaoSocial,
      telefone: f.telefone || resultado.telefone,
      email: f.email || resultado.email,
      cep: f.cep || resultado.cep,
      endereco: f.endereco || resultado.logradouro,
      bairro: f.bairro || resultado.bairro,
      cidade: f.cidade || resultado.cidade,
      uf: f.uf || resultado.uf,
    }));
  };

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    const errosBanco = validarDadosBancarios(form);
    if (errosBanco.length) {
      toast.error(errosBanco[0]);
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      razao_social: form.razao_social || null,
      cnpj_cpf: form.cnpj_cpf || null,
      categoria: form.categoria || null,
      telefone: form.telefone || null,
      email: form.email || null,
      cep: form.cep || null,
      endereco: form.endereco || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      banco: form.banco_nome || null,
      ...dadosBancariosParaSalvar(form),
      observacoes: form.observacoes || null,
    };
    const query = editing
      ? supabase.from("fornecedores").update(payload).eq("id", editing.id).select("id, nome, categoria").single()
      : supabase.from("fornecedores").insert({ ...payload, escola_id: escolaAtivaId }).select("id, nome, categoria").single();
    const { data, error } = await query;
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(editing ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
    onOpenChange(false);
    if (data) onSaved?.({ id: data.id, nome: data.nome, categoria: data.categoria ?? "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Fornecedor" : "Cadastrar Fornecedor"}</DialogTitle>
          <DialogDescription>Pagamentos esporádicos (não recorrentes). Pra despesas recorrentes, use Gestão de Contratos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Dados básicos</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome Fantasia *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Razão Social</Label>
                <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
              </div>
              <div>
                <Label>CNPJ/CPF</Label>
                <Input
                  value={form.cnpj_cpf}
                  onChange={(e) => setForm({ ...form, cnpj_cpf: mascaraCnpjOuCpf(e.target.value) })}
                  onBlur={handleCnpjBlur}
                  placeholder="Digite o CNPJ pra preencher os dados automaticamente"
                />
                {buscandoCnpj && <p className="text-xs text-muted-foreground mt-1">Buscando dados na Receita Federal...</p>}
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Material, Serviço" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Endereço</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CEP</Label>
                <Input
                  value={form.cep} placeholder="00000-000"
                  onChange={(e) => setForm({ ...form, cep: mascaraCEP(e.target.value) })}
                  onBlur={handleCepBlur}
                />
                {buscandoCep && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={form.uf} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <DadosBancariosFields
              value={dadosBancariosDe(form)}
              onChange={(patch) => setForm({ ...form, ...patch })}
              descricao="Usados para gerar o pagamento a este fornecedor por arquivo bancário ou Pix."
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>

          <Button onClick={salvar} disabled={saving} className="w-full">
            {saving ? "Salvando…" : editing ? "Salvar Alterações" : "Cadastrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
