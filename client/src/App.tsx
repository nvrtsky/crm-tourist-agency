import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Dashboard from "@/pages/Dashboard";
import Tourists from "@/pages/Tourists";
import Summary from "@/pages/Summary";
import NotFound from "@/pages/not-found";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { EntityIdNotFound } from "@/components/EntityIdNotFound";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, LayoutDashboard, Users, TableProperties, Settings, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Summary} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/tourists" component={Tourists} />
      <Route path="/:rest*" component={Summary} />
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

function AdminMenu() {
  const [open, setOpen] = useState(false);
  const [isRebinding, setIsRebinding] = useState(false);
  const [rebindLog, setRebindLog] = useState<string[]>([]);
  const { toast } = useToast();

  const addLog = (message: string) => {
    setRebindLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleRebind = () => {
    if (!window.BX24) {
      toast({
        title: "Ошибка",
        description: "BX24 SDK недоступен",
        variant: "destructive",
      });
      return;
    }

    setIsRebinding(true);
    setRebindLog([]);
    addLog("🔄 Начинаем переустановку placement...");

    // Step 1: Unbind OLD handler
    const OLD_HANDLER = 'https://travel-group-manager-ndt72.replit.app/install';
    addLog(`📤 Отвязываем старый placement (handler: ${OLD_HANDLER})...`);
    window.BX24!.callMethod(
      'placement.unbind',
      { 
        PLACEMENT: 'CRM_DYNAMIC_176_DETAIL_TAB',
        HANDLER: OLD_HANDLER
      },
      (unbindResult: any) => {
        if (unbindResult.error()) {
          addLog("⚠️ Unbind: " + unbindResult.error() + " (может быть норма)");
        } else {
          addLog("✅ Старый placement отвязан");
        }

        // Step 2: Bind NEW handler
        const NEW_HANDLER = 'https://travel-group-manager-ndt72.replit.app/';
        addLog(`📥 Привязываем placement к новому URL: ${NEW_HANDLER}`);
        window.BX24!.callMethod(
          'placement.bind',
          {
            PLACEMENT: 'CRM_DYNAMIC_176_DETAIL_TAB',
            HANDLER: NEW_HANDLER,
            TITLE: 'Управление группой'
          },
          (bindResult: any) => {
            if (bindResult.error()) {
              addLog("❌ Ошибка bind: " + bindResult.error());
              toast({
                title: "Ошибка переустановки",
                description: bindResult.error(),
                variant: "destructive",
              });
              setIsRebinding(false);
            } else {
              addLog("✅ Placement успешно переустановлен!");
              addLog("✅ Обновите страницу для применения изменений");
              toast({
                title: "✅ Успешно!",
                description: "Placement переустановлен. Обновите страницу (Ctrl+Shift+R)",
              });
              setIsRebinding(false);

              if (window.BX24?.installFinish) {
                window.BX24.installFinish();
              }
            }
          }
        );
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-admin"
          title="Админ"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚙️ Административные функции</DialogTitle>
          <DialogDescription>
            Переустановка placement для исправления проблемы с извлечением entityId
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Когда использовать:</AlertTitle>
            <AlertDescription>
              Если приложение показывает ошибку "ID элемента Smart Process не найден" и в консоли видно <code>pathname: '/install'</code>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-semibold">Что делает переустановка:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Отвязывает старый placement (если есть)</li>
              <li>Привязывает placement к правильному URL: <code>/</code></li>
              <li>После этого entityId будет определяться автоматически</li>
            </ol>
          </div>

          {rebindLog.length > 0 && (
            <div className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-xs max-h-48 overflow-y-auto">
              {rebindLog.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isRebinding}
          >
            Закрыть
          </Button>
          <Button
            onClick={handleRebind}
            disabled={isRebinding}
            data-testid="button-rebind-placement"
          >
            {isRebinding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Переустановка...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Переустановить Placement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function App() {
  const { entityId, entityTypeId, isReady, error, diagnosticInfo } = useBitrix24();
  const { t } = useTranslation();
  const [location] = useLocation();

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

  // If no entityId found after all attempts, show friendly error screen
  if (!entityId && error) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <EntityIdNotFound
            entityTypeId={entityTypeId}
            diagnosticInfo={diagnosticInfo}
            onRetry={() => window.location.reload()}
          />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
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
                <AdminMenu />
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
            <Navigation />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-6">
              {error && entityId && (
                <Alert variant="default" className="mb-4">
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
