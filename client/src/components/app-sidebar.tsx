import { Home, Plane, Users, FileText, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
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
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();

  const menuItems = [
    {
      title: t("nav.dashboard"),
      url: "/dashboard",
      icon: Home,
      testId: "nav-dashboard",
    },
    {
      title: t("nav.tours"),
      url: "/tours",
      icon: Plane,
      testId: "nav-tours",
    },
    {
      title: t("nav.crm"),
      url: "/crm",
      icon: Users,
      testId: "nav-crm",
    },
    {
      title: t("nav.forms"),
      url: "/forms",
      icon: FileText,
      testId: "nav-forms",
    },
    {
      title: t("nav.settings"),
      url: "/settings",
      icon: Settings,
      testId: "nav-settings",
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <h2 className="text-lg font-semibold">{t("app.title")}</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.main")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={item.testId}
                  >
                    <a
                      href={item.url}
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation(item.url);
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          {t("app.version", { version: "2.0" })}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
