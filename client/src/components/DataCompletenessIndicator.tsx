import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import type { TouristDataCompleteness, CompletenessStatus } from "@/lib/utils";

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
};

const categoryLabels = {
  personal: "Личные данные",
  russianPassport: "РФ паспорт",
  foreignPassport: "Загранпаспорт",
};

const categoryDescriptions: Record<keyof TouristDataCompleteness, Record<CompletenessStatus, string>> = {
  personal: {
    complete: "Все личные данные заполнены",
    partial: "Личные данные заполнены частично",
    empty: "Личные данные не заполнены",
  },
  russianPassport: {
    complete: "Паспорт РФ заполнен полностью",
    partial: "Паспорт РФ заполнен частично",
    empty: "Паспорт РФ не заполнен",
  },
  foreignPassport: {
    complete: "Загранпаспорт заполнен полностью",
    partial: "Загранпаспорт заполнен частично",
    empty: "Загранпаспорт не заполнен",
  },
};

export function DataCompletenessIndicator({ completeness }: DataCompletenessIndicatorProps) {
  return (
    <div className="flex items-center gap-1">
      {(Object.keys(completeness) as Array<keyof TouristDataCompleteness>).map((category) => {
        const status = completeness[category];
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
            <TooltipContent>
              <p className="font-semibold">{categoryLabels[category]}</p>
              <p className="text-xs text-muted-foreground">{categoryDescriptions[category][status]}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
