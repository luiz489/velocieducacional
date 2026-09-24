import { describe, it, expect } from "vitest";
import {
  urlToken, urlBoletos, usernameSicredi, cooperativaDe, postoDe,
  uuidParaBase36, base36ParaUuid, idTituloEmpresaDe, seuNumeroDe,
  montarPayloadBoleto, parseRespostaRegistro, parseWebhook, dataDoEvento,
  chaveBeneficiario, ehLiquidacao, ehEstorno, formaPagamentoDoMovimento,
} from "../../supabase/functions/_shared/sicredi-core";

const UUID = "f69d2a00-76fb-4ea2-bddd-7babd1200525";

const config = {
  codigo_beneficiario: "12345",
  tipo_cobranca: "HIBRIDO",
  especie_documento: "DUPLICATA_MERCANTIL_INDICACAO",
  multa_percentual: 2,
  juros_mensal_percentual: 1,
};

const pagadorOk = {
  nome: "  Maria   da Silva ",
  documento: "028.274.142-87".replace(/\D/g, "").padStart(11, "0"),
  endereco: "Rua Doutor Vargas Neto 150",
  cidade: "Barretos",
  uf: "sp",
  cep: "14.780-000",
};

describe("URLs por ambiente", () => {
  it("sandbox usa o prefixo /sb e produção não", () => {
    expect(urlToken("homologacao")).toBe("https://api-parceiro.sicredi.com.br/sb/auth/openapi/token");
    expect(urlToken("producao")).toBe("https://api-parceiro.sicredi.com.br/auth/openapi/token");
    expect(urlBoletos("homologacao")).toBe("https://api-parceiro.sicredi.com.br/sb/cobranca/boleto/v1/boletos");
    expect(urlBoletos("producao")).toBe("https://api-parceiro.sicredi.com.br/cobranca/boleto/v1/boletos");
  });
});

describe("credenciais", () => {
  it("username = beneficiário (5) + cooperativa (4)", () => {
    expect(usernameSicredi("12345", "0512")).toBe("123450512");
  });
  it("completa zeros à esquerda e recusa excesso de dígitos", () => {
    expect(usernameSicredi("123", "512")).toBe("001230512");
    expect(postoDe("3")).toBe("03");
    expect(cooperativaDe("512")).toBe("0512");
    expect(() => cooperativaDe("12345")).toThrow();
    expect(() => postoDe("")).toThrow();
  });
});

describe("idTituloEmpresa / seuNumero", () => {
  it("UUID -> base36 tem sempre 25 chars e volta ao mesmo UUID", () => {
    const b = uuidParaBase36(UUID);
    expect(b).toHaveLength(25);
    expect(base36ParaUuid(b)).toBe(UUID);
  });
  it("funciona nos extremos (tudo zero e tudo F)", () => {
    const zero = "00000000-0000-0000-0000-000000000000";
    const max = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    expect(uuidParaBase36(zero)).toHaveLength(25);
    expect(uuidParaBase36(max)).toHaveLength(25);
    expect(base36ParaUuid(uuidParaBase36(zero))).toBe(zero);
    expect(base36ParaUuid(uuidParaBase36(max))).toBe(max);
  });
  it("respeita os limites do manual (25 e 10 caracteres)", () => {
    expect(idTituloEmpresaDe(UUID).length).toBeLessThanOrEqual(25);
    expect(seuNumeroDe(UUID)).toHaveLength(10);
  });
  it("rejeita entrada inválida", () => {
    expect(() => uuidParaBase36("não-é-uuid")).toThrow();
    expect(() => base36ParaUuid("!!!")).toThrow();
  });
});

