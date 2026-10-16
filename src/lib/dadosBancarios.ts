// Dados bancários de favorecidos (fornecedores, professores, funcionários) para pagamento por
// arquivo CNAB 240 (crédito em conta/TED) e Pix. Os campos são opcionais no cadastro; o que for
// preenchido precisa estar no formato certo, e `pendenciasBancarias` diz o que falta para pagar.

export type DadosBancarios = {
  banco_codigo: string;
  banco_nome: string;
  agencia: string;
  agencia_dv: string;
  conta: string;
  conta_dv: string;
  tipo_conta: string;
  tipo_chave_pix: string;
  chave_pix: string;
};

export const DADOS_BANCARIOS_VAZIO: DadosBancarios = {
  banco_codigo: "", banco_nome: "", agencia: "", agencia_dv: "", conta: "", conta_dv: "",
  tipo_conta: "corrente", tipo_chave_pix: "", chave_pix: "",
};

export const TIPOS_CONTA = [
  { valor: "corrente", rotulo: "Conta corrente" },
  { valor: "poupanca", rotulo: "Poupança" },
  { valor: "pagamento", rotulo: "Conta de pagamento" },
] as const;

export const TIPOS_CHAVE_PIX = [
  { valor: "cpf", rotulo: "CPF" },
  { valor: "cnpj", rotulo: "CNPJ" },
  { valor: "email", rotulo: "E-mail" },
  { valor: "telefone", rotulo: "Telefone" },
  { valor: "aleatoria", rotulo: "Chave aleatória" },
] as const;

// Código COMPE (3 dígitos) dos bancos mais comuns; "Outro" permite digitar qualquer código.
export const BANCOS: { codigo: string; nome: string }[] = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "077", nome: "Banco Inter" },
  { codigo: "085", nome: "Ailos" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "133", nome: "Cresol" },
  { codigo: "136", nome: "Unicred" },
  { codigo: "208", nome: "BTG Pactual" },
  { codigo: "212", nome: "Banco Original" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "290", nome: "PagBank" },
  { codigo: "323", nome: "Mercado Pago" },
  { codigo: "336", nome: "C6 Bank" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "380", nome: "PicPay" },
  { codigo: "422", nome: "Safra" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "756", nome: "Sicoob" },
];

export const nomeDoBanco = (codigo: string) => BANCOS.find((b) => b.codigo === codigo)?.nome ?? "";

const soDigitos = (v: string) => (v ?? "").replace(/\D/g, "");

