import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Dashboard from "@/pages/Dashboard";
import Tourists from "@/pages/Tourists";
import Summary from "@/pages/Summary";
import NotFound from "@/pages/not-found";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, LayoutDashboard, Users, TableProperties } from "lucide-react";
import { useTranslation } from "react-i18next";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Summary} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/tourists" component={Tourists} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Navigation() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="flex gap-1">
      <Button
        variant={location === "/" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLocation("/")}
        data-testid="nav-summary"
        className="flex-1 sm:flex-none"
      >
        <TableProperties className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">{t("nav.table")}</span>
      </Button>
      <Button
        variant={location === "/dashboard" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLocation("/dashboard")}
        data-testid="nav-dashboard"
        className="flex-1 sm:flex-none"
      >
        <LayoutDashboard className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">{t("nav.dashboard")}</span>
      </Button>
      <Button
        variant={location === "/tourists" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLocation("/tourists")}
        data-testid="nav-tourists"
        className="flex-1 sm:flex-none"
      >
        <Users className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">{t("nav.addTourist")}</span>
      </Button>
    </nav>
  );
}

export default function App() {
  const { entityId, isReady, error } = useBitrix24();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();

  // Auto-redirect from /install to / when loaded as placement tab
  // (if loaded with entityId, it's a working tab, not installation page)
  useEffect(() => {
    if (isReady && entityId && location === '/install') {
      setLocation('/');
    }
  }, [isReady, entityId, location, setLocation]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // Show blocking error only if no entityId at all
  if (error && !entityId) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errors.bitrixInitError")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col h-screen w-full overflow-hidden">
          <header className="flex flex-col gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 border-b bg-background shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <h1 className="text-base sm:text-lg font-semibold truncate">
                  <span className="hidden sm:inline">Групповой тур по Китаю</span>
                  <span className="sm:hidden">Тур Китай</span>
                </h1>
                {entityId && (
                  <span className="hidden md:inline text-xs text-muted-foreground font-mono">
                    ID: {entityId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
            <Navigation />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-6">
              {error && entityId && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>DEMO-режим</AlertTitle>
                  <AlertDescription className="text-sm whitespace-pre-wrap">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <Router />
            </div>
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
