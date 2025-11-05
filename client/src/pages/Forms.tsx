import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Code, Send, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Forms() {
  const { t } = useTranslation();

  const features = [
    {
      title: "Визуальный редактор",
      description: "Создавайте формы drag-and-drop без кода",
      icon: FileText,
      testId: "feature-visual-editor",
    },
    {
      title: "Генерация кода",
      description: "Получайте готовый код для встраивания на сайт",
      icon: Code,
      testId: "feature-code-generation",
    },
    {
      title: "Обработка отправок",
      description: "Автоматическое создание лидов из заявок",
      icon: Send,
      testId: "feature-submissions",
    },
    {
      title: "Настройка полей",
      description: "Гибкая конфигурация типов и валидации",
      icon: Settings,
      testId: "feature-field-config",
    },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-forms">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("nav.forms")}</h1>
          <p className="text-muted-foreground mt-2">
            Конструктор форм для лидогенерации
          </p>
        </div>
        <Button disabled data-testid="button-create-form">
          Создать форму
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature.testId} data-testid={feature.testId}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <feature.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="card-forms-preview">
        <CardHeader>
          <CardTitle>Конструктор Форм</CardTitle>
          <CardDescription>
            Создание и управление формами для сбора заявок
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-primary pl-4 py-2">
            <h3 className="font-semibold mb-2">Возможности:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Визуальный редактор полей формы</li>
              <li>✓ Поддержка различных типов полей (текст, email, телефон, выбор)</li>
              <li>✓ Валидация на стороне клиента и сервера</li>
              <li>✓ Генерация embed-кода для встраивания</li>
              <li>✓ Автоматическое создание лидов в CRM</li>
              <li>✓ История всех отправок</li>
              <li>✓ Статистика конверсии форм</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Workflow:</h3>
            <div className="flex items-center gap-2 text-sm">
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded">
                1. Создание
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded">
                2. Встраивание
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded">
                3. Лиды в CRM
              </div>
            </div>
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
