import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import Dashboard from "@/pages/Dashboard";
import Tourists from "@/pages/Tourists";
import Summary from "@/pages/Summary";
import NotFound from "@/pages/not-found";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, LayoutDashboard, Users, TableProperties } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tourists" component={Tourists} />
      <Route path="/summary" component={Summary} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Navigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="flex gap-1">
      <Button
        variant={location === "/" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLocation("/")}
        data-testid="nav-dashboard"
      >
        <LayoutDashboard className="h-4 w-4 mr-2" />
        Обзор
      </Button>
      <Button
        variant={location === "/tourists" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLocation("/tourists")}
        data-testid="nav-tourists"
      >
        <Users className="h-4 w-4 mr-2" />
        Туристы
      </Button>
      <Button
        variant={location === "/summary" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLocation("/summary")}
        data-testid="nav-summary"
      >
        <TableProperties className="h-4 w-4 mr-2" />
        Сводная
      </Button>
    </nav>
  );
}

export default function App() {
  const { entityId, isReady, error } = useBitrix24();

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Загрузка приложения...</p>
        </div>
      </div>
    );
  }

  if (error && !entityId) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка инициализации</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col h-screen w-full overflow-hidden">
          <header className="flex flex-col gap-3 px-4 py-3 border-b bg-background shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">Групповой тур по Китаю</h1>
                {entityId && (
                  <span className="text-xs text-muted-foreground font-mono">
                    ID: {entityId}
                  </span>
                )}
              </div>
              <ThemeToggle />
            </div>
            <Navigation />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-6">
              <Router />
            </div>
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
