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
                {t('errors.entityIdNotFound', 'ID элемента не определён')}
              </CardTitle>
              <CardDescription>
                {t('errors.entityIdNotFoundDesc', 'Не удалось определить ID Smart Process элемента')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription className="space-y-3">
              <p className="font-medium">
                {t('errors.possibleReasons', 'Возможные причины:')}
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>{t('errors.reason1', 'Приложение открыто не из карточки Smart Process "Событие"')}</li>
                <li>{t('errors.reason2', 'Placement настроен неправильно (handler указывает на /install)')}</li>
                <li>{t('errors.reason3', 'Открыт preview/quick-view вместо полной карточки')}</li>
                <li>{t('errors.reason4', 'Отсутствуют необходимые права доступа')}</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="font-medium text-sm">
              {t('errors.howToFix', 'Как исправить:')}
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="font-bold min-w-[24px]">1.</span>
                <span>{t('errors.solution1', 'Откройте приложение из карточки Smart Process (элемент "Событие"), а не из списка')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="font-bold min-w-[24px]">2.</span>
                <span>{t('errors.solution2', 'Убедитесь, что открыта ПОЛНАЯ карточка (не side-slider preview)')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="font-bold min-w-[24px]">3.</span>
                <div className="flex-1">
                  <span>{t('errors.solution3', 'Если проблема повторяется, переустановите приложение через:')}</span>
                  <div className="mt-1">
                    <a 
                      href="/rebind.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      /rebind.html <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {diagnosticInfo && (
            <details className="text-xs bg-muted p-3 rounded-md">
              <summary className="cursor-pointer font-medium mb-2">
                {t('errors.diagnosticInfo', 'Диагностическая информация')} 
                <span className="text-muted-foreground ml-2">(для разработчика)</span>
              </summary>
              <div className="space-y-1 font-mono text-xs mt-2">
                <div><strong>entityTypeId:</strong> {entityTypeId || '❌'}</div>
                <div><strong>pathname:</strong> {diagnosticInfo.pathname}</div>
                <div><strong>referrer:</strong> {diagnosticInfo.referrer || '(пусто)'}</div>
                <div><strong>placement:</strong> {diagnosticInfo.placement || '❌'}</div>
                <div><strong>window.name:</strong> {diagnosticInfo.windowName || '(пусто)'}</div>
                <div><strong>options:</strong> {JSON.stringify(diagnosticInfo.options, null, 2)}</div>
              </div>
            </details>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              data-testid="button-reload"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('errors.reloadPage', 'Обновить страницу')}
            </Button>
            {onRetry && (
              <Button
                onClick={onRetry}
                data-testid="button-retry"
              >
                {t('errors.tryAgain', 'Попробовать снова')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
