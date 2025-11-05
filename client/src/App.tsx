import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Dashboard from "@/pages/Dashboard";
import Tours from "@/pages/Tours";
import CRM from "@/pages/CRM";
import Forms from "@/pages/Forms";
import Settings from "@/pages/Settings";
import DevTest from "@/pages/DevTest";
import NotFound from "@/pages/not-found";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { EntityIdNotFound } from "@/components/EntityIdNotFound";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Settings as SettingsIcon, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

function Router() {
  const [, setLocation] = useLocation();
  
  return (
    <Switch>
      <Route path="/dev" component={DevTest} />
      <Route path="/">
        {() => {
          setLocation("/dashboard");
          return null;
        }}
      </Route>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/tours" component={Tours} />
      <Route path="/crm" component={CRM} />
      <Route path="/forms" component={Forms} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
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
          <SettingsIcon className="h-4 w-4" />
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
  const [location] = useLocation();
  
  // Check for demo mode via URL parameter
  const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1';
  
  // Dev mode: render directly without Bitrix24 checks
  if (location === "/dev") {
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
  if (isDemoMode) {
    return <AppInDemoMode />;
  }

  return <AppWithBitrix24 />;
}

function AppInDemoMode() {
  const { t } = useTranslation();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <h1 className="font-semibold text-sm">
                    {t("app.title")} <span className="text-xs text-muted-foreground">(DEMO)</span>
                  </h1>
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

function AppWithBitrix24() {
  const { entityId, entityTypeId, isReady, error, diagnosticInfo } = useBitrix24();
  const { t } = useTranslation();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

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
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <h1 className="text-lg font-semibold truncate">
                    {t("app.title")}
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
              </header>
              <main className="flex-1 overflow-auto">
                {error && entityId && (
                  <Alert variant="default" className="m-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>DEMO-режим</AlertTitle>
                    <AlertDescription className="text-sm whitespace-pre-wrap">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
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