describe("montarPayloadBoleto", () => {
  it("com desconto de pontualidade: valor cheio + desconto até o vencimento", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 1576.66, valor_integral: 2123.8, data_vencimento: "2027-01-05" },
      pagadorOk, config, { mensagens: ["Aluno: ISABELE", "Mensalidade 1/12"] }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p = r.payload;
    expect(p.valor).toBe(2123.8);
    expect(p.tipoDesconto).toBe("VALOR");
    expect(p.valorDesconto1).toBe(547.14);
    expect(p.dataDesconto1).toBe("2027-01-05");
    expect(p.dataVencimento).toBe("2027-01-05");
    expect(p.tipoCobranca).toBe("HIBRIDO");
    expect(p.codigoBeneficiario).toBe("12345");
    expect(p.mensagens).toEqual(["Aluno: ISABELE", "Mensalidade 1/12"]);
  });

  it("nunca envia dataInicioJuros/dataInicioMulta (senão o boleto perde o Pix)", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 100, valor_integral: 100, data_vencimento: "2027-01-05" }, pagadorOk, config
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload).not.toHaveProperty("dataInicioJuros");
    expect(r.payload).not.toHaveProperty("dataInicioMulta");
    expect(r.payload.tipoMulta).toBe("PERCENTUAL");
    expect(r.payload.multa).toBe(2);
    expect(r.payload.tipoJuros).toBe("PERCENTUAL");
    expect(r.payload.tipoJurosPercentual).toBe("MENSAL");
    expect(r.payload.juros).toBe(1);
  });

  it("sem desconto quando valor = valor_integral", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 500, valor_integral: 500, data_vencimento: "2027-02-05" }, pagadorOk, config
    );
    expect(r.ok && r.payload).toBeTruthy();
    if (!r.ok) return;
    expect(r.payload).not.toHaveProperty("tipoDesconto");
    expect(r.payload).not.toHaveProperty("valorDesconto1");
  });

  it("valor_integral nulo usa o próprio valor", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 300, valor_integral: null, data_vencimento: "2027-02-05" }, pagadorOk, config
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.valor).toBe(300);
  });

  it("normaliza pagador: CPF só dígitos, UF maiúscula, CEP 8 dígitos, nome sem espaços duplos", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 100, valor_integral: 100, data_vencimento: "2027-01-05" }, pagadorOk, config
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const pg = r.payload.pagador as Record<string, string>;
    expect(pg.tipoPessoa).toBe("PESSOA_FISICA");
    expect(pg.uf).toBe("SP");
    expect(pg.cep).toBe("14780000");
    expect(pg.nome).toBe("Maria da Silva");
    expect(pg.documento).toMatch(/^\d{11}$/);
  });

  it("CNPJ vira PESSOA_JURIDICA", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 100, valor_integral: 100, data_vencimento: "2027-01-05" },
      { ...pagadorOk, documento: "11.222.333/0001-81" }, config
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.payload.pagador as Record<string, string>).tipoPessoa).toBe("PESSOA_JURIDICA");
  });

  it("recusa pagador incompleto com mensagens claras (não registra boleto inválido)", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 100, valor_integral: 100, data_vencimento: "2027-01-05" },
      { nome: "", documento: "123", cep: "1", cidade: "", uf: "" }, config
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros.length).toBeGreaterThanOrEqual(5);
    expect(r.erros.join(" ")).toMatch(/CPF/);
    expect(r.erros.join(" ")).toMatch(/CEP/);
  });

  it("bolsa integral (valor 0) não gera boleto", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 0, valor_integral: 1057.1, data_vencimento: "2027-01-05" }, pagadorOk, config
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.join(" ")).toMatch(/bolsa/i);
  });

  it("limita endereço a 40 chars, mensagens a 4 e informativos a 5", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 100, valor_integral: 100, data_vencimento: "2027-01-05" },
      { ...pagadorOk, endereco: "R".repeat(100) }, config,
      { mensagens: ["1", "2", "3", "4", "5"], informativos: ["a", "b", "c", "d", "e", "f"] }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(((r.payload.pagador as Record<string, string>).endereco).length).toBe(40);
    expect((r.payload.mensagens as string[]).length).toBe(4);
    expect((r.payload.informativos as string[]).length).toBe(5);
  });

  it("multa/juros zerados não são enviados", () => {
    const r = montarPayloadBoleto(
      { id: UUID, valor: 100, valor_integral: 100, data_vencimento: "2027-01-05" }, pagadorOk,
      { ...config, multa_percentual: 0, juros_mensal_percentual: 0 }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload).not.toHaveProperty("multa");
    expect(r.payload).not.toHaveProperty("juros");
  });
});

