import { describe, it, expect, vi, afterEach } from "vitest";
import { gerarCarnePDF, formatarLinhaDigitavel } from "@/lib/carne";

const LINHA = "74891121150039736789903123451001187340000000050"; // resposta real do sandbox do Sicredi
const PIX = "00020126930014br.gov.bcb.pix2571pix-qrcode-h.sicredi.com.br/qr/v2/cobv/528520acdd5f4740b63b9b643ca2bcf99999999999999999999BR5903PIX6006Cidade62070503***630441AC";

// jsPDF define save/text/addImage por instância; interceptamos a instância criada pelo carnê
const espiao = vi.hoisted(() => ({ instancia: null as any, salvos: 0, textos: [] as string[], imagens: 0 }));
vi.mock("jspdf", async (importOriginal) => {
  const mod: any = await importOriginal();
  class Espiao extends mod.default {
    constructor(...args: any[]) {
      super(...args);
      espiao.instancia = this;
      const texto = this.text.bind(this);
      this.text = (t: any, ...r: any[]) => { espiao.textos.push(String(t)); return texto(t, ...r); };
      const img = this.addImage.bind(this);
      this.addImage = (...a: any[]) => { espiao.imagens++; return img(...a); };
      this.save = () => { espiao.salvos++; return this; };
    }
  }
  return { ...mod, default: Espiao };
});

afterEach(() => { espiao.salvos = 0; espiao.textos = []; espiao.imagens = 0; });

describe("formatarLinhaDigitavel", () => {
  it("formata 47 dígitos no padrão de boleto", () => {
    expect(formatarLinhaDigitavel(LINHA)).toBe("74891.12115 00397.367899 03123.451001 1 87340000000050");
  });
  it("devolve o texto original se não tiver 47 dígitos", () => {
    expect(formatarLinhaDigitavel("123")).toBe("123");
  });
});

describe("gerarCarnePDF", () => {
  const aluno = { nome: "Aluno Teste", turma: "1º ANO A", responsavel: "Responsável Teste" };

  it("gera o PDF com QR Pix e linha digitável reais, e avisa quando não há boleto", async () => {
    await gerarCarnePDF(
      aluno,
      [
        { id: "a", descricao: "Mensalidade 1/12", vencimento: "05/01/2027", valor: 2064, valorIntegral: 2100, linhaDigitavel: LINHA, pixCopiaECola: PIX },
        { id: "b", descricao: "Mensalidade 2/12", vencimento: "05/02/2027", valor: 2064, valorIntegral: 2100 },
      ],
      { escola: "Colégio Teste", multaPercentual: 2, jurosMensalPercentual: 1 },
    );

    expect(espiao.salvos).toBe(1);
    expect(espiao.imagens).toBe(1); // só a parcela com Pix tem QR
    const textos = espiao.textos;
    expect(textos).toContain("74891.12115 00397.367899 03123.451001 1 87340000000050");
    expect(textos.some((t) => /ainda não emitido/.test(t))).toBe(true);
    expect(textos.some((t) => /multa de 2%/.test(t))).toBe(true);
    expect(textos.some((t) => /34191\.79001/.test(t))).toBe(false); // nada do mock antigo
  });
});
