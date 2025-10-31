import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string | null | undefined;
  type?: "text" | "date" | "phone";
  placeholder?: string;
  onSave: (value: string) => void;
  className?: string;
  displayFormat?: (value: string) => string;
}

export function EditableCell({
  value,
  type = "text",
  placeholder = "Нажмите чтобы добавить",
  onSave,
  className,
  displayFormat,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [dateValue, setDateValue] = useState<Date | undefined>(
    value && type === "date" ? new Date(value) : undefined
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current && type === "text") {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, type]);

  const handleSave = () => {
    if (type === "date" && dateValue) {
      const isoDate = dateValue.toISOString().split('T')[0];
      onSave(isoDate);
    } else if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value || "");
      setIsEditing(false);
    }
  };

  const displayValue = value
    ? displayFormat
      ? displayFormat(value)
      : type === "date"
      ? format(new Date(value), "dd.MM.yyyy", { locale: ru })
      : value
    : "";

  if (type === "date") {
    return (
      <Popover open={isEditing} onOpenChange={setIsEditing}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "group flex items-center gap-1 cursor-pointer hover-elevate rounded px-2 py-1 min-h-[28px]",
              !value && "text-muted-foreground italic",
              className
            )}
            data-testid="editable-date-trigger"
          >
            {value ? (
              <>
                <span className="flex-1">{displayValue}</span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            ) : (
              <span className="text-xs">{placeholder}</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              setDateValue(date);
              if (date) {
                const isoDate = date.toISOString().split('T')[0];
                onSave(isoDate);
                setIsEditing(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("h-7 text-xs", className)}
        data-testid="editable-input"
      />
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 cursor-pointer hover-elevate rounded px-2 py-1 min-h-[28px]",
        !value && "text-muted-foreground italic",
        className
      )}
      onClick={() => setIsEditing(true)}
      data-testid="editable-text-trigger"
    >
      {value ? (
        <>
          <span className="flex-1">{displayValue}</span>
          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </>
      ) : (
        <span className="text-xs">{placeholder}</span>
      )}
    </div>
  );
}