/** Aceita "Corrente", "Poupança", "poupanca"... e devolve o valor padronizado. */
export function normalizarTipoConta(v: string | null | undefined): string {
  const s = (v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (s.includes("poup")) return "poupanca";
  if (s.includes("pagamento")) return "pagamento";
  return s ? "corrente" : "";
}

export function cpfValido(valor: string): boolean {
  const c = soDigitos(valor);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export function cnpjValido(valor: string): boolean {
  const c = soDigitos(valor);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((s, p, i) => s + p * Number(c[i]), 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
}

/** Tenta descobrir o tipo da chave Pix pelo formato (telefone e CPF se confundem: o usuário confirma). */
export function adivinharTipoChavePix(chave: string): string {
  const c = (chave ?? "").trim();
  if (!c) return "";
  if (c.includes("@")) return "email";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return "aleatoria";
  if (c.startsWith("+")) return "telefone";
  const d = soDigitos(c);
  if (d.length === 14) return "cnpj";
  if (d.length === 11) return cpfValido(d) ? "cpf" : "telefone";
  return "";
}

export function validarChavePix(tipo: string, chave: string): string | null {
  const c = (chave ?? "").trim();
  if (!c) return null;
  switch (tipo) {
    case "cpf": return cpfValido(c) ? null : "CPF inválido na chave Pix.";
    case "cnpj": return cnpjValido(c) ? null : "CNPJ inválido na chave Pix.";
    case "email": return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) && c.length <= 77 ? null : "E-mail inválido na chave Pix.";
    case "telefone": return /^\+55\d{10,11}$/.test(c) ? null : "Telefone na chave Pix deve ser +55 DDD número (ex.: +5516999998888).";
    case "aleatoria": return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c) ? null : "Chave aleatória deve ter o formato 8-4-4-4-12.";
    default: return "Escolha o tipo da chave Pix.";
  }
}

/** Erros de FORMATO nos campos preenchidos (o que está vazio não é erro aqui). */
export function validarDadosBancarios(d: DadosBancarios): string[] {
  const erros: string[] = [];
  if (d.banco_codigo && !/^\d{3}$/.test(d.banco_codigo)) erros.push("Código do banco deve ter 3 dígitos (ex.: 748).");
  if (d.agencia && !/^\d{1,5}$/.test(d.agencia)) erros.push("Agência: só números, sem o dígito (ele vai no campo ao lado).");
  if (d.agencia_dv && !/^[0-9Xx]$/.test(d.agencia_dv)) erros.push("Dígito da agência: 1 número ou X.");
  if (d.conta && !/^\d{1,12}$/.test(d.conta)) erros.push("Conta: só números, sem o dígito (ele vai no campo ao lado).");
  if (d.conta_dv && !/^[0-9Xx]$/.test(d.conta_dv)) erros.push("Dígito da conta: 1 número ou X.");
  if (d.chave_pix) {
    const e = validarChavePix(d.tipo_chave_pix, d.chave_pix);
    if (e) erros.push(e);
  }
  return erros;
}

/** O que ainda falta para pagar este favorecido (por conta ou por Pix). Lista vazia = pronto. */
export function pendenciasBancarias(d: DadosBancarios): string[] {
  const pixOk = !!d.chave_pix && !!d.tipo_chave_pix && !validarChavePix(d.tipo_chave_pix, d.chave_pix);
  const faltaConta: string[] = [];
  if (!/^\d{3}$/.test(d.banco_codigo)) faltaConta.push("código do banco");
  if (!d.agencia) faltaConta.push("agência");
  if (!d.conta) faltaConta.push("conta");
  if (!d.conta_dv) faltaConta.push("dígito da conta");
  if (!d.tipo_conta) faltaConta.push("tipo de conta");
  if (pixOk || faltaConta.length === 0) return [];
  return faltaConta;
}

/** Converte o que vem do banco (ou do formulário antigo) para o formato do formulário. */
export function dadosBancariosDe(l: Partial<Record<keyof DadosBancarios | "banco", string | null>> | null | undefined): DadosBancarios {
  const nomeBanco = (l?.banco_nome ?? l?.banco ?? "") as string;
  return {
    banco_codigo: l?.banco_codigo ?? "",
    banco_nome: nomeBanco,
    agencia: l?.agencia ?? "",
    agencia_dv: l?.agencia_dv ?? "",
    conta: l?.conta ?? "",
    conta_dv: l?.conta_dv ?? "",
    tipo_conta: normalizarTipoConta(l?.tipo_conta) || "corrente",
    tipo_chave_pix: l?.tipo_chave_pix ?? "",
    chave_pix: l?.chave_pix ?? "",
  };
}

/** Valores prontos para gravar (vazio vira null). */
export function dadosBancariosParaSalvar(d: DadosBancarios) {
  const n = (v: string) => (v?.trim() ? v.trim() : null);
  return {
    banco_codigo: n(d.banco_codigo),
    agencia: n(d.agencia),
    agencia_dv: n(d.agencia_dv?.toUpperCase()),
    conta: n(d.conta),
    conta_dv: n(d.conta_dv?.toUpperCase()),
    tipo_conta: n(d.tipo_conta),
    tipo_chave_pix: d.chave_pix?.trim() ? n(d.tipo_chave_pix) : null,
    chave_pix: n(d.chave_pix),
  };
}
