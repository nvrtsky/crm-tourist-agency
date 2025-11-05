import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Users, TrendingUp, Clock, CheckCircle, Edit, Trash2, UserPlus } from "lucide-react";
import type { Lead, InsertLead } from "@shared/schema";
import { insertLeadSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const leadStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Новый", variant: "default" },
  contacted: { label: "Связались", variant: "secondary" },
  qualified: { label: "Квалифицирован", variant: "outline" },
  won: { label: "Конвертирован", variant: "default" },
  lost: { label: "Потерян", variant: "destructive" },
};

const leadSourceMap: Record<string, string> = {
  form: "Веб-форма",
  referral: "Рекомендация",
  direct: "Прямое обращение",
  advertisement: "Реклама",
  other: "Другое",
};

export default function Leads() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    inProgress: leads.filter((l) => ["contacted", "qualified"].includes(l.status)).length,
    completed: leads.filter((l) => l.status === "won").length,
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      return await apiRequest("/api/leads", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Успешно",
        description: "Лид создан",
      });
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLead> }) => {
      return await apiRequest(`/api/leads/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setEditingLead(null);
      toast({
        title: "Успешно",
        description: "Лид обновлен",
      });
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
      return await apiRequest(`/api/leads/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Успешно",
        description: "Лид удален",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-leads">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("nav.crm")}</h1>
          <p className="text-muted-foreground mt-2">
            Управление лидами и воронкой продаж
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-lead">
              <Plus className="h-4 w-4 mr-2" />
              Создать лид
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <LeadForm
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-total-leads">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего лидов</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Все лиды в системе</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-new-leads">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.new}</div>
            <p className="text-xs text-muted-foreground">Статус: новый</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-in-progress">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Активные лиды</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-completed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Завершено</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Успешно конвертированы</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-leads-table">
        <CardHeader>
          <CardTitle>Все лиды</CardTitle>
          <CardDescription>Список всех лидов в CRM системе</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет лидов. Создайте первый лид.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Семья</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.email || "—"}</TableCell>
                    <TableCell>{lead.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={leadStatusMap[lead.status]?.variant || "default"} data-testid={`status-${lead.id}`}>
                        {leadStatusMap[lead.status]?.label || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{leadSourceMap[lead.source] || lead.source}</TableCell>
                    <TableCell>
                      {lead.familyMembersCount && lead.familyMembersCount > 1 ? (
                        <Badge variant="outline" data-testid={`family-${lead.id}`}>
                          {lead.familyMembersCount} чел.
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(lead.createdAt), "dd.MM.yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingLead(lead)}
                          data-testid={`button-edit-${lead.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Вы уверены, что хотите удалить этот лид?")) {
                              deleteMutation.mutate(lead.id);
                            }
                          }}
                          data-testid={`button-delete-${lead.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {lead.status === "qualified" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setConvertingLead(lead)}
                            data-testid={`button-convert-${lead.id}`}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Конвертировать
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent className="max-w-2xl">
          {editingLead && (
            <LeadForm
              lead={editingLead}
              onSubmit={(data) => updateMutation.mutate({ id: editingLead.id, data })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {convertingLead && (
        <ConvertLeadDialog
          lead={convertingLead}
          onClose={() => setConvertingLead(null)}
        />
      )}
    </div>
  );
}

interface LeadFormProps {
  lead?: Lead;
  onSubmit: (data: InsertLead) => void;
  isPending: boolean;
}

function LeadForm({ lead, onSubmit, isPending }: LeadFormProps) {
  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      name: lead?.name || "",
      email: lead?.email || null,
      phone: lead?.phone || null,
      status: lead?.status || "new",
      source: lead?.source || "direct",
      familyMembersCount: lead?.familyMembersCount || null,
      notes: lead?.notes || null,
      formId: lead?.formId || null,
      assignedUserId: lead?.assignedUserId || null,
      createdByUserId: lead?.createdByUserId || null,
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{lead ? "Редактировать лид" : "Создать новый лид"}</DialogTitle>
        <DialogDescription>
          {lead ? "Обновите информацию о лиде" : "Введите данные для создания нового лида"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя *</FormLabel>
                  <FormControl>
                    <Input placeholder="Иван Иванов" {...field} data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Телефон</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+7 (999) 123-45-67"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Статус *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-status">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="new">Новый</SelectItem>
                      <SelectItem value="contacted">Связались</SelectItem>
                      <SelectItem value="qualified">Квалифицирован</SelectItem>
                      <SelectItem value="converted">Конвертирован</SelectItem>
                      <SelectItem value="lost">Потерян</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Источник *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-source">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите источник" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="form">Веб-форма</SelectItem>
                      <SelectItem value="referral">Рекомендация</SelectItem>
                      <SelectItem value="direct">Прямое обращение</SelectItem>
                      <SelectItem value="advertisement">Реклама</SelectItem>
                      <SelectItem value="other">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="familyMembersCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Количество членов семьи</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      data-testid="input-family-members"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Заметки</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Дополнительная информация..."
                    className="resize-none"
                    rows={3}
                    {...field}
                    value={field.value || ""}
                    data-testid="input-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={isPending} data-testid="button-submit-lead">
              {isPending ? "Сохранение..." : lead ? "Обновить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

interface ConvertLeadDialogProps {
  lead: Lead;
  onClose: () => void;
}

function ConvertLeadDialog({ lead, onClose }: ConvertLeadDialogProps) {
  const { toast } = useToast();
  const [eventId, setEventId] = useState("");
  const [groupName, setGroupName] = useState(`Семья ${lead.name}`);
  const [members, setMembers] = useState<Array<{
    name: string;
    email: string;
    phone: string;
    passport: string;
    birthDate: string;
    notes: string;
  }>>([]);

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const convertMutation = useMutation({
    mutationFn: async (data: { eventId: string; groupName: string; members: any[] }) => {
      return await apiRequest(`/api/leads/${lead.id}/convert-family`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Успешно",
        description: `Лид конвертирован. Создано ${members.length} участников.`,
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize members array based on familyMembersCount
  useState(() => {
    const count = lead.familyMembersCount || 1;
    const initialMembers = [];
    for (let i = 0; i < count; i++) {
      initialMembers.push({
        name: i === 0 ? lead.name : "",
        email: i === 0 ? (lead.email || "") : "",
        phone: i === 0 ? (lead.phone || "") : "",
        passport: "",
        birthDate: "",
        notes: "",
      });
    }
    setMembers(initialMembers);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventId) {
      toast({
        title: "Ошибка",
        description: "Выберите тур",
        variant: "destructive",
      });
      return;
    }

    // Validate that all members have names
    const hasEmptyNames = members.some(m => !m.name.trim());
    if (hasEmptyNames) {
      toast({
        title: "Ошибка",
        description: "Все члены семьи должны иметь имя",
        variant: "destructive",
      });
      return;
    }

    convertMutation.mutate({
      eventId,
      groupName,
      members: members.map(m => ({
        ...m,
        email: m.email || null,
        phone: m.phone || null,
        passport: m.passport || null,
        birthDate: m.birthDate || null,
        notes: m.notes || null,
      })),
    });
  };

  const updateMember = (index: number, field: string, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Конвертировать лид: {lead.name}</DialogTitle>
          <DialogDescription>
            {lead.familyMembersCount && lead.familyMembersCount > 1
              ? `Введите данные ${lead.familyMembersCount} членов семьи`
              : "Введите данные для создания контакта и сделки"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Выберите тур *</label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger data-testid="select-event">
                  <SelectValue placeholder="Выберите тур" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event: any) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} ({event.startDate} - {event.endDate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {lead.familyMembersCount && lead.familyMembersCount > 1 && (
              <div>
                <label className="text-sm font-medium">Название группы</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Название семьи"
                  data-testid="input-group-name"
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="font-semibold text-lg">Участники</h3>
            {members.map((member, index) => (
              <Card key={index} data-testid={`member-card-${index}`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Участник {index + 1} {index === 0 && <Badge variant="outline" className="ml-2">Основной</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Имя *</label>
                      <Input
                        value={member.name}
                        onChange={(e) => updateMember(index, "name", e.target.value)}
                        placeholder="Имя и фамилия"
                        data-testid={`input-member-name-${index}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateMember(index, "email", e.target.value)}
                        placeholder="email@example.com"
                        data-testid={`input-member-email-${index}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Телефон</label>
                      <Input
                        type="tel"
                        value={member.phone}
                        onChange={(e) => updateMember(index, "phone", e.target.value)}
                        placeholder="+7 (999) 123-45-67"
                        data-testid={`input-member-phone-${index}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Паспорт</label>
                      <Input
                        value={member.passport}
                        onChange={(e) => updateMember(index, "passport", e.target.value)}
                        placeholder="Номер паспорта"
                        data-testid={`input-member-passport-${index}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Дата рождения</label>
                      <Input
                        type="date"
                        value={member.birthDate}
                        onChange={(e) => updateMember(index, "birthDate", e.target.value)}
                        data-testid={`input-member-birthdate-${index}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Заметки</label>
                      <Input
                        value={member.notes}
                        onChange={(e) => updateMember(index, "notes", e.target.value)}
                        placeholder="Дополнительная информация"
                        data-testid={`input-member-notes-${index}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Отмена
            </Button>
            <Button type="submit" disabled={convertMutation.isPending} data-testid="button-submit-convert">
              {convertMutation.isPending ? "Создание..." : "Конвертировать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
