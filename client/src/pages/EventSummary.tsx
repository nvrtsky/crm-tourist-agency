import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useState, Fragment } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Users, UsersRound, Plus, UserMinus, UserPlus, Edit, Star, Baby, User as UserIcon } from "lucide-react";
import { useLocation } from "wouter";
import { utils, writeFile } from "xlsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { Event, Contact, Deal, CityVisit, Group, User, LeadTourist, Lead } from "@shared/schema";
import { updateLeadTouristSchema } from "@shared/schema";
import { EditableCell } from "@/components/EditableCell";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TOURIST_FIELD_DESCRIPTORS, SECTION_TITLES } from "@/lib/touristFormConfig";
import { DataCompletenessIndicator } from "@/components/DataCompletenessIndicator";
import { calculateTouristDataCompleteness } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  contacted: "Квалифицирован",
  qualified: "Забронирован",
  converted: "Подтвержден",
  lost: "Отложен",
};

interface EventWithStats extends Event {
  bookedCount: number;
  availableSpots: number;
}

interface Participant {
  deal: Deal;
  contact: Contact;
  leadTourist: LeadTourist | null;
  lead: Lead | null;
  visits: CityVisit[];
  group: Group | null;
}

const createMiniGroupSchema = z.object({
  name: z.string().min(1, "Введите название группы"),
  dealIds: z.array(z.string()).min(2, "Выберите минимум 2 участников"),
  primaryDealId: z.string().min(1, "Выберите основного участника"),
});

type CreateMiniGroupFormData = z.infer<typeof createMiniGroupSchema>;