describe("parseRespostaRegistro (exemplo do manual)", () => {
  it("extrai nosso número, linha digitável, QR Pix e txid", () => {
    const r = parseRespostaRegistro({
      txid: "f69d2a0076fb4ea2bddd7babd1200525",
      qrCode: "00020101021226930014br.gov.bcb.pix2571pix-qrcode-h.sicredi.com.br/qr/v2/cobv/6946459e4b6e4c19ab5c9689fe0df30a5204000053039865405999.905802BR5921OLIVEIRA MULTI MARCAS6008BRASILIA62070503***6304E5E1",
      linhaDigitavel: "74891125110061420512803153351030188640000009990",
      codigoBarras: "74891886400000099901125100614205120315335103",
      cooperativa: "0512", posto: "03", nossoNumero: "251006142",
    });
    expect(r.nossoNumero).toBe("251006142");
    expect(r.linhaDigitavel).toHaveLength(47);
    expect(r.codigoBarras).toHaveLength(44);
    expect(r.qrCode).toMatch(/^000201/);
    expect(r.txid).toBe("f69d2a0076fb4ea2bddd7babd1200525");
  });
  it("boleto tradicional (sem qrCode) devolve qrCode nulo", () => {
    const r = parseRespostaRegistro({ nossoNumero: "1", linhaDigitavel: "2", qrCode: null });
    expect(r.qrCode).toBeNull();
  });
  it("erro quando faltam campos essenciais", () => {
    expect(() => parseRespostaRegistro({ txid: "x" })).toThrow();
    expect(() => parseRespostaRegistro(null)).toThrow();
  });
});

describe("webhook (payload do manual)", () => {
  const payload = {
    agencia: "9999", posto: "99", beneficiario: "12345", nossoNumero: "221000144",
    dataEvento: [2024, 3, 20, 11, 40, 39, 24000000], movimento: "LIQUIDACAO_PIX",
    valorLiquidacao: "101.01", valorDesconto: "0", valorJuros: "0", valorMulta: "0", valorAbatimento: "0",
    carteira: "CARTEIRA SIMPLES", dataPrevisaoPagamento: [2024, 3, 20],
    idEventoWebhook: "N000000000000000000000000000000LIQUIDACAO_PIX",
  };

  it("converte o array dataEvento e o valor", () => {
    const e = parseWebhook(payload);
    expect(e.dataEvento).toBe("2024-03-20");
    expect(e.valorLiquidacao).toBe(101.01);
    expect(e.nossoNumero).toBe("221000144");
    expect(e.idTituloEmpresa).toBeNull();
    expect(formaPagamentoDoMovimento(e.movimento)).toBe("Pix");
    expect(ehLiquidacao(e.movimento)).toBe(true);
  });
  it("valor com vírgula e idTituloEmpresa opcional", () => {
    const e = parseWebhook({ ...payload, valorLiquidacao: "1.234,50".replace(".", ""), idTituloEmpresa: "abc" });
    expect(e.valorLiquidacao).toBe(1234.5);
    expect(e.idTituloEmpresa).toBe("abc");
  });
  it("liquidação em rede/compe vira Boleto; estorno é reconhecido", () => {
    expect(formaPagamentoDoMovimento("LIQUIDACAO_REDE")).toBe("Boleto");
    expect(formaPagamentoDoMovimento("LIQUIDACAO_COMPE_H5")).toBe("Boleto");
    expect(ehEstorno("ESTORNO_LIQUIDACAO_REDE")).toBe(true);
    expect(ehLiquidacao("ESTORNO_LIQUIDACAO_REDE")).toBe(false);
    expect(ehLiquidacao("AVISO_PAGAMENTO_COMPE")).toBe(false);
  });
  it("rejeita payload sem campos obrigatórios", () => {
    expect(() => parseWebhook({ ...payload, nossoNumero: undefined })).toThrow(/nossoNumero/);
    expect(() => parseWebhook({ ...payload, idEventoWebhook: "" })).toThrow(/idEventoWebhook/);
    expect(() => parseWebhook({ ...payload, dataEvento: "lixo" })).toThrow();
  });
  it("chaveBeneficiario identifica a escola sem depender de zeros à esquerda", () => {
    expect(chaveBeneficiario("0512", "03", "12345")).toBe("0512-03-12345");
  });
  it("dataDoEvento aceita string ISO", () => {
    expect(dataDoEvento("2027-01-05T10:00:00")).toBe("2027-01-05");
    expect(dataDoEvento([2027, 1, 5])).toBe("2027-01-05");
  });
});
