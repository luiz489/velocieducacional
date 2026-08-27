import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mascaraCPF } from "@/lib/masks";

export type AlunoCamposDefaultValues = {
  nome?: string;
  cpf?: string;
  data_nascimento?: string;
  endereco?: string | null;
  responsavel_financeiro?: string;
  telefone_responsavel?: string | null;
  email_responsavel?: string | null;
  status?: string;
  ra_censo?: string | null;
  nome_pai?: string | null;
  nome_mae?: string | null;
  naturalidade_cidade?: string | null;
  naturalidade_uf?: string | null;
  cor_raca?: string | null;
  hora_entrada?: string | null;
  hora_saida?: string | null;
};

/**
 * Campos de cadastro de aluno, reutilizados tanto na tela de Alunos quanto
 * dentro do fluxo de Nova Matrícula (aba "Novo aluno"). Usa inputs não
 * controlados (name + defaultValue) para ser lido via FormData no <form>
 * que o envolve - não tem <form> nem botões próprios.
 */
export function AlunoCamposFieldset({ defaultValues }: { defaultValues?: AlunoCamposDefaultValues }) {
  const [cpf, setCpf] = useState(defaultValues?.cpf ? mascaraCPF(defaultValues.cpf) : "");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="nome">Nome Completo</Label>
          <Input id="nome" name="nome" placeholder="Nome do aluno" className="mt-1" defaultValue={defaultValues?.nome} required />
        </div>
        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" name="cpf" placeholder="000.000.000-00" className="mt-1" value={cpf} onChange={(e) => setCpf(mascaraCPF(e.target.value))} required />
        </div>
        <div>
          <Label htmlFor="nascimento">Data de Nascimento</Label>
          <Input id="nascimento" name="nascimento" type="date" className="mt-1" defaultValue={defaultValues?.data_nascimento} required />
        </div>
        <div className="col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" placeholder="Endereço completo" className="mt-1" defaultValue={defaultValues?.endereco || ""} />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select name="status" defaultValue={defaultValues?.status || "Ativo"} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Filiação e naturalidade</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nome_pai">Nome do Pai</Label>
            <Input id="nome_pai" name="nome_pai" className="mt-1" defaultValue={defaultValues?.nome_pai || ""} />
          </div>
          <div>
            <Label htmlFor="nome_mae">Nome da Mãe</Label>
            <Input id="nome_mae" name="nome_mae" className="mt-1" defaultValue={defaultValues?.nome_mae || ""} />
          </div>
          <div>
            <Label htmlFor="naturalidade_cidade">Cidade de Naturalidade</Label>
            <Input id="naturalidade_cidade" name="naturalidade_cidade" className="mt-1" defaultValue={defaultValues?.naturalidade_cidade || ""} />
          </div>
          <div>
            <Label htmlFor="naturalidade_uf">UF de Naturalidade</Label>
            <Input id="naturalidade_uf" name="naturalidade_uf" placeholder="SP" maxLength={2} className="mt-1" defaultValue={defaultValues?.naturalidade_uf || ""} />
          </div>
          <div>
            <Label htmlFor="cor_raca">Cor/Raça</Label>
            <select name="cor_raca" defaultValue={defaultValues?.cor_raca || ""} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
              <option value="">Não informado</option>
              <option value="Branca">Branca</option>
              <option value="Preta">Preta</option>
              <option value="Parda">Parda</option>
              <option value="Amarela">Amarela</option>
              <option value="Indígena">Indígena</option>
            </select>
          </div>
          <div>
            <Label htmlFor="ra_censo">RA (Censo Escolar)</Label>
            <Input id="ra_censo" name="ra_censo" placeholder="Código do INEP/Censo" className="mt-1" defaultValue={defaultValues?.ra_censo || ""} />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Horário (entrada/saída)</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hora_entrada">Hora de Entrada</Label>
            <Input id="hora_entrada" name="hora_entrada" type="time" className="mt-1" defaultValue={defaultValues?.hora_entrada || ""} />
          </div>
          <div>
            <Label htmlFor="hora_saida">Hora de Saída</Label>
            <Input id="hora_saida" name="hora_saida" type="time" className="mt-1" defaultValue={defaultValues?.hora_saida || ""} />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Responsável financeiro</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="responsavel">Nome do Responsável</Label>
            <Input id="responsavel" name="responsavel" placeholder="Nome do responsável" className="mt-1" defaultValue={defaultValues?.responsavel_financeiro} required />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" placeholder="(00) 00000-0000" className="mt-1" defaultValue={defaultValues?.telefone_responsavel || ""} />
          </div>
          <div>
            <Label htmlFor="email">E-mail Responsável</Label>
            <Input id="email" name="email" type="email" placeholder="email@exemplo.com" className="mt-1" defaultValue={defaultValues?.email_responsavel || ""} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lê os campos preenchidos no fieldset acima a partir de um FormData do form que o envolve. */
export function lerAlunoCamposDeFormData(fd: FormData) {
  return {
    nome: fd.get("nome") as string,
    cpf: fd.get("cpf") as string,
    data_nascimento: fd.get("nascimento") as string,
    endereco: (fd.get("endereco") as string) || null,
    responsavel_financeiro: fd.get("responsavel") as string,
    telefone_responsavel: (fd.get("telefone") as string) || null,
    email_responsavel: (fd.get("email") as string) || null,
    status: (fd.get("status") as string) || "Ativo",
    ra_censo: (fd.get("ra_censo") as string) || null,
    nome_pai: (fd.get("nome_pai") as string) || null,
    nome_mae: (fd.get("nome_mae") as string) || null,
    naturalidade_cidade: (fd.get("naturalidade_cidade") as string) || null,
    naturalidade_uf: (fd.get("naturalidade_uf") as string) || null,
    cor_raca: (fd.get("cor_raca") as string) || null,
    hora_entrada: (fd.get("hora_entrada") as string) || null,
    hora_saida: (fd.get("hora_saida") as string) || null,
  };
}
