import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const ESCOLA = "escola-1";
const chamadas = vi.hoisted(() => ({ rpc: [] as { fn: string; args: any }[] }));

const dados: Record<string, any[]> = vi.hoisted(() => ({
  remessas_pagamento: [],
  contas_bancarias: [{ id: "cb1", nome: "Conta Corrente Sicredi", banco: "Sicredi", agencia: "0715", conta: "601121" }],
  contas_a_pagar: [
    { id: "cp1", descricao: "Pagamento PJ - Ana", valor: 3000, data_vencimento: "2026-11-05", fornecedor: "Ana", professor_id: "p1", funcionario_id: null, fornecedor_id: null, forma_pagamento: null, codigo_barras: null },
    { id: "cp2", descricao: "Salário - Bruno", valor: 2500, data_vencimento: "2026-11-05", fornecedor: "Bruno", professor_id: null, funcionario_id: "f1", fornecedor_id: null, forma_pagamento: null, codigo_barras: null },
    { id: "cp3", descricao: "Energia", valor: 800, data_vencimento: "2026-11-10", fornecedor: "CPFL", professor_id: null, funcionario_id: null, fornecedor_id: "fo1", forma_pagamento: "boleto", codigo_barras: "123" },
    { id: "cp4", descricao: "Material", valor: 100, data_vencimento: "2026-11-12", fornecedor: "Papelaria", professor_id: null, funcionario_id: null, fornecedor_id: "fo2", forma_pagamento: null, codigo_barras: null },
  ],
  v_favorecidos_pagamento: [
    { id: "p1", origem: "professor", nome: "Ana Prof", pronto_para_pagar: true, pendencias: null },
    { id: "f1", origem: "funcionario", nome: "Bruno Func", pronto_para_pagar: false, pendencias: "chave Pix ou dados da conta (agência, conta)" },
    { id: "fo2", origem: "fornecedor", nome: "Papelaria Ltda", pronto_para_pagar: true, pendencias: null },
  ],
  remessas_pagamento_itens: [{ conta_a_pagar_id: "cp4" }],
}));

vi.mock("@/integrations/supabase/client", () => {
  const consulta = (tabela: string) => {
    const q: any = {
      select: () => q, eq: () => q, neq: () => q, order: () => q, limit: () => q,
      then: (ok: any) => Promise.resolve({ data: dados[tabela] ?? [], error: null }).then(ok),
    };
    return q;
  };
  return {
    supabase: {
      from: (t: string) => consulta(t),
      rpc: (fn: string, args: any) => { chamadas.rpc.push({ fn, args }); return Promise.resolve({ data: "rem-1", error: null }); },
    },
  };
});
vi.mock("@/contexts/EscolaContext", () => ({ useEscolaAtiva: () => ({ escolaAtivaId: ESCOLA }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import RemessaPagamentos from "@/pages/RemessaPagamentos";

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RemessaPagamentos />
    </QueryClientProvider>
  );

beforeEach(() => { chamadas.rpc = []; });

describe("Remessa de pagamentos", () => {
  it("mostra a lista vazia e abre a nova remessa", async () => {
    montar();
    expect(await screen.findByText("Nenhuma remessa criada ainda.")).toBeTruthy();
    fireEvent.click(screen.getByText("Nova remessa"));
    expect(await screen.findByText("Nova remessa de pagamentos")).toBeTruthy();
  });

  it("separa quem está pronto de quem não pode entrar e cria a remessa só com os marcados", async () => {
    montar();
    fireEvent.click(await screen.findByText("Nova remessa"));

    // pronto
    expect(await screen.findByText("Ana Prof")).toBeTruthy();
    // sem dados bancários: motivo explícito
    expect(await screen.findByText(/Falta: chave Pix ou dados da conta/)).toBeTruthy();
    // boleto com código de barras entra mesmo sem dados bancários do favorecido
    expect(screen.getByText("CPFL")).toBeTruthy();
    // já em outra remessa
    expect(screen.getByText("Já está em uma remessa")).toBeTruthy();

    fireEvent.click(screen.getByText(/Marcar todos os prontos/));
    await waitFor(() => expect(screen.getByText(/selecionado\(s\)/).textContent).toContain("2"));
    expect(screen.getByText(/selecionado\(s\)/).textContent).toContain("3.800,00");

    // sem conta de débito escolhida: não chama o servidor
    fireEvent.click(screen.getByText("Criar remessa"));
    expect(chamadas.rpc).toHaveLength(0);
  });
});
