import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, clienteAdmin, usuarioTemPermissao, carregarConfig, registrarParcela, baixarBoleto, ErroSicredi,
} from "../_shared/sicredi.ts";

// Processa a fila de cobrança (registrar / baixar boletos no Sicredi).
// verify_jwt = false porque o cron não tem JWT; a função valida sozinha:
//  - cron: cabeçalho x-cron-secret conferido no banco (segredo no Vault);
//  - tela: usuário logado com permissão de edição no financeiro da escola informada.
const LOTE = 30;
const CONCORRENCIA = 5;
const MAX_TENTATIVAS = 5;

type Item = {
  id: string; escola_id: string; financeiro_id: string | null; operacao: "registrar" | "baixar";
  nosso_numero: string | null; tentativas: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = clienteAdmin();
  let escolaId: string | null = null;

  const segredo = req.headers.get("x-cron-secret");
  if (segredo) {
    const { data: ok } = await admin.rpc("sicredi_cron_ok", { p_segredo: segredo });
    if (ok !== true) return json({ ok: false, erro: "Não autorizado" }, 401);
  } else {
    try { escolaId = (await req.json())?.escola_id ?? null; } catch { /* sem corpo */ }
    if (!escolaId) return json({ ok: false, erro: "escola_id é obrigatório." }, 400);
    if (!(await usuarioTemPermissao(req, escolaId, "financeiro", "editar"))) {
      return json({ ok: false, erro: "Você não tem permissão para processar boletos desta escola." }, 403);
    }
  }

  const { data: lote, error } = await admin.rpc("cobranca_fila_reservar", { p_limite: LOTE, p_escola_id: escolaId });
  if (error) return json({ ok: false, erro: "Falha ao reservar a fila: " + error.message }, 500);

  const itens = (lote ?? []) as Item[];
  const resumo = { total: itens.length, ok: 0, ignorados: 0, erros: 0, reagendados: 0 };

  const fechar = (i: Item, status: "ok" | "erro" | "pendente", nota: string | null, proxima?: Date) =>
    admin.from("cobranca_fila").update({
      status, ultimo_erro: nota, atualizado_em: new Date().toISOString(),
      processado_em: status === "pendente" ? null : new Date().toISOString(),
      ...(proxima ? { proxima_tentativa_em: proxima.toISOString() } : {}),
    }).eq("id", i.id);

  // falha transitória: tenta de novo com espera crescente, até o teto
  const reagendar = async (i: Item, motivo: string) => {
    if (i.tentativas >= MAX_TENTATIVAS) { resumo.erros++; await fechar(i, "erro", motivo.slice(0, 500)); return; }
    resumo.reagendados++;
    await fechar(i, "pendente", motivo.slice(0, 500), new Date(Date.now() + i.tentativas * i.tentativas * 60_000));
  };

  const tratar = async (i: Item) => {
    try {
      if (i.operacao === "registrar") {
        if (!i.financeiro_id) { resumo.ignorados++; await fechar(i, "ok", "título removido"); return; }
        const r = await registrarParcela(admin, i.financeiro_id);
        if (r.ok) { resumo.ok++; await fechar(i, "ok", null); return; }
        if (r.dadosInvalidos) { resumo.erros++; await fechar(i, "erro", r.erro.slice(0, 500)); return; } // cadastro incompleto: não adianta insistir
        if (/não encontrado|Só dá pra registrar/i.test(r.erro)) { resumo.ignorados++; await fechar(i, "ok", "ignorado: " + r.erro.slice(0, 200)); return; }
        await reagendar(i, r.erro);
        return;
      }

      // baixar
      if (!i.nosso_numero) { resumo.ignorados++; await fechar(i, "ok", "sem nosso número"); return; }
      const cfg = await carregarConfig(admin, i.escola_id);
      try {
        await baixarBoleto(admin, cfg, i.nosso_numero);
      } catch (e) {
        // boleto que o banco não conhece / já baixado: objetivo cumprido
        if (e instanceof ErroSicredi && (e.status === 404 || (e.status === 422 && /baix|liquid|cancel/i.test(e.message)))) {
          resumo.ignorados++; await fechar(i, "ok", "já estava baixado/inexistente: " + e.message.slice(0, 200)); return;
        }
        throw e;
      }
      resumo.ok++;
      await fechar(i, "ok", null);
    } catch (e) {
      await reagendar(i, e instanceof Error ? e.message : String(e));
    }
  };

  // pool simples: no máximo CONCORRENCIA chamadas ao Sicredi em paralelo (limite do banco: 20 TPS)
  const fila = [...itens];
  await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, fila.length) }, async () => {
    for (let i = fila.shift(); i; i = fila.shift()) await tratar(i);
  }));

  return json({ ok: true, ...resumo });
});
