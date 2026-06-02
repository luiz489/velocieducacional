import { Link } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Receipt,
  CreditCard,
  Copy,
  Calendar,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { gerarCarnePDF } from "@/lib/carne";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AlunoVinculado = {
  id: string;
  nome: string;
  turma: string;
  matricula: string;
};

const RESPONSAVEL = "Família Silva";

const alunosDoResponsavel: AlunoVinculado[] = [
  { id: "a1", nome: "Lucas Silva", turma: "7º Ano A", matricula: "2026-0142" },
  { id: "a2", nome: "Sofia Silva", turma: "3º Ano B", matricula: "2026-0188" },
];

type Parcela = {
  id: string;
  descricao: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: "Pago" | "Em aberto" | "Vencido";
  pago_em?: string;
  metodo?: string;
};

const parcelas: Parcela[] = [
  { id: "06", descricao: "Mensalidade Junho/2026", competencia: "Jun/2026", vencimento: "10/06/2026", valor: 1850, status: "Em aberto" },
  { id: "07", descricao: "Mensalidade Julho/2026", competencia: "Jul/2026", vencimento: "10/07/2026", valor: 1850, status: "Em aberto" },
  { id: "08", descricao: "Material Didático 2º Sem", competencia: "Jul/2026", vencimento: "15/07/2026", valor: 620, status: "Em aberto" },
  { id: "05", descricao: "Mensalidade Maio/2026", competencia: "Mai/2026", vencimento: "10/05/2026", valor: 1850, status: "Vencido" },
  { id: "04", descricao: "Mensalidade Abril/2026", competencia: "Abr/2026", vencimento: "10/04/2026", valor: 1850, status: "Pago", pago_em: "08/04/2026", metodo: "Pix" },
  { id: "03", descricao: "Mensalidade Março/2026", competencia: "Mar/2026", vencimento: "10/03/2026", valor: 1850, status: "Pago", pago_em: "09/03/2026", metodo: "Boleto" },
  { id: "02", descricao: "Mensalidade Fevereiro/2026", competencia: "Fev/2026", vencimento: "10/02/2026", valor: 1850, status: "Pago", pago_em: "10/02/2026", metodo: "Pix" },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusStyles: Record<Parcela["status"], string> = {
  "Pago": "bg-success/15 text-success",
  "Em aberto": "bg-warning/15 text-warning",
  "Vencido": "bg-destructive/15 text-destructive",
};

export default function AppFinanceiro() {
  const [tab, setTab] = useState<"abertas" | "historico">("abertas");
  const [carneOpen, setCarneOpen] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>(alunosDoResponsavel[0].id);
  const [filtroCarne, setFiltroCarne] = useState<"em_aberto" | "vencidas" | "todas">("em_aberto");
  const [usarIntervalo, setUsarIntervalo] = useState(false);
  const [mesInicio, setMesInicio] = useState("2026-01");
  const [mesFim, setMesFim] = useState("2026-12");

  // dd/mm/yyyy -> yyyy-mm
  const venc2YM = (v: string) => {
    const [, m, y] = v.split("/");
    return `${y}-${m}`;
  };

  const baixarCarne = () => {
    const aluno = alunosDoResponsavel.find((a) => a.id === alunoSelecionado);
    if (!aluno) return;

    let filtradas = parcelas;
    if (filtroCarne === "em_aberto") {
      filtradas = parcelas.filter((p) => p.status === "Em aberto");
    } else if (filtroCarne === "vencidas") {
      filtradas = parcelas.filter((p) => p.status === "Vencido");
    } else if (filtroCarne === "todas") {
      filtradas = parcelas.filter((p) => p.status !== "Pago");
    }

    if (usarIntervalo) {
      if (mesInicio > mesFim) {
        toast.error("Intervalo inválido: mês inicial após o final.");
        return;
      }
      filtradas = filtradas.filter((p) => {
        const ym = venc2YM(p.vencimento);
        return ym >= mesInicio && ym <= mesFim;
      });
    }

    const parcelasPDF = filtradas.map((p) => ({
      id: p.id,
      descricao: p.descricao,
      vencimento: p.vencimento,
      valor: p.valor,
    }));

    if (parcelasPDF.length === 0) {
      toast.error("Nenhuma parcela encontrada para o filtro selecionado.");
      return;
    }

    gerarCarnePDF(
      { nome: aluno.nome, turma: aluno.turma, responsavel: RESPONSAVEL, matricula: aluno.matricula },
      parcelasPDF,
    );
    setCarneOpen(false);
    toast.success(`Carnê de ${aluno.nome} gerado com sucesso!`);
  };

  const abertas = parcelas.filter((p) => p.status !== "Pago");
  const pagas = parcelas.filter((p) => p.status === "Pago");
  const totalAberto = abertas.reduce((s, p) => s + p.valor, 0);
  const vencidas = abertas.filter((p) => p.status === "Vencido");
  const proxima = abertas
    .filter((p) => p.status === "Em aberto")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];

  const copiarLinha = () => {
    navigator.clipboard.writeText("34191.79001 01043.510047 91020.150008 9 95820000185000");
    toast.success("Linha digitável copiada");
  };

  const lista = tab === "abertas" ? abertas : pagas;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary to-orange-500 text-primary-foreground px-5 pt-6 pb-10 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/app" className="h-9 w-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-wider opacity-80">Financeiro</p>
            <p className="text-base font-semibold">Lucas Silva · 7º Ano A</p>
          </div>
        </div>

        <div>
          <p className="text-xs opacity-80">Total em aberto</p>
          <p className="text-3xl font-bold mt-1">{brl(totalAberto)}</p>
          <div className="flex items-center gap-3 mt-3 text-xs">
            <span className="flex items-center gap-1 bg-white/15 px-2 py-1 rounded-full">
              <Clock className="h-3 w-3" /> {abertas.length} parcelas
            </span>
            {vencidas.length > 0 && (
              <span className="flex items-center gap-1 bg-destructive/30 px-2 py-1 rounded-full">
                <AlertCircle className="h-3 w-3" /> {vencidas.length} vencida{vencidas.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Próxima parcela / carnê */}
      {proxima && (
        <section className="px-4 -mt-6">
          <div className="bg-card border rounded-2xl shadow-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Próximo vencimento</p>
                <p className="text-sm font-semibold mt-0.5">{proxima.descricao}</p>
              </div>
              <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${statusStyles[proxima.status]}`}>
                {proxima.status}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {proxima.vencimento}
                </p>
                <p className="text-2xl font-bold text-primary mt-1">{brl(proxima.valor)}</p>
              </div>
              <button
                onClick={copiarLinha}
                className="flex items-center gap-1 text-xs font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 active:scale-95 transition"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar Pix
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Ações rápidas */}
      <section className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setCarneOpen(true)}
            className="bg-card border rounded-xl p-3 flex flex-col items-center gap-1.5 hover:shadow-md transition active:scale-95"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium">Carnê PDF</span>
          </button>
          <button className="bg-card border rounded-xl p-3 flex flex-col items-center gap-1.5 hover:shadow-md transition active:scale-95">
            <div className="h-9 w-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium">2ª via boleto</span>
          </button>
          <button className="bg-card border rounded-xl p-3 flex flex-col items-center gap-1.5 hover:shadow-md transition active:scale-95">
            <div className="h-9 w-9 rounded-lg bg-success/15 text-success flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium">Extrato IR</span>
          </button>
        </div>
      </section>

      {/* Tabs */}
      <section className="px-4 pt-5">
        <div className="bg-muted rounded-xl p-1 flex">
          <button
            onClick={() => setTab("abertas")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition ${
              tab === "abertas" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Em aberto ({abertas.length})
          </button>
          <button
            onClick={() => setTab("historico")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition ${
              tab === "historico" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Histórico ({pagas.length})
          </button>
        </div>
      </section>

      {/* Lista */}
      <section className="px-4 pt-3 space-y-2">
        {lista.map((p) => (
          <div key={p.id} className="bg-card border rounded-xl p-3 flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                p.status === "Pago"
                  ? "bg-success/15 text-success"
                  : p.status === "Vencido"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-warning/15 text-warning"
              }`}
            >
              {p.status === "Pago" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : p.status === "Vencido" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.descricao}</p>
              <p className="text-[11px] text-muted-foreground">
                {p.status === "Pago"
                  ? `Pago em ${p.pago_em} · ${p.metodo}`
                  : `Vence em ${p.vencimento}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{brl(p.valor)}</p>
              {p.status !== "Pago" && (
                <button className="text-[10px] text-primary font-semibold mt-0.5 hover:underline">
                  Ver boleto
                </button>
              )}
              {p.status === "Pago" && (
                <button className="text-[10px] text-muted-foreground font-semibold mt-0.5 hover:underline flex items-center gap-0.5 ml-auto">
                  <Download className="h-2.5 w-2.5" /> Recibo
                </button>
              )}
            </div>
          </div>
        ))}
        {lista.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-10">
            Nenhuma parcela {tab === "abertas" ? "em aberto" : "paga"}.
          </div>
        )}
      </section>

      {/* Diálogo: selecionar aluno para baixar carnê */}
      <Dialog open={carneOpen} onOpenChange={setCarneOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Baixar carnê</DialogTitle>
            <DialogDescription>
              Selecione o aluno e o tipo de parcelas para gerar o carnê em PDF.
            </DialogDescription>
          </DialogHeader>

          {/* Filtro de parcelas */}
          <div className="py-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Parcelas</p>
            <div className="flex gap-2">
              {([
                { key: "em_aberto", label: "Em aberto" },
                { key: "vencidas", label: "Vencidas" },
                { key: "todas", label: "Todas" },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFiltroCarne(opt.key)}
                  className={`flex-1 text-[11px] font-semibold py-2 rounded-xl border transition ${
                    filtroCarne === opt.key
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intervalo de vencimentos */}
          <div className="py-1">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-muted-foreground">
                Filtrar por intervalo de vencimento
              </span>
              <input
                type="checkbox"
                checked={usarIntervalo}
                onChange={(e) => setUsarIntervalo(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
            {usarIntervalo && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label htmlFor="mes-inicio" className="text-[10px] text-muted-foreground">
                    De
                  </Label>
                  <Input
                    id="mes-inicio"
                    type="month"
                    value={mesInicio}
                    onChange={(e) => setMesInicio(e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mes-fim" className="text-[10px] text-muted-foreground">
                    Até
                  </Label>
                  <Input
                    id="mes-fim"
                    type="month"
                    value={mesFim}
                    onChange={(e) => setMesFim(e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
              </div>
            )}
          </div>


          <div className="space-y-2 py-2">
            <p className="text-xs font-medium text-muted-foreground">Aluno</p>
            {alunosDoResponsavel.map((a) => {
              const ativo = alunoSelecionado === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setAlunoSelecionado(a.id)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition ${
                    ativo
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center">
                    {a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.turma} · Matrícula {a.matricula}
                    </p>
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      ativo ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCarneOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={baixarCarne} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
