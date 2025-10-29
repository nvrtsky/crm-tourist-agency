import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

interface EntityIdNotFoundProps {
  entityTypeId: string | null;
  diagnosticInfo?: {
    pathname: string;
    referrer: string;
    options: any;
    placement: string;
    windowName?: string;
    extractionMethod?: string;
  };
  onRetry?: () => void;
}

export function EntityIdNotFound({ entityTypeId, diagnosticInfo, onRetry }: EntityIdNotFoundProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <div>
              <CardTitle className="text-2xl">
                Нужно открыть карточку события полностью
              </CardTitle>
              <CardDescription>
                Откройте событие в полной карточке, а не в предпросмотре
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription className="space-y-3">
              <p className="text-sm">
                Сейчас вкладка <strong>"Управление группой"</strong> открыта во временном предпросмотре (сайдбар справа). 
                В этом режиме Bitrix24 не передаёт ID события, поэтому мы не можем показать состав группы.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="font-medium text-sm">
              Что сделать:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="font-bold min-w-[24px]">1.</span>
                <span>Закройте этот боковой предпросмотр.</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="font-bold min-w-[24px]">2.</span>
                <span>Откройте карточку события (смарт-процесс "Событие") полностью.</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="font-bold min-w-[24px]">3.</span>
                <span>Перейдите на вкладку "Управление группой" снова.</span>
              </div>
            </div>
          </div>

          {diagnosticInfo && (
            <div className="pt-4 border-t">
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium mb-2">
                  Техническая информация
                </summary>
                <div className="space-y-1 font-mono text-xs mt-2 pl-4">
                  <div>placement: {diagnosticInfo.placement || 'не определён'}</div>
                  <div>entityTypeId: {entityTypeId || 'не определён'}</div>
                  <div>Открыт режим предпросмотра без ID.</div>
                </div>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
