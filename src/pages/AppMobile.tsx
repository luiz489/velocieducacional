import { Link } from "react-router-dom";
import {
  GraduationCap,
  DollarSign,
  Clock,
  CalendarDays,
  Megaphone,
  MessageCircle,
  AlertCircle,
  ShieldAlert,
  CalendarClock,
  CalendarRange,
  ClipboardEdit,
  IdCard,
  Bell,
  User,
} from "lucide-react";
import logoDM from "@/assets/logo-dm.png";

type Tile = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  badge?: number;
  accent?: "primary" | "navy";
};

const tiles: Tile[] = [
  { title: "Notas", icon: GraduationCap, to: "/notas", accent: "primary" },
  { title: "Financeiro", icon: DollarSign, to: "/app/financeiro", badge: 2, accent: "primary" },
  { title: "Horário Escolar", icon: Clock, to: "/horarios", accent: "navy" },
  { title: "Calendário Anual", icon: CalendarDays, to: "/calendario", accent: "navy" },
  { title: "Avisos Secretaria", icon: Megaphone, to: "/avisos?canal=secretaria", badge: 3, accent: "primary" },
  { title: "Canal Coordenação", icon: MessageCircle, to: "/avisos?canal=coordenacao", accent: "navy" },
  { title: "Avisos Cobrança", icon: AlertCircle, to: "/avisos?canal=cobranca", badge: 1, accent: "primary" },
  { title: "Canal Bullying", icon: ShieldAlert, to: "/avisos?canal=bullying", accent: "navy" },
  { title: "Horário 2026", icon: CalendarClock, to: "/horarios?ano=2026", accent: "primary" },
  { title: "Calendários Acadêmicos", icon: CalendarRange, to: "/calendario?tipo=academico", accent: "navy" },
  { title: "(Re)matrícula", icon: ClipboardEdit, to: "/rematricula", accent: "primary" },
  { title: "Carteirinha", icon: IdCard, to: "/carteirinhas", accent: "navy" },
];

export default function AppMobile() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary to-orange-500 text-primary-foreground px-5 pt-8 pb-12 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src={logoDM} alt="Colégio DM" className="h-9 w-9 rounded-full bg-white p-0.5" />
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-80">Colégio DM</p>
              <p className="text-sm font-semibold">Área do Responsável</p>
            </div>
          </div>
          <button
            type="button"
            className="relative h-10 w-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center">
              6
            </span>
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs opacity-80">Olá,</p>
          <h1 className="text-2xl font-bold leading-tight">Família Silva 👋</h1>
          <p className="text-xs opacity-90">Acompanhe a vida escolar do seu filho.</p>
        </div>
      </header>

      {/* Aluno card */}
      <section className="px-4 -mt-7">
        <div className="bg-card border rounded-2xl shadow-md p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Lucas Silva</p>
            <p className="text-xs text-muted-foreground truncate">7º Ano A · Fundamental II · 2026</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-1 rounded-full">
            Ativo
          </span>
        </div>
      </section>

      {/* Tiles grid */}
      <section className="px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Acesso rápido</h2>
          <span className="text-[11px] text-muted-foreground">{tiles.length} itens</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const isPrimary = tile.accent === "primary";
            return (
              <Link
                key={tile.title}
                to={tile.to}
                className="relative aspect-square rounded-2xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all p-2.5 flex flex-col items-center justify-center gap-2 text-center"
              >
                {tile.badge ? (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {tile.badge}
                  </span>
                ) : null}
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    isPrimary
                      ? "bg-primary/12 text-primary"
                      : "bg-accent/12 text-accent"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium leading-tight text-foreground line-clamp-2">
                  {tile.title}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t shadow-lg flex justify-around py-2 px-4 max-w-md mx-auto">
        <button className="flex flex-col items-center gap-0.5 text-primary">
          <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-semibold">Início</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground">
          <Megaphone className="h-5 w-5" />
          <span className="text-[10px]">Avisos</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground">
          <DollarSign className="h-5 w-5" />
          <span className="text-[10px]">Financeiro</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground">
          <User className="h-5 w-5" />
          <span className="text-[10px]">Perfil</span>
        </button>
      </nav>
    </div>
  );
}
