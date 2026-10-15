import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@fontsource/dancing-script/latin-700.css";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/caveat/latin-700.css";

type Modo = "desenhar" | "nome" | "iniciais";

const ESTILOS = [
  { id: "dancing", rotulo: "Elegante", familia: '"Dancing Script"', peso: 700 },
  { id: "vibes", rotulo: "Clássica", familia: '"Great Vibes"', peso: 400 },
  { id: "caveat", rotulo: "Manuscrita", familia: '"Caveat"', peso: 700 },
] as const;

const PARTICULAS = new Set(["da", "de", "di", "do", "du", "das", "dos", "e"]);

export function iniciaisDe(nome: string): string {
  const letras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p && !PARTICULAS.has(p.toLowerCase()))
    .map((p) => p[0].toUpperCase());
  return letras.join(".") + (letras.length ? "." : "");
}

/** Desenha o texto em letra cursiva num PNG (data URL) com fundo branco, no mesmo formato do desenho à mão. */
async function textoParaPng(texto: string, familia: string, peso: number): Promise<string | null> {
  const t = texto.trim();
  if (!t) return null;
  await document.fonts.load(`${peso} 64px ${familia}`, t).catch(() => []);
  const largura = 640;
  const altura = 200;
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let tamanho = 96;
  ctx.font = `${peso} ${tamanho}px ${familia}, cursive`;
  while (ctx.measureText(t).width > largura - 48 && tamanho > 24) {
    tamanho -= 4;
    ctx.font = `${peso} ${tamanho}px ${familia}, cursive`;
  }
  ctx.fillText(t, largura / 2, altura / 2);
  return canvas.toDataURL("image/png");
}

const ROTULO_MODO: Record<Modo, string> = { desenhar: "Desenhar", nome: "Nome por extenso", iniciais: "Iniciais" };

/**
 * Quadro de assinatura: desenhada com o dedo/mouse, nome por extenso ou iniciais (rubrica) em letra
 * cursiva. Em qualquer modo devolve um PNG (data URL) ou null enquanto estiver vazio.
 */
export function AssinaturaCanvas({
  onChange,
  nomeSugerido = "",
}: {
  onChange: (png: string | null) => void;
  nomeSugerido?: string;
}) {
  const [modo, setModo] = useState<Modo>("desenhar");
  const [texto, setTexto] = useState(nomeSugerido);
  const [estilo, setEstilo] = useState<(typeof ESTILOS)[number]["id"]>("dancing");
  const [previas, setPrevias] = useState<Record<string, string | null>>({});
  const textoEditado = useRef(false);

  // O nome digitado no formulário acompanha a assinatura digitada, até a pessoa editar o campo daqui.
  useEffect(() => {
    if (!textoEditado.current) setTexto(nomeSugerido);
  }, [nomeSugerido]);

  const baseTexto = modo === "iniciais" ? iniciaisDe(texto) : texto.trim();

  useEffect(() => {
    if (modo === "desenhar") return;
    let cancelado = false;
    void (async () => {
      const novas: Record<string, string | null> = {};
      for (const e of ESTILOS) novas[e.id] = await textoParaPng(baseTexto, e.familia, e.peso);
      if (cancelado) return;
      setPrevias(novas);
      onChange(novas[estilo] ?? null);
    })();
    return () => {
      cancelado = true;
    };
    // onChange vem do pai e muda a cada render; só reage ao texto, estilo e modo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, baseTexto, estilo]);

  const trocarModo = (m: Modo) => {
    if (m === modo) return;
    setModo(m);
    setPrevias({});
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm">
        {(Object.keys(ROTULO_MODO) as Modo[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => trocarModo(m)}
            className={`rounded-md px-2 py-1.5 transition-colors ${
              modo === m ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {ROTULO_MODO[m]}
          </button>
        ))}
      </div>

      {modo === "desenhar" ? (
        <QuadroDesenho onChange={onChange} />
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="assinatura-texto">
              {modo === "nome" ? "Nome que vai aparecer na assinatura" : "Nome (as iniciais são geradas a partir dele)"}
            </label>
            <Input
              id="assinatura-texto"
              value={texto}
              onChange={(e) => {
                textoEditado.current = true;
                setTexto(e.target.value);
              }}
              placeholder="Nome completo"
              maxLength={150}
            />
            {modo === "iniciais" && baseTexto && (
              <p className="text-xs text-muted-foreground">Iniciais: {baseTexto}</p>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {ESTILOS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEstilo(e.id)}
                aria-pressed={estilo === e.id}
                className={`rounded-lg border bg-white p-2 text-left transition-colors ${
                  estilo === e.id ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
                }`}
              >
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-500">{e.rotulo}</span>
                {previas[e.id] ? (
                  <img src={previas[e.id]!} alt={`Assinatura ${e.rotulo}`} className="h-14 w-full object-contain" />
                ) : (
                  <span className="flex h-14 items-center justify-center text-xs text-neutral-400">
                    {baseTexto ? "…" : "Digite o nome"}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Escolha o estilo da assinatura. O documento registra o seu nome, CPF, data, hora e endereço de acesso,
            seja qual for a forma escolhida.
          </p>
        </div>
      )}
    </div>
  );
}

function QuadroDesenho({ onChange }: { onChange: (png: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const temTraco = useRef(false);

  const preparar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.offsetWidth * escala);
    canvas.height = Math.round(canvas.offsetHeight * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    temTraco.current = false;
  }, []);

  useEffect(() => {
    preparar();
  }, [preparar]);

  const ponto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const iniciar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    desenhando.current = true;
    const { x, y } = ponto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    temTraco.current = true;
  };

  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = ponto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const terminar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando.current) return;
    desenhando.current = false;
    onChange(temTraco.current ? e.currentTarget.toDataURL("image/png") : null);
  };

  const limpar = () => {
    preparar();
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        aria-label="Quadro para desenhar a assinatura"
        className="h-40 w-full cursor-crosshair touch-none rounded-lg border border-border bg-white"
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Desenhe sua assinatura acima com o dedo ou o mouse.</span>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={limpar}>
          <Eraser className="h-3.5 w-3.5" /> Limpar
        </Button>
      </div>
    </div>
  );
}
