import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

export type ColorOption = "red" | "blue" | "green" | "yellow" | "purple" | null;

const COLOR_CONFIG: Record<Exclude<ColorOption, null>, { bg: string; border: string; label: string }> = {
  red: {
    bg: "bg-red-500 dark:bg-red-600",
    border: "border-red-600 dark:border-red-700",
    label: "Красный"
  },
  blue: {
    bg: "bg-blue-500 dark:bg-blue-600",
    border: "border-blue-600 dark:border-blue-700",
    label: "Синий"
  },
  green: {
    bg: "bg-green-500 dark:bg-green-600",
    border: "border-green-600 dark:border-green-700",
    label: "Зелёный"
  },
  yellow: {
    bg: "bg-yellow-500 dark:bg-yellow-600",
    border: "border-yellow-600 dark:border-yellow-700",
    label: "Жёлтый"
  },
  purple: {
    bg: "bg-purple-500 dark:bg-purple-600",
    border: "border-purple-600 dark:border-purple-700",
    label: "Фиолетовый"
  }
};

export interface ColorPickerProps {
  value: ColorOption;
  onChange: (value: ColorOption) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label = "Цвет" }: ColorPickerProps) {
  const colors: Array<Exclude<ColorOption, null>> = ["red", "blue", "green", "yellow", "purple"];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`h-8 w-8 rounded-md border-2 transition-all hover-elevate ${
            value === null
              ? "border-primary bg-muted"
              : "border-border bg-background"
          }`}
          title="Без цвета"
          data-testid="color-none"
        >
          <span className="text-xs text-muted-foreground">—</span>
        </button>
        
        {colors.map((color) => {
          const config = COLOR_CONFIG[color];
          const isSelected = value === color;
          
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`h-8 w-8 rounded-md border-2 transition-all hover-elevate flex items-center justify-center ${config.bg} ${
                isSelected 
                  ? `${config.border} ring-2 ring-offset-2 ring-foreground` 
                  : "border-transparent"
              }`}
              title={config.label}
              data-testid={`color-${color}`}
            >
              {isSelected && <Check className="h-4 w-4 text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function getColorClasses(color: ColorOption): string {
  if (!color) return "";
  const config = COLOR_CONFIG[color];
  return `${config.bg} text-white`;
}

// Pastel background colors for card fill
const PASTEL_CONFIG: Record<Exclude<ColorOption, null>, { bg: string; border: string }> = {
  red: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900"
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900"
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-900"
  },
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-900"
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-900"
  }
};

export function getPastelClasses(color: ColorOption): { bg: string; border: string } {
  if (!color) return { bg: "", border: "" };
  return PASTEL_CONFIG[color] || { bg: "", border: "" };
}

// Color display mode types
export type ColorDisplayMode = "dot" | "fill" | "both";

// Get color display settings from localStorage
export function getColorDisplayMode(): ColorDisplayMode {
  if (typeof window === "undefined") return "both";
  const stored = localStorage.getItem("colorDisplayMode");
  if (stored === "dot" || stored === "fill" || stored === "both") {
    return stored;
  }
  return "both";
}

// Save color display settings to localStorage
export function setColorDisplayMode(mode: ColorDisplayMode): void {
  localStorage.setItem("colorDisplayMode", mode);
}

export function ColorIndicator({ color }: { color: ColorOption }) {
  if (!color) return null;
  
  const config = COLOR_CONFIG[color];
  
  return (
    <div
      className={`h-3 w-3 rounded-full ${config.bg}`}
      title={config.label}
      data-testid={`indicator-${color}`}
    />
  );
}
