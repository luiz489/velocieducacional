import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mascaraCPF, mascaraTelefone } from "@/lib/masks";
import { useCepLookup, mascaraCEP } from "@/hooks/useCepLookup";
import { useCidadesPorUf } from "@/hooks/useCidadesPorUf";
import { ESTADOS } from "@/lib/cidadesSP";

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
  responsavel_nacionalidade?: string | null;
  responsavel_nome_pai?: string | null;
  responsavel_nome_mae?: string | null;
  telefone_responsavel?: string | null;
  email_responsavel?: string | null;
  status?: string;
  ra_censo?: string | null;
  nome_pai?: string | null;
  nome_mae?: string | null;
  telefone_pai?: string | null;
  telefone_mae?: string | null;
  naturalidade_cidade?: string | null;
  naturalidade_uf?: string | null;
  cor_raca?: string | null;
  hora_entrada?: string | null;
  hora_saida?: string | null;
};

/**
 * Chaves dos campos/seções opcionais que a escola pode esconder no formulário
 * de "novo aluno" de Nova Matrícula (Configurações → Parâmetros → Campos da
 * Matrícula). Nome, CPF, nascimento e nome do responsável são sempre
 * obrigatórios e não aparecem aqui.
 */
export const CAMPOS_MATRICULA_CONFIGURAVEIS = [
  { chave: "responsavel_endereco", rotulo: "Endereço (CEP, bairro, cidade, UF, rua)" },
  { chave: "status", rotulo: "Status (Ativo/Inativo)" },
  { chave: "filiacao", rotulo: "Nome e telefone do pai e da mãe" },
  { chave: "naturalidade", rotulo: "Naturalidade do aluno" },
  { chave: "cor_raca", rotulo: "Cor/Raça" },
  { chave: "ra_censo", rotulo: "RA (Censo Escolar)" },
  { chave: "horario", rotulo: "Horário de entrada/saída" },
  { chave: "responsavel_telefone_email", rotulo: "Telefone e e-mail do responsável" },
  { chave: "responsavel_documentos", rotulo: "CPF e RG do responsável" },
  { chave: "responsavel_estado_civil", rotulo: "Estado civil e cônjuge do responsável" },
  { chave: "responsavel_naturalidade", rotulo: "Naturalidade do responsável" },
] as const;

export type CamposVisiveis = Record<string, boolean>;

/** true se a chave não estiver presente na config (padrão = visível) */
function visivel(config: CamposVisiveis | undefined, chave: string): boolean {
  if (!config) return true;
  return config[chave] !== false;
}

/** Par de campos UF + Cidade: UF é uma lista fixa dos 27 estados; a Cidade
 * é buscada dinamicamente (API do IBGE) conforme a UF escolhida. */
