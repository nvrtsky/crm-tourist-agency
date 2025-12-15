import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, XCircle, MinusCircle } from "lucide-react";
import type { TouristDataCompleteness, CompletenessStatus, CategoryCompleteness } from "@/lib/utils";

interface DataCompletenessIndicatorProps {
  completeness: TouristDataCompleteness;
}

const statusConfig: Record<CompletenessStatus, {
  icon: typeof CheckCircle2;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}> = {
  complete: {
    icon: CheckCircle2,
    variant: "default",
    className: "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white",
  },
  partial: {
    icon: AlertCircle,
    variant: "secondary",
    className: "bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white",
  },
  empty: {
    icon: XCircle,
    variant: "destructive",
    className: "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white",
  },
  not_required: {
    icon: MinusCircle,
    variant: "outline",
    className: "bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700 text-white border-gray-400 dark:border-gray-600",
  },
};

const categoryLabels: Record<keyof TouristDataCompleteness, string> = {
  personal: "Личные данные",
  russianPassport: "РФ паспорт",
  foreignPassport: "Загранпаспорт",
};

export function DataCompletenessIndicator({ completeness }: DataCompletenessIndicatorProps) {
  return (
    <div className="flex items-center gap-1">
      {(Object.keys(completeness) as Array<keyof TouristDataCompleteness>).map((category) => {
        const categoryData = completeness[category] as CategoryCompleteness;
        const status = categoryData.status;
        const missingFields = categoryData.missingFields;
        const config = statusConfig[status];
        const Icon = config.icon;

        return (
          <Tooltip key={category}>
            <TooltipTrigger
              type="button"
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 h-6 text-xs font-semibold transition-colors cursor-help ${config.className}`}
              data-testid={`indicator-${category}-${status}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent side="bottom" collisionPadding={8}>
              <p className="font-semibold">{categoryLabels[category]}</p>
              {status === "complete" && (
                <p className="text-xs text-muted-foreground">Все данные заполнены</p>
              )}
              {status === "not_required" && (
                <p className="text-xs text-muted-foreground">Данные не требуются</p>
              )}
              {(status === "partial" || status === "empty") && missingFields.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Не заполнено: {missingFields.join(", ")}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
