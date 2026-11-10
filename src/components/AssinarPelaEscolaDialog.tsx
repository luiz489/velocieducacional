import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssinaturaCanvas } from "@/components/AssinaturaCanvas";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import type { InfoAssinatura } from "@/lib/assinaturas";

const CHAVE_CARGO = "assinatura-escola-cargo";

type Props = {
  assinaturaId: string | null;
  titulo: string;
  alunoNome?: string;
  onClose: () => void;
  onAssinado: () => void;
};

/** Converte a imagem (de uma URL assinada do Storage) para data URL base64 PNG, no formato que o RPC exige. */
async function urlParaPngBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a imagem.");
  ctx.drawImage(bitmap, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Assinatura da escola (diretora), feita logada, antes de liberar o link para a família. */
export function AssinarPelaEscolaDialog({ assinaturaId, titulo, alunoNome, onClose, onAssinado }: Props) {
  const { escolaAtivaId } = useEscolaAtiva();
  const [cargo, setCargo] = useState("Diretora");
  const [imagem, setImagem] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoAssinatura>({ forma: "desenhada", estilo: null });
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false);

  useEffect(() => {
    if (!assinaturaId) return;
    setImagem(null);
    setAceite(false);
    setMostrarManual(false);
    try {
      const salvo = localStorage.getItem(CHAVE_CARGO);
      if (salvo) setCargo(salvo);
    } catch { /* sem armazenamento local: segue com o padrão */ }
  }, [assinaturaId]);

  const { data: corpo } = useQuery({
    queryKey: ["assinatura-corpo", assinaturaId],
    enabled: !!assinaturaId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from("assinaturas_documentos").select("corpo_html").eq("id", assinaturaId!).maybeSingle();
      if (error) throw error;
      return (data?.corpo_html ?? "") as string;
    },
  });

  const { data: meuNome } = useQuery({
    queryKey: ["meu-nome-assinatura"],
    enabled: !!assinaturaId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return "";
      const { data } = await supabase.from("profiles").select("full_name").eq("id", u.user.id).maybeSingle();
      return data?.full_name ?? "";
    },
  });

  const { data: escolaAssinatura } = useQuery({
    queryKey: ["escola-assinatura-padrao", escolaAtivaId],
    enabled: !!assinaturaId && !!escolaAtivaId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("escolas")
        .select("assinatura_padrao_path, assinatura_padrao_cargo")
        .eq("id", escolaAtivaId!)
        .maybeSingle();
      return data as { assinatura_padrao_path: string | null; assinatura_padrao_cargo: string | null } | null;
    },
  });
  const { data: assinaturaPadraoUrl } = useSignedUrl("escola-logos", escolaAssinatura?.assinatura_padrao_path);

  const gravar = async (dadosImagem: string, dadosInfo: InfoAssinatura, dadosCargo: string) => {
    if (!assinaturaId) return;
    setEnviando(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("assinar_documento_pela_escola", {
      p_id: assinaturaId,
      p_cargo: dadosCargo,
      p_imagem: dadosImagem,
      p_forma: dadosInfo.forma,
      p_estilo: dadosInfo.estilo,
    });
    setEnviando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    try { localStorage.setItem(CHAVE_CARGO, dadosCargo.trim()); } catch { /* ignora */ }
    toast.success("Assinado pela escola");
    onAssinado();
  };

  const assinarComPadrao = async () => {
    if (!assinaturaPadraoUrl) return;
    const cargoPadrao = escolaAssinatura?.assinatura_padrao_cargo?.trim() || "Diretora";
    if (!confirm(`Assinar "${titulo}"${alunoNome ? ` — ${alunoNome}` : ""} com a assinatura salva (${cargoPadrao})?`)) return;
    setEnviando(true);
    try {
      const png = await urlParaPngBase64(assinaturaPadraoUrl);
      await gravar(png, { forma: "padrao", estilo: null }, cargoPadrao);
    } catch {
      setEnviando(false);
      toast.error("Não foi possível usar a assinatura salva. Tente assinar manualmente.");
    }
  };

  const assinarManual = () => {
    if (!imagem) return;
    void gravar(imagem, info, cargo);
  };

  const prontoManual = !!imagem && aceite && cargo.trim().length >= 2 && !enviando;

  return (
    <Dialog open={!!assinaturaId} onOpenChange={(open) => !open && !enviando && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assinar em nome da escola</DialogTitle>
          <DialogDescription>
            {titulo}{alunoNome ? ` — ${alunoNome}` : ""}. A assinatura fica registrada com o seu usuário, a data, a
            hora e o endereço de acesso. Só depois dela o link é liberado para a família.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <iframe
            title="Documento a assinar"
            sandbox="allow-same-origin"
            srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;font-size:13px;line-height:1.5;margin:12px;color:#000;background:#fff}img{max-width:100%}</style></head><body>${corpo ?? "Carregando…"}</body></html>`}
            className="h-64 w-full rounded-md border bg-white"
          />

          {assinaturaPadraoUrl && !mostrarManual ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-24 rounded border bg-white flex items-center justify-center overflow-hidden shrink-0">
                  <img src={assinaturaPadraoUrl} alt="Assinatura padrão" className="h-full w-full object-contain" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Assinatura salva de <span className="font-medium text-foreground">{escolaAssinatura?.assinatura_padrao_cargo || "Diretora"}</span>.
                </p>
              </div>
              <Button className="w-full gap-2" disabled={enviando} onClick={() => void assinarComPadrao()}>
                <PenLine className="h-4 w-4" /> {enviando ? "Assinando…" : "Assinar com esta assinatura"}
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setMostrarManual(true)}
                  disabled={enviando}
                >
                  Não é esta pessoa quem está assinando? Desenhar ou digitar outra assinatura
                </button>
                <Button variant="ghost" size="sm" onClick={onClose} disabled={enviando}>Assinar depois</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {assinaturaPadraoUrl && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setMostrarManual(false)}
                >
                  ← Usar a assinatura salva em vez de desenhar
                </button>
              )}
              <div className="space-y-2">
                <Label htmlFor="cargo-assinante">Cargo de quem assina</Label>
                <Input id="cargo-assinante" value={cargo} onChange={(e) => setCargo(e.target.value)} maxLength={80} />
              </div>
              <AssinaturaCanvas onChange={(png, i) => { setImagem(png); setInfo(i); }} nomeSugerido={meuNome ?? ""} />
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox checked={aceite} onCheckedChange={(c) => setAceite(!!c)} className="mt-0.5" />
                <span>
                  Li o documento, tenho poderes para assiná-lo em nome da escola e concordo com o seu conteúdo. Aceito
                  assinar por meio eletrônico.
                </span>
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose} disabled={enviando}>Assinar depois</Button>
                <Button onClick={assinarManual} disabled={!prontoManual}>
                  {enviando ? "Assinando…" : "Assinar pela escola"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
