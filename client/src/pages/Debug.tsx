import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, AlertCircle, CheckCircle2, Database } from "lucide-react";
import { useBitrix24 } from "@/hooks/useBitrix24";

interface Tourist {
  dealId: string;
  name: string | null;
  passport: string | null;
  rawData: any;
}

interface DebugResponse {
  success: boolean;
  smartProcessItem: any;
  dealIds: string[];
  deals: any[];
  tourists: Tourist[];
  summary: {
    entityTypeId: string;
    entityId: string;
    dealsCount: number;
    touristsCount: number;
  };
  message?: string;
}

export default function Debug() {
  const { entityId, entityTypeId } = useBitrix24();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBitrixData = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(
        `/api/bitrix/test-fetch?entityTypeId=${entityTypeId || "176"}&entityId=${entityId || "303"}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch data");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!data) return;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitrix24-debug-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          🔍 Bitrix24 Debug
        </h1>
        <p className="text-muted-foreground mt-1">
          Тестовая выгрузка данных из Битрикс24
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Параметры запроса</CardTitle>
          <CardDescription>
            Данные будут загружены из Smart Process "Событие"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Entity Type ID</div>
              <div className="text-lg font-mono">{entityTypeId || "176"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Entity ID</div>
              <div className="text-lg font-mono">{entityId || "303"}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={fetchBitrixData}
              disabled={loading}
              data-testid="button-fetch-data"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Загрузить данные
                </>
              )}
            </Button>

            {data && (
              <Button
                variant="outline"
                onClick={downloadJSON}
                data-testid="button-download-json"
              >
                <Download className="h-4 w-4 mr-2" />
                Скачать JSON
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Данные успешно загружены</AlertTitle>
            <AlertDescription>
              Найдено {data.summary.dealsCount} сделок и {data.summary.touristsCount} туристов
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>📊 Сводка</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Сделок</div>
                  <div className="text-2xl font-bold">{data.summary.dealsCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Туристов</div>
                  <div className="text-2xl font-bold">{data.summary.touristsCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Entity Type</div>
                  <div className="text-2xl font-bold font-mono">{data.summary.entityTypeId}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Entity ID</div>
                  <div className="text-2xl font-bold font-mono">{data.summary.entityId}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {data.tourists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>👥 Туристы ({data.tourists.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.tourists.map((tourist, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg space-y-2"
                      data-testid={`tourist-${index}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {tourist.name || <span className="text-muted-foreground italic">Имя не указано</span>}
                        </div>
                        <Badge variant="outline">Deal #{tourist.dealId}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Паспорт: {tourist.passport || <span className="italic">не указан</span>}
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Показать raw данные
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                          {JSON.stringify(tourist.rawData, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>💼 Сделки ({data.deals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.deals.map((deal, index) => (
                  <details key={index} className="border rounded-lg">
                    <summary className="cursor-pointer p-4 hover:bg-muted">
                      <span className="font-semibold">Deal #{deal.ID}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {deal.TITLE || "Без названия"}
                      </span>
                    </summary>
                    <div className="p-4 border-t">
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">
                        {JSON.stringify(deal, null, 2)}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📦 Smart Process Item</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(data.smartProcessItem, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
