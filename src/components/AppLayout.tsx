import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, Link } from "react-router-dom";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { ShieldAlert } from "lucide-react";

export function AppLayout() {
  const { emModoAdministrador, escolas, escolaAtivaId } = useEscolaAtiva();
  const escolaAtiva = escolas.find((e) => e.escola_id === escolaAtivaId);
  const escolaNome = escolaAtiva?.nome;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {emModoAdministrador && (
            <div className="h-9 shrink-0 bg-amber-500 text-amber-950 flex items-center justify-center gap-2 px-4 text-xs font-medium">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>
                Você está conectado como administrador no ambiente de <strong>{escolaNome}</strong>
                {escolaAtiva?.razao_social && <> (<strong>{escolaAtiva.razao_social}</strong>)</>} — não é sua escola de origem.
              </span>
              <Link to="/plataforma/clientes" className="underline ml-2">Voltar para Clientes</Link>
            </div>
          )}
          <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
