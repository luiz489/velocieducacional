import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mascaraCPF } from "@/lib/masks";
import { useCepLookup, mascaraCEP } from "@/hooks/useCepLookup";

export type AlunoCamposDefaultValues = {
  nome?: string;
  cpf?: string;
  data_nascimento?: string;
  endereco?: string | null;
  responsavel_financeiro?: string;
  responsavel_cpf?: string | null;
  responsavel_rg?: string | null;
  responsavel_rg_orgao_emissor?: string | null;
  responsavel_rg_data_emissao?: string | null;
  responsavel_data_nascimento?: string | null;
  responsavel_estado_civil?: string | null;
  responsavel_conjuge?: string | null;
  responsavel_bairro?: string | null;
  responsavel_cidade?: string | null;
  responsavel_uf?: string | null;
  responsavel_cep?: string | null;
  responsavel_naturalidade_cidade?: string | null;
  responsavel_naturalidade_uf?: string | null;
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
  const [responsavelCpf, setResponsavelCpf] = useState(
    defaultValues?.responsavel_cpf ? mascaraCPF(defaultValues.responsavel_cpf) : ""
  );
  const [responsavelCep, setResponsavelCep] = useState(defaultValues?.responsavel_cep || "");
  const { buscarCep, buscando: buscandoCep } = useCepLookup();
  const enderecoRef = useRef<HTMLInputElement>(null);
  const bairroRef = useRef<HTMLInputElement>(null);
  const cidadeRef = useRef<HTMLInputElement>(null);
  const ufRef = useRef<HTMLInputElement>(null);

  const handleCepBlur = async () => {
    const resultado = await buscarCep(responsavelCep);
    if (!resultado) return;
    if (enderecoRef.current && !enderecoRef.current.value) enderecoRef.current.value = resultado.logradouro;
    if (bairroRef.current) bairroRef.current.value = resultado.bairro;
    if (cidadeRef.current) cidadeRef.current.value = resultado.cidade;
    if (ufRef.current) ufRef.current.value = resultado.uf;
  };

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
          <Input id="endereco" name="endereco" placeholder="Endereço completo" className="mt-1" defaultValue={defaultValues?.endereco || ""} ref={enderecoRef} />
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

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Dados completos do responsável (para contratos)</p>
        <p className="text-xs text-muted-foreground -mt-2 mb-3">
          Usados para gerar contratos e declarações completos automaticamente. Opcionais, mas recomendados.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="responsavel_cpf">CPF do Responsável</Label>
            <Input
              id="responsavel_cpf" name="responsavel_cpf" placeholder="000.000.000-00" className="mt-1"
              value={responsavelCpf} onChange={(e) => setResponsavelCpf(mascaraCPF(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="responsavel_rg">RG do Responsável</Label>
            <Input id="responsavel_rg" name="responsavel_rg" className="mt-1" defaultValue={defaultValues?.responsavel_rg || ""} />
          </div>
          <div>
            <Label htmlFor="responsavel_rg_orgao_emissor">Órgão Emissor do RG</Label>
            <Input id="responsavel_rg_orgao_emissor" name="responsavel_rg_orgao_emissor" placeholder="Ex: SSP-SP" className="mt-1" defaultValue={defaultValues?.responsavel_rg_orgao_emissor || ""} />
          </div>
          <div>
            <Label htmlFor="responsavel_rg_data_emissao">Data de Emissão do RG</Label>
            <Input id="responsavel_rg_data_emissao" name="responsavel_rg_data_emissao" type="date" className="mt-1" defaultValue={defaultValues?.responsavel_rg_data_emissao || ""} />
          </div>
          <div>
            <Label htmlFor="responsavel_data_nascimento">Data de Nascimento</Label>
            <Input id="responsavel_data_nascimento" name="responsavel_data_nascimento" type="date" className="mt-1" defaultValue={defaultValues?.responsavel_data_nascimento || ""} />
          </div>
          <div>
            <Label htmlFor="responsavel_estado_civil">Estado Civil</Label>
            <select name="responsavel_estado_civil" defaultValue={defaultValues?.responsavel_estado_civil || ""} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
              <option value="">Não informado</option>
              <option value="Solteiro(a)">Solteiro(a)</option>
              <option value="Casado(a)">Casado(a)</option>
              <option value="Divorciado(a)">Divorciado(a)</option>
              <option value="Viúvo(a)">Viúvo(a)</option>
              <option value="União Estável">União Estável</option>
            </select>
          </div>
          <div>
            <Label htmlFor="responsavel_conjuge">Nome do Cônjuge</Label>
            <Input id="responsavel_conjuge" name="responsavel_conjuge" className="mt-1" defaultValue={defaultValues?.responsavel_conjuge || ""} />
          </div>
          <div>
            <Label htmlFor="responsavel_cep">CEP</Label>
            <Input
              id="responsavel_cep" name="responsavel_cep" placeholder="00000-000" className="mt-1"
              value={responsavelCep}
              onChange={(e) => setResponsavelCep(mascaraCEP(e.target.value))}
              onBlur={handleCepBlur}
            />
            {buscandoCep && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
          </div>
          <div>
            <Label htmlFor="responsavel_bairro">Bairro</Label>
            <Input id="responsavel_bairro" name="responsavel_bairro" className="mt-1" defaultValue={defaultValues?.responsavel_bairro || ""} ref={bairroRef} />
          </div>
          <div>
            <Label htmlFor="responsavel_cidade">Cidade</Label>
            <Input id="responsavel_cidade" name="responsavel_cidade" className="mt-1" defaultValue={defaultValues?.responsavel_cidade || ""} ref={cidadeRef} />
          </div>
          <div>
            <Label htmlFor="responsavel_uf">UF</Label>
            <Input id="responsavel_uf" name="responsavel_uf" placeholder="SP" maxLength={2} className="mt-1" defaultValue={defaultValues?.responsavel_uf || ""} ref={ufRef} />
          </div>
          <div>
            <Label htmlFor="responsavel_naturalidade_cidade">Naturalidade (Cidade)</Label>
            <Input id="responsavel_naturalidade_cidade" name="responsavel_naturalidade_cidade" className="mt-1" defaultValue={defaultValues?.responsavel_naturalidade_cidade || ""} />
          </div>
          <div>
            <Label htmlFor="responsavel_naturalidade_uf">Naturalidade (UF)</Label>
            <Input id="responsavel_naturalidade_uf" name="responsavel_naturalidade_uf" placeholder="SP" maxLength={2} className="mt-1" defaultValue={defaultValues?.responsavel_naturalidade_uf || ""} />
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
    responsavel_cpf: (fd.get("responsavel_cpf") as string) || null,
    responsavel_rg: (fd.get("responsavel_rg") as string) || null,
    responsavel_rg_orgao_emissor: (fd.get("responsavel_rg_orgao_emissor") as string) || null,
    responsavel_rg_data_emissao: (fd.get("responsavel_rg_data_emissao") as string) || null,
    responsavel_data_nascimento: (fd.get("responsavel_data_nascimento") as string) || null,
    responsavel_estado_civil: (fd.get("responsavel_estado_civil") as string) || null,
    responsavel_conjuge: (fd.get("responsavel_conjuge") as string) || null,
    responsavel_bairro: (fd.get("responsavel_bairro") as string) || null,
    responsavel_cidade: (fd.get("responsavel_cidade") as string) || null,
    responsavel_uf: (fd.get("responsavel_uf") as string) || null,
    responsavel_cep: (fd.get("responsavel_cep") as string) || null,
    responsavel_naturalidade_cidade: (fd.get("responsavel_naturalidade_cidade") as string) || null,
    responsavel_naturalidade_uf: (fd.get("responsavel_naturalidade_uf") as string) || null,
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
