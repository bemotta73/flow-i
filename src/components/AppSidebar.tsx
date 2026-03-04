import { FilePlus2, TableProperties, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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

const items = [
  { title: "Nova Cotação", url: "/", icon: FilePlus2 },
  { title: "Controle de Cotações", url: "/controle", icon: TableProperties },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex flex-col items-center gap-0.5 px-4 py-6">
        {!collapsed ? (
          <>
            <span className="text-2xl font-bold tracking-tight text-sidebar-foreground">
              Cota<span className="text-officer-green">Flow</span>
            </span>
            <span className="text-xs text-sidebar-muted-foreground tracking-wide">
              Officer Distribuidora
            </span>
          </>
        ) : (
          <span className="text-lg font-bold text-officer-green">CF</span>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
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
                        className={`relative hover:bg-sidebar-accent/60 ${
                          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""
                        }`}
                        activeClassName=""
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-officer-green" />
                        )}
                        <item.icon className={`h-5 w-5 ${isActive ? "text-officer-green" : ""}`} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
