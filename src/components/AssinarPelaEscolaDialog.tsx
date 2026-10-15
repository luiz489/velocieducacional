import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssinaturaCanvas } from "@/components/AssinaturaCanvas";
import { toast } from "sonner";

const CHAVE_CARGO = "assinatura-escola-cargo";

type Props = {
  assinaturaId: string | null;
  titulo: string;
  alunoNome?: string;
  onClose: () => void;
  onAssinado: () => void;
};

/** Assinatura da escola (diretora), feita logada, antes de liberar o link para a família. */
export function AssinarPelaEscolaDialog({ assinaturaId, titulo, alunoNome, onClose, onAssinado }: Props) {
  const [cargo, setCargo] = useState("Diretora");
  const [imagem, setImagem] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!assinaturaId) return;
    setImagem(null);
    setAceite(false);
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

  const assinar = async () => {
    if (!assinaturaId || !imagem) return;
    setEnviando(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("assinar_documento_pela_escola", {
      p_id: assinaturaId,
      p_cargo: cargo,
      p_imagem: imagem,
    });
    setEnviando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    try { localStorage.setItem(CHAVE_CARGO, cargo.trim()); } catch { /* ignora */ }
    toast.success("Assinado pela escola");
    onAssinado();
  };

  const pronto = !!imagem && aceite && cargo.trim().length >= 2 && !enviando;

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
          <div className="space-y-2">
            <Label htmlFor="cargo-assinante">Cargo de quem assina</Label>
            <Input id="cargo-assinante" value={cargo} onChange={(e) => setCargo(e.target.value)} maxLength={80} />
          </div>
          <AssinaturaCanvas onChange={setImagem} nomeSugerido={meuNome ?? ""} />
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox checked={aceite} onCheckedChange={(c) => setAceite(!!c)} className="mt-0.5" />
            <span>
              Li o documento, tenho poderes para assiná-lo em nome da escola e concordo com o seu conteúdo. Aceito
              assinar por meio eletrônico.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={enviando}>Assinar depois</Button>
            <Button onClick={() => void assinar()} disabled={!pronto}>
              {enviando ? "Assinando…" : "Assinar pela escola"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
