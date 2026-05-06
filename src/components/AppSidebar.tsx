import {
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  GraduationCap,
  ClipboardList,
  UserCheck,
  AlertTriangle,
  Settings,
  ShoppingCart,
  LogOut,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Contas a Receber", url: "/financeiro", icon: DollarSign },
      { title: "Contas a Pagar", url: "/contas-a-pagar", icon: ClipboardList },
      { title: "Contratos", url: "/contratos", icon: ClipboardList },
      { title: "Compras", url: "/compras", icon: ShoppingCart },
    ],
  },
  {
    label: "Pedagógico",
    items: [
      { title: "Matrizes Curriculares", url: "/matrizes-curriculares", icon: BookOpen },
      { title: "Notas", url: "/notas", icon: GraduationCap },
      { title: "Frequência", url: "/frequencia", icon: UserCheck },
      { title: "Ocorrências", url: "/ocorrencias", icon: AlertTriangle },
    ],
  },
  {
    label: "Comunidade",
    items: [
      { title: "Parceiros", url: "/parceiros", icon: MapPin },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent">
            <GraduationCap className="h-5 w-5 text-sidebar-accent-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-primary">EduGestão</h2>
              <p className="text-xs text-sidebar-foreground/60">ERP Escolar</p>
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
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/admin"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Administração</span>}
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
