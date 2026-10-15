import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { CheckCircle2, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Boleto = {
  situacao: "aberto" | "vencido" | "pago" | "expirado" | "indisponivel";
  mensagem?: string;
  escola: string | null;
  aluno: string;
  turma: string | null;
  descricao: string;
  vencimento: string;
  valor_ate_vencimento: number;
  valor_integral: number;
  pix_valido_ate: string;
  data_pagamento?: string | null;
  pix_copia_e_cola?: string | null;
  linha_digitavel?: string;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

function formatarLinha(l: string) {
  const d = l.replace(/\D/g, "");
  if (d.length !== 47) return l;
  return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
}

function Copiavel({ rotulo, valor, exibir }: { rotulo: string; valor: string; exibir?: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      const area = document.createElement("textarea");
      area.value = valor;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{rotulo}</p>
      <p className="break-all rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">{exibir ?? valor}</p>
      <Button type="button" variant="outline" className="w-full" onClick={copiar}>
        {copiado ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
        {copiado ? "Copiado!" : "Copiar"}
      </Button>
    </div>
  );
}

export default function BoletoPublico() {
  const { token = "" } = useParams();
  const [boleto, setBoleto] = useState<Boleto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [qr, setQr] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/boleto-publico?t=${encodeURIComponent(token)}`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const corpo = await resp.json().catch(() => null);
      if (!resp.ok || !corpo) setErro(corpo?.erro ?? "Não foi possível abrir o boleto.");
      else setBoleto(corpo as Boleto);
    } catch {
      setErro("Sem conexão. Confira sua internet e abra o link de novo.");
    }
    setCarregando(false);
  }, [token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    document.title = "Boleto";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!boleto?.pix_copia_e_cola) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(boleto.pix_copia_e_cola, { margin: 1, width: 280 }).then(setQr).catch(() => setQr(null));
  }, [boleto?.pix_copia_e_cola]);

  const temDesconto = boleto ? boleto.valor_integral - boleto.valor_ate_vencimento > 0.004 : false;
  const vencido = boleto?.situacao === "vencido";
  const valorAgora = boleto ? (vencido ? boleto.valor_integral : boleto.valor_ate_vencimento) : 0;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        {carregando && <p className="py-16 text-center text-sm text-muted-foreground">Carregando boleto…</p>}

        {erro && (
          <div className="rounded-lg border bg-background p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
            <p className="text-sm">{erro}</p>
          </div>
        )}

        {boleto && (
          <>
            <header className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{boleto.escola}</p>
              <h1 className="mt-1 text-xl font-semibold">{boleto.descricao}</h1>
              <p className="text-sm text-muted-foreground">
                Aluno(a): {boleto.aluno}
                {boleto.turma ? ` · ${boleto.turma}` : ""}
              </p>
            </header>

            {boleto.situacao === "pago" && (
              <div className="rounded-lg border bg-background p-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
                <p className="font-medium">Pagamento confirmado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {boleto.data_pagamento ? `Recebido em ${dataBr(boleto.data_pagamento)}. ` : ""}Obrigado!
                </p>
              </div>
            )}

            {(boleto.situacao === "indisponivel" || boleto.situacao === "expirado") && (
              <div className="rounded-lg border bg-background p-6 text-center">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
                <p className="text-sm">{boleto.mensagem}</p>
              </div>
            )}

            {(boleto.situacao === "aberto" || boleto.situacao === "vencido") && (
              <>
                <section className="rounded-lg border bg-background p-5 text-center">
                  <p className="text-sm text-muted-foreground">
                    {vencido ? "Valor atualizado" : `Valor até ${dataBr(boleto.vencimento)}`}
                  </p>
                  <p className="text-3xl font-bold tabular-nums">{brl(valorAgora)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Vencimento: {dataBr(boleto.vencimento)}</p>
                  {temDesconto && !vencido && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Após o vencimento: {brl(boleto.valor_integral)} + multa e juros.
                    </p>
                  )}
                  {vencido && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Boleto vencido. O banco soma multa e juros ao valor no pagamento.
                    </p>
                  )}
                </section>

                {boleto.pix_copia_e_cola && (
                  <section className="space-y-4 rounded-lg border bg-background p-5">
                    <h2 className="font-medium">Pagar com Pix</h2>
                    {qr && (
                      <img src={qr} alt="QR Code Pix" className="mx-auto h-56 w-56 rounded-md border bg-white p-2" />
                    )}
                    <p className="text-center text-xs text-muted-foreground">
                      Abra o app do seu banco e leia o QR Code, ou use o Pix copia e cola.
                    </p>
                    <Copiavel rotulo="Pix copia e cola" valor={boleto.pix_copia_e_cola} />
                  </section>
                )}

                {boleto.linha_digitavel && (
                  <section className="space-y-4 rounded-lg border bg-background p-5">
                    <h2 className="font-medium">Pagar com boleto</h2>
                    <Copiavel
                      rotulo="Linha digitável"
                      valor={boleto.linha_digitavel.replace(/\D/g, "")}
                      exibir={formatarLinha(boleto.linha_digitavel)}
                    />
                  </section>
                )}

                <p className="px-2 text-center text-xs text-muted-foreground">
                  O pagamento é identificado automaticamente. Em caso de dúvida, fale com a escola.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
