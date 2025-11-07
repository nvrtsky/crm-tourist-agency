import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Leads from "@/pages/Leads";
import Events from "@/pages/Events";
import EventSummary from "@/pages/EventSummary";
import Forms from "@/pages/Forms";
import FormBuilder from "@/pages/FormBuilder";
import FormSubmissions from "@/pages/FormSubmissions";
import PublicForm from "@/pages/PublicForm";
import Booking from "@/pages/Booking";
import Settings from "@/pages/Settings";
import DevTest from "@/pages/DevTest";
import NotFound from "@/pages/not-found";
import { useTranslation } from "react-i18next";
import logoDarkUrl from "@assets/logo_1762426754494.png";
import logoLightUrl from "@assets/logo_white_1762533626956.png";

function Router() {
  const [, setLocation] = useLocation();
  
  return (
    <Switch>
      <Route path="/dev" component={DevTest} />
      <Route path="/demo/leads" component={Leads} />
      <Route path="/demo/events/:id/summary" component={EventSummary} />
      <Route path="/demo/events" component={Events} />
      <Route path="/demo/booking" component={Booking} />
      <Route path="/demo/forms/:id/public" component={PublicForm} />
      <Route path="/demo/forms/:id/submissions" component={FormSubmissions} />
      <Route path="/demo/forms/:id/builder" component={FormBuilder} />
      <Route path="/demo/forms" component={Forms} />
      <Route path="/demo/settings" component={Settings} />
      <Route path="/demo">
        {() => {
          setLocation("/demo/leads");
          return null;
        }}
      </Route>
      <Route path="/leads" component={Leads} />
      <Route path="/events/:id/summary" component={EventSummary} />
      <Route path="/events" component={Events} />
      <Route path="/booking" component={Booking} />
      <Route path="/forms/:id/public" component={PublicForm} />
      <Route path="/forms/:id/submissions" component={FormSubmissions} />
      <Route path="/forms/:id/builder" component={FormBuilder} />
      <Route path="/forms" component={Forms} />
      <Route path="/settings" component={Settings} />
      <Route path="/">
        {() => {
          setLocation("/leads");
          return null;
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}


export default function App() {
  const [location] = useLocation();
  
  // Check window.location.pathname for initial load
  const pathname = typeof window !== 'undefined' ? window.location.pathname : location;
  
  // Dev mode: render directly without Bitrix24 checks
  if (location === "/dev" || pathname === "/dev") {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Demo mode: render with sidebar but without Bitrix24 checks
  if (location.startsWith("/demo") || pathname.startsWith("/demo")) {
    return <AppInDemoMode />;
  }

  // Default: Standalone CRM without Bitrix24
  return <AppInDemoMode />;
}

function AppInDemoMode() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Initialize theme from localStorage and DOM
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = stored || "light";
    setTheme(initial);

    // Watch for theme changes on documentElement
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const logoUrl = theme === "dark" ? logoLightUrl : logoDarkUrl;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <img src={logoUrl} alt="Unique Travel" className="h-8 w-auto" data-testid="img-logo" />
                </div>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

