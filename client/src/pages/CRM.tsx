import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function CRM() {
  const { t } = useTranslation();

  const stats = [
    {
      title: "Всего лидов",
      value: "—",
      icon: Users,
      description: "Ожидает реализации",
      testId: "stat-total-leads",
    },
    {
      title: "Новые",
      value: "—",
      icon: TrendingUp,
      description: "Статус: новый",
      testId: "stat-new-leads",
    },
    {
      title: "В работе",
      value: "—",
      icon: Clock,
      description: "Активные лиды",
      testId: "stat-in-progress",
    },
    {
      title: "Завершено",
      value: "—",
      icon: CheckCircle,
      description: "Успешно закрыты",
      testId: "stat-completed",
    },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-crm">
      <div>
        <h1 className="text-3xl font-bold">{t("nav.crm")}</h1>
        <p className="text-muted-foreground mt-2">
          Управление лидами и воронкой продаж
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.testId} data-testid={stat.testId}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="card-crm-preview">
        <CardHeader>
          <CardTitle>CRM Модуль</CardTitle>
          <CardDescription>
            Система управления взаимоотношениями с клиентами
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-primary pl-4 py-2">
            <h3 className="font-semibold mb-2">Функционал:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Карточки лидов с полной информацией</li>
              <li>✓ Воронка продаж с отслеживанием статусов</li>
              <li>✓ История изменений и аудит действий</li>
              <li>✓ Источники лидов (формы, прямые обращения)</li>
              <li>✓ Фильтры и поиск по лидам</li>
              <li>✓ Аналитика конверсии</li>
            </ul>
          </div>
          
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm">
              <strong>Статус:</strong> Архитектура готова, функционал в разработке
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
