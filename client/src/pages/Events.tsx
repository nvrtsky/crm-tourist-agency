import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, Search, Filter, X } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { EditEventDialog } from "@/components/EditEventDialog";
import { ColorPicker, type ColorOption } from "@/components/ColorPicker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, InsertEvent } from "@shared/schema";
import { updateEventSchema, COUNTRIES, TOUR_TYPES } from "@shared/schema";
import { ZodError } from "zod";
import { format as formatDate } from "date-fns";

interface EventWithStats extends Event {
  bookedCount: number;
  availableSpots: number;
}

// Helper function to translate tour type to Russian
function getTourTypeLabel(tourType: string): string {
  const labels: Record<string, string> = {
    group: "Групповой",
    individual: "Индивидуальный",
    excursion: "Экскурсия",
    transfer: "Трансфер",
  };
  return labels[tourType] || tourType;
}

const createEventFormSchema = z.object({
  name: z.string().min(3, "Название должно содержать минимум 3 символа"),
  description: z.string().optional(),
  color: z.string().nullable(),
  country: z.string().min(2, "Укажите страну"),
  cities: z.string().min(1, "Укажите города через запятую"),
  tourType: z.string().min(1, "Выберите тип тура"),
  startDate: z.string().min(1, "Укажите дату начала"),
  endDate: z.string().min(1, "Укажите дату окончания"),
  participantLimit: z.string()
    .min(1, "Укажите лимит участников")
    .transform(val => {
      const num = parseInt(val, 10);
      if (!Number.isFinite(num) || num <= 0) {
        throw new Error("Лимит участников должен быть положительным числом");
      }
      return num;
    }),
  price: z.string()
    .min(1, "Укажите цену")
    .transform(val => {
      const num = parseFloat(val);
      if (!Number.isFinite(num) || num <= 0) {
        throw new Error("Цена должна быть положительным числом");
      }
      return num.toFixed(2);
    }),
});

type CreateEventForm = z.infer<typeof createEventFormSchema>;

