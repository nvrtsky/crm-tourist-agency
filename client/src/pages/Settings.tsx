import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Pencil, Trash2, Loader2, Shield, MessageCircle, Check, X, Settings as SettingsIcon, Palette, Book, ArrowUp, ArrowDown, Cloud, Webhook } from "lucide-react";
import { SyncLogsTab } from "@/components/SyncLogsTab";
import { z } from "zod";
import type { User, SystemDictionary, DICTIONARY_TYPES } from "@shared/schema";
import { type ColorDisplayMode, getColorDisplayMode, setColorDisplayMode, ColorIndicator, getPastelClasses } from "@/components/ColorPicker";

// Dictionary type labels in Russian
const DICTIONARY_TYPE_LABELS: Record<string, string> = {
  lead_source: "Источники лидов",
  lead_status: "Статусы лидов",
  country: "Страны",
  room_type: "Типы размещения",
  currency: "Валюты",
  hotel_category: "Категории отелей",
  client_category: "Категории клиентов",
  transfers: "Трансферы",
  meals: "Питание",
};

const AVAILABLE_DICTIONARY_TYPES = Object.keys(DICTIONARY_TYPE_LABELS);

type SanitizedUser = Omit<User, "passwordHash">;
type UserRole = "admin" | "manager" | "viewer";

function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "manager" || value === "viewer";
}

function normalizeUserRole(role: string): UserRole {
  return isUserRole(role) ? role : "viewer";
}

const userFormSchema = z.object({
  username: z.string().min(3, "Минимум 3 символа"),
  password: z.string().min(6, "Минимум 6 символов").optional().or(z.literal("")),
  firstName: z.string().min(1, "Обязательное поле"),
  lastName: z.string().min(1, "Обязательное поле"),
  position: z.string().min(1, "Обязательное поле"),
  role: z.enum(["admin", "manager", "viewer"]),
});

type UserFormData = z.infer<typeof userFormSchema>;

