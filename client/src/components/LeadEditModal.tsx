import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Star, User as UserIcon, UserRound, Baby, MessageCircle } from "lucide-react";
import type { Lead, LeadTourist, InsertLead, InsertLeadTourist, EventWithStats, User } from "@shared/schema";
import { insertLeadSchema, insertLeadTouristSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { DataCompletenessIndicator } from "@/components/DataCompletenessIndicator";
import { calculateTouristDataCompleteness, formatTouristName } from "@/lib/utils";
import { ColorPicker, ColorIndicator, type ColorOption } from "@/components/ColorPicker";
import { Wazzup24Chat } from "@/components/Wazzup24Chat";

const leadFormSchema = insertLeadSchema.extend({
  color: z.string().nullable(),
  selectedCities: z.array(z.string()).nullable(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadEditModalProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  eventId?: string;
}

export function LeadEditModal({ leadId, open, onClose, onSuccess, eventId }: LeadEditModalProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [isTouristDialogOpen, setIsTouristDialogOpen] = useState(false);
  const [editingTourist, setEditingTourist] = useState<LeadTourist | null>(null);
  const [prefillData, setPrefillData] = useState<Partial<InsertLeadTourist> | null>(null);
  const isInitializedRef = useRef(false);

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json();
    },
    enabled: !!leadId && open,
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<EventWithStats[]>({
    queryKey: ["/api/events"],
  });

  const { data: managersAndAdmins = [] } = useQuery<User[]>({
    queryKey: ["/api/users/managers-and-admins"],
  });

  const { data: tourists = [], isLoading: isLoadingTourists } = useQuery<LeadTourist[]>({
    queryKey: ["/api/leads", leadId, "tourists"],
    enabled: !!leadId && open,
  });

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      middleName: null,
      phone: null,
      email: null,
      eventId: null,
      selectedCities: null,
      tourCost: null,
      tourCostCurrency: "RUB",
      advancePayment: null,
      advancePaymentCurrency: "RUB",
      remainingPayment: null,
      remainingPaymentCurrency: "RUB",
      clientCategory: null,
      color: null,
      status: "new",
      source: "direct",
      notes: null,
      assignedUserId: null,
    },
  });

  useEffect(() => {
    if (lead && open) {
      let selectedCities = lead.selectedCities || null;
      if (lead.eventId && !selectedCities && events.length > 0) {
        const event = events.find(e => e.id === lead.eventId);
        if (event?.cities) {
          selectedCities = [...event.cities];
        }
      }
      
      form.reset({
        lastName: lead.lastName || "",
        firstName: lead.firstName || "",
        middleName: lead.middleName || null,
        phone: lead.phone || null,
        email: lead.email || null,
        eventId: lead.eventId || null,
        selectedCities,
        tourCost: lead.tourCost || null,
        tourCostCurrency: lead.tourCostCurrency || "RUB",
        advancePayment: lead.advancePayment || null,
        advancePaymentCurrency: lead.advancePaymentCurrency || "RUB",
        remainingPayment: lead.remainingPayment || null,
        remainingPaymentCurrency: lead.remainingPaymentCurrency || "RUB",
        clientCategory: lead.clientCategory || null,
        color: lead.color ?? null,
        status: lead.status || "new",
        source: lead.source || "direct",
        notes: lead.notes || null,
        assignedUserId: lead.assignedUserId || null,
      });
      isInitializedRef.current = false;
    }
  }, [lead, form, events, open]);

  useEffect(() => {
    if (lead && lead.eventId && !form.getValues("selectedCities") && events.length > 0) {
      const event = events.find(e => e.id === lead.eventId);
      if (event?.cities) {
        form.setValue("selectedCities", [...event.cities]);
      }
    }
  }, [events, lead, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertLead>) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      await queryClient.refetchQueries({ queryKey: ["/api/events"] });
      
      if (lead?.eventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${lead.eventId}/participants`] });
      }
      if (eventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      }
      
      toast({
        title: "Успешно",
        description: "Лид обновлен",
      });
      onSuccess?.();
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/leads/${leadId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (lead?.eventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${lead.eventId}/participants`] });
      }
      if (eventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      }
      toast({
        title: "Успешно",
        description: "Лид удален",
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

  const createTouristMutation = useMutation({
    mutationFn: async (data: InsertLeadTourist) => {
      return await apiRequest("POST", "/api/tourists", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "tourists"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (lead?.eventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${lead.eventId}/participants`] });
      }
      setIsTouristDialogOpen(false);
      toast({
        title: "Успешно",
        description: "Турист добавлен",
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

  const updateTouristMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLeadTourist> }) => {
      return await apiRequest("PATCH", `/api/tourists/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "tourists"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (lead?.eventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${lead.eventId}/participants`] });
      }
      setIsTouristDialogOpen(false);
      toast({
        title: "Успешно",
        description: "Турист обновлен",
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

  const togglePrimaryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLeadTourist> }) => {
      return await apiRequest("PATCH", `/api/tourists/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "tourists"] });
      if (lead?.eventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${lead.eventId}/participants`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTouristMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tourists/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "tourists"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (lead?.eventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${lead.eventId}/participants`] });
      }
      toast({
        title: "Успешно",
        description: "Турист удален",
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

  const handleTogglePrimary = async (tourist: LeadTourist) => {
    if (tourist.isPrimary) return;
    
    const currentPrimary = tourists.find(t => t.isPrimary);
    if (currentPrimary) {
      await togglePrimaryMutation.mutateAsync({ id: currentPrimary.id, data: { isPrimary: false } });
    }
    await togglePrimaryMutation.mutateAsync({ id: tourist.id, data: { isPrimary: true } });
  };

  const handleDeleteTourist = (tourist: LeadTourist) => {
    if (tourists.length <= 1) {
      toast({
        title: "Ошибка",
        description: "Должен быть хотя бы один турист",
        variant: "destructive",
      });
      return;
    }

    const fullName = formatTouristName(tourist, null);
    if (confirm(`Вы уверены, что хотите удалить туриста ${fullName}?`)) {
      deleteTouristMutation.mutate(tourist.id);
    }
  };

  const onSubmit = (data: LeadFormData) => {
    if (isLoadingEvents && data.eventId) {
      toast({
        title: "Подождите",
        description: "Загрузка данных тура...",
      });
      return;
    }
    
    const submitData = { ...data } as Partial<InsertLead>;
    
    const eventUnchanged = data.eventId === lead?.eventId;
    if (eventUnchanged && submitData.selectedCities === null && lead?.selectedCities) {
      submitData.selectedCities = lead.selectedCities;
    }
    
    updateMutation.mutate(submitData);
  };

  const selectedEventId = form.watch("eventId");
  const selectedEvent = events.find(e => e.id === selectedEventId);

  const getLeadName = () => {
    if (!lead) return "Загрузка...";
    return `${lead.lastName || ""} ${lead.firstName || ""}`.trim() || "Без имени";
  };

  if (!open) return null;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-lead-full">
          <DialogHeader>
            <DialogTitle>Редактирование лида</DialogTitle>
            <DialogDescription>{getLeadName()}</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 p-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ) : !lead ? (
            <Alert variant="destructive">
              <AlertDescription>Лид не найден.</AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="details" data-testid="tab-lead-details">
                  <Edit className="h-4 w-4 mr-2" />
                  Редактирование
                </TabsTrigger>
                <TabsTrigger value="chat" data-testid="tab-lead-chat">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Чат
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Личные данные */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground">Личные данные</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Фамилия *</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-lead-lastName" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Имя *</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-lead-firstName" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="middleName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Отчество</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} data-testid="input-lead-middleName" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Контакты */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-foreground">Контактные данные</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Телефон</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} data-testid="input-lead-phone" />
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
                                <Input type="email" {...field} value={field.value || ""} data-testid="input-lead-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Тур и города */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-foreground">Информация о туре</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="eventId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Тур</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value === "__none__" ? null : value);
                                  if (value && value !== "__none__") {
                                    const event = events.find(e => e.id === value);
                                    if (event?.cities) {
                                      form.setValue("selectedCities", [...event.cities]);
                                    }
                                  } else {
                                    form.setValue("selectedCities", null);
                                  }
                                }} 
                                value={field.value || "__none__"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-lead-eventId">
                                    <SelectValue placeholder="Выберите тур" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__none__">Без тура</SelectItem>
                                  {events.map((event) => (
                                    <SelectItem key={event.id} value={event.id}>
                                      {event.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="clientCategory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Категория клиента</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value === "__none__" ? null : value)} 
                                value={field.value || "__none__"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-lead-clientCategory">
                                    <SelectValue placeholder="Выберите категорию" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__none__">Не указана</SelectItem>
                                  <SelectItem value="category_ab">Категория А и В (Даты и бюджет)</SelectItem>
                                  <SelectItem value="category_c">Категория C (Неопределились)</SelectItem>
                                  <SelectItem value="category_d">Категория D (Нет бюджета)</SelectItem>
                                  <SelectItem value="vip">VIP</SelectItem>
                                  <SelectItem value="not_segmented">Не сегментированный</SelectItem>
                                  <SelectItem value="travel_agent">Турагент</SelectItem>
                                  <SelectItem value="tariff_standard">Тариф стандарт</SelectItem>
                                  <SelectItem value="tariff_economy">Тариф эконом</SelectItem>
                                  <SelectItem value="tariff_vip">Тариф VIP</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Города маршрута */}
                      {selectedEvent?.cities && selectedEvent.cities.length > 0 && (
                        <FormField
                          control={form.control}
                          name="selectedCities"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Города маршрута</FormLabel>
                              <div className="flex flex-wrap gap-2">
                                {selectedEvent.cities.map((city) => {
                                  const isSelected = field.value?.includes(city) ?? true;
                                  return (
                                    <div key={city} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`city-${city}`}
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [...selectedEvent.cities];
                                          if (checked) {
                                            field.onChange([...current, city]);
                                          } else {
                                            field.onChange(current.filter(c => c !== city));
                                          }
                                        }}
                                        data-testid={`checkbox-city-${city}`}
                                      />
                                      <label
                                        htmlFor={`city-${city}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        {city}
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Финансы */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-foreground">Финансовая информация</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex gap-2">
                          <FormField
                            control={form.control}
                            name="tourCost"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Стоимость тура</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} value={field.value || ""} data-testid="input-lead-tourCost" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="tourCostCurrency"
                            render={({ field }) => (
                              <FormItem className="w-20">
                                <FormLabel>&nbsp;</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || "RUB"}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-lead-tourCostCurrency">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="RUB">₽</SelectItem>
                                    <SelectItem value="USD">$</SelectItem>
                                    <SelectItem value="EUR">€</SelectItem>
                                    <SelectItem value="CNY">¥</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex gap-2">
                          <FormField
                            control={form.control}
                            name="advancePayment"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Аванс</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} value={field.value || ""} data-testid="input-lead-advancePayment" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="advancePaymentCurrency"
                            render={({ field }) => (
                              <FormItem className="w-20">
                                <FormLabel>&nbsp;</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || "RUB"}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-lead-advancePaymentCurrency">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="RUB">₽</SelectItem>
                                    <SelectItem value="USD">$</SelectItem>
                                    <SelectItem value="EUR">€</SelectItem>
                                    <SelectItem value="CNY">¥</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex gap-2">
                          <FormField
                            control={form.control}
                            name="remainingPayment"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Остаток</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} value={field.value || ""} data-testid="input-lead-remainingPayment" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="remainingPaymentCurrency"
                            render={({ field }) => (
                              <FormItem className="w-20">
                                <FormLabel>&nbsp;</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || "RUB"}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-lead-remainingPaymentCurrency">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="RUB">₽</SelectItem>
                                    <SelectItem value="USD">$</SelectItem>
                                    <SelectItem value="EUR">€</SelectItem>
                                    <SelectItem value="CNY">¥</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Статус и информация о лиде */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-foreground">Информация о лиде</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Статус *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-lead-status">
                                    <SelectValue placeholder="Выберите статус" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="new">Новый</SelectItem>
                                  <SelectItem value="contacted">Квалифицирован</SelectItem>
                                  <SelectItem value="qualified">Забронирован</SelectItem>
                                  <SelectItem value="converted">Подтвержден</SelectItem>
                                  <SelectItem value="lost">Отложен</SelectItem>
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
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-lead-source">
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
                          name="assignedUserId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ответственный</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value === "__none__" ? null : value)} 
                                value={field.value || "__none__"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-lead-assignedUserId">
                                    <SelectValue placeholder="Выберите ответственного" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__none__">Не назначен</SelectItem>
                                  {managersAndAdmins.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.firstName} {user.lastName} ({user.role === "admin" ? "Админ" : "Менеджер"})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Цветовая индикация</FormLabel>
                              <FormControl>
                                <ColorPicker
                                  value={field.value as ColorOption}
                                  onChange={field.onChange}
                                  label=""
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Заметки */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-foreground">Заметки</h4>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Дополнительная информация..."
                                className="resize-none"
                                rows={3}
                                {...field}
                                value={field.value || ""}
                                data-testid="input-lead-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Туристы */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-foreground">Туристы</h4>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const leadData: Partial<InsertLeadTourist> = {
                                leadId: lead.id,
                                lastName: lead.lastName || "",
                                firstName: lead.firstName || "",
                                middleName: lead.middleName || null,
                                phone: lead.phone || null,
                                email: lead.email || null,
                                isPrimary: tourists.length === 0,
                              };
                              setPrefillData(leadData);
                              setEditingTourist(null);
                              setIsTouristDialogOpen(true);
                            }}
                            data-testid="button-add-from-lead"
                          >
                            <UserIcon className="h-4 w-4 mr-2" />
                            Добавить из лида
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPrefillData(null);
                              setEditingTourist(null);
                              setIsTouristDialogOpen(true);
                            }}
                            data-testid="button-add-tourist"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить туриста
                          </Button>
                        </div>
                      </div>

                      {isLoadingTourists ? (
                        <div className="text-center py-4 text-muted-foreground">Загрузка туристов...</div>
                      ) : tourists.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          Нет туристов. Добавьте первого туриста.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table data-testid="table-tourists">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Имя</TableHead>
                                <TableHead>Данные туриста</TableHead>
                                <TableHead>Действия</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tourists.map((tourist) => (
                                <TableRow 
                                  key={tourist.id} 
                                  data-testid={`row-tourist-${tourist.id}`}
                                  className="cursor-pointer hover-elevate"
                                  onClick={() => {
                                    setEditingTourist(tourist);
                                    setIsTouristDialogOpen(true);
                                  }}
                                >
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium">
                                        {formatTouristName(tourist, null)}
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Tooltip>
                                          <TooltipTrigger type="button" className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-[10px] font-semibold transition-colors cursor-default hover-elevate" onClick={(e) => e.stopPropagation()}>
                                            {tourist.touristType === "adult" ? (
                                              <UserIcon className="h-3 w-3" />
                                            ) : tourist.touristType === "child" ? (
                                              <UserRound className="h-3 w-3" />
                                            ) : (
                                              <Baby className="h-3 w-3" />
                                            )}
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{tourist.touristType === "adult" ? "Взрослый" : tourist.touristType === "child" ? "Ребенок" : "Младенец"}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                        {tourist.isPrimary ? (
                                          <Tooltip>
                                            <TooltipTrigger 
                                              type="button"
                                              className="inline-flex items-center rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition-colors cursor-default hover-elevate"
                                              data-testid={`badge-primary-${tourist.id}`}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Star className="h-3 w-3" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Основной турист</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleTogglePrimary(tourist);
                                                }}
                                                disabled={togglePrimaryMutation.isPending}
                                                data-testid={`button-set-primary-${tourist.id}`}
                                              >
                                                <Star className="h-3 w-3" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Сделать основным</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <DataCompletenessIndicator 
                                      completeness={calculateTouristDataCompleteness(tourist)} 
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setEditingTourist(tourist);
                                          setIsTouristDialogOpen(true);
                                        }}
                                        disabled={togglePrimaryMutation.isPending || deleteTouristMutation.isPending}
                                        data-testid={`button-edit-tourist-${tourist.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      {isAdmin && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteTourist(tourist)}
                                          disabled={tourists.length <= 1 || togglePrimaryMutation.isPending || deleteTouristMutation.isPending}
                                          data-testid={`button-delete-tourist-${tourist.id}`}
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
                    </div>

                    <DialogFooter className="flex justify-between items-center">
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            if (confirm(`Вы уверены, что хотите удалить лид "${getLeadName()}"?`)) {
                              deleteMutation.mutate();
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid="button-delete-lead"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                          Отмена
                        </Button>
                        <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-lead">
                          {updateMutation.isPending ? "Сохранение..." : "Обновить"}
                        </Button>
                      </div>
                    </DialogFooter>
                  </form>
                </Form>

                {/* Tourist Dialog */}
                <TouristDialog
                  open={isTouristDialogOpen}
                  onOpenChange={(open) => {
                    setIsTouristDialogOpen(open);
                    if (!open) {
                      setPrefillData(null);
                    }
                  }}
                  tourist={editingTourist}
                  prefillData={prefillData}
                  leadId={lead.id}
                  tourists={tourists}
                  onSubmit={(data) => {
                    if (editingTourist) {
                      updateTouristMutation.mutate({ id: editingTourist.id, data });
                    } else {
                      createTouristMutation.mutate(data);
                    }
                  }}
                  isPending={createTouristMutation.isPending || updateTouristMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="chat">
                <Wazzup24Chat lead={lead} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

interface TouristDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourist: LeadTourist | null;
  prefillData?: Partial<InsertLeadTourist> | null;
  leadId: string;
  tourists: LeadTourist[];
  onSubmit: (data: InsertLeadTourist) => void;
  isPending: boolean;
}

function TouristDialog({
  open,
  onOpenChange,
  tourist,
  prefillData,
  leadId,
  tourists,
  onSubmit,
  isPending,
}: TouristDialogProps) {
  const form = useForm<InsertLeadTourist>({
    resolver: zodResolver(insertLeadTouristSchema),
    defaultValues: {
      leadId,
      lastName: tourist?.lastName || "",
      firstName: tourist?.firstName || "",
      middleName: tourist?.middleName || null,
      email: tourist?.email || null,
      phone: tourist?.phone || null,
      dateOfBirth: tourist?.dateOfBirth || null,
      passportSeries: tourist?.passportSeries || null,
      passportIssuedBy: tourist?.passportIssuedBy || null,
      registrationAddress: tourist?.registrationAddress || null,
      foreignPassportName: tourist?.foreignPassportName || null,
      foreignPassportNumber: tourist?.foreignPassportNumber || null,
      foreignPassportValidUntil: tourist?.foreignPassportValidUntil || null,
      touristType: tourist?.touristType || "adult",
      isPrimary: tourist?.isPrimary || false,
      notes: tourist?.notes || null,
      order: tourist?.order || tourists.length,
    },
  });

  useEffect(() => {
    if (tourist) {
      form.reset({
        leadId,
        lastName: tourist.lastName,
        firstName: tourist.firstName,
        middleName: tourist.middleName,
        email: tourist.email,
        phone: tourist.phone,
        dateOfBirth: tourist.dateOfBirth,
        passportSeries: tourist.passportSeries,
        passportIssuedBy: tourist.passportIssuedBy,
        registrationAddress: tourist.registrationAddress,
        foreignPassportName: tourist.foreignPassportName,
        foreignPassportNumber: tourist.foreignPassportNumber,
        foreignPassportValidUntil: tourist.foreignPassportValidUntil,
        touristType: tourist.touristType,
        isPrimary: tourist.isPrimary,
        notes: tourist.notes,
        order: tourist.order,
      });
    } else if (prefillData) {
      form.reset({
        leadId,
        lastName: prefillData.lastName || "",
        firstName: prefillData.firstName || "",
        middleName: prefillData.middleName || null,
        email: prefillData.email || null,
        phone: prefillData.phone || null,
        dateOfBirth: null,
        passportSeries: null,
        passportIssuedBy: null,
        registrationAddress: null,
        foreignPassportName: null,
        foreignPassportNumber: null,
        foreignPassportValidUntil: null,
        touristType: "adult",
        isPrimary: prefillData.isPrimary ?? tourists.length === 0,
        notes: null,
        order: tourists.length,
      });
    } else {
      form.reset({
        leadId,
        lastName: "",
        firstName: "",
        middleName: null,
        email: null,
        phone: null,
        dateOfBirth: null,
        passportSeries: null,
        passportIssuedBy: null,
        registrationAddress: null,
        foreignPassportName: null,
        foreignPassportNumber: null,
        foreignPassportValidUntil: null,
        touristType: "adult",
        isPrimary: tourists.length === 0,
        notes: null,
        order: tourists.length,
      });
    }
  }, [tourist, prefillData, leadId, tourists.length, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tourist ? "Редактировать туриста" : "Добавить туриста"}
          </DialogTitle>
          <DialogDescription>
            {tourist ? "Обновите информацию о туристе" : "Введите данные нового туриста"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Личные данные */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Личные данные</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Фамилия *</FormLabel>
                      <FormControl>
                        <Input placeholder="Иванов" {...field} data-testid="input-tourist-lastName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя *</FormLabel>
                      <FormControl>
                        <Input placeholder="Иван" {...field} data-testid="input-tourist-firstName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Отчество</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Иванович" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-tourist-middleName" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата рождения</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-tourist-dob"
                        />
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
                          data-testid="input-tourist-email"
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
                          data-testid="input-tourist-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Тип туриста */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold text-foreground">Тип туриста</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="touristType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tourist-type">
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="adult">Взрослый</SelectItem>
                          <SelectItem value="child">Ребенок</SelectItem>
                          <SelectItem value="infant">Младенец</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPrimary"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-tourist-isPrimary"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Основной турист
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Российский паспорт */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold text-foreground">Российский паспорт</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="passportSeries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Серия паспорта</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="45 12 123456"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-tourist-passportSeries"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passportIssuedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Кем выдан паспорт</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Отделом УФМС..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-tourist-passportIssuedBy"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registrationAddress"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Адрес регистрации</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="г. Москва, ул. ..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-tourist-registrationAddress"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Загранпаспорт */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold text-foreground">Загранпаспорт</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="foreignPassportName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ФИО в загранпаспорте</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="IVANOV IVAN"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-tourist-foreignPassportName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="foreignPassportNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер загранпаспорта</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="75 1234567"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-tourist-foreignPassportNumber"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="foreignPassportValidUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Действителен до</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-tourist-foreignPassportValidUntil"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Заметки */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold text-foreground">Заметки</h4>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Дополнительная информация..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        value={field.value || ""}
                        data-testid="input-tourist-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending} data-testid="button-submit-tourist">
                {isPending ? "Сохранение..." : tourist ? "Обновить" : "Добавить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
