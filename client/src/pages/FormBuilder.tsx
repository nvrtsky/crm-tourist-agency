import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Eye,
  ArrowLeft,
  Loader2,
  Type,
  Mail,
  Phone,
  List,
  CheckSquare,
  AlignLeft,
  Calendar,
  MapPin,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  insertFormFieldSchema,
  type Form as FormType,
  type FormField as FormFieldType,
  FORM_FIELD_TYPES,
} from "@shared/schema";

const fieldFormSchema = insertFormFieldSchema
  .omit({ formId: true }) // formId добавляется на бэкенде из URL
  .extend({
    key: z.string().min(1, "Укажите ключ поля"),
    label: z.string().min(1, "Укажите название поля"),
    type: z.enum(FORM_FIELD_TYPES as unknown as [string, ...string[]]),
    options: z.array(z.string()).nullable().optional(),
    isMultiple: z.boolean().optional().default(false),
  });

type FieldFormData = z.infer<typeof fieldFormSchema>;

interface FormWithFields extends FormType {
  fields: FormFieldType[];
}

const FIELD_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: Type,
  email: Mail,
  phone: Phone,
  select: List,
  checkbox: CheckSquare,
  textarea: AlignLeft,
  tour: MapPin,
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Текст",
  email: "Email",
  phone: "Телефон",
  select: "Выбор",
  checkbox: "Чекбокс",
  textarea: "Текстовое поле",
  tour: "Тур",
};

