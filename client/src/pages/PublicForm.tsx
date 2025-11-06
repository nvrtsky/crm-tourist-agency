import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Form as FormType, FormField as FormFieldType } from "@shared/schema";

interface FormWithFields extends FormType {
  fields: FormFieldType[];
}

export default function PublicForm() {
  const { id } = useParams();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: formData, isLoading } = useQuery<FormWithFields>({
    queryKey: [`/api/public/forms/${id}`],
    enabled: !!id,
  });

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
        case "checkbox":
          fieldSchema = z.boolean();
          break;
        default:
          fieldSchema = z.string();
      }
      
      if (field.isRequired && field.type !== "checkbox") {
        fieldSchema = (fieldSchema as z.ZodString).min(1, "Обязательное поле");
      } else if (!field.isRequired) {
        fieldSchema = fieldSchema.optional();
      }
      
      shape[field.key] = fieldSchema;
    });
    
    return z.object(shape);
  };

  const sortedFields = formData?.fields ? [...formData.fields].sort((a, b) => a.order - b.order) : [];
  const formSchema = sortedFields.length > 0 ? buildSchema(sortedFields) : z.object({});
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: sortedFields.reduce((acc, field) => {
      acc[field.key] = field.type === "checkbox" ? false : "";
      return acc;
    }, {} as Record<string, string | boolean>),
  });

  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, string | boolean>) => {
      const response = await fetch(`/api/public/forms/${id}/submit`, {
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
      setIsSubmitted(true);
      form.reset();
    },
  });

  const handleSubmit = (data: Record<string, string | boolean>) => {
    submitMutation.mutate(data);
  };

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
    </div>
  );
}
