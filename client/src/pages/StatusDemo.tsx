import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";

export default function StatusDemo() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Статусные Badge - Демо</h1>
        <p className="text-muted-foreground">
          Все варианты Badge компонентов в светлой и темной теме
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Success (Успех)</CardTitle>
          <CardDescription>
            Зеленый - подтверждение, успешное завершение
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge variant="success" data-testid="badge-success-1">
            <CheckCircle className="w-3 h-3 mr-1" />
            Подтверждено
          </Badge>
          <Badge variant="success" data-testid="badge-success-2">
            Оплачено
          </Badge>
          <Badge variant="success" data-testid="badge-success-3">
            <CheckCircle className="w-3 h-3 mr-1" />
            Synced to Tours
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Warning (Внимание)</CardTitle>
          <CardDescription>
            Золотой - требует внимания, ожидание
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge variant="warning" data-testid="badge-warning-1">
            <AlertCircle className="w-3 h-3 mr-1" />
            Ожидание оплаты
          </Badge>
          <Badge variant="warning" data-testid="badge-warning-2">
            Требует подтверждения
          </Badge>
          <Badge variant="warning" data-testid="badge-warning-3">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Info (Информация)</CardTitle>
          <CardDescription>
            Синий - информационные статусы, в процессе
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge variant="info" data-testid="badge-info-1">
            <Info className="w-3 h-3 mr-1" />
            В обработке
          </Badge>
          <Badge variant="info" data-testid="badge-info-2">
            Новый лид
          </Badge>
          <Badge variant="info" data-testid="badge-info-3">
            <Info className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destructive (Ошибка)</CardTitle>
          <CardDescription>
            Красный - ошибки, отмены, критичные действия
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge variant="destructive" data-testid="badge-destructive-1">
            <XCircle className="w-3 h-3 mr-1" />
            Отменено
          </Badge>
          <Badge variant="destructive" data-testid="badge-destructive-2">
            Ошибка оплаты
          </Badge>
          <Badge variant="destructive" data-testid="badge-destructive-3">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outline (Контурный)</CardTitle>
          <CardDescription>
            Прозрачный с границей - вторичные статусы
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge variant="outline" data-testid="badge-outline-1">
            Архив
          </Badge>
          <Badge variant="outline" data-testid="badge-outline-2">
            Неактивно
          </Badge>
          <Badge variant="outline" data-testid="badge-outline-3">
            Черновик
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default (По умолчанию)</CardTitle>
          <CardDescription>
            Нейтральный - общие метки
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge data-testid="badge-default-1">
            Стандартный
          </Badge>
          <Badge data-testid="badge-default-2">
            Обычный статус
          </Badge>
          <Badge data-testid="badge-default-3">
            Regular
          </Badge>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Адаптация под тему</CardTitle>
          <CardDescription>
            Статусные цвета оптимизированы для читаемости в обеих темах
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Светлая тема:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Темные оттенки</Badge>
              <Badge variant="warning">с белым текстом</Badge>
              <Badge variant="info">для контраста</Badge>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Темная тема:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Светлые оттенки</Badge>
              <Badge variant="warning">с темным текстом</Badge>
              <Badge variant="info">для читаемости</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Переключите тему (светлая ↔ темная) чтобы увидеть разницу в цветах
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
