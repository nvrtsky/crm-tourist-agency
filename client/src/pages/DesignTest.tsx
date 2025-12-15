import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, User, FileText, Settings, MapPin } from "lucide-react";

export default function DesignTest() {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Варианты дизайна заголовков секций</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Текущий стиль</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground">Тур и оплата</h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Вариант 1: С иконкой и цветным акцентом</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Тур и оплата
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Информация о лиде
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Вариант 2: С цветной полосой слева</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground pl-3 border-l-2 border-primary">
              Тур и оплата
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground pl-3 border-l-2 border-primary">
              Информация о лиде
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Вариант 3: С лёгким фоном</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground bg-muted/50 px-3 py-1.5 rounded-md inline-block">
              Тур и оплата
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground bg-muted/50 px-3 py-1.5 rounded-md inline-block">
              Информация о лиде
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Вариант 4: Uppercase + tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Тур и оплата
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Информация о лиде
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Вариант 5: Иконка + фон</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground bg-muted/30 px-3 py-2 rounded-md flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Тур и оплата
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground bg-muted/30 px-3 py-2 rounded-md flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Информация о лиде
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Вариант 6: Полоса слева + иконка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground pl-3 border-l-2 border-primary flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Тур и оплата
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground pl-3 border-l-2 border-primary flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Информация о лиде
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Вариант 7: Подчёркивание</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground pb-2 border-b border-primary/30 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Тур и оплата
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground pb-2 border-b border-primary/30 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Информация о лиде
            </h4>
            <div className="h-20 bg-muted/30 rounded flex items-center justify-center text-muted-foreground">
              Контент секции...
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