// Defensive normalization helper for event update payloads
function normalizeEventUpdatePayload(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid payload: expected object");
  }

  const payload = data as Record<string, any>;
  const normalized: Record<string, any> = {};

  // Copy all fields
  Object.assign(normalized, payload);

  // Normalize dates to YYYY-MM-DD strings (prevent timezone shift)
  const normalizeDate = (value: any, fieldName: string): string => {
    if (value instanceof Date) {
      // Convert Date object to YYYY-MM-DD string
      return formatDate(value, "yyyy-MM-dd");
    }
    if (typeof value === "string") {
      // Validate and normalize string dates
      const trimmed = value.trim();
      // Check if it matches YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        throw new Error(`Invalid ${fieldName} format: expected YYYY-MM-DD, got "${trimmed}"`);
      }
      // Parse to verify it's a valid date
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid ${fieldName}: "${trimmed}" is not a valid date`);
      }
      // Return normalized (already in correct format)
      return trimmed;
    }
    throw new Error(`Invalid ${fieldName} type: expected Date or string, got ${typeof value}`);
  };

  if (payload.startDate !== undefined && payload.startDate !== null) {
    normalized.startDate = normalizeDate(payload.startDate, "startDate");
  }
  if (payload.endDate !== undefined && payload.endDate !== null) {
    normalized.endDate = normalizeDate(payload.endDate, "endDate");
  }

  // Ensure numeric types
  if (payload.participantLimit !== undefined && payload.participantLimit !== null) {
    const limit = Number(payload.participantLimit);
    if (!isNaN(limit)) {
      normalized.participantLimit = limit;
    }
  }

  // Ensure price is string
  if (payload.price !== undefined && payload.price !== null) {
    normalized.price = String(payload.price).trim();
  }

  // Normalize arrays (trim strings)
  if (Array.isArray(payload.cities)) {
    normalized.cities = payload.cities.map((c: any) => String(c).trim()).filter(Boolean);
  }

  // Trim string fields
  if (typeof payload.name === "string") {
    normalized.name = payload.name.trim();
  }
  if (typeof payload.country === "string") {
    normalized.country = payload.country.trim();
  }
  if (typeof payload.tourType === "string") {
    normalized.tourType = payload.tourType.trim();
  }
  if (typeof payload.description === "string") {
    normalized.description = payload.description.trim() || null;
  }

  return normalized;
}

export default function Events() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [tourTypeFilter, setTourTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("startDate");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const { data: events = [], isLoading } = useQuery<EventWithStats[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: null,
      country: "",
      cities: "",
      tourType: "",
      startDate: "",
      endDate: "",
      participantLimit: "" as any,
      price: "" as any,
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventForm) => {
      const eventData: InsertEvent = {
        name: data.name,
        description: data.description || "",
        color: data.color,
        country: data.country,
        cities: data.cities.split(",").map(c => c.trim()).filter(Boolean),
        tourType: data.tourType,
        startDate: data.startDate,
        endDate: data.endDate,
        participantLimit: data.participantLimit,
        price: data.price,
      };
      const response = await apiRequest("POST", "/api/events", eventData);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Не удалось создать тур");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Тур создан",
        description: "Новый тур успешно добавлен в систему",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать тур",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      // Normalize payload defensively (Date → string, type coercion)
      const normalized = normalizeEventUpdatePayload(data);
      
      // Validate with shared schema
      const parseResult = updateEventSchema.safeParse(normalized);
      if (!parseResult.success) {
        const zodError = parseResult.error as ZodError;
        const errorMessages = zodError.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
        throw new Error(`Ошибка валидации: ${errorMessages}`);
      }

      // Send validated payload to API
      const response = await apiRequest("PATCH", `/api/events/${id}`, parseResult.data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Не удалось обновить тур");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Тур обновлен",
        description: "Изменения успешно сохранены",
      });
      setEditingEvent(null); // Close dialog on success
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить тур",
        variant: "destructive",
      });
      // Keep editingEvent so user can see error and retry
    },
  });

  const onSubmit = (data: CreateEventForm) => {
    createEventMutation.mutate(data);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
  };

  const handleSaveEdit = (data: unknown) => {
    if (editingEvent) {
      // Mutation will normalize and validate, but we can also normalize here for extra safety
      updateEventMutation.mutate({ id: editingEvent.id, data });
    }
  };

  // Backend now filters events for viewer role, so we only need to apply UI filters
  const filteredEvents = events
    .filter(event => {
      const matchesSearch = !searchQuery || 
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.cities.some(city => city.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCountry = countryFilter === "all" || event.country === countryFilter;
      const matchesTourType = tourTypeFilter === "all" || event.tourType === tourTypeFilter;
      return matchesSearch && matchesCountry && matchesTourType;
    })
    .sort((a, b) => {
      if (sortBy === "startDate") {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
      if (sortBy === "price") {
        return Number(a.price) - Number(b.price);
      }
      if (sortBy === "availability") {
        return b.availableSpots - a.availableSpots;
      }
      return 0;
    });

  const countries = Array.from(new Set(events.map(e => e.country))).filter(Boolean);
  const tourTypes = Array.from(new Set(events.map(e => e.tourType))).filter(Boolean);

  const stats = {
    total: events.length,
    upcoming: events.filter(e => new Date(e.startDate) > new Date()).length,
    fullOrAlmostFull: events.filter(e => e.availableSpots <= e.participantLimit * 0.1).length,
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-events">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Туры</h1>
          <p className="text-muted-foreground mt-2">
            Управление туристическими турами и группами
          </p>
        </div>
        <Button 
          data-testid="button-create-event"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Создать тур
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="stat-total-events">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего туров</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">В системе</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-upcoming-events">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Предстоящие</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">Еще не началось</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-full-events">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Почти заполнены</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fullOrAlmostFull}</div>
            <p className="text-xs text-muted-foreground">≥90% занято</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-filters">
        <CardHeader>
          <CardTitle>Фильтры и поиск</CardTitle>
          <CardDescription>Найдите нужный тур</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или городу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Страна</label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger data-testid="select-country">
                  <SelectValue placeholder="Все страны" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все страны</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Тип тура</label>
              <Select value={tourTypeFilter} onValueChange={setTourTypeFilter}>
                <SelectTrigger data-testid="select-tour-type">
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {tourTypes.map(type => (
                    <SelectItem key={type} value={type}>{getTourTypeLabel(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Сортировка</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startDate">По дате начала</SelectItem>
                  <SelectItem value="price">По цене</SelectItem>
                  <SelectItem value="availability">По доступности</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || countryFilter !== "all" || tourTypeFilter !== "all") && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery("");
                    setCountryFilter("all");
                    setTourTypeFilter("all");
                    setSortBy("startDate");
                  }}
                  data-testid="button-reset-filters"
                >
                  Сбросить
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-64 animate-pulse" data-testid={`skeleton-${i}`}>
              <CardContent className="h-full bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card data-testid="card-no-events">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Туров не найдено</h3>
            <p className="text-sm text-muted-foreground">
              Попробуйте изменить фильтры или создайте новый тур
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onViewSummary={(eventId) => setLocation(`/events/${eventId}/summary`)}
              onEdit={handleEditEvent}
            />
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать новый тур</DialogTitle>
            <DialogDescription>
              Заполните информацию о туре. Города вводите через запятую.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название тура</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Золотое кольцо Китая" {...field} data-testid="input-event-name" />
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
                        placeholder="Краткое описание тура..." 
                        {...field} 
                        data-testid="input-event-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ColorPicker 
                        value={field.value as ColorOption} 
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Страна</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event-country">
                            <SelectValue placeholder="Выберите страну" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
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
                  name="tourType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип тура</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event-tour-type">
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TOUR_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {getTourTypeLabel(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Города (через запятую)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Пекин, Лоян, Сиань, Чжанцзяцзе, Шанхай" 
                        {...field} 
                        data-testid="input-event-cities"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата начала</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-event-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата окончания</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-event-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="participantLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Лимит участников</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="20" 
                          {...field} 
                          data-testid="input-event-limit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Цена</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15000" 
                          {...field} 
                          data-testid="input-event-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    form.reset();
                  }}
                  data-testid="button-cancel-event"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  data-testid="button-submit-event"
                >
                  {createEventMutation.isPending ? "Создание..." : "Создать тур"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {editingEvent && (
        <EditEventDialog
          open={true}
          event={editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
