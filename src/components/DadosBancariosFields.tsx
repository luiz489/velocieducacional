import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BANCOS, TIPOS_CHAVE_PIX, TIPOS_CONTA, adivinharTipoChavePix, nomeDoBanco, pendenciasBancarias, validarDadosBancarios,
  type DadosBancarios,
} from "@/lib/dadosBancarios";

type Props = {
  value: DadosBancarios;
  onChange: (patch: Partial<DadosBancarios>) => void;
  descricao?: string;
};

const soDigitos = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

export function DadosBancariosFields({ value, onChange, descricao }: Props) {
  const erros = validarDadosBancarios(value);
  const faltam = pendenciasBancarias(value);
  const algumPreenchido = Object.entries(value).some(([k, v]) => k !== "tipo_conta" && !!v);
  const bancoDaLista = BANCOS.some((b) => b.codigo === value.banco_codigo) ? value.banco_codigo : "";

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Dados bancários (pagamento por conta ou Pix)</p>
        {descricao && <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Banco</Label>
          <Select
            value={bancoDaLista}
            onValueChange={(codigo) => onChange({ banco_codigo: codigo, banco_nome: nomeDoBanco(codigo) })}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Escolher da lista (ou digite o código abaixo)" /></SelectTrigger>
            <SelectContent>
              {BANCOS.map((b) => (
                <SelectItem key={b.codigo} value={b.codigo}>{b.codigo} — {b.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Código do banco</Label>
          <Input
            inputMode="numeric" maxLength={3} placeholder="Ex.: 748" value={value.banco_codigo}
            onChange={(e) => {
              const codigo = soDigitos(e.target.value, 3);
              onChange({ banco_codigo: codigo, ...(nomeDoBanco(codigo) ? { banco_nome: nomeDoBanco(codigo) } : {}) });
            }}
          />
        </div>
        <div>
          <Label>Nome do banco</Label>
          <Input value={value.banco_nome} onChange={(e) => onChange({ banco_nome: e.target.value })} />
        </div>

        <div>
          <Label>Agência</Label>
          <div className="flex gap-2">
            <Input inputMode="numeric" placeholder="0715" value={value.agencia} onChange={(e) => onChange({ agencia: soDigitos(e.target.value, 5) })} />
            <Input className="w-16" maxLength={1} placeholder="DV" title="Dígito da agência (se houver)" value={value.agencia_dv}
              onChange={(e) => onChange({ agencia_dv: e.target.value.replace(/[^0-9xX]/g, "").slice(0, 1) })} />
          </div>
        </div>
        <div>
          <Label>Conta</Label>
          <div className="flex gap-2">
            <Input inputMode="numeric" placeholder="601121" value={value.conta} onChange={(e) => onChange({ conta: soDigitos(e.target.value, 12) })} />
            <Input className="w-16" maxLength={1} placeholder="DV" title="Dígito da conta" value={value.conta_dv}
              onChange={(e) => onChange({ conta_dv: e.target.value.replace(/[^0-9xX]/g, "").slice(0, 1) })} />
          </div>
        </div>

        <div>
          <Label>Tipo de conta</Label>
          <Select value={value.tipo_conta || "corrente"} onValueChange={(v) => onChange({ tipo_conta: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_CONTA.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo da chave Pix</Label>
          <Select value={value.tipo_chave_pix || "nenhum"} onValueChange={(v) => onChange({ tipo_chave_pix: v === "nenhum" ? "" : v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Sem chave Pix</SelectItem>
              {TIPOS_CHAVE_PIX.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Chave Pix</Label>
          <Input
            value={value.chave_pix}
            placeholder={value.tipo_chave_pix === "telefone" ? "+5516999998888" : "CPF, CNPJ, e-mail, telefone ou chave aleatória"}
            onChange={(e) => {
              const chave = e.target.value;
              onChange({ chave_pix: chave, ...(value.tipo_chave_pix ? {} : { tipo_chave_pix: adivinharTipoChavePix(chave) }) });
            }}
          />
        </div>
      </div>

      {erros.length > 0 && (
        <ul className="text-xs text-destructive list-disc pl-4 space-y-0.5">
          {erros.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      {erros.length === 0 && algumPreenchido && (
        <p className={`text-xs ${faltam.length === 0 ? "text-success" : "text-muted-foreground"}`}>
          {faltam.length === 0 ? "Dados completos para pagamento." : `Para pagar por conta falta: ${faltam.join(", ")} (ou informe uma chave Pix).`}
        </p>
      )}
    </div>
  );
}
