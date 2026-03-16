import { FilePlus2, TableProperties, BarChart3, ListChecks, Users, Bell, Tag } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import vorneLogo from "@/assets/vorne-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useUnreadAlerts } from "@/hooks/useUnreadAlerts";

const adminItems = [
  { title: "Nova Cotação", url: "/", icon: FilePlus2 },
  { title: "Controle de Cotações", url: "/controle", icon: TableProperties },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Lista Mix", url: "/lista-mix", icon: ListChecks },
  { title: "Alertas", url: "/alertas", icon: Bell },
  { title: "Gerenciar Vendedores", url: "/vendedores", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { count: unreadAlerts } = useUnreadAlerts();

  return (
    <Sidebar collapsible="icon" className="border-r-0 group/sidebar">
      <div className="flex flex-col items-center gap-1 px-4 py-8">
        {!collapsed ? (
          <>
            <span className="text-xl font-bold tracking-tight text-sidebar-foreground">
              CotaFlow
            </span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
              Officer Distribuidora
            </span>
          </>
        ) : (
          <span className="text-sm font-bold text-primary">CF</span>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {adminItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className={`rounded-[10px] transition-all duration-200 ${
                          isActive
                            ? "bg-primary/15 text-primary font-medium"
                            : "text-muted-foreground hover:bg-warning/15 hover:text-warning"
                        }`}
                        activeClassName=""
                      >
                        <item.icon className={`h-[18px] w-[18px] ${isActive ? "text-primary" : ""}`} />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                        {item.url === "/alertas" && unreadAlerts > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-warning text-warning-foreground text-[10px] font-bold px-1">
                            {unreadAlerts}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto flex flex-col items-center gap-2 px-4 py-4 border-t border-white/10">
        {!collapsed && profile && (
          <span className="text-[10px] text-muted-foreground">{profile.nome}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={`text-muted-foreground hover:text-foreground ${collapsed ? "p-1.5" : "gap-2"}`}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-xs">Sair</span>}
        </Button>
        <img src={vorneLogo} alt="Vorne AI" className={collapsed ? "h-5 w-5" : "h-8 w-8"} />
        {!collapsed && (
          <span className="text-[9px] text-muted-foreground tracking-wide">
            Desenvolvido por <span className="font-medium text-foreground/70">Vorne AI</span>
          </span>
        )}
      </div>
    </Sidebar>
  );
}
