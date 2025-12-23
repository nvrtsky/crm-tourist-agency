import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Plane,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  CheckSquare,
  Star,
  MessageSquare,
  Bell,
  User,
  Users,
  LogOut,
  ChevronRight,
  Clock,
  Hotel,
  Utensils,
  Bus,
  AlertCircle,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import logoLight from "@assets/logo_1762426754494.png";

type TouristData = {
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    passport: string | null;
    birthDate: string | null;
  };
  trips: {
    id: string;
    event: {
      id: string;
      name: string;
      country: string;
      cities: string[];
      startDate: string;
      endDate: string;
      tourType: string;
    };
    deal: {
      id: string;
      status: string;
      amount: string | null;
      paidAmount: string | null;
    };
    lead: {
      tourCost: string | null;
      tourCostCurrency: string;
      advancePayment: string | null;
      remainingPayment: string | null;
      remainingPaymentCurrency: string;
      roomType: string | null;
      hotelCategory: string | null;
      meals: string | null;
      transfers: string | null;
    } | null;
    companions: {
      id: string;
      name: string;
    }[];
    cityVisits: {
      city: string;
      arrivalDate: string | null;
      departureDate: string | null;
      hotelName: string | null;
      roomType: string | null;
    }[];
    itinerary: {
      day: number;
      date: string;
      city: string;
      description: string;
    }[];
  }[];
  notifications: {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }[];
  checklists: {
    phase: string;
    items: {
      id: string;
      text: string;
      description: string | null;
      isRequired: boolean;
      isCompleted: boolean;
    }[];
  }[];
  upcomingTours: {
    id: string;
    name: string;
    country: string;
    cities: string[];
    startDate: string;
    endDate: string;
    price: string;
    priceCurrency: string;
    websiteUrl: string | null;
  }[];
};

