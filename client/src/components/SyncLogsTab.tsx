import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Cloud, CheckCircle2, XCircle, AlertCircle, Clock, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SyncLog {
  id: string;
  operation: string;
  entityType: string;
  entityId?: string;
  externalId?: string;
  details?: Record<string, unknown>;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface SyncSettings {
  id?: string;
  key: string;
  enabled: boolean;
  intervalHours: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncMessage?: string;
}

interface SyncLogsResponse {
  logs: SyncLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getOperationLabel(operation: string): string {
  switch (operation) {
    case "create": return "Создание";
    case "update": return "Обновление";
    case "archive": return "Архивация";
    case "error": return "Ошибка";
    case "sync_start": return "Начало синхронизации";
    case "sync_complete": return "Синхронизация завершена";
    default: return operation;
  }
}

function getEntityTypeLabel(entityType: string): string {
  switch (entityType) {
    case "event": return "Тур";
    case "lead": return "Лид";
    default: return entityType;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" data-testid="badge-status-success"><CheckCircle2 className="w-3 h-3 mr-1" />Успешно</Badge>;
    case "error":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" data-testid="badge-status-error"><XCircle className="w-3 h-3 mr-1" />Ошибка</Badge>;
    case "partial":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800" data-testid="badge-status-partial"><AlertCircle className="w-3 h-3 mr-1" />Частично</Badge>;
    case "pending":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" data-testid="badge-status-pending"><Clock className="w-3 h-3 mr-1" />В процессе</Badge>;
    default:
      return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

interface ScrapeWebsiteResponse {
  success: boolean;
  created: number;
  updated: number;
  archived: number;
  errors: string[];
  tours: { name: string; dates: number }[];
  message: string;
}

export function SyncLogsTab() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { toast } = useToast();

  const { data: syncSettings, isLoading: settingsLoading } = useQuery<SyncSettings>({
    queryKey: ["/api/sync-settings/tour_sync"],
  });

  const { data: logsResponse, isLoading: logsLoading } = useQuery<SyncLogsResponse>({
    queryKey: ["/api/sync-logs", { page, limit }],
    queryFn: async () => {
      const response = await fetch(`/api/sync-logs?page=${page}&limit=${limit}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sync logs');
      return response.json();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SyncSettings>) => {
      return apiRequest("PATCH", "/api/sync-settings/tour_sync", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync-settings"] });
    },
  });

  const triggerSyncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sync-settings/tour_sync/trigger");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync-settings"] });
    },
  });

  const scrapeWebsiteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync/scrape-website");
      return response.json() as Promise<ScrapeWebsiteResponse>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Синхронизация завершена",
        description: `Создано: ${data.created}, обновлено: ${data.updated}, архивировано: ${data.archived}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка импорта",
        description: error.message || "Не удалось выполнить импорт с сайта",
        variant: "destructive",
      });
    },
  });

  const handleIntervalChange = (value: string) => {
    updateSettingsMutation.mutate({ intervalHours: parseInt(value) });
  };

  const handleEnabledToggle = (enabled: boolean) => {
    updateSettingsMutation.mutate({ enabled });
  };

  if (settingsLoading || logsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const settings = syncSettings || { key: "tour_sync", enabled: false, intervalHours: 24 };
  const logs = logsResponse?.logs || [];
  const pagination = logsResponse?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Синхронизация с WordPress
          </CardTitle>
          <CardDescription>
            Настройки автоматической синхронизации туров и бронирований с сайтом WordPress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="sync-enabled"
                checked={settings.enabled}
                onCheckedChange={handleEnabledToggle}
                disabled={updateSettingsMutation.isPending}
                data-testid="switch-sync-enabled"
              />
              <Label htmlFor="sync-enabled" className="font-medium">
                Автоматическая синхронизация
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="interval" className="text-sm text-muted-foreground whitespace-nowrap">
                Интервал:
              </Label>
              <Select
                value={String(settings.intervalHours)}
                onValueChange={handleIntervalChange}
                disabled={updateSettingsMutation.isPending}
              >
                <SelectTrigger className="w-[140px]" data-testid="select-sync-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Каждый час</SelectItem>
                  <SelectItem value="6">Каждые 6 часов</SelectItem>
                  <SelectItem value="12">Каждые 12 часов</SelectItem>
                  <SelectItem value="24">Раз в сутки</SelectItem>
                  <SelectItem value="48">Раз в 2 суток</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => scrapeWebsiteMutation.mutate()}
                disabled={scrapeWebsiteMutation.isPending}
                variant="outline"
                data-testid="button-scrape-website"
              >
                <Download className={`w-4 h-4 mr-2 ${scrapeWebsiteMutation.isPending ? 'animate-spin' : ''}`} />
                {scrapeWebsiteMutation.isPending ? 'Импорт...' : 'Импорт с сайта'}
              </Button>
              <Button
                onClick={() => triggerSyncMutation.mutate()}
                disabled={triggerSyncMutation.isPending}
                variant="outline"
                data-testid="button-trigger-sync"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${triggerSyncMutation.isPending ? 'animate-spin' : ''}`} />
                Синхронизировать сейчас
              </Button>
            </div>
          </div>

          {settings.lastSyncAt && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="text-muted-foreground">Последняя синхронизация: </span>
                <span className="font-medium">
                  {format(new Date(settings.lastSyncAt), "d MMM yyyy, HH:mm", { locale: ru })}
                </span>
                {settings.lastSyncStatus && (
                  <span className="ml-3">
                    {getStatusBadge(settings.lastSyncStatus)}
                  </span>
                )}
              </div>
              {settings.lastSyncMessage && (
                <span className="text-sm text-muted-foreground">
                  — {settings.lastSyncMessage}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Журнал синхронизации</CardTitle>
          <CardDescription>
            История операций синхронизации с внешними системами
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Записей пока нет. Операции синхронизации будут отображаться здесь.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 border rounded-lg"
                    data-testid={`row-sync-log-${log.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), "dd.MM.yy HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" data-testid={`badge-entity-${log.entityType}`}>
                        {getEntityTypeLabel(log.entityType)}
                      </Badge>
                      <span className="font-medium text-sm">
                        {getOperationLabel(log.operation)}
                      </span>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground truncate">
                      {log.entityId && <span>ID: {log.entityId.slice(0, 8)}...</span>}
                      {log.externalId && <span className="ml-2">Внешний: {log.externalId}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                    </div>
                    {log.errorMessage && (
                      <div className="w-full text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                        {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Страница {pagination.page} из {pagination.totalPages}
                    {" "}({pagination.total} записей)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}