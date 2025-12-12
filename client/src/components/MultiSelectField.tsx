import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDictionaryTypeConfig, useSystemDictionary } from "@/hooks/use-system-dictionary";

interface MultiSelectFieldProps {
  dictionaryType: string;
  value: string | string[] | null | undefined;
  onChange: (value: string | string[] | null) => void;
  placeholder?: string;
  fallbackOptions?: { value: string; label: string }[];
  disabled?: boolean;
  "data-testid"?: string;
}

export function parseMultiValue(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value.includes(",")) {
    return value.split(",").map(v => v.trim()).filter(Boolean);
  }
  return value ? [value] : [];
}

export function serializeMultiValue(values: string[], isMultiple: boolean): string | null {
  if (values.length === 0) return null;
  if (!isMultiple) return values[0];
  return values.join(",");
}

export function MultiSelectField({
  dictionaryType,
  value,
  onChange,
  placeholder = "Выберите...",
  fallbackOptions = [],
  disabled = false,
  "data-testid": testId,
}: MultiSelectFieldProps) {
  const { data: config } = useDictionaryTypeConfig(dictionaryType);
  const { data: items = [] } = useSystemDictionary(dictionaryType);
  
  const isMultiple = config?.isMultiple ?? false;
  const options = items.length > 0 
    ? items.map(item => ({ value: item.value, label: item.label }))
    : fallbackOptions;
  
  const selectedValues = parseMultiValue(value);
  
  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    let newValues: string[];
    if (checked) {
      newValues = [...selectedValues, optionValue];
    } else {
      newValues = selectedValues.filter((v: string) => v !== optionValue);
    }
    onChange(serializeMultiValue(newValues, isMultiple));
  };
  
  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === "__none__") {
      onChange(null);
    } else {
      onChange(selectedValue);
    }
  };
  
  if (isMultiple) {
    return (
      <div className="flex flex-wrap gap-3" data-testid={testId}>
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`${testId}-${option.value}`}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={(checked) => handleCheckboxChange(option.value, !!checked)}
              disabled={disabled}
              data-testid={`checkbox-${option.value}`}
            />
            <Label
              htmlFor={`${testId}-${option.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <Select
      value={selectedValues[0] || "__none__"}
      onValueChange={handleSelectChange}
      disabled={disabled}
    >
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
