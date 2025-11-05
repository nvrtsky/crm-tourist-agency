import { LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ViewMode = "kanban" | "table";

interface ViewToggleProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
}

export function ViewToggle({ value, onValueChange }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        if (newValue) onValueChange(newValue as ViewMode);
      }}
      className="border border-border rounded-md"
      data-testid="toggle-view-mode"
    >
      <ToggleGroupItem
        value="kanban"
        aria-label="Kanban view"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        data-testid="toggle-kanban"
      >
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="table"
        aria-label="Table view"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        data-testid="toggle-table"
      >
        <List className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
