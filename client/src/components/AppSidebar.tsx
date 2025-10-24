import { LayoutDashboard, Users, MapPin, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Обзор",
    titleCn: "概览",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Туристы",
    titleCn: "游客",
    url: "/tourists",
    icon: Users,
  },
  {
    title: "Города",
    titleCn: "城市",
    url: "/cities",
    icon: MapPin,
  },
  {
    title: "Настройки",
    titleCn: "设置",
    url: "/settings",
    icon: Settings,
  },
];

export default function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-4 py-4">
            Туристическое Агентство
            <div className="text-xs font-normal text-muted-foreground mt-1">
              旅行社
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto font-normal">
                        {item.titleCn}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