function CampoUfCidade({
  labelCidade, labelUf, nomeCidade, nomeUf, ufInicial, cidadeInicial,
}: {
  labelCidade: string; labelUf: string; nomeCidade: string; nomeUf: string;
  ufInicial?: string | null; cidadeInicial?: string | null;
}) {
  const [uf, setUf] = useState(ufInicial ?? "");
  const [cidade, setCidade] = useState(cidadeInicial ?? "");
  const { data: cidades, isLoading: carregandoCidades } = useCidadesPorUf(uf);

  useEffect(() => {
    // Se trocar de UF e a cidade atual não pertencer mais a ela, limpa a escolha
    if (cidades && cidade && !cidades.includes(cidade)) setCidade("");
  }, [cidades]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div>
        <Label>{labelUf}</Label>
        <Select value={uf} onValueChange={setUf}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => <SelectItem key={e.uf} value={e.uf}>{e.uf} - {e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <input type="hidden" name={nomeUf} value={uf} />
      </div>
      <div>
        <Label>{labelCidade}</Label>
        <Select value={cidade} onValueChange={setCidade} disabled={!uf}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={!uf ? "Escolha a UF primeiro" : carregandoCidades ? "Carregando..." : "Selecione"} />
          </SelectTrigger>
          <SelectContent>
            {cidades?.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <input type="hidden" name={nomeCidade} value={cidade} />
      </div>
    </>
  );
}

/**
 * Campos de cadastro de aluno, reutilizados tanto na tela de Alunos quanto
 * dentro do fluxo de Nova Matrícula (aba "Novo aluno"). Usa inputs não
 * controlados (name + defaultValue) para ser lido via FormData no <form>
 * que o envolve - não tem <form> nem botões próprios.
 *
 * `camposVisiveis`: quando informado (ex: dentro de Nova Matrícula), esconde
 * os campos/seções que a escola configurou como ocultos em Configurações →
 * Parâmetros. Quando omitido (ex: tela de Alunos), mostra tudo.
 */
export function AlunoCamposFieldset({
  defaultValues,
  camposVisiveis,
}: {
  defaultValues?: AlunoCamposDefaultValues;
  camposVisiveis?: CamposVisiveis;
}) {
  const [cpf, setCpf] = useState(defaultValues?.cpf ? mascaraCPF(defaultValues.cpf) : "");
  const [responsavelCpf, setResponsavelCpf] = useState(
    defaultValues?.responsavel_cpf ? mascaraCPF(defaultValues.responsavel_cpf) : ""
  );
  const [cep, setCep] = useState(defaultValues?.responsavel_cep || "");
  const { buscarCep, buscando: buscandoCep } = useCepLookup();
  const enderecoRef = useRef<HTMLInputElement>(null);
  const bairroRef = useRef<HTMLInputElement>(null);

  const handleCepBlur = async () => {
    const resultado = await buscarCep(cep);
    if (!resultado) return;
    if (enderecoRef.current && !enderecoRef.current.value) enderecoRef.current.value = resultado.logradouro;
    if (bairroRef.current) bairroRef.current.value = resultado.bairro;
  };

  // Telefones (com máscara)
  const [telefonePai, setTelefonePai] = useState(defaultValues?.telefone_pai ? mascaraTelefone(defaultValues.telefone_pai) : "");
  const [telefoneMae, setTelefoneMae] = useState(defaultValues?.telefone_mae ? mascaraTelefone(defaultValues.telefone_mae) : "");
  const [telefoneResp, setTelefoneResp] = useState(defaultValues?.telefone_responsavel ? mascaraTelefone(defaultValues.telefone_responsavel) : "");

  // Nome do pai/mãe (precisam ser controlados pra alimentar o "copiar dados do pai")
  const [nomePai, setNomePai] = useState(defaultValues?.nome_pai ?? "");
  const [nomeMae, setNomeMae] = useState(defaultValues?.nome_mae ?? "");
  const [nomeResponsavel, setNomeResponsavel] = useState(defaultValues?.responsavel_financeiro ?? "");
  const [respEhPai, setRespEhPai] = useState(false);

  const handleRespEhPaiChange = (marcado: boolean) => {
    setRespEhPai(marcado);
    if (marcado) {
      setNomeResponsavel(nomePai);
      setTelefoneResp(telefonePai);
    }
  };

  const mostrarStatus = visivel(camposVisiveis, "status");
  const mostrarFiliacao = visivel(camposVisiveis, "filiacao");
  const mostrarNaturalidade = visivel(camposVisiveis, "naturalidade");
  const mostrarCorRaca = visivel(camposVisiveis, "cor_raca");
  const mostrarRaCenso = visivel(camposVisiveis, "ra_censo");
  const mostrarHorario = visivel(camposVisiveis, "horario");
  const mostrarEndereco = visivel(camposVisiveis, "responsavel_endereco");
  const mostrarRespTelefoneEmail = visivel(camposVisiveis, "responsavel_telefone_email");
  const mostrarRespDocumentos = visivel(camposVisiveis, "responsavel_documentos");
  const mostrarRespEstadoCivil = visivel(camposVisiveis, "responsavel_estado_civil");
  const mostrarRespNaturalidade = visivel(camposVisiveis, "responsavel_naturalidade");

  const mostraSecaoFiliacaoNaturalidade = mostrarFiliacao || mostrarNaturalidade || mostrarCorRaca || mostrarRaCenso;
  // Nacionalidade e pais do responsável sempre aparecem nesta seção, então ela
  // nunca fica completamente escondida, mesmo se documentos/estado civil/
  // naturalidade estiverem todos desativados.
  const mostraSecaoRespDetalhes = true;

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

        {mostrarEndereco && (
          <>
            <div className="col-span-2">
              <Label htmlFor="responsavel_cep">CEP</Label>
              <Input
                id="responsavel_cep" name="responsavel_cep" placeholder="00000-000" className="mt-1 max-w-[200px]"
                value={cep}
                onChange={(e) => setCep(mascaraCEP(e.target.value))}
                onBlur={handleCepBlur}
              />
              {buscandoCep && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
            </div>
            <div className="col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" placeholder="Rua, número" className="mt-1" defaultValue={defaultValues?.endereco || ""} ref={enderecoRef} />
            </div>
            <div>
              <Label htmlFor="responsavel_bairro">Bairro</Label>
              <Input id="responsavel_bairro" name="responsavel_bairro" className="mt-1" defaultValue={defaultValues?.responsavel_bairro || ""} ref={bairroRef} />
            </div>
            <CampoUfCidade
              labelCidade="Cidade" labelUf="UF"
              nomeCidade="responsavel_cidade" nomeUf="responsavel_uf"
              ufInicial={defaultValues?.responsavel_uf} cidadeInicial={defaultValues?.responsavel_cidade}
            />
          </>
        )}

        {mostrarStatus && (
          <div>
            <Label htmlFor="status">Status</Label>
            <select name="status" defaultValue={defaultValues?.status || "Ativo"} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
        )}
      </div>

      {mostraSecaoFiliacaoNaturalidade && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Filiação e naturalidade</p>
          <div className="grid grid-cols-2 gap-4">
            {mostrarFiliacao && (
              <>
                <div>
                  <Label htmlFor="nome_pai">Nome do Pai</Label>
                  <Input id="nome_pai" name="nome_pai" className="mt-1" value={nomePai} onChange={(e) => setNomePai(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="telefone_pai">Telefone do Pai</Label>
                  <Input
                    id="telefone_pai" name="telefone_pai" placeholder="(00) 00000-0000" className="mt-1"
                    value={telefonePai} onChange={(e) => setTelefonePai(mascaraTelefone(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="nome_mae">Nome da Mãe</Label>
                  <Input id="nome_mae" name="nome_mae" className="mt-1" value={nomeMae} onChange={(e) => setNomeMae(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="telefone_mae">Telefone da Mãe</Label>
                  <Input
                    id="telefone_mae" name="telefone_mae" placeholder="(00) 00000-0000" className="mt-1"
                    value={telefoneMae} onChange={(e) => setTelefoneMae(mascaraTelefone(e.target.value))}
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2 -mt-1">
                  <Checkbox id="resp_eh_pai" checked={respEhPai} onCheckedChange={(v) => handleRespEhPaiChange(!!v)} />
                  <Label htmlFor="resp_eh_pai" className="cursor-pointer font-normal">
                    O responsável financeiro é o pai (copia nome e telefone automaticamente)
                  </Label>
                </div>
              </>
            )}
            {mostrarNaturalidade && (
              <CampoUfCidade
                labelCidade="Cidade de Naturalidade" labelUf="UF de Naturalidade"
                nomeCidade="naturalidade_cidade" nomeUf="naturalidade_uf"
                ufInicial={defaultValues?.naturalidade_uf} cidadeInicial={defaultValues?.naturalidade_cidade}
              />
            )}
            {mostrarCorRaca && (
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
            )}
            {mostrarRaCenso && (
              <div>
                <Label htmlFor="ra_censo">RA (Censo Escolar)</Label>
                <Input id="ra_censo" name="ra_censo" placeholder="Código do INEP/Censo" className="mt-1" defaultValue={defaultValues?.ra_censo || ""} />
              </div>
            )}
          </div>
        </div>
      )}

      {mostrarHorario && (
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
      )}

      <div className="border-t pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Responsável financeiro</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="responsavel">Nome do Responsável</Label>
            <Input
              id="responsavel" name="responsavel" placeholder="Nome do responsável" className="mt-1"
              value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} required
            />
          </div>
          {mostrarRespTelefoneEmail && (
            <>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone" name="telefone" placeholder="(00) 00000-0000" className="mt-1"
                  value={telefoneResp} onChange={(e) => setTelefoneResp(mascaraTelefone(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail Responsável</Label>
                <Input id="email" name="email" type="email" placeholder="email@exemplo.com" className="mt-1" defaultValue={defaultValues?.email_responsavel || ""} />
              </div>
            </>
          )}
        </div>
      </div>

      {mostraSecaoRespDetalhes && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Dados adicionais do responsável (para contratos)</p>
          <div className="grid grid-cols-2 gap-4">
            {mostrarRespDocumentos && (
              <>
                <div className="col-span-2">
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
              </>
            )}
            {mostrarRespEstadoCivil && (
              <>
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
              </>
            )}
            {mostrarRespNaturalidade && (
              <CampoUfCidade
                labelCidade="Naturalidade (Cidade)" labelUf="Naturalidade (UF)"
                nomeCidade="responsavel_naturalidade_cidade" nomeUf="responsavel_naturalidade_uf"
                ufInicial={defaultValues?.responsavel_naturalidade_uf} cidadeInicial={defaultValues?.responsavel_naturalidade_cidade}
              />
            )}
            <div>
              <Label htmlFor="responsavel_nacionalidade">Nacionalidade</Label>
              <Input id="responsavel_nacionalidade" name="responsavel_nacionalidade" className="mt-1" defaultValue={defaultValues?.responsavel_nacionalidade ?? "Brasileira"} />
            </div>
            <div>
              <Label htmlFor="responsavel_nome_pai">Nome do Pai (do responsável)</Label>
              <Input id="responsavel_nome_pai" name="responsavel_nome_pai" className="mt-1" defaultValue={defaultValues?.responsavel_nome_pai || ""} />
            </div>
            <div>
              <Label htmlFor="responsavel_nome_mae">Nome da Mãe (do responsável)</Label>
              <Input id="responsavel_nome_mae" name="responsavel_nome_mae" className="mt-1" defaultValue={defaultValues?.responsavel_nome_mae || ""} />
            </div>
          </div>
        </div>
      )}
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
    responsavel_nacionalidade: (fd.get("responsavel_nacionalidade") as string) || null,
    responsavel_nome_pai: (fd.get("responsavel_nome_pai") as string) || null,
    responsavel_nome_mae: (fd.get("responsavel_nome_mae") as string) || null,
    telefone_responsavel: (fd.get("telefone") as string) || null,
    email_responsavel: (fd.get("email") as string) || null,
    status: (fd.get("status") as string) || "Ativo",
    ra_censo: (fd.get("ra_censo") as string) || null,
    nome_pai: (fd.get("nome_pai") as string) || null,
    nome_mae: (fd.get("nome_mae") as string) || null,
    telefone_pai: (fd.get("telefone_pai") as string) || null,
    telefone_mae: (fd.get("telefone_mae") as string) || null,
    naturalidade_cidade: (fd.get("naturalidade_cidade") as string) || null,
    naturalidade_uf: (fd.get("naturalidade_uf") as string) || null,
    cor_raca: (fd.get("cor_raca") as string) || null,
    hora_entrada: (fd.get("hora_entrada") as string) || null,
    hora_saida: (fd.get("hora_saida") as string) || null,
  };
}
