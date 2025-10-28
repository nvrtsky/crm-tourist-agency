import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, RefreshCw, Info } from "lucide-react";

interface PlacementInfo {
  placement: string;
  handler: string;
  title?: string;
  description?: string;
}

export default function DebugPlacement() {
  const [placements, setPlacements] = useState<PlacementInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const loadPlacements = () => {
    setLoading(true);
    setError("");
    setSuccess("");

    if (!window.BX24) {
      setError("Bitrix24 SDK не загружен. Откройте эту страницу из Bitrix24.");
      setLoading(false);
      return;
    }

    window.BX24.callMethod("placement.get", {}, (result: any) => {
      setLoading(false);
      
      console.log("placement.get result:", result);
      
      if (result.error()) {
        const errorText = String(result.error());
        const errorDesc = result.error_description ? String(result.error_description()) : "";
        setError(`Ошибка загрузки: ${errorText}\n${errorDesc}`);
        console.error("placement.get error:", errorText, errorDesc);
      } else {
        const data = result.data();
        console.log("Registered placements:", data);
        
        if (Array.isArray(data)) {
          setPlacements(data);
          setSuccess(`Найдено ${data.length} зарегистрированных placement(ов)`);
        } else {
          setPlacements([]);
          setSuccess("Placement'ы не найдены");
        }
      }
    });
  };

  const unbindPlacement = (placement: string, handler?: string) => {
    if (!window.BX24) {
      setError("Bitrix24 SDK не загружен");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const params: any = { PLACEMENT: placement };
    if (handler) {
      params.HANDLER = handler;
    }

    console.log("Calling placement.unbind with params:", params);

    window.BX24.callMethod("placement.unbind", params, (result: any) => {
      console.log("placement.unbind result:", result);
      
      if (result.error()) {
        const errorText = String(result.error());
        const errorDesc = result.error_description ? String(result.error_description()) : "";
        const errorObj = result.ex || {};
        
        console.error("placement.unbind error:", {
          error: errorText,
          description: errorDesc,
          ex: errorObj
        });
        
        setError(`Ошибка удаления: ${errorText}\n${errorDesc}`);
        setLoading(false);
      } else {
        setSuccess(`Placement "${placement}" успешно удалён!`);
        setLoading(false);
        // Перезагрузить список через секунду
        setTimeout(() => loadPlacements(), 1000);
      }
    });
  };

  const unbindAll = (placement: string) => {
    unbindPlacement(placement);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Отладка Placement'ов Bitrix24</CardTitle>
          <CardDescription>
            Инструмент для просмотра и удаления зарегистрированных placement'ов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Control buttons */}
          <div className="flex gap-2">
            <Button
              onClick={loadPlacements}
              disabled={loading}
              data-testid="button-load-placements"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Загрузить список
                </>
              )}
            </Button>
          </div>

          {/* Status messages */}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <AlertTitle className="text-green-800 dark:text-green-200">Успех</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Info about target placement */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Целевой placement</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <div><strong>Код:</strong> CRM_DYNAMIC_176_DETAIL_TAB</div>
                <div><strong>Handler:</strong> https://travel-group-manager-ndt72.replit.app/</div>
                <div><strong>Название:</strong> Управление группой</div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Placements list */}
          {placements.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Зарегистрированные placement'ы:</h3>
              
              {placements.map((p, index) => (
                <Card key={index} className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono">
                              {p.placement}
                            </Badge>
                            {p.placement === "CRM_DYNAMIC_176_DETAIL_TAB" && (
                              <Badge variant="default">Наш placement</Badge>
                            )}
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <div>
                              <strong>Handler:</strong>{" "}
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {p.handler}
                              </code>
                            </div>
                            
                            {p.title && (
                              <div>
                                <strong>Название:</strong> {p.title}
                              </div>
                            )}
                            
                            {p.description && (
                              <div>
                                <strong>Описание:</strong> {p.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => unbindPlacement(p.placement, p.handler)}
                            disabled={loading}
                            data-testid={`button-unbind-${p.placement}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Удалить
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unbindAll(p.placement)}
                            disabled={loading}
                            data-testid={`button-unbind-all-${p.placement}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Удалить все
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <AlertTitle>Инструкции</AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              <ol className="list-decimal list-inside space-y-1">
                <li>Нажмите "Загрузить список" чтобы увидеть все зарегистрированные placement'ы</li>
                <li>Найдите placement с кодом "CRM_DYNAMIC_176_DETAIL_TAB"</li>
                <li>Нажмите "Удалить" чтобы удалить конкретный handler</li>
                <li>Или нажмите "Удалить все" чтобы удалить ВСЕ handlers для этого placement</li>
                <li>После удаления вернитесь на страницу /install для регистрации</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Debug info */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-4 bg-muted rounded text-xs font-mono">
              <div>BX24 Available: {window.BX24 ? "Yes" : "No"}</div>
              <div>Placements loaded: {placements.length}</div>
              <div>Loading: {loading ? "Yes" : "No"}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
