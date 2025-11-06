import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Code, Eye, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertFormSchema, type Form as FormType } from "@shared/schema";
import { format } from "date-fns";

const formFormSchema = insertFormSchema.extend({
  name: z.string().min(3, "Название должно содержать минимум 3 символа"),
  description: z.string().optional(),
});

type FormFormData = z.infer<typeof formFormSchema>;

export default function Forms() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormType | null>(null);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [embedFormId, setEmbedFormId] = useState<string | null>(null);

  const { data: forms = [], isLoading } = useQuery<FormType[]>({
    queryKey: ["/api/forms"],
  });

  const form = useForm<FormFormData>({
    resolver: zodResolver(formFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormFormData) => {
      // TODO: Replace with actual user from auth context
      const userId = "demo-user-001";
      
      return await apiRequest("POST", "/api/forms", {
        ...data,
        userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Форма создана",
        description: "Форма успешно создана",
      });
      setIsCreateDialogOpen(false);
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormFormData> }) => {
      return await apiRequest("PATCH", `/api/forms/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Форма обновлена",
        description: "Изменения успешно сохранены",
      });
      setEditingForm(null);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/forms/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Форма удалена",
        description: "Форма успешно удалена",
      });
      setDeletingFormId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/forms/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
    },
  });

  const handleSubmit = (data: FormFormData) => {
    if (editingForm) {
      updateMutation.mutate({ id: editingForm.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (formData: FormType) => {
    setEditingForm(formData);
    form.reset({
      name: formData.name,
      description: formData.description || "",
      isActive: formData.isActive,
    });
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingForm(null);
    form.reset();
  };

  const embedUrl = embedFormId 
    ? `${window.location.origin}/forms/${embedFormId}/public` 
    : "";

  const embedCode = embedFormId
    ? `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`
    : "";

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Скопировано",
      description: "Embed-код скопирован в буфер обмена",
    });
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(embedUrl);
    toast({
      title: "Скопировано",
      description: "Ссылка скопирована в буфер обмена",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-forms">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Формы</h1>
          <p className="text-muted-foreground mt-2">
            Конструктор форм для лидогенерации
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-form"
        >
          <Plus className="h-4 w-4 mr-2" />
          Создать форму
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card data-testid="card-empty-state">
          <CardHeader>
            <CardTitle>Нет форм</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Создайте первую форму для сбора заявок с вашего сайта
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать первую форму
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-forms-table">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Отправок</TableHead>
                  <TableHead>Создана</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((formItem) => (
                  <TableRow key={formItem.id} data-testid={`row-form-${formItem.id}`}>
                    <TableCell className="font-medium">{formItem.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">
                      {formItem.description || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formItem.isActive}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({
                              id: formItem.id,
                              isActive: checked,
                            })
                          }
                          data-testid={`switch-active-${formItem.id}`}
                        />
                        <Badge variant={formItem.isActive ? "default" : "secondary"}>
                          {formItem.isActive ? "Активна" : "Неактивна"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-submissions-${formItem.id}`}>
                      —
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(formItem.createdAt), "dd.MM.yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setLocation(`/forms/${formItem.id}/builder`)}
                          data-testid={`button-edit-${formItem.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setLocation(`/forms/${formItem.id}/submissions`)}
                          data-testid={`button-submissions-${formItem.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEmbedFormId(formItem.id)}
                          data-testid={`button-embed-${formItem.id}`}
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingFormId(formItem.id)}
                          data-testid={`button-delete-${formItem.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingForm} onOpenChange={handleCloseDialog}>
        <DialogContent data-testid="dialog-form-editor">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? "Редактировать форму" : "Создать форму"}
            </DialogTitle>
            <DialogDescription>
              {editingForm
                ? "Измените настройки формы"
                : "Создайте новую форму для сбора заявок"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Форма обратной связи"
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Форма для приёма заявок на туры"
                        rows={3}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Активна</FormLabel>
                      <FormDescription>
                        Активные формы доступны для заполнения
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingForm ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFormId} onOpenChange={() => setDeletingFormId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить форму?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Форма и все её отправки будут удалены навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFormId && deleteMutation.mutate(deletingFormId)}
              data-testid="button-confirm-delete"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Embed Code Dialog */}
      <Dialog open={!!embedFormId} onOpenChange={() => setEmbedFormId(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-embed-code">
          <DialogHeader>
            <DialogTitle>Embed-код формы</DialogTitle>
            <DialogDescription>
              Скопируйте код ниже и вставьте на ваш сайт
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Прямая ссылка</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUrl}
                  data-testid="button-copy-url"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Копировать
                </Button>
              </div>
              <Input
                value={embedUrl}
                readOnly
                data-testid="input-embed-url"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">HTML код (iframe)</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyEmbed}
                  data-testid="button-copy-embed"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Копировать
                </Button>
              </div>
              <Textarea
                value={embedCode}
                readOnly
                rows={3}
                data-testid="input-embed-code"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
