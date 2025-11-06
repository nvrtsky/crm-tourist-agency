import { UserPlus, Calendar, FileText, Settings } from "lucide-react";
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

  // Check if we're in demo mode
  const isDemoMode = location.startsWith("/demo");
  const urlPrefix = isDemoMode ? "/demo" : "";

  const menuItems = [
    {
      title: "Лиды",
      url: `${urlPrefix}/leads`,
      icon: UserPlus,
      testId: "nav-leads",
    },
    {
      title: "Туры",
      url: `${urlPrefix}/events`,
      icon: Calendar,
      testId: "nav-events",
    },
    {
      title: t("nav.forms"),
      url: `${urlPrefix}/forms`,
      icon: FileText,
      testId: "nav-forms",
    },
    {
      title: t("nav.settings"),
      url: `${urlPrefix}/settings`,
      icon: Settings,
      testId: "nav-settings",
    },
  ];

  return (
    <Sidebar>
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