export default function FormBuilder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldType | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  const { data: formData, isLoading } = useQuery<FormWithFields>({
    queryKey: [`/api/forms/${id}`],
    enabled: !!id,
  });

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: {
      key: "",
      label: "",
      type: "text",
      isRequired: false,
      isMultiple: false,
      options: [],
      order: 0,
    },
  });

  // Watch field type to show/hide options editor
  const watchType = form.watch("type");

  // Debug: log form errors
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log("[FormBuilder] Form validation errors:", form.formState.errors);
    }
  }, [form.formState.errors]);

  const createFieldMutation = useMutation({
    mutationFn: async (data: FieldFormData) => {
      console.log("[FormBuilder] Creating field:", data);
      const payload = {
        ...data,
        order: formData?.fields.length || 0,
      };
      console.log("[FormBuilder] Sending to POST /api/forms/${id}/fields:", payload);
      return await apiRequest("POST", `/api/forms/${id}/fields`, payload);
    },
    onSuccess: () => {
      console.log("[FormBuilder] Field created successfully");
      queryClient.invalidateQueries({ queryKey: [`/api/forms/${id}`] });
      toast({
        title: "Поле добавлено",
        description: "Поле успешно добавлено в форму",
      });
      setIsAddFieldDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      console.error("[FormBuilder] Error creating field:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ id: fieldId, data }: { id: string; data: Partial<FieldFormData> }) => {
      return await apiRequest("PATCH", `/api/fields/${fieldId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/forms/${id}`] });
      toast({
        title: "Поле обновлено",
        description: "Изменения успешно сохранены",
      });
      setEditingField(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      return await apiRequest("DELETE", `/api/fields/${fieldId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/forms/${id}`] });
      toast({
        title: "Поле удалено",
        description: "Поле успешно удалено",
      });
    },
  });

  const reorderFieldsMutation = useMutation({
    mutationFn: async (fields: FormFieldType[]) => {
      // Update order for all fields
      const updates = fields.map((field, index) => ({
        id: field.id,
        order: index,
      }));
      
      // Send all updates
      return await Promise.all(
        updates.map(({ id: fieldId, order }) =>
          apiRequest("PATCH", `/api/fields/${fieldId}`, { order })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/forms/${id}`] });
    },
  });

  const handleSubmit = (data: FieldFormData) => {
    console.log("[FormBuilder] handleSubmit called with:", data);
    console.log("[FormBuilder] Editing field:", editingField);
    // Include options from state if it's a select field
    const submitData = {
      ...data,
      options: data.type === "select" ? selectOptions : null,
      isMultiple: data.type === "select" ? data.isMultiple : false,
    };
    if (editingField) {
      console.log("[FormBuilder] Updating field");
      updateFieldMutation.mutate({ id: editingField.id, data: submitData });
    } else {
      console.log("[FormBuilder] Creating new field");
      createFieldMutation.mutate(submitData);
    }
  };

  const handleEdit = (field: FormFieldType) => {
    setEditingField(field);
    setSelectOptions(field.options || []);
    form.reset({
      key: field.key,
      label: field.label,
      type: field.type,
      isRequired: field.isRequired,
      isMultiple: field.isMultiple || false,
      options: field.options || [],
      order: field.order,
    });
  };

  const handleCloseDialog = () => {
    setIsAddFieldDialogOpen(false);
    setEditingField(null);
    setSelectOptions([]);
    setNewOption("");
    form.reset();
  };

  const handleAddOption = () => {
    if (newOption.trim() && !selectOptions.includes(newOption.trim())) {
      setSelectOptions([...selectOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setSelectOptions(selectOptions.filter((_, i) => i !== index));
  };

  const handleMoveOption = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= selectOptions.length) return;
    const newOptions = [...selectOptions];
    [newOptions[fromIndex], newOptions[toIndex]] = [newOptions[toIndex], newOptions[fromIndex]];
    setSelectOptions(newOptions);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const fields = [...(formData?.fields || [])];
    const draggedField = fields[draggedIndex];
    fields.splice(draggedIndex, 1);
    fields.splice(index, 0, draggedField);

    // Update local state immediately for UI feedback
    queryClient.setQueryData([`/api/forms/${id}`], {
      ...formData,
      fields,
    });

    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (formData?.fields) {
      reorderFieldsMutation.mutate(formData.fields);
    }
    setDraggedIndex(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="p-6">
        <p>Форма не найдена</p>
      </div>
    );
  }

  const sortedFields = [...(formData.fields || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="p-6 space-y-6" data-testid="page-form-builder">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/forms")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{formData.name}</h1>
            <p className="text-muted-foreground mt-1">
              Конструктор полей формы
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation(`/forms/${id}/submissions`)}
            data-testid="button-submissions"
          >
            <Eye className="h-4 w-4 mr-2" />
            Отправки
          </Button>
          <Button
            onClick={() => setIsAddFieldDialogOpen(true)}
            data-testid="button-add-field"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить поле
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field List */}
        <Card data-testid="card-field-list">
          <CardHeader>
            <CardTitle>Поля формы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Нет полей</p>
                <p className="text-sm mt-2">Добавьте первое поле в форму</p>
              </div>
            ) : (
              sortedFields.map((field, index) => {
                const Icon = FIELD_TYPE_ICONS[field.type] || Type;
                return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className="flex items-center gap-3 p-3 border rounded-lg hover-elevate cursor-move"
                    data-testid={`field-item-${field.id}`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Icon className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.label}</span>
                        {field.isRequired && (
                          <Badge variant="secondary" className="text-xs">
                            Обязательное
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {field.key} • {FIELD_TYPE_LABELS[field.type]}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(field)}
                        data-testid={`button-edit-field-${field.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteFieldMutation.mutate(field.id)}
                        data-testid={`button-delete-field-${field.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card data-testid="card-preview">
          <CardHeader>
            <CardTitle>Предпросмотр</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedFields.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Добавьте поля для предпросмотра
                </p>
              ) : (
                sortedFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-sm font-medium">
                      {field.label}
                      {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === "textarea" ? (
                      <Textarea
                        placeholder={`Введите ${field.label.toLowerCase()}`}
                        disabled
                      />
                    ) : field.type === "select" ? (
                      field.isMultiple ? (
                        <div className="space-y-2 border rounded-md p-3">
                          {field.options && field.options.length > 0 ? (
                            field.options.map((opt, idx) => (
                              <label key={idx} className="flex items-center gap-2 opacity-50">
                                <Checkbox disabled />
                                <span className="text-sm">{opt}</span>
                              </label>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">Нет опций</span>
                          )}
                        </div>
                      ) : (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите значение" />
                          </SelectTrigger>
                          {field.options && field.options.length > 0 && (
                            <SelectContent>
                              {field.options.map((opt, idx) => (
                                <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          )}
                        </Select>
                      )
                    ) : field.type === "checkbox" ? (
                      <div className="flex items-center gap-2">
                        <input type="checkbox" disabled className="rounded" />
                        <span className="text-sm">{field.label}</span>
                      </div>
                    ) : (
                      <Input
                        type={field.type}
                        placeholder={`Введите ${field.label.toLowerCase()}`}
                        disabled
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Field Dialog */}
      <Dialog open={isAddFieldDialogOpen || !!editingField} onOpenChange={handleCloseDialog}>
        <DialogContent data-testid="dialog-field-editor">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Редактировать поле" : "Добавить поле"}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? "Измените настройки поля"
                : "Добавьте новое поле в форму"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form 
              onSubmit={(e) => {
                console.log("[FormBuilder] Form submit event triggered");
                form.handleSubmit(handleSubmit)(e);
              }} 
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Имя"
                        data-testid="input-label"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ключ</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="name"
                        data-testid="input-key"
                      />
                    </FormControl>
                    <FormDescription>
                      Уникальный идентификатор поля (латиница, без пробелов)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип поля</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FORM_FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {FIELD_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Options editor for select fields */}
              {watchType === "select" && (
                <div className="space-y-3 rounded-lg border p-3">
                  <FormLabel>Опции выбора</FormLabel>
                  
                  {/* Options list */}
                  <div className="space-y-2">
                    {selectOptions.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...selectOptions];
                            newOptions[index] = e.target.value;
                            setSelectOptions(newOptions);
                          }}
                          className="flex-1"
                          data-testid={`input-option-${index}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveOption(index, "up")}
                          disabled={index === 0}
                          data-testid={`button-move-up-${index}`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveOption(index, "down")}
                          disabled={index === selectOptions.length - 1}
                          data-testid={`button-move-down-${index}`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(index)}
                          data-testid={`button-remove-option-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add new option */}
                  <div className="flex gap-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Новая опция"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      data-testid="input-new-option"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddOption}
                      data-testid="button-add-option"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить
                    </Button>
                  </div>

                  {/* Multiple selection toggle */}
                  <FormField
                    control={form.control}
                    name="isMultiple"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3 mt-3">
                        <div className="space-y-0.5">
                          <FormLabel>Множественный выбор</FormLabel>
                          <FormDescription>
                            Разрешить выбор нескольких значений
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-multiple"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Обязательное</FormLabel>
                      <FormDescription>
                        Поле должно быть заполнено
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-required"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
                  data-testid="button-submit"
                >
                  {(createFieldMutation.isPending || updateFieldMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingField ? "Сохранить" : "Добавить"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
