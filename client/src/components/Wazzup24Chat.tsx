import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, AlertCircle, Settings, RefreshCcw } from "lucide-react";
import { Link } from "wouter";
import type { Lead } from "@shared/schema";

interface Wazzup24ChatProps {
  lead: Lead;
}

export function Wazzup24Chat({ lead }: Wazzup24ChatProps) {
  const { toast } = useToast();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);

  const { data: wazzup24Status, isLoading: isLoadingStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/settings/wazzup24"],
  });

  const iframeMutation = useMutation({
    mutationFn: async () => {
      const leadName = `${lead.lastName || ''} ${lead.firstName || ''}`.trim() || `Lead ${lead.id}`;
      const response = await apiRequest("POST", "/api/wazzup24/iframe", {
        leadId: lead.id,
        phone: lead.phone || undefined,
        name: leadName,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        setIframeUrl(data.url);
        setIframeError(null);
      } else {
        setIframeError("Не удалось получить URL чата");
      }
    },
    onError: (error: Error) => {
      const isUnauthorized = error.message.includes("401") || error.message.includes("Unauthorized");
      if (isUnauthorized) {
        setIframeError("API ключ Wazzup24 не настроен или недействителен");
      } else {
        setIframeError(error.message);
        toast({
          title: "Ошибка загрузки чата",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    if (wazzup24Status?.configured && !iframeUrl && !iframeMutation.isPending) {
      iframeMutation.mutate();
    }
  }, [wazzup24Status?.configured]);

  const handleRefresh = () => {
    setIframeUrl(null);
    setIframeError(null);
    iframeMutation.mutate();
  };

  if (isLoadingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!wazzup24Status?.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Wazzup24 не настроен
          </CardTitle>
          <CardDescription>
            Для использования чата WhatsApp необходимо настроить интеграцию Wazzup24
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Перейти к настройкам
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (iframeMutation.isPending) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Загрузка чата...</p>
        </CardContent>
      </Card>
    );
  }

  if (iframeError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Ошибка загрузки чата
          </CardTitle>
          <CardDescription>{iframeError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!iframeUrl) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <MessageCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Чат не загружен</p>
          <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Загрузить чат
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          WhatsApp чат с {lead.lastName} {lead.firstName}
        </p>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh}
          title="Обновить чат"
          data-testid="button-refresh-chat"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>
      <iframe
        src={iframeUrl}
        className="w-full h-[600px] border rounded-lg"
        title="Wazzup24 Chat"
        data-testid="iframe-wazzup24-chat"
      />
    </div>
  );
}