function UsersTab() {
  const { user: currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SanitizedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SanitizedUser | null>(null);
  
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    position: "",
    role: "viewer",
  });

  const { data: users = [], isLoading } = useQuery<SanitizedUser[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest("POST", "/api/users", {
        ...data,
        passwordHash: data.password,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Пользователь создан",
        description: "Новый пользователь успешно добавлен",
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      const updateData: any = { ...data };
      if (data.password) {
        updateData.passwordHash = data.password;
      }
      delete updateData.password;
      
      const response = await apiRequest("PATCH", `/api/users/${id}`, updateData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Пользователь обновлен",
        description: "Изменения успешно сохранены",
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Пользователь удален",
        description: "Пользователь успешно удален из системы",
      });
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenCreateDialog = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      position: "",
      role: "viewer",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (user: SanitizedUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName,
      position: user.position ?? "",
      role: normalizeUserRole(user.role),
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      position: "",
      role: "viewer",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validation = userFormSchema.safeParse(formData);
      if (!validation.success) {
        toast({
          title: "Ошибка валидации",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      if (editingUser) {
        const updateData: Partial<UserFormData> = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          position: formData.position,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await updateUserMutation.mutateAsync({ id: editingUser.id, data: updateData });
      } else {
        if (!formData.password) {
          toast({
            title: "Ошибка валидации",
            description: "Пароль обязателен при создании пользователя",
            variant: "destructive",
          });
          return;
        }
        await createUserMutation.mutateAsync(formData);
      }
    } catch (error) {
    }
  };

  const handleDelete = (user: SanitizedUser) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingUser) {
      await deleteUserMutation.mutateAsync(deletingUser.id);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "default" as const;
      case "manager":
        return "secondary" as const;
      case "viewer":
        return "outline" as const;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "Администратор";
      case "manager":
        return "Менеджер";
      case "viewer":
        return "Наблюдатель";
    }
  };

  const isSubmitting = createUserMutation.isPending || updateUserMutation.isPending;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Button onClick={handleOpenCreateDialog} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-2" />
          Добавить пользователя
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>
            Всего пользователей: {users.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет пользователей в системе
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя пользователя</TableHead>
                    <TableHead>Имя</TableHead>
                    <TableHead>Фамилия</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium" data-testid={`text-username-${user.id}`}>
                        {user.username}
                      </TableCell>
                      <TableCell data-testid={`text-firstname-${user.id}`}>
                        {user.firstName}
                      </TableCell>
                      <TableCell data-testid={`text-lastname-${user.id}`}>
                        {user.lastName}
                      </TableCell>
                      <TableCell data-testid={`text-position-${user.id}`}>
                        {user.position || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(normalizeUserRole(user.role))} data-testid={`badge-role-${user.id}`}>
                          {getRoleLabel(normalizeUserRole(user.role))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditDialog(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user)}
                              disabled={!!currentUser && user.id === currentUser.id}
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-user-form">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Редактировать пользователя" : "Создать пользователя"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Измените данные пользователя. Оставьте пароль пустым, чтобы не менять его."
                : "Заполните данные для создания нового пользователя"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                data-testid="input-username-form"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={isSubmitting || !!editingUser}
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Пароль {editingUser && "(оставьте пустым для сохранения текущего)"}
              </Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password-form"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isSubmitting}
                placeholder={editingUser ? "Новый пароль (необязательно)" : "Минимум 6 символов"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input
                  id="firstName"
                  data-testid="input-firstname-form"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Иван"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input
                  id="lastName"
                  data-testid="input-lastname-form"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Петров"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Должность</Label>
              <Input
                id="position"
                data-testid="input-position-form"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                disabled={isSubmitting}
                placeholder="Менеджер по продажам"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger data-testid="select-role-form">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="manager">Менеджер</SelectItem>
                  <SelectItem value="viewer">Наблюдатель</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-user">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : editingUser ? (
                  "Сохранить"
                ) : (
                  "Создать"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить пользователя{" "}
              <strong>{deletingUser?.username}</strong>? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DisplayTab() {
  const { toast } = useToast();
  const [colorMode, setColorMode] = useState<ColorDisplayMode>("both");

  useEffect(() => {
    setColorMode(getColorDisplayMode());
  }, []);

  const handleColorModeChange = (mode: ColorDisplayMode) => {
    setColorMode(mode);
    setColorDisplayMode(mode);
    toast({
      title: "Настройки сохранены",
      description: "Режим отображения цвета обновлён",
    });
    window.dispatchEvent(new Event("colorDisplayModeChanged"));
  };

  const pastelRed = getPastelClasses("red");
  const pastelBlue = getPastelClasses("blue");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Отображение цветов
          </CardTitle>
          <CardDescription>
            Настройте как отображаются цветовые метки на карточках лидов и туров
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={colorMode}
            onValueChange={(value) => handleColorModeChange(value as ColorDisplayMode)}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="dot" id="dot" data-testid="radio-color-dot" />
              <Label htmlFor="dot" className="flex items-center gap-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <ColorIndicator color="red" />
                  <ColorIndicator color="blue" />
                </div>
                <span>Только точки</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="fill" id="fill" data-testid="radio-color-fill" />
              <Label htmlFor="fill" className="flex items-center gap-3 cursor-pointer">
                <div className="flex gap-1">
                  <div className={`h-6 w-8 rounded ${pastelRed.bg} ${pastelRed.border} border`} />
                  <div className={`h-6 w-8 rounded ${pastelBlue.bg} ${pastelBlue.border} border`} />
                </div>
                <span>Только заливка</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="both" id="both" data-testid="radio-color-both" />
              <Label htmlFor="both" className="flex items-center gap-3 cursor-pointer">
                <div className="flex gap-1">
                  <div className={`h-6 w-8 rounded ${pastelRed.bg} ${pastelRed.border} border flex items-center justify-center`}>
                    <ColorIndicator color="red" />
                  </div>
                  <div className={`h-6 w-8 rounded ${pastelBlue.bg} ${pastelBlue.border} border flex items-center justify-center`}>
                    <ColorIndicator color="blue" />
                  </div>
                </div>
                <span>Точки и заливка</span>
              </Label>
            </div>
          </RadioGroup>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Эти настройки применяются к карточкам лидов в Kanban-доске и к карточкам туров на странице мероприятий.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Wazzup24Tab() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  
  const { data: wazzup24Status, isLoading: isLoadingStatus } = useQuery<{ configured: boolean; updatedAt?: string }>({
    queryKey: ["/api/settings/wazzup24"],
  });

  const saveMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await apiRequest("POST", "/api/settings/wazzup24", { apiKey: key });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/wazzup24"] });
      toast({
        title: "API ключ сохранен",
        description: "Интеграция Wazzup24 настроена",
      });
      setApiKey("");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/settings/wazzup24");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/wazzup24"] });
      toast({
        title: "API ключ удален",
        description: "Интеграция Wazzup24 отключена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wazzup24/test");
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Подключение успешно",
          description: "Wazzup24 работает корректно",
        });
      } else {
        toast({
          title: "Ошибка подключения",
          description: data.error || "Не удалось подключиться к Wazzup24",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка тестирования",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncUsersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wazzup24/sync-users");
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        const usersList = Array.isArray(data.users) ? data.users.join(", ") : "";
        toast({
          title: "Пользователи синхронизированы",
          description: `Синхронизировано ${data.syncedCount || 0} пользователей${usersList ? `: ${usersList}` : ""}`,
        });
      } else {
        toast({
          title: "Ошибка синхронизации",
          description: data.error || "Не удалось синхронизировать пользователей",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка синхронизации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setupWebhookMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wazzup24/setup-webhook");
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Webhook настроен",
          description: `URL: ${data.webhookUrl}`,
        });
      } else {
        toast({
          title: "Ошибка настройки webhook",
          description: data.error || "Не удалось настроить webhook",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка настройки webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите API ключ",
        variant: "destructive",
      });
      return;
    }
    await saveMutation.mutateAsync(apiKey.trim());
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
  };

  const handleTest = async () => {
    await testMutation.mutateAsync();
  };

  const handleSyncUsers = async () => {
    await syncUsersMutation.mutateAsync();
  };

  const handleSetupWebhook = async () => {
    await setupWebhookMutation.mutateAsync();
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Интеграция Wazzup24
          </CardTitle>
          <CardDescription>
            Подключите Wazzup24 для общения с клиентами через WhatsApp прямо из карточки лида
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Статус:</span>
            {wazzup24Status?.configured ? (
              <Badge variant="default" className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Подключено
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <X className="h-3 w-3" />
                Не настроено
              </Badge>
            )}
          </div>

          {wazzup24Status?.updatedAt && (
            <p className="text-sm text-muted-foreground">
              Последнее обновление: {new Date(wazzup24Status.updatedAt).toLocaleString("ru-RU")}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="wazzup24-api-key">API ключ</Label>
            <div className="flex gap-2">
              <Input
                id="wazzup24-api-key"
                type="password"
                placeholder={wazzup24Status?.configured ? "Введите новый ключ для замены" : "Введите API ключ"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-wazzup24-api-key"
              />
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !apiKey.trim()}
                data-testid="button-save-wazzup24"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Сохранить"
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Получите API ключ в личном кабинете Wazzup24
            </p>
          </div>

          {wazzup24Status?.configured && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending}
                data-testid="button-test-wazzup24"
              >
                {testMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  "Проверить подключение"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleSyncUsers}
                disabled={syncUsersMutation.isPending}
                data-testid="button-sync-users-wazzup24"
              >
                {syncUsersMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Синхронизация...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Синхронизировать пользователей
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleSetupWebhook}
                disabled={setupWebhookMutation.isPending}
                data-testid="button-setup-webhook-wazzup24"
              >
                {setupWebhookMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Настройка...
                  </>
                ) : (
                  <>
                    <Webhook className="mr-2 h-4 w-4" />
                    Настроить Webhook
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-wazzup24"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Удалить ключ"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Как использовать</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Получите API ключ в личном кабинете Wazzup24</p>
          <p>2. Введите ключ выше и нажмите "Сохранить"</p>
          <p>3. Проверьте подключение кнопкой "Проверить подключение"</p>
          <p>4. Нажмите "Синхронизировать пользователей" чтобы добавить всех менеджеров CRM в Wazzup24</p>
          <p>5. Нажмите "Настроить Webhook" чтобы получать уведомления о входящих сообщениях</p>
          <p>6. После настройки в карточках лидов появится вкладка "Чат" для общения через WhatsApp</p>
        </CardContent>
      </Card>
    </div>
  );
}

function DictionariesTab() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("lead_source");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemDictionary | null>(null);
  const [deletingItem, setDeletingItem] = useState<SystemDictionary | null>(null);
  const [formData, setFormData] = useState({ value: "", label: "" });

  const { data: items = [], isLoading } = useQuery<SystemDictionary[]>({
    queryKey: ["/api/dictionaries", selectedType],
  });

  const filteredItems = items.filter(item => item.type === selectedType);

  const createMutation = useMutation({
    mutationFn: async (data: { type: string; value: string; label: string; order: number }) => {
      const response = await apiRequest("POST", "/api/dictionaries", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dictionaries", selectedType] });
      toast({ title: "Элемент добавлен" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ value: string; label: string; order: number }> }) => {
      const response = await apiRequest("PATCH", `/api/dictionaries/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dictionaries", selectedType] });
      toast({ title: "Элемент обновлен" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dictionaries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dictionaries", selectedType] });
      toast({ title: "Элемент удален" });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  // Dictionary type config query and mutation
  const { data: typeConfig } = useQuery<{ type: string; isMultiple: boolean; displayName: string }>({
    queryKey: ["/api/dictionary-type-configs", selectedType],
    queryFn: async () => {
      const response = await fetch(`/api/dictionary-type-configs`);
      if (!response.ok) return { type: selectedType, isMultiple: false, displayName: selectedType };
      const configs = await response.json();
      const config = configs.find((c: { type: string }) => c.type === selectedType);
      return config || { type: selectedType, isMultiple: false, displayName: DICTIONARY_TYPE_LABELS[selectedType] || selectedType };
    },
  });

  const updateTypeConfigMutation = useMutation({
    mutationFn: async (isMultiple: boolean) => {
      const response = await apiRequest("PUT", `/api/dictionary-type-configs/${selectedType}`, {
        isMultiple,
        displayName: DICTIONARY_TYPE_LABELS[selectedType] || selectedType,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dictionary-type-configs", selectedType] });
      toast({ title: "Настройки типа обновлены" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ value: "", label: "" });
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ value: "", label: "" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: SystemDictionary) => {
    setEditingItem(item);
    setFormData({ value: item.value, label: item.label });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.value.trim() || !formData.label.trim()) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate({
        type: selectedType,
        value: formData.value.trim(),
        label: formData.label.trim(),
        order: filteredItems.length,
      });
    }
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? index - 1 : index + 1;
    if (toIndex < 0 || toIndex >= filteredItems.length) return;

    const item1 = filteredItems[index];
    const item2 = filteredItems[toIndex];

    // Swap orders
    updateMutation.mutate({ id: item1.id, data: { order: toIndex } });
    updateMutation.mutate({ id: item2.id, data: { order: index } });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Справочники
              </CardTitle>
              <CardDescription>
                Управление списками значений для выпадающих полей
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Label className="whitespace-nowrap">Справочник:</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[300px]" data-testid="select-dictionary-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_DICTIONARY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {DICTIONARY_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                id="is-multiple"
                checked={typeConfig?.isMultiple ?? false}
                onCheckedChange={(checked) => updateTypeConfigMutation.mutate(checked)}
                disabled={updateTypeConfigMutation.isPending}
                data-testid="switch-is-multiple"
              />
              <Label htmlFor="is-multiple" className="text-sm text-muted-foreground whitespace-nowrap">
                Множественный выбор
              </Label>
            </div>
            <Button onClick={handleOpenCreate} data-testid="button-add-dictionary-item">
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет элементов в справочнике
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Значение</TableHead>
                  <TableHead>Отображение</TableHead>
                  <TableHead className="w-[150px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems
                  .sort((a, b) => a.order - b.order)
                  .map((item, index) => (
                  <TableRow key={item.id} data-testid={`row-dictionary-${item.id}`}>
                    <TableCell className="font-mono text-sm">{item.value}</TableCell>
                    <TableCell>{item.label}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveItem(index, "up")}
                          disabled={index === 0}
                          data-testid={`button-move-up-${item.id}`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveItem(index, "down")}
                          disabled={index === filteredItems.length - 1}
                          data-testid={`button-move-down-${item.id}`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingItem(item);
                            setIsDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent data-testid="dialog-dictionary-item">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Редактировать элемент" : "Добавить элемент"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Измените значения элемента справочника"
                : `Добавьте новый элемент в справочник "${DICTIONARY_TYPE_LABELS[selectedType]}"`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">Значение (код)</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Уникальный идентификатор"
                data-testid="input-dictionary-value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Отображение</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Как будет показываться пользователю"
                data-testid="input-dictionary-label"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-dictionary">
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-dictionary"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingItem ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить элемент?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить элемент "{deletingItem?.label}"?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-dictionary">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-dictionary"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Settings() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="p-6" data-testid="page-settings">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <CardTitle>Доступ запрещен</CardTitle>
            </div>
            <CardDescription>
              Эта страница доступна только администраторам
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Настройки
        </h1>
        <p className="text-muted-foreground mt-2">
          Управление системой и интеграциями
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
            <Users className="h-4 w-4" />
            Пользователи
          </TabsTrigger>
          <TabsTrigger value="dictionaries" className="flex items-center gap-2" data-testid="tab-dictionaries">
            <Book className="h-4 w-4" />
            Справочники
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2" data-testid="tab-display">
            <Palette className="h-4 w-4" />
            Отображение
          </TabsTrigger>
          <TabsTrigger value="wazzup24" className="flex items-center gap-2" data-testid="tab-wazzup24">
            <MessageCircle className="h-4 w-4" />
            Wazzup24
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2" data-testid="tab-sync">
            <Cloud className="h-4 w-4" />
            Синхронизация
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>
        <TabsContent value="dictionaries" className="mt-6">
          <DictionariesTab />
        </TabsContent>
        <TabsContent value="display" className="mt-6">
          <DisplayTab />
        </TabsContent>
        <TabsContent value="wazzup24" className="mt-6">
          <Wazzup24Tab />
        </TabsContent>
        <TabsContent value="sync" className="mt-6">
          <SyncLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
