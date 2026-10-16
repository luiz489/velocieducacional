import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const chamadas = vi.hoisted(() => ({ rpc: [] as { fn: string; args: any }[] }));
const linhas = vi.hoisted(() => ({
  dados: [
    {
      id: "l1", nosso_numero: "261009993", data_pagamento: "2026-10-16", valor_pago: 328.82, tipo_liquidacao: "LIQUIDACAO_REDE",
      pagador_nome: "JESSICA SILVA", pagador_doc_final: "31", vencimento: "2026-10-15", valor_nominal: 321.34,
      resultado: "nenhum", motivo: "Há parcela deste CPF/CNPJ neste vencimento, mas com valor diferente.",
      candidatos: [{ id: "p1", aluno: "LUCAS SILVA", valor: 321.34, valor_integral: 321.34 }],
    },
    {
      id: "l2", nosso_numero: "261009994", data_pagamento: "2026-10-15", valor_pago: 100, tipo_liquidacao: "LIQUIDACAO_PIX",
      pagador_nome: "CARLA", pagador_doc_final: "55", vencimento: "2026-10-20", valor_nominal: 100,
      resultado: "nenhum", motivo: "Nenhuma parcela em aberto deste CPF/CNPJ neste vencimento.", candidatos: [],
    },
  ] as any[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const q: any = {
    select: () => q, eq: () => q, order: () => q,
    then: (ok: any) => Promise.resolve({ data: linhas.dados, error: null }).then(ok),
  };
  return {
    supabase: {
      from: () => q,
      rpc: (fn: string, args: any) => { chamadas.rpc.push({ fn, args }); return Promise.resolve({ data: null, error: null }); },
    },
  };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PagamentosParaConferir } from "@/components/PagamentosParaConferir";

const montar = (escolaId: string | null = "e1") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PagamentosParaConferir escolaId={escolaId} />
    </QueryClientProvider>
  );

beforeEach(() => { chamadas.rpc = []; });

describe("Pagamentos para conferir", () => {
  it("avisa quantos pagamentos aguardam e lista cada um com o motivo", async () => {
    montar();
    expect(await screen.findByText(/aguardam sua conferência/)).toBeTruthy();
    fireEvent.click(screen.getByText("Conferir"));
    expect(await screen.findByText(/JESSICA SILVA/)).toBeTruthy();
    expect(screen.getByText(/com valor diferente/)).toBeTruthy();
    expect(screen.getByText(/Nenhuma parcela em aberto/)).toBeTruthy();
  });

  it("só oferece baixa nas parcelas candidatas e chama a função com a parcela escolhida", async () => {
    montar();
    fireEvent.click(await screen.findByText("Conferir"));
    expect(await screen.findAllByText("Dar baixa")).toHaveLength(1); // CARLA não tem candidata
    fireEvent.click(screen.getByText("Dar baixa"));
    await waitFor(() => expect(chamadas.rpc).toHaveLength(1));
    expect(chamadas.rpc[0]).toEqual({ fn: "resolver_liquidacao_externa", args: { p_id: "l1", p_acao: "baixar", p_financeiro_id: "p1" } });
  });

  it("permite marcar como resolvido sem escolher parcela", async () => {
    montar();
    fireEvent.click(await screen.findByText("Conferir"));
    fireEvent.click((await screen.findAllByText("Já resolvi por outro caminho"))[1]);
    await waitFor(() => expect(chamadas.rpc).toHaveLength(1));
    expect(chamadas.rpc[0].args).toEqual({ p_id: "l2", p_acao: "resolvida", p_financeiro_id: null });
  });

  it("não mostra nada quando não há pagamentos para conferir", async () => {
    linhas.dados = [];
    const { container } = montar();
    await waitFor(() => expect(container.textContent).toBe(""));
    linhas.dados = [];
  });
});