export default function EventSummary() {
  const [, params] = useRoute("/events/:id/summary");
  const [, setLocation] = useLocation();
  const eventId = params?.id;
  const { toast } = useToast();
  const [showCreateMiniGroupDialog, setShowCreateMiniGroupDialog] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  const { data: event, isLoading: eventLoading } = useQuery<EventWithStats>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  // Load viewer users for displaying guide names
  const { data: viewers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/viewers"],
    enabled: !!event,
  });

  const { data: rawParticipants = [], isLoading: participantsLoading } = useQuery<Participant[]>({
    queryKey: [`/api/events/${eventId}/participants`],
    enabled: !!eventId,
  });

  // Sort participants by composite key: (leadId, isPrimary, groupId, isPrimaryInGroup)
  // This allows unrelated leads and non-lead members to interleave based on group relationships
  const participants = rawParticipants.slice().sort((a, b) => {
    const aLeadId = a.contact?.leadId ?? '';
    const bLeadId = b.contact?.leadId ?? '';
    const aGroupId = a.deal.groupId ?? '';
    const bGroupId = b.deal.groupId ?? '';
    const aIsPrimary = a.leadTourist?.isPrimary || false;
    const bIsPrimary = b.leadTourist?.isPrimary || false;
    const aIsPrimaryInGroup = a.deal.isPrimaryInGroup || false;
    const bIsPrimaryInGroup = b.deal.isPrimaryInGroup || false;
    
    // Compare by leadId (empty string sorts equally with other empty strings)
    if (aLeadId !== bLeadId) {
      return aLeadId.localeCompare(bLeadId);
    }
    
    // Same leadId (including both empty) - compare by isPrimary
    if (aIsPrimary !== bIsPrimary) {
      return aIsPrimary ? -1 : 1;
    }
    
    // Same leadId and primary status - compare by groupId
    if (aGroupId !== bGroupId) {
      return aGroupId.localeCompare(bGroupId);
    }
    
    // Same groupId - compare by isPrimaryInGroup
    if (aIsPrimaryInGroup !== bIsPrimaryInGroup) {
      return aIsPrimaryInGroup ? -1 : 1;
    }
    
    return 0;
  });

  // Pre-compute first participant indices for each lead and group
  // This ensures rowSpan merging works even when isPrimary/isPrimaryInGroup flags are missing
  const leadFirstIndexMap = new Map<string, number>();
  const groupFirstIndexMap = new Map<string, number>();
  
  participants.forEach((p, index) => {
    const leadId = p.contact?.leadId;
    const groupId = p.deal.groupId;
    
    if (leadId && !leadFirstIndexMap.has(leadId)) {
      leadFirstIndexMap.set(leadId, index);
    }
    
    if (groupId && !groupFirstIndexMap.has(groupId)) {
      groupFirstIndexMap.set(groupId, index);
    }
  });

  // Create viewer map for quick guide name lookups
  const viewerMap = new Map(
    viewers.map(v => [v.id, `${v.firstName} ${v.lastName}`])
  );

  // Helper to get guide name for a city
  const getGuideName = (city: string): string | null => {
    if (!event?.cityGuides) return null;
    const cityGuides = event.cityGuides as Record<string, string>;
    const guideId = cityGuides[city];
    return guideId ? viewerMap.get(guideId) || null : null;
  };

  // Helper to build display metadata for each participant's city columns
  // Determines which columns to show and with what rowSpan based on lead/mini-group membership
  const buildCityColumnsMeta = (participant: Participant, leadId: string | null | undefined, leadSize: number, isFirstInLead: boolean, isMiniGroup: boolean, isFirstInMiniGroup: boolean, groupSize: number) => {
    // Priority: Lead merge > Mini-group hotel merge > Individual rendering
    
    // Scenario 1: Participant is part of a lead (family)
    // Merge ALL 4 columns (Arrival, Transport, Hotel, Departure)
    if (leadId && leadSize > 1) {
      if (isFirstInLead) {
        // First tourist in lead - show all columns with rowSpan
        return {
          showArrival: true,
          arrivalRowSpan: leadSize,
          showTransport: true,
          transportRowSpan: leadSize,
          showHotel: true,
          hotelRowSpan: leadSize,
          showDeparture: true,
          departureRowSpan: leadSize,
        };
      } else {
        // Not first tourist in lead - hide all columns (already shown in first row)
        return {
          showArrival: false,
          arrivalRowSpan: 1,
          showTransport: false,
          transportRowSpan: 1,
          showHotel: false,
          hotelRowSpan: 1,
          showDeparture: false,
          departureRowSpan: 1,
        };
      }
    }
    
    // Scenario 2: Participant is in mini-group (but NOT in lead, or lead has only 1 member)
    // Merge ONLY Hotel column
    if (isMiniGroup && groupSize > 1) {
      if (isFirstInMiniGroup) {
        // First participant in mini-group - show all columns, Hotel with rowSpan
        return {
          showArrival: true,
          arrivalRowSpan: 1,
          showTransport: true,
          transportRowSpan: 1,
          showHotel: true,
          hotelRowSpan: groupSize,
          showDeparture: true,
          departureRowSpan: 1,
        };
      } else {
        // Not first in mini-group - show all except Hotel
        return {
          showArrival: true,
          arrivalRowSpan: 1,
          showTransport: true,
          transportRowSpan: 1,
          showHotel: false,
          hotelRowSpan: 1,
          showDeparture: true,
          departureRowSpan: 1,
        };
      }
    }
    
    // Default: Individual rendering (no merging)
    return {
      showArrival: true,
      arrivalRowSpan: 1,
      showTransport: true,
      transportRowSpan: 1,
      showHotel: true,
      hotelRowSpan: 1,
      showDeparture: true,
      departureRowSpan: 1,
    };
  };

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

  const createMiniGroupMutation = useMutation({
    mutationFn: async (data: CreateMiniGroupFormData) => {
      if (!eventId) throw new Error("Event ID is required");
      
      let createdGroupId: string | null = null;
      try {
        const groupResponse = await apiRequest("POST", "/api/groups", {
          name: data.name,
          type: "mini_group",
          eventId,
        });
        const group = await groupResponse.json() as Group;
        createdGroupId = group.id;

        // Add all members
        for (const dealId of data.dealIds) {
          await apiRequest("POST", `/api/groups/${group.id}/members`, {
            dealId,
            isPrimary: dealId === data.primaryDealId,
          });
        }

        return group;
      } catch (error) {
        // Rollback: delete the group if it was created but member addition failed
        if (createdGroupId) {
          try {
            await apiRequest("DELETE", `/api/groups/${createdGroupId}`);
          } catch (rollbackError) {
            console.error("Failed to rollback group creation:", rollbackError);
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      setShowCreateMiniGroupDialog(false);
      miniGroupForm.reset();
      toast({
        title: "Успешно",
        description: "Мини-группа создана",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось создать мини-группу",
        variant: "destructive",
      });
    },
  });

  const miniGroupForm = useForm<CreateMiniGroupFormData>({
    resolver: zodResolver(createMiniGroupSchema),
    defaultValues: {
      name: "",
      dealIds: [],
      primaryDealId: "",
    },
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ groupId, dealId }: { groupId: string; dealId: string }) => {
      return apiRequest("DELETE", `/api/groups/${groupId}/members/${dealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Успешно",
        description: "Участник удален из группы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось удалить участника из группы",
        variant: "destructive",
      });
    },
  });

  const handleEditTourist = (contactId: string | undefined) => {
    if (!contactId) {
      toast({
        title: "Ошибка",
        description: "ID контакта не найден",
        variant: "destructive",
      });
      return;
    }
    setEditingContactId(contactId);
  };

  const handleVisitUpdate = (visitId: string | undefined, dealId: string, city: string, field: string, value: string) => {
    // Find the participant
    const participant = participants.find(p => p.deal.id === dealId);
    if (!participant) return;

    const leadId = participant.contact?.leadId;
    const groupId = participant.deal.groupId;
    const group = participant.group;
    
    // Determine if we need to apply updates to multiple participants
    let targetMembers: typeof participants = [];
    let isLeadUpdate = false;
    
    // Priority 1: If participant is from a multi-member lead (family), update ALL fields for ALL tourists
    if (leadId) {
      const leadMembers = participants.filter(p => p.contact?.leadId === leadId);
      if (leadMembers.length > 1) {
        targetMembers = leadMembers;
        isLeadUpdate = true;
      }
    }
    
    // Priority 2: If no multi-member lead, check mini-group hotel sharing
    const hotelFields = ['hotelName', 'roomType'];
    if (!isLeadUpdate && groupId && group?.type === 'mini_group' && hotelFields.includes(field)) {
      const groupMembers = participants.filter(p => p.deal.groupId === groupId);
      if (groupMembers.length > 1) {
        targetMembers = groupMembers;
      }
    }
    
    // Apply update to target members (or just this participant if no group sharing)
    const membersToUpdate = targetMembers.length > 0 ? targetMembers : [participant];
    
    membersToUpdate.forEach(member => {
      const memberVisit = member.visits?.find(v => v.city === city);
      
      if (memberVisit?.id) {
        updateVisitMutation.mutate({ 
          visitId: memberVisit.id, 
          updates: { [field]: value || null } 
        });
      } else {
        // Create new visit with defaults
        createVisitMutation.mutate({
          dealId: member.deal.id,
          visitData: {
            city,
            [field]: value || null,
            arrivalDate: null,
            arrivalTime: null,
            transportType: null,
            flightNumber: null,
            hotelName: null,
            roomType: null,
            departureDate: null,
            departureTime: null,
          },
        });
      }
    });
  };

  const handleExportExcel = () => {
    if (!event || participants.length === 0) return;

    // NOTE: Excel export provides higher granularity than UI table:
    // - UI: 4 columns per city (Прибытие, Транспорт, Отель, Отъезд) for readability
    // - Excel: 8 columns per city (expanding each category into discrete fields)
    //   This provides operations teams with detailed information (flight numbers, room types, etc.)
    const exportData = participants.map((p, index) => {
      // Calculate tourist data completeness for export
      let completenessText = "—";
      if (p.leadTourist) {
        const completeness = calculateTouristDataCompleteness(p.leadTourist);
        const statusSymbol = (status: string) => status === "complete" ? "✓" : status === "partial" ? "◐" : "—";
        completenessText = `${statusSymbol(completeness.personal)} ${statusSymbol(completeness.russianPassport)} ${statusSymbol(completeness.foreignPassport)}`;
      }

      const baseData: Record<string, any> = {
        "№": index + 1,
        "ФИО": p.contact?.name || "—",
        "Данные": completenessText,
        "Статус лида": p.lead ? LEAD_STATUS_LABELS[p.lead.status] || p.lead.status : "—",
        "Email": p.contact?.email || "",
        "Телефон": p.contact?.phone || "",
        "Паспорт": p.contact?.passport || "",
        "Дата рождения": p.contact?.birthDate ? format(new Date(p.contact.birthDate), "dd.MM.yyyy") : "",
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
    const merges: any[] = [];

    // Track groups and their row ranges for merged cells
    const groupRows = new Map<string, { start: number; end: number; type: string }>();
    participants.forEach((p, index) => {
      const rowIndex = index + 1; // +1 for header row
      if (p.deal.groupId) {
        const existing = groupRows.get(p.deal.groupId);
        if (existing) {
          existing.end = rowIndex;
        } else {
          groupRows.set(p.deal.groupId, {
            start: rowIndex,
            end: rowIndex,
            type: p.group?.type || ''
          });
        }
      }
    });

    // Create merges for lead status column
    groupRows.forEach(({ start, end }) => {
      if (end > start) {
        // Merge "Статус лида" column (column 3 - after №, ФИО, Данные)
        merges.push({
          s: { r: start, c: 3 },
          e: { r: end, c: 3 }
        });
      }
    });

    // Create merges for hotel and transport columns (for groups)
    groupRows.forEach(({ start, end, type }) => {
      if (end > start) {
        const baseColumns = 9; // № + ФИО + Данные + Статус лида + Email + Телефон + Паспорт + ДР + Сумма
        
        event.cities.forEach((city, cityIndex) => {
          const cityBaseCol = baseColumns + (cityIndex * 8); // 8 columns per city
          
          // For families: merge both hotel and transport columns
          if (type === 'family') {
            // Merge transport arrival columns (transportType, flightNumber)
            merges.push({
              s: { r: start, c: cityBaseCol + 1 }, // Транспорт прибытия
              e: { r: end, c: cityBaseCol + 1 }
            });
            merges.push({
              s: { r: start, c: cityBaseCol + 2 }, // Рейс/Поезд прибытия
              e: { r: end, c: cityBaseCol + 2 }
            });
            
            // Merge hotel columns (hotelName, roomType)
            merges.push({
              s: { r: start, c: cityBaseCol + 3 }, // Отель
              e: { r: end, c: cityBaseCol + 3 }
            });
            merges.push({
              s: { r: start, c: cityBaseCol + 4 }, // Тип номера
              e: { r: end, c: cityBaseCol + 4 }
            });
            
            // Merge transport departure columns
            merges.push({
              s: { r: start, c: cityBaseCol + 6 }, // Транспорт отъезда
              e: { r: end, c: cityBaseCol + 6 }
            });
            merges.push({
              s: { r: start, c: cityBaseCol + 7 }, // Рейс/Поезд отъезда
              e: { r: end, c: cityBaseCol + 7 }
            });
          } else if (type === 'mini_group') {
            // For mini-groups: merge only hotel columns
            merges.push({
              s: { r: start, c: cityBaseCol + 3 }, // Отель
              e: { r: end, c: cityBaseCol + 3 }
            });
            merges.push({
              s: { r: start, c: cityBaseCol + 4 }, // Тип номера
              e: { r: end, c: cityBaseCol + 4 }
            });
          }
        });
      }
    });

    ws['!merges'] = merges;
    
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

  const getLeadStatusStyle = (status: string): { 
    variant: "default" | "secondary" | "outline" | "destructive"; 
    customClass?: string 
  } => {
    switch (status) {
      case "qualified":
        return { 
          variant: "outline", 
          customClass: "bg-[#f4a825] dark:bg-[#f4a825] text-white dark:text-white !border-[#d89420]" 
        };
      case "converted":
        return { 
          variant: "default", 
          customClass: "bg-green-700 dark:bg-green-800 text-white border-green-800 dark:border-green-900" 
        };
      case "lost":
        return { variant: "destructive" };
      case "new":
      case "contacted":
      default:
        return { variant: "secondary" };
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
            onClick={() => setShowCreateMiniGroupDialog(true)}
            disabled={participants.filter(p => !p.deal.groupId).length < 2}
            data-testid="button-create-mini-group"
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать мини-группу
          </Button>
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
                    <th className="sticky left-12 bg-background z-10 text-left p-2 font-medium border-r min-w-[150px]" rowSpan={2}>ФИО</th>
                    <th className="text-left p-2 font-medium border-r" rowSpan={2}>Данные туриста</th>
                    <th className="text-center p-2 font-medium border-r w-16" rowSpan={2}>Лид</th>
                    {event.cities.map((city) => {
                      const guideName = getGuideName(city);
                      return (
                        <th key={city} className="text-center p-2 font-medium border-r bg-muted/30" colSpan={4}>
                          <div className="flex flex-col gap-1">
                            <span>{city}</span>
                            {guideName && (
                              <span className="text-xs text-muted-foreground font-normal">
                                Гид: {guideName}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="border-b text-xs text-muted-foreground">
                    {event.cities.map((city) => (
                      <Fragment key={city}>
                        <th className="text-left p-2 border-r bg-muted/10">Прибытие</th>
                        <th className="text-left p-2 border-r bg-muted/10">Транспорт</th>
                        <th className="text-left p-2 border-r bg-muted/10">Отель</th>
                        <th className="text-left p-2 border-r bg-muted/10">Отъезд</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, index) => {
                    // Determine group membership
                    const groupId = participant.deal.groupId;
                    const groupMembers = participant.group 
                      ? participants.filter(p => p.group?.id === participant.group?.id)
                      : [];
                    const groupSize = groupMembers.length;
                    
                    // Use pre-computed first index map - works even without isPrimaryInGroup flag
                    const isFirstInGroup = groupId ? groupFirstIndexMap.get(groupId) === index : false;
                    
                    // Determine if this is the first row from the same lead (family)
                    const leadId = participant.contact?.leadId;
                    const leadMembers = leadId 
                      ? participants.filter(p => p.contact?.leadId === leadId)
                      : [];
                    const leadSize = leadMembers.length;
                    // Use pre-computed first index map - works even without isPrimary flag
                    const isFirstInLead = leadId ? leadFirstIndexMap.get(leadId) === index : false;
                    
                    // Determine if this is a mini-group (not a family group)
                    const isMiniGroup = participant.group?.type === "mini_group";
                    // Use pre-computed first index map - works even without isPrimaryInGroup flag
                    const isFirstInMiniGroup = isMiniGroup && groupId ? groupFirstIndexMap.get(groupId) === index : false;

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
                        
                        {/* Name column - sticky */}
                        <td className="sticky left-12 bg-background z-10 p-2 font-medium border-r min-w-[150px]" data-testid={`text-name-${participant.deal.id}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span>{participant.contact?.name || "—"}</span>
                              {participant.leadTourist && (
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger 
                                      type="button" 
                                      className="inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1.5 text-[10px] font-semibold transition-colors cursor-default hover-elevate"
                                      data-testid={`badge-tourist-type-${participant.deal.id}`}
                                    >
                                      {participant.leadTourist.touristType === "adult" ? (
                                        <UserIcon className="h-3 w-3 text-muted-foreground" />
                                      ) : (
                                        <Baby className="h-3 w-3 text-muted-foreground" />
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{participant.leadTourist.touristType === "adult" ? "Взрослый" : participant.leadTourist.touristType === "child" ? "Ребенок" : "Младенец"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {participant.leadTourist.isPrimary && (
                                    <Tooltip>
                                      <TooltipTrigger 
                                        type="button"
                                        className="inline-flex items-center rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground transition-colors cursor-default hover-elevate"
                                        data-testid={`badge-primary-tourist-${participant.deal.id}`}
                                      >
                                        <Star className="h-3 w-3" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Основной турист</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-50 hover:opacity-100"
                                onClick={() => handleEditTourist(participant.contact?.id)}
                                data-testid={`button-edit-tourist-${participant.deal.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {participant.deal.groupId && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-50 hover:opacity-100"
                                  onClick={() => {
                                    if (confirm(`Удалить ${participant.contact?.name} из группы?`)) {
                                      removeFromGroupMutation.mutate({
                                        groupId: participant.deal.groupId!,
                                        dealId: participant.deal.id,
                                      });
                                    }
                                  }}
                                  disabled={removeFromGroupMutation.isPending}
                                  data-testid={`button-remove-from-group-${participant.deal.id}`}
                                >
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r">
                          {participant.leadTourist ? (
                            <DataCompletenessIndicator 
                              completeness={calculateTouristDataCompleteness(participant.leadTourist)} 
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        
                        {/* Lead status column with rowSpan for grouped participants - now non-sticky */}
                        {isFirstInGroup ? (
                          <td 
                            className="p-2 border-r text-center align-top w-16"
                            rowSpan={groupSize}
                          >
                            {participant.lead ? (() => {
                              const style = getLeadStatusStyle(participant.lead.status);
                              return (
                                <Link href="/leads" data-testid={`link-lead-${participant.lead.id}`}>
                                  <Badge 
                                    variant={style.variant}
                                    className={`text-[10px] cursor-pointer hover-elevate ${style.customClass || ''}`}
                                  >
                                    {LEAD_STATUS_LABELS[participant.lead.status] || participant.lead.status}
                                  </Badge>
                                </Link>
                              );
                            })() : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ) : !participant.group && (
                          <td className="p-2 border-r text-center w-16">
                            {participant.lead ? (() => {
                              const style = getLeadStatusStyle(participant.lead.status);
                              return (
                                <Link href="/leads" data-testid={`link-lead-${participant.lead.id}`}>
                                  <Badge 
                                    variant={style.variant}
                                    className={`text-[10px] cursor-pointer hover-elevate ${style.customClass || ''}`}
                                  >
                                    {LEAD_STATUS_LABELS[participant.lead.status] || participant.lead.status}
                                  </Badge>
                                </Link>
                              );
                            })() : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        
                        {event.cities.map((city) => {
                          const visit = participant.visits?.find((v) => v.city === city);
                          const cityMeta = buildCityColumnsMeta(participant, leadId, leadSize, isFirstInLead, isMiniGroup, isFirstInMiniGroup, groupSize);
                          
                          return (
                            <Fragment key={city}>
                              {cityMeta.showArrival && (
                                <td 
                                  className="p-1 border-r align-top" 
                                  {...(cityMeta.arrivalRowSpan > 1 && { rowSpan: cityMeta.arrivalRowSpan })}
                                >
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
                              )}
                              {cityMeta.showTransport && (
                                <td 
                                  className="p-1 border-r align-top" 
                                  {...(cityMeta.transportRowSpan > 1 && { rowSpan: cityMeta.transportRowSpan })}
                                >
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
                              )}
                              {cityMeta.showHotel && (
                                <td 
                                  className="p-1 border-r min-w-[120px] align-top" 
                                  {...(cityMeta.hotelRowSpan > 1 && { rowSpan: cityMeta.hotelRowSpan })}
                                >
                                  <div className="space-y-1">
                                    <EditableCell
                                      type="text"
                                      value={visit?.hotelName}
                                      placeholder="Отель"
                                      onSave={(value) => handleVisitUpdate(visit?.id, participant.deal.id, city, "hotelName", value)}
                                      className="text-xs"
                                      triggerTestId={`editable-hotelName-${city}-${participant.deal.id}`}
                                      inputTestId={`input-hotelName-${city}-${participant.deal.id}`}
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
                                      triggerTestId={`editable-roomType-${city}-${participant.deal.id}`}
                                    />
                                  </div>
                                </td>
                              )}
                              {cityMeta.showDeparture && (
                                <td 
                                  className="p-1 border-r align-top" 
                                  {...(cityMeta.departureRowSpan > 1 && { rowSpan: cityMeta.departureRowSpan })}
                                >
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
                              )}
                            </Fragment>
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

      {/* Create Mini-Group Dialog */}
      <Dialog open={showCreateMiniGroupDialog} onOpenChange={setShowCreateMiniGroupDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-create-mini-group">
          <DialogHeader>
            <DialogTitle>Создать мини-группу</DialogTitle>
            <DialogDescription>
              Выберите участников тура для объединения в мини-группу. Они будут делить общий номер отеля.
            </DialogDescription>
          </DialogHeader>

          <Form {...miniGroupForm}>
            <form onSubmit={miniGroupForm.handleSubmit((data) => createMiniGroupMutation.mutate(data))} className="space-y-4">
              <FormField
                control={miniGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название группы</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Друзья из Москвы" {...field} data-testid="input-group-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Участники (выберите минимум 2)</FormLabel>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {participants.filter(p => !p.deal.groupId).map((participant) => {
                    const selectedDealIds = miniGroupForm.watch("dealIds") || [];
                    const isSelected = selectedDealIds.includes(participant.deal.id);

                    return (
                      <div key={participant.deal.id} className="flex items-center space-x-2 p-2 rounded hover-elevate">
                        <Checkbox
                          id={`participant-${participant.deal.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const currentDealIds = miniGroupForm.getValues("dealIds") || [];
                            if (checked) {
                              miniGroupForm.setValue("dealIds", [...currentDealIds, participant.deal.id]);
                              if (currentDealIds.length === 0) {
                                miniGroupForm.setValue("primaryDealId", participant.deal.id);
                              }
                            } else {
                              const newDealIds = currentDealIds.filter(id => id !== participant.deal.id);
                              miniGroupForm.setValue("dealIds", newDealIds);
                              if (miniGroupForm.getValues("primaryDealId") === participant.deal.id) {
                                miniGroupForm.setValue("primaryDealId", newDealIds[0] || "");
                              }
                            }
                          }}
                          data-testid={`checkbox-participant-${participant.deal.id}`}
                        />
                        <label
                          htmlFor={`participant-${participant.deal.id}`}
                          className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          <div className="flex justify-between items-center">
                            <span>{participant.contact?.name || "—"}</span>
                            <span className="text-xs text-muted-foreground">{participant.contact?.passport || "—"}</span>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
                {miniGroupForm.formState.errors.dealIds && (
                  <p className="text-sm text-destructive">{miniGroupForm.formState.errors.dealIds.message}</p>
                )}
              </div>

              <FormField
                control={miniGroupForm.control}
                name="primaryDealId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Основной участник (главный в группе)</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        data-testid="select-primary-participant"
                      >
                        <option value="">Выберите основного участника</option>
                        {(miniGroupForm.watch("dealIds") || []).map((dealId) => {
                          const participant = participants.find(p => p.deal.id === dealId);
                          return (
                            <option key={dealId} value={dealId}>
                              {participant?.contact?.name || "—"}
                            </option>
                          );
                        })}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateMiniGroupDialog(false);
                    miniGroupForm.reset();
                  }}
                  data-testid="button-cancel-mini-group"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createMiniGroupMutation.isPending}
                  data-testid="button-submit-mini-group"
                >
                  {createMiniGroupMutation.isPending ? "Создание..." : "Создать группу"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Tourist Details Dialog */}
      <TouristDetailsDialog
        contactId={editingContactId}
        onClose={() => setEditingContactId(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
        }}
      />
    </div>
  );
}

// TouristDetailsDialog Component
interface TouristDetailsDialogProps {
  contactId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ContactDetails {
  contact: Contact;
  leadTourist: LeadTourist | null;
}

function TouristDetailsDialog({ contactId, onClose, onSuccess }: TouristDetailsDialogProps) {
  const { toast } = useToast();
  
  const { data: details, isLoading } = useQuery<ContactDetails>({
    queryKey: ["/api/contacts", contactId, "details"],
    enabled: !!contactId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<LeadTourist>) => {
      return apiRequest("PATCH", `/api/contacts/${contactId}/details`, data);
    },
    onSuccess: () => {
      onSuccess();
      toast({
        title: "Успешно",
        description: "Данные туриста обновлены",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить данные",
        variant: "destructive",
      });
    },
  });

  const form = useForm<Partial<LeadTourist>>({
    resolver: zodResolver(updateLeadTouristSchema.partial()),
    values: details?.leadTourist || undefined,
  });

  if (!contactId) return null;

  return (
    <Dialog open={!!contactId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать данные туриста</DialogTitle>
          <DialogDescription>
            {details?.contact?.name || "Загрузка..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-4">
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
        ) : !details?.leadTourist ? (
          <Alert variant="destructive">
            <AlertDescription>
              У этого контакта нет связанных данных туриста. Редактирование невозможно.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              {(["personal", "passport", "foreign", "additional"] as const).map((section) => {
                const fields = TOURIST_FIELD_DESCRIPTORS.filter((f) => f.section === section);
                if (fields.length === 0) return null;

                return (
                  <div key={section} className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">
                      {SECTION_TITLES[section]}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {fields.map((field) => (
                        <FormField
                          key={field.key}
                          control={form.control}
                          name={field.key as any}
                          render={({ field: formField }) => (
                            <FormItem className={field.type === "textarea" ? "col-span-2" : ""}>
                              <FormLabel>
                                {field.label} {field.required && "*"}
                              </FormLabel>
                              <FormControl>
                                {field.type === "select" ? (
                                  <Select
                                    onValueChange={formField.onChange}
                                    value={formField.value || ""}
                                  >
                                    <SelectTrigger data-testid={field.testId}>
                                      <SelectValue placeholder="Выберите" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {field.selectOptions?.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : field.type === "textarea" ? (
                                  <Textarea
                                    placeholder={field.placeholder}
                                    {...formField}
                                    value={formField.value || ""}
                                    data-testid={field.testId}
                                  />
                                ) : (
                                  <Input
                                    type={field.type || "text"}
                                    placeholder={field.placeholder}
                                    {...formField}
                                    value={formField.value || ""}
                                    data-testid={field.testId}
                                  />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel-tourist-edit"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !details?.leadTourist}
                  data-testid="button-submit-tourist-edit"
                >
                  {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
