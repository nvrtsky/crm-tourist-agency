import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

type InstallStatus = "idle" | "loading" | "success" | "error";

export default function Install() {
  const [status, setStatus] = useState<InstallStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [autoInstallAttempted, setAutoInstallAttempted] = useState(false);

  const installPlacement = () => {
    setStatus("loading");
    setMessage("");

    if (!window.BX24) {
      setStatus("error");
      setMessage("Bitrix24 SDK не загружен. Откройте эту страницу из Bitrix24.");
      return;
    }

    window.BX24.callMethod(
      "placement.bind",
      {
        PLACEMENT: "CRM_DYNAMIC_176_DETAIL_TAB",
        HANDLER: "https://travel-group-manager-ndt72.replit.app/",
        TITLE: "Управление группой",
      },
      (result: any) => {
        if (result.error()) {
          setStatus("error");
          setMessage(`Ошибка регистрации: ${result.error()}`);
          console.error("Placement registration error:", result.error());
        } else {
          setStatus("success");
          setMessage("Вкладка успешно зарегистрирована! Теперь она появится во всех карточках Smart Process 'Событие'.");
          console.log("Placement registered successfully:", result.data());
        }
      }
    );
  };

  useEffect(() => {
    // Auto-install on first load
    if (!autoInstallAttempted) {
      setAutoInstallAttempted(true);
      
      // Wait for BX24 to be ready
      const checkAndInstall = () => {
        if (window.BX24) {
          window.BX24.init(() => {
            installPlacement();
          });
        } else {
          // If no BX24, try to load it
          setTimeout(() => {
            if (window.BX24) {
              window.BX24.init(() => {
                installPlacement();
              });
            } else {
              setStatus("error");
              setMessage("Откройте эту страницу из Bitrix24 для автоматической установки.");
            }
          }, 1000);
        }
      };

      checkAndInstall();
    }
  }, [autoInstallAttempted]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Установка приложения "Управление группой"</CardTitle>
          <CardDescription>
            Регистрация вкладки в Smart Process "Событие" (ENTITY_TYPE_ID = 176)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status indicator */}
          {status === "loading" && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Регистрация...</AlertTitle>
              <AlertDescription>
                Подождите, идет регистрация вкладки в Bitrix24.
              </AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">Успешно!</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === "idle" && (
            <Alert>
              <AlertDescription>
                Нажмите кнопку ниже для регистрации вкладки в Smart Process "Событие".
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Что произойдет:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Будет зарегистрирована вкладка "Управление группой"</li>
                <li>Вкладка появится во всех карточках Smart Process "Событие"</li>
                <li>Placement: CRM_DYNAMIC_176_DETAIL_TAB</li>
                <li>После установки можно закрыть эту страницу</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Инструкции после установки:</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Откройте любую карточку Smart Process "Событие"</li>
                <li>Найдите вкладку "Управление группой"</li>
                <li>Начните добавлять туристов и планировать маршруты</li>
              </ol>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {(status === "idle" || status === "error" || status === "loading") && (
              <Button
                onClick={installPlacement}
                disabled={status === "loading"}
                data-testid="button-install-placement"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Регистрация...
                  </>
                ) : (
                  "Зарегистрировать вкладку"
                )}
              </Button>
            )}

            {status === "success" && (
              <Button
                onClick={installPlacement}
                variant="outline"
                data-testid="button-reinstall-placement"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Переустановить
              </Button>
            )}
          </div>

          {/* Debug info */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-4 bg-muted rounded text-xs font-mono">
              <div>Status: {status}</div>
              <div>BX24 Available: {window.BX24 ? "Yes" : "No"}</div>
              <div>Auto Install Attempted: {autoInstallAttempted ? "Yes" : "No"}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
