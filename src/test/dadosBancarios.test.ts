import { describe, it, expect } from "vitest";
import {
  DADOS_BANCARIOS_VAZIO, adivinharTipoChavePix, cnpjValido, cpfValido, dadosBancariosDe, dadosBancariosParaSalvar,
  normalizarTipoConta, pendenciasBancarias, validarChavePix, validarDadosBancarios,
} from "@/lib/dadosBancarios";

describe("dadosBancarios", () => {
  it("valida CPF e CNPJ pelos dígitos verificadores", () => {
    expect(cpfValido("295.650.348-02")).toBe(true);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("295.650.348-03")).toBe(false);
    expect(cnpjValido("00.987.778/0001-36")).toBe(true);
    expect(cnpjValido("00.987.778/0001-37")).toBe(false);
  });

  it("padroniza o tipo de conta antigo", () => {
    expect(normalizarTipoConta("Corrente")).toBe("corrente");
    expect(normalizarTipoConta("Poupança")).toBe("poupanca");
    expect(normalizarTipoConta("poupanca")).toBe("poupanca");
    expect(normalizarTipoConta("Conta de pagamento")).toBe("pagamento");
    expect(normalizarTipoConta(null)).toBe("");
  });

  it("valida chave Pix por tipo", () => {
    expect(validarChavePix("cpf", "29565034802")).toBeNull();
    expect(validarChavePix("cpf", "12345678900")).not.toBeNull();
    expect(validarChavePix("cnpj", "00987778000136")).toBeNull();
    expect(validarChavePix("email", "a@b.com")).toBeNull();
    expect(validarChavePix("email", "sem-arroba")).not.toBeNull();
    expect(validarChavePix("telefone", "+5516999998888")).toBeNull();
    expect(validarChavePix("telefone", "16999998888")).not.toBeNull();
    expect(validarChavePix("aleatoria", "123e4567-e89b-12d3-a456-426614174000")).toBeNull();
    expect(validarChavePix("", "algo")).not.toBeNull();
    expect(validarChavePix("cpf", "")).toBeNull();
  });

  it("adivinha o tipo da chave", () => {
    expect(adivinharTipoChavePix("a@b.com")).toBe("email");
    expect(adivinharTipoChavePix("00987778000136")).toBe("cnpj");
    expect(adivinharTipoChavePix("295.650.348-02")).toBe("cpf");
    expect(adivinharTipoChavePix("+5516999998888")).toBe("telefone");
    expect(adivinharTipoChavePix("123e4567-e89b-12d3-a456-426614174000")).toBe("aleatoria");
    expect(adivinharTipoChavePix("")).toBe("");
  });

  it("aponta erros de formato só nos campos preenchidos", () => {
    expect(validarDadosBancarios(DADOS_BANCARIOS_VAZIO)).toEqual([]);
    const erros = validarDadosBancarios({
      ...DADOS_BANCARIOS_VAZIO, banco_codigo: "74", agencia: "0715-2", conta: "60112-1", conta_dv: "12",
    });
    expect(erros).toHaveLength(4);
  });

  it("diz o que falta para pagar", () => {
    expect(pendenciasBancarias(DADOS_BANCARIOS_VAZIO)).toEqual(["código do banco", "agência", "conta", "dígito da conta"]);
    const conta = { ...DADOS_BANCARIOS_VAZIO, banco_codigo: "748", agencia: "0715", conta: "601121", conta_dv: "3" };
    expect(pendenciasBancarias(conta)).toEqual([]);
    const pix = { ...DADOS_BANCARIOS_VAZIO, tipo_chave_pix: "cpf", chave_pix: "29565034802" };
    expect(pendenciasBancarias(pix)).toEqual([]);
    const pixInvalido = { ...DADOS_BANCARIOS_VAZIO, tipo_chave_pix: "cpf", chave_pix: "123" };
    expect(pendenciasBancarias(pixInvalido).length).toBeGreaterThan(0);
  });

  it("converte do banco para o formulário e de volta", () => {
    const d = dadosBancariosDe({ banco: "Sicredi", tipo_conta: "Poupança", agencia: "0715" });
    expect(d.banco_nome).toBe("Sicredi");
    expect(d.tipo_conta).toBe("poupanca");
    const s = dadosBancariosParaSalvar({ ...d, conta_dv: "x", chave_pix: "", tipo_chave_pix: "cpf" });
    expect(s.conta_dv).toBe("X");
    expect(s.chave_pix).toBeNull();
    expect(s.tipo_chave_pix).toBeNull();
  });
});
