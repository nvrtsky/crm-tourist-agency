import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold">Страница не найдена</h2>
        <p className="text-muted-foreground">
          Запрашиваемая страница не существует
        </p>
        <Button asChild data-testid="button-home">
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            На главную
          </Link>
        </Button>
      </div>
    </div>
  );
}
