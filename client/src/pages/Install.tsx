import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type InstallStatus = "idle" | "checking" | "loading" | "success" | "error" | "already_exists";

export default function Install() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<InstallStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [autoInstallAttempted, setAutoInstallAttempted] = useState(false);
  const [existingPlacement, setExistingPlacement] = useState<any>(null);

  const checkExistingPlacements = async () => {
    setStatus("checking");
    setMessage("");

    try {
      const response = await fetch("/api/placement/check");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to check placements");
      }

      console.log("Placement check result:", data);

      if (data.exists) {
        setExistingPlacement(data.placement);
        setStatus("already_exists");
        setMessage(t("install.alreadyExists"));
      } else {
        setStatus("idle");
        setMessage("");
      }
    } catch (error: any) {
      console.error("Error checking placements:", error);
      setStatus("error");
      setMessage(t("install.errorMessage") + " " + error.message);
    }
  };

  const unbindPlacement = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/placement/unbind", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to unbind placement");
      }

      console.log("Placement unbound successfully");
      setExistingPlacement(null);
      setStatus("idle");
      setMessage(t("install.unbindSuccess"));
    } catch (error: any) {
      console.error("Placement unbind error:", error);
      setStatus("error");
      setMessage(`${t("install.unbindError")} ${error.message}`);
    }
  };

  const installPlacement = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/placement/register", {
        method: "POST",
      });
      const data = await response.json();

      // Check for "already exists" - both by status code and error message
      if (response.status === 409 || 
          data.error === "already_exists" ||
          data.message?.toLowerCase().includes("already bind") ||
          data.message?.toLowerCase().includes("уже зарегистрирован")) {
        console.log("✅ Placement already exists");
        setStatus("already_exists");
        setMessage(t("install.alreadyExists"));
        checkExistingPlacements(); // Fetch existing placement details
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to register placement");
      }

      console.log("Placement registered successfully:", data);
      setStatus("success");
      setMessage(t("install.successMessage"));
    } catch (error: any) {
      console.error("Placement registration error:", error);
      
      // Last resort: check error message for "already binded"
      const errorMsg = error.message?.toLowerCase() || "";
      if (errorMsg.includes("already bind") || errorMsg.includes("handler already")) {
        console.log("✅ Caught 'already binded' in error handler");
        setStatus("already_exists");
        setMessage(t("install.alreadyExists"));
        checkExistingPlacements();
        return;
      }
      
      setStatus("error");
      setMessage(`${t("install.errorMessage")} ${error.message}`);
    }
  };

  useEffect(() => {
    // Auto-check placements on first load
    if (!autoInstallAttempted) {
      setAutoInstallAttempted(true);
      // Check placements via server API (no SDK required)
      checkExistingPlacements();
    }
  }, [autoInstallAttempted]);

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
          {status === "checking" && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>{t("install.checking")}</AlertTitle>
              <AlertDescription>
                {t("install.checkingDescription")}
              </AlertDescription>
            </Alert>
          )}

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

          {status === "already_exists" && (
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <CheckCircle2 className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                {t("install.alreadyExistsTitle")}
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300 space-y-2">
                <p>{t("install.alreadyExistsDescription")}</p>
                {existingPlacement && (
                  <div className="text-xs font-mono bg-yellow-100 dark:bg-yellow-900 p-2 rounded">
                    <div>Placement: {existingPlacement.placement}</div>
                    <div>Handler: {existingPlacement.handler}</div>
                  </div>
                )}
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

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {(status === "idle" || status === "error") && (
              <Button
                onClick={installPlacement}
                data-testid="button-install-placement"
              >
                {t("install.registerButton")}
              </Button>
            )}

            {status === "loading" && (
              <Button disabled data-testid="button-loading">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("install.pleaseWait")}
              </Button>
            )}

            {status === "checking" && (
              <Button disabled data-testid="button-checking">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("install.checking")}
              </Button>
            )}

            {status === "already_exists" && (
              <>
                <Button
                  onClick={unbindPlacement}
                  variant="destructive"
                  data-testid="button-unbind-placement"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("install.unbindButton")}
                </Button>
                <Button
                  onClick={checkExistingPlacements}
                  variant="outline"
                  data-testid="button-recheck-placements"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("install.recheckButton")}
                </Button>
              </>
            )}

            {status === "success" && (
              <Button
                onClick={checkExistingPlacements}
                variant="outline"
                data-testid="button-recheck-after-success"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("install.recheckButton")}
              </Button>
            )}
          </div>

          {/* Info banner */}
          <Alert className="mt-4">
            <AlertDescription className="text-sm">
              ℹ️ Эта страница работает через <strong>серверный REST API</strong>. 
              Bitrix24 SDK не требуется - можно открывать напрямую в браузере.
            </AlertDescription>
          </Alert>

          {/* Debug info */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-4 bg-muted rounded text-xs font-mono">
              <div>Status: {status}</div>
              <div>Mode: Server-side REST API (no SDK required)</div>
              <div>BX24 SDK Available: {window.BX24 ? "Yes (not used)" : "No (not needed)"}</div>
              <div>Auto Check Attempted: {autoInstallAttempted ? "Yes" : "No"}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
