import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string | null | undefined;
  type?: "text" | "date" | "phone" | "time" | "select";
  placeholder?: string;
  onSave: (value: string) => void;
  className?: string;
  displayFormat?: (value: string) => string;
  selectOptions?: { value: string; label: string }[];
  triggerTestId?: string;
  inputTestId?: string;
}

export function EditableCell({
  value,
  type = "text",
  placeholder = "Нажмите чтобы добавить",
  onSave,
  className,
  displayFormat,
  selectOptions = [],
  triggerTestId,
  inputTestId,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [dateValue, setDateValue] = useState<Date | undefined>(
    value && type === "date" ? new Date(value) : undefined
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current && (type === "text" || type === "phone" || type === "time")) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, type]);

  useEffect(() => {
    if (type === "date") {
      setDateValue(value ? new Date(value) : undefined);
    }
  }, [value, type]);

  const handleSave = () => {
    if (type === "date" && dateValue) {
      const isoDate = format(dateValue, 'yyyy-MM-dd');
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
      : type === "select" && selectOptions.length > 0
      ? selectOptions.find(opt => opt.value === value)?.label || value
      : value
    : "";

  if (type === "select") {
    return (
      <div className="relative inline-flex items-center group">
        <Select
          value={value || ""}
          onValueChange={(newValue) => {
            onSave(newValue);
          }}
        >
          <SelectTrigger 
            className={cn(
              "h-auto min-h-[28px] px-2 py-1 pr-7 border-0 hover-elevate data-[state=open]:bg-accent",
              !value && "text-muted-foreground italic",
              className
            )}
            data-testid={triggerTestId || "editable-select-trigger"}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} data-testid={`select-option-${option.value}`}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 pointer-events-none" />
      </div>
    );
  }

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
            data-testid={triggerTestId || "editable-date-trigger"}
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
                const isoDate = format(date, 'yyyy-MM-dd');
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
        type={type === "time" ? "time" : "text"}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("h-7 text-xs", className)}
        data-testid={inputTestId || "editable-input"}
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
      data-testid={triggerTestId || "editable-text-trigger"}
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
