import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Shield, Bell, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { t } = useTranslation();

  const sections = [
    {
      title: "Профиль",
      description: "Управление учетной записью пользователя",
      icon: User,
      testId: "section-profile",
    },
    {
      title: "Безопасность",
      description: "Пароль, двухфакторная аутентификация",
      icon: Shield,
      testId: "section-security",
    },
    {
      title: "Уведомления",
      description: "Настройка email и push-уведомлений",
      icon: Bell,
      testId: "section-notifications",
    },
    {
      title: "Внешний вид",
      description: "Тема, язык интерфейса",
      icon: Palette,
      testId: "section-appearance",
    },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <div>
        <h1 className="text-3xl font-bold">{t("nav.settings")}</h1>
        <p className="text-muted-foreground mt-2">
          Настройки приложения и учетной записи
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.testId} data-testid={section.testId}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <section.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
              <Button variant="outline" size="sm" disabled>
                Настроить
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="card-auth-preview">
        <CardHeader>
          <CardTitle>Система Авторизации</CardTitle>
          <CardDescription>
            Аутентификация и управление доступом
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-primary pl-4 py-2">
            <h3 className="font-semibold mb-2">Роли пользователей:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>Admin:</strong> Полный доступ ко всем модулям, управление пользователями
              </li>
              <li>
                <strong>Manager:</strong> Доступ к CRM, формам и турам, редактирование данных
              </li>
              <li>
                <strong>Viewer:</strong> Просмотр данных без возможности редактирования
              </li>
            </ul>
          </div>

          <div className="border-l-4 border-primary pl-4 py-2">
            <h3 className="font-semibold mb-2">Функционал:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Регистрация новых пользователей (только admin)</li>
              <li>✓ Аутентификация с сессиями</li>
              <li>✓ Role-based access control (RBAC)</li>
              <li>✓ Защита маршрутов по ролям</li>
              <li>✓ Audit log действий пользователей</li>
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
