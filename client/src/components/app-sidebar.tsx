import { UserPlus, Calendar, Settings, User } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
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
  const { user } = useAuth();

  // Check if we're in demo mode
  const isDemoMode = location.startsWith("/demo");
  const urlPrefix = isDemoMode ? "/demo" : "";

  // Check if we're in development mode (hide portal-admin in production)
  const isDev = import.meta.env.DEV;

  const allMenuItems = [
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
    // Only show portal-admin in development mode
    ...(isDev ? [{
      title: "Личный кабинет",
      url: `${urlPrefix}/portal-admin`,
      icon: User,
      testId: "nav-portal-admin",
    }] : []),
    {
      title: t("nav.settings"),
      url: `${urlPrefix}/settings`,
      icon: Settings,
      testId: "nav-settings",
    },
  ];

  // Filter menu items based on user role
  const menuItems = user?.role === "viewer"
    ? allMenuItems.filter(item => item.testId === "nav-events")
    : user?.role === "manager"
    ? allMenuItems.filter(item => item.testId === "nav-leads" || item.testId === "nav-events")
    : allMenuItems; // Admin sees all including portal-admin

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
