import {
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  Receipt,
  Landmark,
  GraduationCap,
  ClipboardList,
  UserCheck,
  AlertTriangle,
  Settings,
  Building2,
  Layers,
  ShieldAlert,
  ShoppingCart,
  LogOut,
  MapPin,
  Megaphone,
  Clock,
  CalendarDays,
  ClipboardEdit,
  IdCard,
  FileText,
  FileSignature,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { useQuery } from "@tanstack/react-query";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuGroups = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Secretaria",
    items: [
      { title: "Alunos", url: "/alunos", icon: Users },
      { title: "Turmas", url: "/turmas", icon: BookOpen },
      { title: "Matrículas", url: "/matriculas", icon: ClipboardList },
      { title: "(Re)matrícula", url: "/rematricula", icon: ClipboardEdit },
      { title: "Carteirinhas", url: "/carteirinhas", icon: IdCard },
      { title: "Categorias/Segmentos", url: "/categorias", icon: Layers },
      { title: "Disciplinas", url: "/disciplinas", icon: BookOpen },
      { title: "Horário Escolar", url: "/horarios", icon: Clock },
      { title: "Calendários", url: "/calendario", icon: CalendarDays },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Contas a Receber", url: "/financeiro", icon: DollarSign },
      { title: "Central de Faturamento", url: "/faturamento", icon: Receipt },
      { title: "Parametrizações Financeiras", url: "/parametrizacoes-financeiras", icon: Landmark },
      { title: "Contas a Pagar", url: "/contas-a-pagar", icon: ClipboardList },
      { title: "Planos por Turma", url: "/planos-financeiros", icon: Wallet },
      { title: "Contratos", url: "/contratos", icon: ClipboardList },
      { title: "Compras", url: "/compras", icon: ShoppingCart },
    ],
  },
  {
    label: "RH",
    items: [
      { title: "Professores", url: "/professores", icon: UserCheck },
      { title: "Funcionários (CLT)", url: "/funcionarios", icon: UserCheck },
      { title: "Pagamentos Professores", url: "/pagamentos-professores", icon: Wallet },
      { title: "Pagamentos Funcionários", url: "/pagamentos-funcionarios", icon: Wallet },
    ],
  },
  {
    label: "Pedagógico",
    items: [
      { title: "Matrizes Curriculares", url: "/matrizes-curriculares", icon: GraduationCap },
      { title: "Notas", url: "/notas", icon: GraduationCap },
      { title: "Frequência", url: "/frequencia", icon: UserCheck },
      { title: "Ocorrências", url: "/ocorrencias", icon: AlertTriangle },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { title: "Avisos", url: "/avisos", icon: Megaphone },
    ],
  },
  {
    label: "Documentos",
    items: [
      { title: "Gerar Documento", url: "/documentos/gerar", icon: FileSignature },
      { title: "Configurar Documentos", url: "/documentos", icon: FileText },
    ],
  },
  {
    label: "Comunidade",
    items: [
      { title: "Fornecedores", url: "/fornecedores", icon: MapPin },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const { escolaAtivaId, escolas, filiaisDaEscolaAtiva, isSuperadmin, emModoAdministrador, setEscolaAtivaId } = useEscolaAtiva();
  const escolaAtiva = escolas.find((e) => e.escola_id === escolaAtivaId);
  const escolaNome = escolaAtiva?.nome ?? "Carregando…";

  const { data: escolaLogoPath } = useQuery({
    queryKey: ["escola-logo", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data } = await supabase.from("escolas").select("logo_url").eq("id", escolaAtivaId!).single();
      return data?.logo_url ?? null;
    },
  });
  const { data: escolaLogo } = useSignedUrl("escola-logos", escolaLogoPath);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full shrink-0 bg-sidebar-primary/10 flex items-center justify-center overflow-hidden">
            {escolaLogo ? (
              <img src={escolaLogo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <GraduationCap className="h-5 w-5 text-sidebar-primary" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              {!emModoAdministrador && filiaisDaEscolaAtiva.length > 1 ? (
                <select
                  value={escolaAtivaId ?? ""}
                  onChange={(e) => setEscolaAtivaId(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-sidebar-primary border-none outline-none cursor-pointer truncate"
                >
                  {filiaisDaEscolaAtiva.map((e) => (
                    <option key={e.escola_id} value={e.escola_id} className="text-foreground">
                      {e.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <h2 className="text-sm font-bold text-sidebar-primary truncate">{escolaNome}</h2>
              )}
              <p className="text-xs text-sidebar-foreground/60 truncate" title={escolaAtiva?.razao_social ?? undefined}>
                {emModoAdministrador
                  ? (escolaAtiva?.razao_social ? `Modo Administrador · ${escolaAtiva.razao_social}` : "Modo Administrador")
                  : "Veloci Educacional"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider font-semibold mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          {isSuperadmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/plataforma"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/10"
                  activeClassName="bg-amber-500/10 font-medium"
                >
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Modo Administrador</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/filiais"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Filiais</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/configuracoes"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Configurações</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
