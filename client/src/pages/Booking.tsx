import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, Calendar, MapPin, Users, DollarSign, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Event } from "@shared/schema";

interface EventWithStats extends Event {
  bookedCount: number;
  availableSpots: number;
}

interface AvailabilityData {
  eventId: string;
  participantLimit: number;
  confirmedCount: number;
  availableSpots: number;
  availabilityPercentage: number;
  isFull: boolean;
}

const bookingFormSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  phone: z.string().min(1, "Телефон обязателен"),
  participantCount: z.number().min(1, "Минимум 1 участник").default(1),
  notes: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingFormSchema>;

function AvailabilityIndicator({ eventId }: { eventId: string }) {
  const { data: availability, isLoading } = useQuery<AvailabilityData>({
    queryKey: ["/api/events/availability", eventId],
  });

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!availability) {
    return null;
  }

  const { availableSpots, participantLimit, availabilityPercentage } = availability;

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
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant={badgeVariant} data-testid={`badge-availability-${eventId}`}>
        {badgeText}
      </Badge>
      <span className="text-sm text-muted-foreground" data-testid={`text-spots-${eventId}`}>
        Осталось {availableSpots} из {participantLimit} мест
      </span>
    </div>
  );
}

export default function Booking() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<EventWithStats | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [tourTypeFilter, setTourTypeFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventWithStats[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      participantCount: 1,
      notes: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: BookingForm) => {
      if (!selectedEvent) throw new Error("No event selected");

      const response = await apiRequest("POST", "/api/public/bookings", {
        eventId: selectedEvent.id,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        participantCount: data.participantCount,
        notes: data.notes || undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit booking");
      }

      return await response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить заявку",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: BookingForm) => {
    submitMutation.mutate(data);
  };

  // Filter events
  const availableEvents = events.filter((event) => !event.isFull);

  const filteredEvents = availableEvents.filter((event) => {
    const matchesCountry = countryFilter === "all" || event.country === countryFilter;
    const matchesTourType = tourTypeFilter === "all" || event.tourType === tourTypeFilter;
    const matchesDate = !startDateFilter || event.startDate >= startDateFilter;

    return matchesCountry && matchesTourType && matchesDate;
  });

  const countries = Array.from(new Set(availableEvents.map((e) => e.country)));
  const tourTypes = Array.from(new Set(availableEvents.map((e) => e.tourType)));

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
            <CardTitle className="text-center">Спасибо за вашу заявку!</CardTitle>
            <CardDescription className="text-center">
              Ваша заявка успешно отправлена. Наша команда свяжется с вами в ближайшее время для подтверждения бронирования.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setIsSubmitted(false);
                setSelectedEvent(null);
              }}
              className="w-full"
              data-testid="button-new-booking"
            >
              Забронировать еще один тур
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-hero-title">
            Забронировать тур
          </h1>
          <p className="text-lg text-primary-foreground/90" data-testid="text-hero-description">
            Выберите подходящий тур и оставьте заявку. Мы свяжемся с вами для подтверждения всех деталей.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Filters Section */}
        {!selectedEvent && (
          <Card data-testid="card-filters">
            <CardHeader>
              <CardTitle>Найдите свой идеальный тур</CardTitle>
              <CardDescription>Используйте фильтры для поиска тура</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Страна</label>
                  <Select
                    value={countryFilter}
                    onValueChange={setCountryFilter}
                  >
                    <SelectTrigger data-testid="select-country">
                      <SelectValue placeholder="Все страны" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все страны</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Тип тура</label>
                  <Select
                    value={tourTypeFilter}
                    onValueChange={setTourTypeFilter}
                  >
                    <SelectTrigger data-testid="select-tour-type">
                      <SelectValue placeholder="Все типы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      {tourTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Дата начала</label>
                  <Input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    data-testid="input-date-filter"
                  />
                </div>
              </div>

              {(countryFilter !== "all" || tourTypeFilter !== "all" || startDateFilter) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCountryFilter("all");
                    setTourTypeFilter("all");
                    setStartDateFilter("");
                  }}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-2" />
                  Сбросить фильтры
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Events Grid */}
        {!selectedEvent && (
          <>
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <Card data-testid="card-no-events">
                <CardHeader>
                  <CardTitle>Туры не найдены</CardTitle>
                  <CardDescription>
                    Попробуйте изменить фильтры или проверьте позже
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                    data-testid={`card-event-${event.id}`}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl">{event.name}</CardTitle>
                      <CardDescription className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{event.tourType}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(event.startDate), "dd.MM.yyyy")} -{" "}
                          {format(new Date(event.endDate), "dd.MM.yyyy")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-lg font-bold">
                        <DollarSign className="h-5 w-5" />
                        <span>{event.price} ₽</span>
                      </div>

                      <AvailabilityIndicator eventId={event.id} />

                      <Button className="w-full" data-testid={`button-select-${event.id}`}>
                        Выбрать этот тур
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Booking Form */}
        {selectedEvent && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card data-testid="card-selected-event">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">{selectedEvent.name}</CardTitle>
                    <CardDescription className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{selectedEvent.country} • {selectedEvent.tourType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(selectedEvent.startDate), "dd.MM.yyyy")} -{" "}
                          {format(new Date(selectedEvent.endDate), "dd.MM.yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold text-lg">
                        <DollarSign className="h-5 w-5" />
                        <span>{selectedEvent.price} ₽</span>
                      </div>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedEvent(null)}
                    data-testid="button-change-event"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Изменить
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card data-testid="card-booking-form">
              <CardHeader>
                <CardTitle>Форма бронирования</CardTitle>
                <CardDescription>
                  Заполните информацию для бронирования тура
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Имя <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Введите ваше имя"
                              data-testid="input-name"
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
                              {...field}
                              type="email"
                              placeholder="Введите ваш email"
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
                          <FormLabel>
                            Телефон <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="+7 (999) 123-45-67"
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="participantCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Количество участников</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                              data-testid="input-participant-count"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дополнительные пожелания</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Укажите дополнительные пожелания или вопросы"
                              rows={4}
                              data-testid="input-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitMutation.isPending}
                      data-testid="button-submit"
                    >
                      {submitMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Отправить заявку
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
