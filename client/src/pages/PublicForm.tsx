import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle } from "lucide-react";
import type { Form as FormType, FormField as FormFieldType, Event } from "@shared/schema";

interface FormWithFields extends FormType {
  fields: FormFieldType[];
}

interface AvailabilityData {
  eventId: string;
  participantLimit: number;
  confirmedCount: number;
  availableSpots: number;
  availabilityPercentage: number;
  isFull: boolean;
}

// Build dynamic schema based on form fields
const buildSchema = (fields: FormFieldType[]) => {
  const shape: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case "email":
        fieldSchema = z.string().email("Неверный формат email");
        break;
      case "phone":
        fieldSchema = z.string().min(10, "Введите корректный номер телефона");
        break;
      case "tour":
        fieldSchema = z.string();
        break;
      case "checkbox":
        fieldSchema = z.boolean();
        if (field.isRequired) {
          fieldSchema = z.boolean().refine(val => val === true, {
            message: "Обязательное поле",
          });
        }
        break;
      default:
        fieldSchema = z.string();
    }
    
    if (field.isRequired && field.type !== "checkbox") {
      fieldSchema = (fieldSchema as z.ZodString).min(1, "Обязательное поле");
    } else if (!field.isRequired && field.type !== "checkbox") {
      fieldSchema = fieldSchema.optional();
    }
    
    shape[field.key] = fieldSchema;
  });
  
  return z.object(shape);
};

function AvailabilityBadge({ eventId }: { eventId: string }) {
  const { data: availability, isLoading } = useQuery<AvailabilityData>({
    queryKey: [`/api/events/availability/${eventId}`],
  });

  if (isLoading) {
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  }

  if (!availability) {
    return null;
  }

  const { availabilityPercentage } = availability;

  let badgeVariant: "default" | "secondary" | "destructive" = "default";
  let badgeText = "Много мест";

  if (availabilityPercentage <= 0) {
    badgeVariant = "destructive";
    badgeText = "Нет мест";
  } else if (availabilityPercentage <= 10) {
    badgeVariant = "destructive";
    badgeText = "Мало мест";
  } else if (availabilityPercentage <= 30) {
    badgeVariant = "secondary";
    badgeText = "Мало мест";
  }

  return (
    <Badge variant={badgeVariant} className="text-xs">
      {badgeText}
    </Badge>
  );
}

function TourSelect({ 
  onChange, 
  value, 
  isRequired 
}: { 
  onChange: (value: string) => void; 
  value: string; 
  isRequired: boolean;
}) {
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const availableEvents = events.filter(event => !event.isFull);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (availableEvents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Нет доступных туров
      </div>
    );
  }

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger data-testid="select-tour">
        <SelectValue placeholder="Выберите тур" />
      </SelectTrigger>
      <SelectContent>
        {availableEvents.map((event) => (
          <SelectItem key={event.id} value={event.id}>
            <div className="flex items-center justify-between gap-2 w-full">
              <div>
                <div>{event.name}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(event.startDate), 'dd.MM.yyyy')} - {format(new Date(event.endDate), 'dd.MM.yyyy')}
                </div>
              </div>
              <AvailabilityBadge eventId={event.id} />
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FormContent({ formData, onSubmitSuccess }: { formData: FormWithFields; onSubmitSuccess: () => void }) {
  const sortedFields = [...formData.fields].sort((a, b) => a.order - b.order);
  const formSchema = buildSchema(sortedFields);
  
  const defaultValues = sortedFields.reduce((acc, field) => {
    acc[field.key] = field.type === "checkbox" ? false : "";
    return acc;
  }, {} as Record<string, string | boolean>);
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, string | boolean>) => {
      const response = await fetch(`/api/public/forms/${formData.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit form");
      }
      
      return response.json();
    },
    onSuccess: () => {
      onSubmitSuccess();
      form.reset();
    },
  });

  const handleSubmit = (data: Record<string, string | boolean>) => {
    submitMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{formData.name}</CardTitle>
        {formData.description && (
          <CardDescription>{formData.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {sortedFields.map((field) => (
              <FormField
                key={field.id}
                control={form.control}
                name={field.key}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>
                      {field.label}
                      {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                    <FormControl>
                      {field.type === "textarea" ? (
                        <Textarea
                          {...formField}
                          placeholder={`Введите ${field.label.toLowerCase()}`}
                          data-testid={`input-${field.key}`}
                          value={formField.value as string}
                        />
                      ) : field.type === "select" ? (
                        <Select
                          onValueChange={formField.onChange}
                          value={formField.value as string}
                        >
                          <SelectTrigger data-testid={`select-${field.key}`}>
                            <SelectValue placeholder="Выберите значение" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="option1">Опция 1</SelectItem>
                            <SelectItem value="option2">Опция 2</SelectItem>
                            <SelectItem value="option3">Опция 3</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : field.type === "tour" ? (
                        <TourSelect
                          onChange={formField.onChange}
                          value={formField.value as string}
                          isRequired={field.isRequired}
                        />
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formField.value as boolean}
                            onCheckedChange={formField.onChange}
                            data-testid={`checkbox-${field.key}`}
                          />
                          <span className="text-sm">{field.label}</span>
                        </div>
                      ) : (
                        <Input
                          {...formField}
                          type={field.type}
                          placeholder={`Введите ${field.label.toLowerCase()}`}
                          data-testid={`input-${field.key}`}
                          value={formField.value as string}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending}
              data-testid="button-submit"
            >
              {submitMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Отправить
            </Button>
            {submitMutation.isError && (
              <p className="text-sm text-red-500 text-center">
                Ошибка отправки. Попробуйте еще раз.
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function PublicForm() {
  const { id } = useParams();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: formData, isLoading } = useQuery<FormWithFields>({
    queryKey: [`/api/public/forms/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Форма не найдена</CardTitle>
            <CardDescription>
              Форма не существует или неактивна
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg" data-testid="card-success">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">Спасибо!</CardTitle>
            <CardDescription className="text-center">
              Ваша заявка успешно отправлена. Мы свяжемся с вами в ближайшее время.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setIsSubmitted(false)}
              className="w-full"
              variant="outline"
              data-testid="button-submit-another"
            >
              Отправить еще одну заявку
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" data-testid="page-public-form">
      <FormContent formData={formData} onSubmitSuccess={() => setIsSubmitted(true)} />
    </div>
  );
}
