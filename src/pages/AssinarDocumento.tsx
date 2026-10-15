import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssinaturaCanvas } from "@/components/AssinaturaCanvas";
import { formatarDataHoraBrasilia, urlFuncaoAssinatura, type InfoAssinatura } from "@/lib/assinaturas";
import { montarDocumento, type Documento } from "@/lib/assinaturaDocumento";

export default function AssinarDocumento() {
  const { token = "" } = useParams();
  const [doc, setDoc] = useState<Documento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoAssinatura>({ forma: "desenhada", estilo: null });
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [altura, setAltura] = useState(600);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resp = await fetch(urlFuncaoAssinatura(token), {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const corpo = await resp.json().catch(() => null);
      if (!resp.ok || !corpo) {
        setErro(corpo?.erro ?? "Não foi possível abrir o documento.");
      } else {
        setDoc(corpo as Documento);
        setErro(null);
      }
    } catch {
      setErro("Sem conexão. Confira sua internet e abra o link de novo.");
    }
    setCarregando(false);
  }, [token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    document.title = "Assinatura de documento";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const srcDoc = useMemo(() => (doc && !doc.limitado ? montarDocumento(doc) : ""), [doc]);

  const ajustarAltura = () => {
    const h = iframeRef.current?.contentDocument?.documentElement?.scrollHeight;
    if (h) setAltura(h + 8);
  };

  const imprimir = () => iframeRef.current?.contentWindow?.print();

  const assinar = async () => {
    setErroEnvio(null);
    if (!imagem) return setErroEnvio("Desenhe sua assinatura no quadro.");
    setEnviando(true);
    try {
      const resp = await fetch(urlFuncaoAssinatura(token).split("?")[0], {
        method: "POST",
        headers: { "content-type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ t: token, nome, documento: cpf, imagem, forma: info.forma, estilo: info.estilo, aceite }),
      });
      const corpo = await resp.json().catch(() => null);
      if (!resp.ok) {
        setErroEnvio(corpo?.erro ?? "Não foi possível assinar agora. Tente de novo.");
      } else {
        await carregar();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setErroEnvio("Sem conexão. Confira sua internet e tente de novo.");
    }
    setEnviando(false);
  };

  if (carregando) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Abrindo o documento…</div>;
  }

  if (erro || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-2 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Documento indisponível</h1>
          <p className="text-sm text-muted-foreground">{erro ?? "Não foi possível abrir este documento."}</p>
          <p className="text-xs text-muted-foreground">Peça um novo link para a escola.</p>
        </div>
      </div>
    );
  }

  if (doc.limitado) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-3 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
          <h1 className="text-lg font-semibold">Documento assinado</h1>
          <p className="text-sm text-muted-foreground">
            {doc.titulo}
            {doc.escola ? ` — ${doc.escola}` : ""}
            {doc.assinadoEm ? `, assinado em ${formatarDataHoraBrasilia(doc.assinadoEm)} (Brasília).` : "."}
          </p>
          <p className="text-xs text-muted-foreground">
            Por segurança, o conteúdo do contrato não fica mais disponível neste link. Peça uma cópia do documento
            assinado à escola.
          </p>
        </div>
      </div>
    );
  }

  const podeAssinar = nome.trim().length > 4 && cpf.replace(/\D/g, "").length === 11 && !!imagem && aceite && !enviando;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          {doc.escola && <p className="text-xs uppercase tracking-wider text-muted-foreground">{doc.escola}</p>}
          <h1 className="text-xl font-semibold">{doc.titulo}</h1>
          {doc.alunoNome && <p className="text-sm text-muted-foreground">Aluno(a): {doc.alunoNome}</p>}
        </header>

        {!doc.assinado && doc.escolaAssinatura && (
          <div className="rounded-xl border border-border/60 bg-card p-4 text-sm">
            <p className="font-semibold">A escola já assinou este documento.</p>
            <p className="text-muted-foreground">Leia com atenção e, se estiver de acordo, assine no final da página.</p>
          </div>
        )}

        {doc.assinado && doc.assinadoEm && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div className="text-sm">
              <p className="font-semibold">Documento assinado</p>
              <p className="text-muted-foreground">
                Por {doc.assinanteNome} em {formatarDataHoraBrasilia(doc.assinadoEm)}. Imprima ou salve uma cópia em
                PDF agora: por segurança, este link deixa de mostrar o contrato em cerca de 30 minutos. A escola
                também guarda o documento assinado.
              </p>
            </div>
          </div>
        )}

        <div>
          <Button variant="outline" size="sm" className="gap-2" onClick={imprimir}>
            <Printer className="h-4 w-4" /> Imprimir / salvar em PDF
          </Button>
        </div>

        <iframe
          ref={iframeRef}
          title={doc.titulo}
          srcDoc={srcDoc}
          sandbox="allow-same-origin allow-modals"
          onLoad={ajustarAltura}
          style={{ height: altura }}
          className="w-full rounded-xl border border-border/60 bg-white"
        />

        {!doc.assinado && (
          <section className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
            <h2 className="font-semibold">Assinar o documento</h2>
            <p className="text-xs text-muted-foreground">
              O CPF e o RG do responsável aparecem ocultos no texto acima. Para assinar, digite o CPF do
              responsável financeiro cadastrado na escola.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assinante-nome">Nome completo</Label>
                <Input
                  id="assinante-nome"
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Quem está assinando"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assinante-cpf">CPF</Label>
                <Input
                  id="assinante-cpf"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <AssinaturaCanvas onChange={(png, i) => { setImagem(png); setInfo(i); }} nomeSugerido={nome} />
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <Checkbox checked={aceite} onCheckedChange={(c) => setAceite(!!c)} className="mt-0.5" />
              <span>
                Li o documento acima e concordo com todas as suas cláusulas. Aceito assiná-lo por meio eletrônico e
                reconheço a validade desta assinatura, registrada com meu nome, CPF, data, hora e endereço de acesso.
              </span>
            </label>
            {erroEnvio && <p className="text-sm text-destructive">{erroEnvio}</p>}
            <Button className="w-full rounded-full" disabled={!podeAssinar} onClick={() => void assinar()}>
              {enviando ? "Assinando…" : "Assinar documento"}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
