import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Users, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import { utils, writeFile } from "xlsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { Event, Contact, Deal, CityVisit, Group } from "@shared/schema";
import { EditableCell } from "@/components/EditableCell";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EventWithStats extends Event {
  bookedCount: number;
  availableSpots: number;
}

interface Participant {
  deal: Deal;
  contact: Contact;
  visits: CityVisit[];
  group: Group | null;
}

export default function EventSummary() {
  const [, params] = useRoute("/events/:id/summary");
  const [, setLocation] = useLocation();
  const eventId = params?.id;
  const { toast } = useToast();

  const { data: event, isLoading: eventLoading } = useQuery<EventWithStats>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  const { data: rawParticipants = [], isLoading: participantsLoading } = useQuery<Participant[]>({
    queryKey: [`/api/events/${eventId}/participants`],
    enabled: !!eventId,
  });

  // Sort participants so that groups are contiguous and primary members come first
  const participants = rawParticipants.slice().sort((a, b) => {
    // First, group by groupId (nulls last)
    if (a.deal.groupId && !b.deal.groupId) return -1;
    if (!a.deal.groupId && b.deal.groupId) return 1;
    if (a.deal.groupId && b.deal.groupId) {
      if (a.deal.groupId !== b.deal.groupId) {
        return a.deal.groupId.localeCompare(b.deal.groupId);
      }
      // Within same group, primary members first
      if (a.deal.isPrimaryInGroup && !b.deal.isPrimaryInGroup) return -1;
      if (!a.deal.isPrimaryInGroup && b.deal.isPrimaryInGroup) return 1;
    }
    return 0;
  });

  const updateVisitMutation = useMutation({
    mutationFn: async ({ visitId, updates }: { visitId: string; updates: Partial<CityVisit> }) => {
      return apiRequest("PATCH", `/api/visits/${visitId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Сохранено",
        description: "Данные обновлены",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: async ({ dealId, visitData }: { dealId: string; visitData: Partial<CityVisit> & { city: string } }) => {
      return apiRequest("POST", `/api/deals/${dealId}/visits`, {
        ...visitData,
        // Set required fields with defaults
        arrivalDate: visitData.arrivalDate || new Date().toISOString().split("T")[0],
        transportType: visitData.transportType || "plane",
        hotelName: visitData.hotelName || "Hotel",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Создано",
        description: "Новое посещение добавлено",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать посещение",
        variant: "destructive",
      });
    },
  });

  const handleVisitUpdate = (visitId: string | undefined, dealId: string, city: string, field: string, value: string) => {
    if (visitId) {
      updateVisitMutation.mutate({ visitId, updates: { [field]: value || null } });
    } else {
      createVisitMutation.mutate({
        dealId,
        visitData: {
          city,
          [field]: value,
        },
      });
    }
  };

  const handleExportExcel = () => {
    if (!event || participants.length === 0) return;

    const exportData = participants.map((p, index) => {
      const baseData: Record<string, any> = {
        "№": index + 1,
        "ФИО": p.contact?.name || "—",
        "Email": p.contact?.email || "",
        "Телефон": p.contact?.phone || "",
        "Паспорт": p.contact?.passport || "",
        "Дата рождения": p.contact?.birthDate ? format(new Date(p.contact.birthDate), "dd.MM.yyyy") : "",
        "Статус сделки": p.deal.status,
        "Сумма": Number(p.deal.amount || 0),
      };

      event.cities.forEach((city) => {
        const visit = p.visits?.find((v) => v.city === city);
        baseData[`${city} - Прибытие`] = visit?.arrivalDate
          ? `${format(new Date(visit.arrivalDate), "dd.MM.yyyy")}${visit.arrivalTime ? ` ${visit.arrivalTime}` : ""}`
          : "";
        baseData[`${city} - Транспорт прибытия`] = visit?.transportType || "";
        baseData[`${city} - Рейс/Поезд прибытия`] = visit?.flightNumber || "";
        baseData[`${city} - Отель`] = visit?.hotelName || "";
        baseData[`${city} - Тип номера`] = visit?.roomType || "";
        baseData[`${city} - Отъезд`] = visit?.departureDate
          ? `${format(new Date(visit.departureDate), "dd.MM.yyyy")}${visit.departureTime ? ` ${visit.departureTime}` : ""}`
          : "";
        baseData[`${city} - Транспорт отъезда`] = visit?.departureTransportType || "";
        baseData[`${city} - Рейс/Поезд отъезда`] = visit?.departureFlightNumber || "";
      });

      return baseData;
    });

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Участники");

    // Sanitize filename by removing special characters and replacing spaces
    const sanitizedEventName = event.name
      .replace(/[^\wа-яА-Я\s-]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    const fileName = `${sanitizedEventName}_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
    writeFile(wb, fileName);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  if (eventLoading || participantsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-semibold mb-2">Тур не найден</p>
            <Button onClick={() => setLocation("/events")} data-testid="button-back-to-events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к турам
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-event-summary">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/events")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <p className="text-muted-foreground mt-1">
              {event.country}: {event.cities.join(", ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={participants.length === 0}
            data-testid="button-export-excel"
          >
            <Download className="h-4 w-4 mr-2" />
            Экспорт в Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="stat-total-participants">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Участников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{event.bookedCount} / {event.participantLimit}</div>
            <p className="text-xs text-muted-foreground">
              {event.availableSpots} мест доступно
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-confirmed">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Подтверждено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participants.filter(p => p.deal.status === "confirmed").length}
            </div>
            <p className="text-xs text-muted-foreground">Готовы к туру</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В ожидании</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participants.filter(p => p.deal.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Требуют подтверждения</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participants
                .filter(p => p.deal.status === "confirmed")
                .reduce((sum, p) => sum + Number(p.deal.amount || 0), 0)
                .toLocaleString()} ₽
            </div>
            <p className="text-xs text-muted-foreground">От подтвержденных</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-participants">
        <CardHeader>
          <CardTitle>Сводная таблица по маршруту</CardTitle>
          <CardDescription>
            {event.startDate && format(new Date(event.startDate), "d MMMM yyyy", { locale: ru })} - {event.endDate && format(new Date(event.endDate), "d MMMM yyyy", { locale: ru })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет участников</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" data-testid="table-participants">
                <thead>
                  <tr className="border-b">
                    <th className="sticky left-0 bg-background z-10 text-center p-2 font-medium border-r w-12" rowSpan={2}>№</th>
                    <th className="sticky left-12 bg-background z-10 text-center p-2 font-medium border-r w-16" rowSpan={2}>Группа</th>
                    <th className="sticky left-28 bg-background z-10 text-left p-2 font-medium border-r min-w-[150px]" rowSpan={2}>ФИО</th>
                    <th className="text-left p-2 font-medium border-r" rowSpan={2}>Паспорт</th>
                    <th className="text-left p-2 font-medium border-r" rowSpan={2}>Статус</th>
                    {event.cities.map((city) => (
                      <th key={city} className="text-center p-2 font-medium border-r bg-muted/30" colSpan={4}>
                        {city}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b text-xs text-muted-foreground">
                    {event.cities.map((city) => (
                      <>
                        <th key={`${city}-arrival`} className="text-left p-2 border-r bg-muted/10">Прибытие</th>
                        <th key={`${city}-transport`} className="text-left p-2 border-r bg-muted/10">Транспорт</th>
                        <th key={`${city}-hotel`} className="text-left p-2 border-r bg-muted/10">Отель</th>
                        <th key={`${city}-departure`} className="text-left p-2 border-r bg-muted/10">Отъезд</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, index) => {
                    // Determine if this is the first row in a group
                    const isFirstInGroup = participant.group && participant.deal.isPrimaryInGroup;
                    const groupMembers = participant.group 
                      ? participants.filter(p => p.group?.id === participant.group?.id)
                      : [];
                    const groupSize = groupMembers.length;
                    
                    // Determine group icon component
                    const GroupIcon = participant.group?.type === "family" 
                      ? Users
                      : participant.group?.type === "mini_group" 
                        ? UsersRound
                        : null;

                    return (
                      <tr
                        key={participant.deal.id}
                        className={`border-b hover-elevate ${participant.group ? 'bg-muted/5' : ''}`}
                        data-testid={`row-participant-${participant.deal.id}`}
                      >
                        {/* Number column - always present */}
                        <td className="sticky left-0 bg-background z-10 p-2 border-r text-center">
                          {index + 1}
                        </td>
                        
                        {/* Group indicator column with rowSpan for grouped participants */}
                        {isFirstInGroup ? (
                          <td 
                            className="sticky left-12 bg-background z-10 p-2 border-r text-center align-top"
                            rowSpan={groupSize}
                          >
                            <div className="flex flex-col items-center gap-1">
                              {GroupIcon && (
                                <GroupIcon className="h-5 w-5 text-primary" />
                              )}
                              <div className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                                {participant.group?.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {groupSize} чел.
                              </div>
                            </div>
                          </td>
                        ) : !participant.group && (
                          <td className="sticky left-12 bg-background z-10 p-2 border-r text-center">
                            —
                          </td>
                        )}
                        
                        <td className="sticky left-28 bg-background z-10 p-2 font-medium border-r min-w-[150px]" data-testid={`text-name-${participant.deal.id}`}>
                          <div className="flex items-center gap-2">
                            <span>{participant.contact?.name || "—"}</span>
                          </div>
                        </td>
                        <td className="p-2 border-r text-muted-foreground">
                          {participant.contact?.passport || "—"}
                        </td>
                        <td className="p-2 border-r">
                          <Badge className={getStatusColor(participant.deal.status)} data-testid={`badge-status-${participant.deal.id}`}>
                            {participant.deal.status}
                          </Badge>
                        </td>
                        {event.cities.map((city) => {
                          const visit = participant.visits?.find((v) => v.city === city);
                          return (
                            <>
                              <td key={`${city}-arrival`} className="p-1 border-r">
                                <div className="space-y-1">
                                  <EditableCell
                                    type="date"
                                    value={visit?.arrivalDate}
                                    placeholder="Дата"
                                    onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "arrivalDate", value)}
                                    className="text-xs"
                                  />
                                  <EditableCell
                                    type="time"
                                    value={visit?.arrivalTime}
                                    placeholder="Время"
                                    onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "arrivalTime", value)}
                                    className="text-xs"
                                  />
                                </div>
                              </td>
                              <td key={`${city}-transport`} className="p-1 border-r">
                                <div className="space-y-1">
                                  <EditableCell
                                    type="select"
                                    value={visit?.transportType}
                                    placeholder="Тип"
                                    selectOptions={[
                                      { value: "plane", label: "Самолет" },
                                      { value: "train", label: "Поезд" },
                                    ]}
                                    onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "transportType", value)}
                                    className="text-xs"
                                  />
                                  <EditableCell
                                    type="text"
                                    value={visit?.flightNumber}
                                    placeholder="№ рейса"
                                    onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "flightNumber", value)}
                                    className="text-xs"
                                  />
                                </div>
                              </td>
                              <td key={`${city}-hotel`} className="p-1 border-r min-w-[120px]">
                                <div className="space-y-1">
                                  <EditableCell
                                    type="text"
                                    value={visit?.hotelName}
                                    placeholder="Отель"
                                    onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "hotelName", value)}
                                    className="text-xs"
                                  />
                                  <EditableCell
                                    type="select"
                                    value={visit?.roomType}
                                    placeholder="Тип номера"
                                    selectOptions={[
                                      { value: "twin", label: "Twin" },
                                      { value: "double", label: "Double" },
                                    ]}
                                    onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "roomType", value)}
                                    className="text-xs"
                                  />
                                </div>
                              </td>
                              <td key={`${city}-departure`} className="p-1 border-r">
                                <div className="space-y-1">
                                  <EditableCell
                                    type="date"
                                    value={visit?.departureDate}
                                    placeholder="Дата"
                                    onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "departureDate", value)}
                                    className="text-xs"
                                  />
                                  <EditableCell
                                    type="time"
                                    value={visit?.departureTime}
                                    placeholder="Время"
                                    onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "departureTime", value)}
                                    className="text-xs"
                                  />
                                </div>
                              </td>
                            </>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
