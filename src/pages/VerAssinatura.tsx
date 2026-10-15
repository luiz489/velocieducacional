import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { montarDocumento, type Documento } from "@/lib/assinaturaDocumento";

/** Contrato completo para a escola (usuário logado): mostra o texto congelado, com o CPF inteiro, e imprime/salva em PDF. */
export default function VerAssinatura() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [altura, setAltura] = useState(700);

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ["assinatura-ver", id],
    enabled: !!id,
    queryFn: async (): Promise<Documento> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("assinaturas_documentos")
        .select("*, escolas(nome), alunos(nome)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Documento não encontrado.");

      let html: string = data.corpo_html;
      const m = html.match(/data-logo-path="([^"]*)"/);
      if (m) {
        const { data: url } = m[1] ? await supabase.storage.from("escola-logos").createSignedUrl(m[1], 3600) : { data: null };
        html = url?.signedUrl
          ? html.replace(`data-logo-path="${m[1]}"`, `src="${url.signedUrl}"`)
          : html.replace(/<img data-logo-path="[^"]*"[^>]*\/>/, "");
      }

      return {
        escolaAssinatura: data.escola_assinou_em
          ? {
              nome: data.escola_assinante_nome,
              cargo: data.escola_assinante_cargo,
              assinadoEm: data.escola_assinou_em,
              ip: data.escola_assinante_ip,
              imagem: data.escola_assinatura_imagem,
              forma: data.escola_assinatura_forma,
              estilo: data.escola_assinatura_estilo,
            }
          : null,
        escola: data.escolas?.nome ?? null,
        titulo: data.titulo,
        alunoNome: data.alunos?.nome ?? null,
        html,
        assinado: !!data.assinado_em,
        assinadoEm: data.assinado_em,
        assinanteNome: data.assinante_nome,
        assinanteDocumento: data.assinante_documento,
        assinanteIp: data.assinante_ip,
        hashDocumento: data.hash_documento,
        assinaturaImagem: data.assinatura_imagem,
        assinaturaForma: data.assinatura_forma,
        assinaturaEstilo: data.assinatura_estilo,
        cpfConferido: data.cpf_conferido ?? null,
      };
    },
  });

  const srcDoc = useMemo(() => (doc ? montarDocumento(doc) : ""), [doc]);

  const ajustarAltura = () => {
    const h = iframeRef.current?.contentDocument?.documentElement?.scrollHeight;
    if (h) setAltura(h + 8);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-1 gap-1" onClick={() => navigate("/assinaturas")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-xl font-bold tracking-tight">{doc?.titulo ?? "Documento"}</h1>
          {doc?.alunoNome && <p className="text-sm text-muted-foreground">Aluno(a): {doc.alunoNome}</p>}
        </div>
        <Button className="gap-2" disabled={!doc} onClick={() => iframeRef.current?.contentWindow?.print()}>
          <Printer className="h-4 w-4" /> Imprimir / salvar em PDF
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Abrindo o documento…</p>}
      {error && <p className="text-sm text-destructive">Não foi possível abrir este documento.</p>}
      {doc && (
        <>
          {!doc.assinado && (
            <p className="rounded-md border border-border/60 bg-card p-3 text-sm text-muted-foreground">
              Este documento ainda não foi assinado pela família
              {doc.escolaAssinatura ? " (a escola já assinou)." : " nem pela escola."}
            </p>
          )}
          <iframe
            ref={iframeRef}
            title={doc.titulo}
            srcDoc={srcDoc}
            sandbox="allow-same-origin allow-modals"
            onLoad={ajustarAltura}
            style={{ height: altura }}
            className="w-full rounded-xl border border-border/60 bg-white"
          />
        </>
      )}
    </div>
  );
}