export default function TouristPortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tours");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: "" });

  const token = typeof window !== "undefined" ? localStorage.getItem("touristToken") : null;

  const { data, isLoading, error } = useQuery<TouristData>({
    queryKey: ["/api/portal/me"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch tourist data");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (!token) {
      setLocation("/portal");
    }
  }, [token, setLocation]);

  useEffect(() => {
    if (error) {
      localStorage.removeItem("touristToken");
      setLocation("/portal");
    }
  }, [error, setLocation]);

  useEffect(() => {
    if (data?.trips && data.trips.length > 0 && !selectedTripId) {
      const upcomingTrip = data.trips.find((t) => isFuture(new Date(t.event.startDate)));
      setSelectedTripId(upcomingTrip?.id || data.trips[0].id);
    }
  }, [data, selectedTripId]);

  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      return apiRequest("POST", "/api/portal/checklist/toggle", { itemId, isCompleted }, {
        Authorization: `Bearer ${token}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: { tripId: string; rating: number; comment: string }) => {
      return apiRequest("POST", "/api/portal/reviews", reviewData, {
        Authorization: `Bearer ${token}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
      setIsReviewDialogOpen(false);
      setReviewData({ rating: 0, comment: "" });
      toast({ title: "Спасибо за отзыв!" });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("touristToken");
    setLocation("/portal");
  };

  if (!token) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const selectedTrip = data.trips.find((t) => t.id === selectedTripId);
  const daysUntilTrip = selectedTrip
    ? differenceInDays(new Date(selectedTrip.event.startDate), new Date())
    : 0;
  const tripStatus = selectedTrip
    ? isPast(new Date(selectedTrip.event.endDate))
      ? "completed"
      : isPast(new Date(selectedTrip.event.startDate))
      ? "ongoing"
      : "upcoming"
    : "none";

  const unreadNotifications = data.notifications.filter((n) => !n.isRead).length;

  const phaseLabels: Record<string, string> = {
    before: "До поездки",
    during: "Во время тура",
    after: "После возвращения",
  };

  const getChecklistProgress = (phase: string) => {
    const checklist = data.checklists.find((c) => c.phase === phase);
    if (!checklist || checklist.items.length === 0) return 0;
    const completed = checklist.items.filter((i) => i.isCompleted).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoLight} alt="Logo" className="h-8" />
            <span className="font-semibold hidden sm:inline">Личный кабинет</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setActiveTab("notifications")}
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Привет, {data.contact.name.split(" ")[0]}!</h1>
            {selectedTrip && tripStatus === "upcoming" && daysUntilTrip > 0 && (
              <p className="text-muted-foreground">
                До поездки осталось <span className="font-semibold text-primary">{daysUntilTrip}</span> дней
              </p>
            )}
            {tripStatus === "ongoing" && (
              <p className="text-primary font-medium">Ваш тур идёт прямо сейчас!</p>
            )}
          </div>
          {data.trips.length > 1 && (
            <select
              value={selectedTripId || ""}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background"
              data-testid="select-trip"
            >
              {data.trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.event.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedTrip && (
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{selectedTrip.event.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(selectedTrip.event.startDate), "d MMM", { locale: ru })} —{" "}
                      {format(new Date(selectedTrip.event.endDate), "d MMM yyyy", { locale: ru })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedTrip.event.cities.join(" → ")}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={
                    tripStatus === "upcoming"
                      ? "default"
                      : tripStatus === "ongoing"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-sm"
                >
                  {tripStatus === "upcoming"
                    ? "Предстоящий"
                    : tripStatus === "ongoing"
                    ? "В процессе"
                    : "Завершён"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="tours" className="flex items-center gap-1" data-testid="tab-tours">
              <Plane className="h-4 w-4" />
              <span className="hidden sm:inline">Туры</span>
            </TabsTrigger>
            <TabsTrigger value="program" className="flex items-center gap-1" data-testid="tab-program">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Программа</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-1" data-testid="tab-payment">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Оплата</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1" data-testid="tab-documents">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Документы</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-1" data-testid="tab-checklist">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Чек-лист</span>
            </TabsTrigger>
            <TabsTrigger value="companions" className="flex items-center gap-1" data-testid="tab-companions">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Попутчики</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-1" data-testid="tab-reviews">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Отзывы</span>
            </TabsTrigger>
            <TabsTrigger value="other-tours" className="flex items-center gap-1" data-testid="tab-other-tours">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Другие</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tours" className="space-y-4">
            <h2 className="text-lg font-semibold">Мои туры</h2>
            {data.trips.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>У вас пока нет забронированных туров</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {data.trips.map((trip) => {
                  const status = isPast(new Date(trip.event.endDate))
                    ? "completed"
                    : isPast(new Date(trip.event.startDate))
                    ? "ongoing"
                    : "upcoming";
                  return (
                    <Card
                      key={trip.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTripId === trip.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedTripId(trip.id)}
                      data-testid={`card-trip-${trip.id}`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="font-medium">{trip.event.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(trip.event.startDate), "d MMM", { locale: ru })} —{" "}
                              {format(new Date(trip.event.endDate), "d MMM yyyy", { locale: ru })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                status === "upcoming"
                                  ? "default"
                                  : status === "ongoing"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {status === "upcoming"
                                ? "Предстоящий"
                                : status === "ongoing"
                                ? "В процессе"
                                : "Завершён"}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="program" className="space-y-4">
            <h2 className="text-lg font-semibold">Программа тура</h2>
            {selectedTrip ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Hotel className="h-4 w-4" />
                        Размещение
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Тип номера:</span>
                        <span>{selectedTrip.lead?.roomType || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Категория:</span>
                        <span>{selectedTrip.lead?.hotelCategory || "—"}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        Услуги
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Питание:</span>
                        <span>{selectedTrip.lead?.meals || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Трансферы:</span>
                        <span>{selectedTrip.lead?.transfers || "—"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Маршрут по дням</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedTrip.itinerary && selectedTrip.itinerary.length > 0 ? (
                      <div className="space-y-4">
                        {selectedTrip.itinerary.map((day, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {day.day}
                              </div>
                              {idx < selectedTrip.itinerary.length - 1 && (
                                <div className="flex-1 w-px bg-border mt-2" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{day.city}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(day.date), "d MMM", { locale: ru })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{day.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Программа тура будет добавлена позже
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Выберите тур для просмотра программы
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <h2 className="text-lg font-semibold">Оплата</h2>
            {selectedTrip?.lead ? (
              <Card>
                <CardContent className="py-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Стоимость тура</p>
                      <p className="text-2xl font-bold">
                        {selectedTrip.lead.tourCost
                          ? `${Number(selectedTrip.lead.tourCost).toLocaleString()} ${selectedTrip.lead.tourCostCurrency}`
                          : "—"}
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-500/10">
                      <p className="text-sm text-muted-foreground mb-1">Оплачено</p>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedTrip.lead.advancePayment
                          ? `${Number(selectedTrip.lead.advancePayment).toLocaleString()} ${selectedTrip.lead.tourCostCurrency}`
                          : "0"}
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-orange-500/10">
                      <p className="text-sm text-muted-foreground mb-1">Остаток</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {selectedTrip.lead.remainingPayment
                          ? `${Number(selectedTrip.lead.remainingPayment).toLocaleString()} ${selectedTrip.lead.remainingPaymentCurrency}`
                          : "0"}
                      </p>
                    </div>
                  </div>

                  {selectedTrip.lead.remainingPayment && Number(selectedTrip.lead.remainingPayment) > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <span className="text-sm">
                        Необходимо внести остаток до начала тура
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Информация об оплате недоступна
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <h2 className="text-lg font-semibold">Мои документы</h2>
            <Card>
              <CardContent className="py-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">Паспортные данные</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">ФИО:</span>{" "}
                        {data.contact.name}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Паспорт:</span>{" "}
                        {data.contact.passport || "Не указан"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Дата рождения:</span>{" "}
                        {data.contact.birthDate
                          ? format(new Date(data.contact.birthDate), "d MMMM yyyy", { locale: ru })
                          : "Не указана"}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Контактные данные</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        {data.contact.email || "Не указан"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Телефон:</span>{" "}
                        {data.contact.phone || "Не указан"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4">
            <h2 className="text-lg font-semibold">Чек-листы</h2>
            {data.checklists.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Чек-листы пока не созданы</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.checklists.map((checklist) => (
                  <Card key={checklist.phase}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{phaseLabels[checklist.phase]}</CardTitle>
                        <Badge variant="outline">{getChecklistProgress(checklist.phase)}%</Badge>
                      </div>
                      <Progress value={getChecklistProgress(checklist.phase)} className="h-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {checklist.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={item.isCompleted}
                            onCheckedChange={(checked) =>
                              toggleChecklistMutation.mutate({
                                itemId: item.id,
                                isCompleted: checked as boolean,
                              })
                            }
                            data-testid={`checkbox-item-${item.id}`}
                          />
                          <div className="flex-1">
                            <p
                              className={`text-sm ${
                                item.isCompleted ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {item.text}
                              {item.isRequired && <span className="text-destructive ml-1">*</span>}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="companions" className="space-y-4">
            <h2 className="text-lg font-semibold">Попутчики</h2>
            {selectedTrip?.companions && selectedTrip.companions.length > 0 ? (
              <div className="grid gap-3">
                {selectedTrip.companions.map((companion) => (
                  <Card key={companion.id}>
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">{companion.name}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Вы путешествуете один</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Отзывы</h2>
              {selectedTrip && tripStatus === "completed" && (
                <Button onClick={() => setIsReviewDialogOpen(true)} data-testid="button-add-review">
                  <Star className="h-4 w-4 mr-2" />
                  Оставить отзыв
                </Button>
              )}
            </div>

            {tripStatus === "completed" ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <Star className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                  <p className="font-medium mb-2">Как вам поездка?</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ваш отзыв поможет нам стать лучше
                  </p>
                  <Button onClick={() => setIsReviewDialogOpen(true)}>Оставить отзыв</Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Вы сможете оставить отзыв после завершения тура</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="other-tours" className="space-y-4">
            <h2 className="text-lg font-semibold">Другие туры</h2>
            {data.upcomingTours.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Новые туры скоро появятся</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {data.upcomingTours.map((tour) => (
                  <Card key={tour.id} data-testid={`card-tour-${tour.id}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{tour.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {tour.cities.join(" → ")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(tour.startDate), "d MMM", { locale: ru })} —{" "}
                        {format(new Date(tour.endDate), "d MMM yyyy", { locale: ru })}
                      </div>
                      <div className="text-lg font-bold text-primary">
                        от {Number(tour.price).toLocaleString()} {tour.priceCurrency}
                      </div>
                    </CardContent>
                    {tour.websiteUrl && (
                      <CardFooter>
                        <Button variant="outline" className="w-full" asChild>
                          <a href={tour.websiteUrl} target="_blank" rel="noopener noreferrer">
                            Подробнее
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <h2 className="text-lg font-semibold">Уведомления</h2>
            {data.notifications.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет уведомлений</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {data.notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={notification.isRead ? "opacity-60" : ""}
                    data-testid={`card-notification-${notification.id}`}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-2 w-2 rounded-full mt-2 ${
                            notification.isRead ? "bg-muted" : "bg-primary"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(notification.createdAt), "d MMM, HH:mm", {
                              locale: ru,
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оставить отзыв</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Насколько вы довольны туром?</p>
              <div className="flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setReviewData((prev) => ({ ...prev, rating: i + 1 }))}
                    className={`h-10 w-10 rounded-lg border transition-colors ${
                      reviewData.rating >= i + 1
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:border-primary"
                    }`}
                    data-testid={`button-rating-${i + 1}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Плохо</span>
                <span>Отлично</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Комментарий (необязательно)</p>
              <Textarea
                value={reviewData.comment}
                onChange={(e) => setReviewData((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="Расскажите о вашем опыте..."
                rows={4}
                data-testid="textarea-review-comment"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() =>
                selectedTripId &&
                submitReviewMutation.mutate({
                  tripId: selectedTripId,
                  rating: reviewData.rating,
                  comment: reviewData.comment,
                })
              }
              disabled={reviewData.rating === 0 || submitReviewMutation.isPending}
              data-testid="button-submit-review"
            >
              {submitReviewMutation.isPending ? "Отправка..." : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
