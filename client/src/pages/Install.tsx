import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Bug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

type InstallStatus = "idle" | "loading" | "success" | "error";

export default function Install() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<InstallStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [autoInstallAttempted, setAutoInstallAttempted] = useState(false);

  const installPlacement = () => {
    setStatus("loading");
    setMessage("");

    if (!window.BX24) {
      setStatus("error");
      setMessage(t("install.sdkNotLoaded"));
      return;
    }

    const PLACEMENT_CODE = "CRM_DYNAMIC_176_DETAIL_TAB";
    const HANDLER_URL = "https://travel-group-manager-ndt72.replit.app/";
    const TITLE = "Управление группой";

    // Helper function to bind placement with retry on "already binded" error
    const tryBindPlacement = (retryCount = 0) => {
      if (!window.BX24) {
        setStatus("error");
        setMessage(t("install.sdkNotLoaded"));
        return;
      }

      window.BX24.callMethod(
        "placement.bind",
        {
          PLACEMENT: PLACEMENT_CODE,
          HANDLER: HANDLER_URL,
          TITLE: TITLE,
        },
        (bindResult: any) => {
          // Log full result for debugging
          console.log("Bind result:", bindResult);
          
          if (bindResult.error()) {
            const errorText = String(bindResult.error());
            const errorDesc = bindResult.error_description ? String(bindResult.error_description()) : "";
            
            // Get full error object if available
            const errorObj = bindResult.ex || {};
            const errorMessage = errorObj.error || errorObj.error_description || errorText;
            
            console.error("Placement registration error details:", {
              error: errorText,
              description: errorDesc,
              ex: errorObj,
              fullMessage: errorMessage
            });
            
            // Check for "Handler already exists" error codes
            const isHandlerExistsError = 
              errorText.includes("Handler already binded") || 
              errorText.includes("ERROR_HANDLER_ALREADY_EXIST") ||
              errorMessage.includes("Handler already binded") ||
              errorMessage.includes("Handler already exists") ||
              errorMessage.includes("ERROR_HANDLER_ALREADY_EXIST");
            
            // If "Handler already exists" error and first attempt, try unbind then retry
            if (isHandlerExistsError && retryCount === 0) {
              console.log("Handler already binded, attempting unbind and retry...");
              
              if (!window.BX24) {
                setStatus("error");
                setMessage(t("install.sdkNotLoaded"));
                return;
              }
              
              // Unbind ALL handlers for this placement (omitting HANDLER parameter)
              window.BX24.callMethod(
                "placement.unbind",
                {
                  PLACEMENT: PLACEMENT_CODE,
                  // HANDLER omitted - this removes ALL handlers for the placement
                },
                (unbindResult: any) => {
                  console.log("Unbind result:", unbindResult.data(), unbindResult.error());
                  
                  // Wait 500ms then retry bind
                  setTimeout(() => {
                    tryBindPlacement(1); // Retry once
                  }, 500);
                }
              );
            } else {
              // Show error
              setStatus("error");
              
              let helpText = "";
              const isHandlerError = 
                errorText.includes("Handler already binded") || 
                errorText.includes("ERROR_HANDLER_ALREADY_EXIST") ||
                errorMessage.includes("Handler already binded") ||
                errorMessage.includes("Handler already exists") ||
                errorMessage.includes("ERROR_HANDLER_ALREADY_EXIST");
              
              if (isHandlerError) {
                helpText = t("install.errorAlreadyBinded");
              } else if (errorText.includes("ACCESS_DENIED") || errorMessage.includes("ACCESS_DENIED")) {
                helpText = t("install.errorAccessDenied");
              }
              
              const fullError = errorDesc || errorMessage || errorText;
              setMessage(`${t("install.errorMessage")} ${fullError}\n\n${helpText}`);
            }
          } else {
            // Success!
            setStatus("success");
            setMessage(t("install.successMessage"));
            console.log("Placement registered successfully:", bindResult.data());
            
            // Call installFinish (REQUIRED by Bitrix24 for app installation)
            if (window.BX24?.installFinish) {
              window.BX24.installFinish();
            }
          }
        }
      );
    };

    // Start the bind process
    tryBindPlacement();
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
              setMessage(t("install.openFromBitrix"));
            }
          }, 1000);
        }
      };

      checkAndInstall();
    }
  }, [autoInstallAttempted, t]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>{t("install.title")}</CardTitle>
          <CardDescription>
            {t("install.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status indicator */}
          {status === "loading" && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>{t("install.registering")}</AlertTitle>
              <AlertDescription>
                {t("install.registeringDescription")}
              </AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">{t("install.success")}</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{t("install.errorTitle")}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === "idle" && (
            <Alert>
              <AlertDescription>
                {t("install.idleMessage")}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t("install.whatWillHappen")}</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>{t("install.willRegisterTab")}</li>
                <li>{t("install.willAppearInCards")}</li>
                <li>{t("install.placementCode")}</li>
                <li>{t("install.canCloseAfter")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">{t("install.afterInstallation")}</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>{t("install.openCard")}</li>
                <li>{t("install.findTab")}</li>
                <li>{t("install.startUsing")}</li>
              </ol>
            </div>
          </div>

          {/* Debug link */}
          {status === "error" && (
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertTitle>Проблемы с установкой?</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  Если ошибка повторяется, используйте страницу отладки для просмотра и удаления зарегистрированных placement'ов:
                </p>
                <Link href="/debug-placement">
                  <Button variant="outline" size="sm">
                    <Bug className="mr-2 h-4 w-4" />
                    Открыть страницу отладки
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}

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
                    {t("install.registering")}
                  </>
                ) : (
                  t("install.registerButton")
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
                {t("install.reinstallButton")}
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
