import { Navigate, NavLink as RouterNavLink, Outlet } from "react-router-dom";
import { BarChart3, Building2, LogOut, Receipt, ShieldAlert, ArrowLeftRight, Layers } from "lucide-react";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Visão Geral", url: "/plataforma", icon: BarChart3, end: true },
  { title: "Clientes", url: "/plataforma/clientes", icon: Building2, end: false },
  { title: "Planos", url: "/plataforma/planos", icon: Layers, end: false },
  { title: "Faturamento", url: "/plataforma/faturamento", icon: Receipt, end: false },
];

export function PlataformaLayout() {
  const { isSuperadmin, checking, user, authLoading } = useSuperadmin();
  const { signOut } = useAuth();

  if (authLoading || checking) {
    return (
      <div className="plataforma-theme min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperadmin) return <Navigate to="/" replace />;

  return (
    <div className="plataforma-theme min-h-screen flex w-full bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Plataforma</span>
          </div>
          <p className="mt-1 text-xs text-sidebar-foreground/60">Modo dono do ERP</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <RouterNavLink
              key={item.url}
              to={item.url}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </RouterNavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <RouterNavLink
            to="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ArrowLeftRight className="h-4 w-4 shrink-0" />
            <span>Painel da escola</span>
          </RouterNavLink>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 shrink-0 border-b border-border bg-card flex items-center px-6">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Console da Plataforma · {user.email}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
