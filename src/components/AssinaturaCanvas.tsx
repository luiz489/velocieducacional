import { useCallback, useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Quadro para assinar com o dedo ou o mouse. Devolve um PNG (data URL) ou null enquanto estiver vazio. */
export function AssinaturaCanvas({ onChange }: { onChange: (png: string | null) => void }) {
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
