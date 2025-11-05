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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, InsertEvent } from "@shared/schema";

interface EventWithStats extends Event {
  bookedCount: number;
  availableSpots: number;
}

const createEventFormSchema = z.object({
  name: z.string().min(3, "Название должно содержать минимум 3 символа"),
  description: z.string().optional(),
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

export default function Events() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [tourTypeFilter, setTourTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("startDate");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery<EventWithStats[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      name: "",
      description: "",
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

  const onSubmit = (data: CreateEventForm) => {
    createEventMutation.mutate(data);
  };

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

  const countries = Array.from(new Set(events.map(e => e.country)));
  const tourTypes = Array.from(new Set(events.map(e => e.tourType)));

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
                    <SelectItem key={type} value={type}>{type}</SelectItem>
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

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Страна</FormLabel>
                      <FormControl>
                        <Input placeholder="Например: Китай" {...field} data-testid="input-event-country" />
                      </FormControl>
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
                      <FormControl>
                        <Input placeholder="Например: Групповой" {...field} data-testid="input-event-tour-type" />
                      </FormControl>
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
    </div>
  );
}
