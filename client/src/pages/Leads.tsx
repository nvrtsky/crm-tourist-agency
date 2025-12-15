import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuLabel } from "@/components/ui/context-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Users, TrendingUp, Clock, CheckCircle, Edit, Trash2, LayoutGrid, LayoutList, Filter, Star, User as UserIcon, UserRound, Baby, RotateCcw, Search, MessageCircle, MapPin, XCircle, FileText, Download, Archive, ArchiveRestore, ChevronsUpDown, Check, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Lead, LeadWithTouristCount, InsertLead, LeadTourist, InsertLeadTourist, Event, EventWithStats, User } from "@shared/schema";
import { insertLeadSchema, insertLeadTouristSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { DataCompletenessIndicator } from "@/components/DataCompletenessIndicator";
import { calculateTouristDataCompleteness, formatCurrency, formatTouristName, cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ColorPicker, ColorIndicator, type ColorOption, type ColorDisplayMode, getColorDisplayMode, getPastelClasses } from "@/components/ColorPicker";
import { DeferLeadDialog, type DeferLeadDialogResult, postponeReasonLabels, failureReasonLabels, postponeReasons, failureReasons } from "@/components/DeferLeadDialog";
import { Wazzup24Chat } from "@/components/Wazzup24Chat";
import { useSystemDictionary } from "@/hooks/use-system-dictionary";
import { MultiSelectField } from "@/components/MultiSelectField";
import { PassportScansField } from "@/components/PassportScansField";
import { z } from "zod";

const leadStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; customClass?: string }> = {
  new: { label: "Новый", variant: "secondary" },
  contacted: { label: "Квалифицирован", variant: "secondary" },
  qualified: { label: "Забронирован", variant: "outline", customClass: "bg-[#f4a825] dark:bg-[#f4a825] text-white dark:text-white !border-[#d89420]" },
  converted: { label: "Подтвержден", variant: "default", customClass: "bg-green-700 dark:bg-green-800 text-white border-green-800 dark:border-green-900" },
  lost: { label: "Отложен/Провал", variant: "destructive" },
};

const leadSourceMap: Record<string, string> = {
  form: "Веб-форма",
  referral: "Рекомендация",
  direct: "Прямое обращение",
  advertisement: "Реклама",
  other: "Другое",
};

const clientCategoryMap: Record<string, string> = {
  category_ab: "Категория А и В (Даты и бюджет)",
  category_c: "Категория C (Неопределились)",
  category_d: "Категория D (Нет бюджета)",
  vip: "VIP",
  not_segmented: "Не сегментированный",
  travel_agent: "Турагент",
  tariff_standard: "Тариф стандарт",
  tariff_economy: "Тариф эконом",
  tariff_vip: "Тариф VIP",
};

// Helper function to get status label based on outcomeType
function getLeadStatusLabel(lead: Lead): string {
  if (lead.status === 'lost') {
    if (lead.outcomeType === 'failed') {
      return 'Провал';
    }
    return 'Отложен';
  }
  return leadStatusMap[lead.status]?.label || lead.status;
}

// Helper function to determine lead display color
function getLeadDisplayColor(lead: Lead): ColorOption {
  // If manual color is set, use it
  if (lead.color) {
    return lead.color as ColorOption;
  }
  
  // Auto-color based on status
  if (lead.status === "converted" || lead.status === "won") {
    return "green";
  }
  if (lead.status === "lost") {
    return "red";
  }
  
  // No color for other statuses
  return null;
}

// Form schema with color field, selectedCities, and primary tourist data
const createLeadFormSchema = insertLeadSchema.extend({
  color: z.string().nullable(),
  selectedCities: z.array(z.string()).nullable(),
  // Primary tourist data (for completeness)
  dateOfBirth: z.string().nullable().optional(),
  passportSeries: z.string().nullable().optional(),
  passportIssuedBy: z.string().nullable().optional(),
  registrationAddress: z.string().nullable().optional(),
  foreignPassportName: z.string().nullable().optional(),
  foreignPassportNumber: z.string().nullable().optional(),
  foreignPassportValidUntil: z.string().nullable().optional(),
});

export default function Leads() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin } = useAuth(); // Only admins can delete leads
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // Defer dialog state
  const [isDeferDialogOpen, setIsDeferDialogOpen] = useState(false);
  const [leadToDefer, setLeadToDefer] = useState<{ id: string; name: string } | null>(null);
  const [pendingFormData, setPendingFormData] = useState<Partial<InsertLead> | null>(null);
  
  // Color display mode state for table view
  const [colorDisplayMode, setColorDisplayMode] = useState<ColorDisplayMode>(() => getColorDisplayMode());
  
  // Listen for color display mode changes from Settings
  useEffect(() => {
    const handleColorModeChange = () => {
      setColorDisplayMode(getColorDisplayMode());
    };
    window.addEventListener("colorDisplayModeChanged", handleColorModeChange);
    return () => {
      window.removeEventListener("colorDisplayModeChanged", handleColorModeChange);
    };
  }, []);
  
  // View and filter state
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    return (localStorage.getItem('leadsViewMode') as 'table' | 'kanban') || 'kanban';
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [tourFilter, setTourFilter] = useState<string>('');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data: leads = [], isLoading } = useQuery<LeadWithTouristCount[]>({
    queryKey: ["/api/leads"],
  });

  const { data: events = [] } = useQuery<EventWithStats[]>({
    queryKey: ["/api/events"],
  });

  // Fetch tourists for the editing lead (for document validation)
  const { data: editingLeadTourists = [] } = useQuery<LeadTourist[]>({
    queryKey: ["/api/leads", editingLead?.id, "tourists"],
    enabled: !!editingLead?.id,
  });

  // Dictionary queries for dynamic form options
  const { data: clientCategoryItems = [] } = useSystemDictionary("client_category");
  const { data: leadSourceItems = [] } = useSystemDictionary("lead_source");
  const { data: hotelCategoryItems = [] } = useSystemDictionary("hotel_category");
  const { data: roomTypeItems = [] } = useSystemDictionary("room_type");

  // Create dynamic maps from dictionary data (with fallback to hardcoded values)
  const dynamicClientCategoryMap = useMemo(() => {
    if (clientCategoryItems.length > 0) {
      return clientCategoryItems.reduce((acc, item) => {
        acc[item.value] = item.label;
        return acc;
      }, {} as Record<string, string>);
    }
    return clientCategoryMap;
  }, [clientCategoryItems]);

  const dynamicLeadSourceMap = useMemo(() => {
    if (leadSourceItems.length > 0) {
      return leadSourceItems.reduce((acc, item) => {
        acc[item.value] = item.label;
        return acc;
      }, {} as Record<string, string>);
    }
    return leadSourceMap;
  }, [leadSourceItems]);

  const createMutation = useMutation<Lead, Error, InsertLead>({
    mutationFn: async (data: InsertLead) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return await res.json();
    },
    onSuccess: (newLead: Lead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      // If lead was created with eventId, invalidate participants cache for that event
      if (newLead.eventId) {
        queryClient.invalidateQueries({ queryKey: [`/api/events/${newLead.eventId}/participants`] });
      }
      
      setIsCreateDialogOpen(false);
      toast({
        title: "Успешно",
        description: newLead.eventId ? "Лид создан и туристы добавлены в тур" : "Лид создан",
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
      return await apiRequest("PATCH", `/api/leads/${id}`, data);
    },
    onMutate: async (variables) => {
      // Capture old eventId at mutation time to avoid race conditions
      const lead = leads.find(l => l.id === variables.id);
      return { oldEventId: lead?.eventId };
    },
    onSuccess: async (_result, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      // Refetch events to update status counters in EventCard
      await queryClient.refetchQueries({ queryKey: ["/api/events"] });
      
      // If eventId changed, invalidate participants cache for both old and new events
      const oldEventId = context?.oldEventId;
      const newEventId = variables.data.eventId;
      
      if (oldEventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${oldEventId}/participants`] });
      }
      if (newEventId && newEventId !== oldEventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${newEventId}/participants`] });
      }
      
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
      return await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      // Refetch events to update status counters in EventCard
      queryClient.refetchQueries({ queryKey: ["/api/events"] });
      
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

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/leads/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Успешно",
        description: "Лид перемещен в архив",
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

  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/leads/${id}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Успешно",
        description: "Лид восстановлен из архива",
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

  // Save viewMode to localStorage
  useEffect(() => {
    localStorage.setItem('leadsViewMode', viewMode);
  }, [viewMode]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    const filtered = leads.filter(lead => {
      // Archive filter - show only archived leads when showArchived is true, otherwise show only non-archived
      if (showArchived) {
        if (!lead.isArchived) {
          return false;
        }
      } else {
        if (lead.isArchived) {
          return false;
        }
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (lead.firstName?.toLowerCase() || '').includes(query) ||
          (lead.lastName?.toLowerCase() || '').includes(query) ||
          (lead.middleName?.toLowerCase() || '').includes(query) ||
          (lead.email?.toLowerCase() || '').includes(query) ||
          (lead.phone?.toLowerCase() || '').includes(query);
        
        if (!matchesSearch) {
          return false;
        }
      }
      
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(lead.status)) {
        return false;
      }
      
      // Source filter
      if (sourceFilter && lead.source !== sourceFilter) {
        return false;
      }
      
      // Category filter
      if (categoryFilter && lead.clientCategory !== categoryFilter) {
        return false;
      }
      
      // Tour filter
      if (tourFilter && lead.eventId !== tourFilter) {
        return false;
      }
      
      // Color filter
      if (colorFilter) {
        const displayColor = getLeadDisplayColor(lead);
        if (colorFilter === "none") {
          // Filter for leads with no color (neither manual nor auto)
          if (displayColor !== null) return false;
        } else {
          // Filter for specific color
          if (displayColor !== colorFilter) return false;
        }
      }
      
      // Outcome filter (postpone/failure reasons)
      if (outcomeFilter) {
        // Check for outcome type filter
        if (outcomeFilter === "postponed") {
          if (lead.status !== 'lost' || lead.outcomeType !== 'postponed') return false;
        } else if (outcomeFilter === "failed") {
          if (lead.status !== 'lost' || lead.outcomeType !== 'failed') return false;
        } else {
          // Filter by specific reason (postpone or failure)
          const matchesPostpone = lead.status === 'lost' && lead.postponeReason === outcomeFilter;
          const matchesFailure = lead.status === 'lost' && lead.failureReason === outcomeFilter;
          if (!matchesPostpone && !matchesFailure) return false;
        }
      }
      
      // Date range filter
      if (dateRange.from || dateRange.to) {
        const leadDate = new Date(lead.createdAt);
        if (dateRange.from && leadDate < dateRange.from) return false;
        if (dateRange.to && leadDate > dateRange.to) return false;
      }
      
      return true;
    });
    
    // Sort by createdAt DESC (newest first) for table view
    // Clone array before sorting to avoid mutating react-query cache
    return [...filtered].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads, searchQuery, statusFilter, sourceFilter, categoryFilter, tourFilter, colorFilter, outcomeFilter, showArchived, dateRange]);

  // Calculate stats from filtered leads
  const stats = {
    total: filteredLeads.length,
    new: filteredLeads.filter((l) => l.status === "new").length,
    inProgress: filteredLeads.filter((l) => ["contacted", "qualified"].includes(l.status)).length,
    completed: filteredLeads.filter((l) => l.status === "converted").length,
  };

  // Helper function to get lead display name
  const getLeadName = (lead: Lead) => {
    return `${lead.lastName || ''} ${lead.firstName || ''}`.trim() || 'Без имени';
  };

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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <LeadForm
              onSubmit={(data) => {
                // Explicitly include tourist fields in the payload to ensure they're sent to the API
                // The backend expects these fields and will pass them to the auto-created tourist
                const payload = {
                  ...data,
                  dateOfBirth: data.dateOfBirth || null,
                  passportSeries: data.passportSeries || null,
                  passportIssuedBy: data.passportIssuedBy || null,
                  registrationAddress: data.registrationAddress || null,
                  foreignPassportName: data.foreignPassportName || null,
                  foreignPassportNumber: data.foreignPassportNumber || null,
                  foreignPassportValidUntil: data.foreignPassportValidUntil || null,
                };
                createMutation.mutate(payload as InsertLead);
              }}
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

      {/* Filters and View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, email, телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8"
                data-testid="input-search"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                data-testid="button-view-kanban"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Канбан
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                data-testid="button-view-table"
              >
                <LayoutList className="h-4 w-4 mr-2" />
                Таблица
              </Button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter.length === 1 ? statusFilter[0] : "all"}
                onValueChange={(value) => setStatusFilter(value === "all" ? [] : [value])}
              >
                <SelectTrigger className="h-8" data-testid="select-status-filter">
                  <SelectValue placeholder="Фильтр по статусу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="new">Новый</SelectItem>
                  <SelectItem value="contacted">Квалифицирован</SelectItem>
                  <SelectItem value="qualified">Забронирован</SelectItem>
                  <SelectItem value="converted">Подтвержден</SelectItem>
                  <SelectItem value="lost">Отложен</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-2 min-w-[180px]">
              <Select
                value={sourceFilter || "all"}
                onValueChange={(value) => setSourceFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-8" data-testid="select-source-filter">
                  <SelectValue placeholder="Фильтр по источнику" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  {leadSourceItems.length > 0 ? (
                    leadSourceItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="form">Веб-форма</SelectItem>
                      <SelectItem value="referral">Рекомендация</SelectItem>
                      <SelectItem value="direct">Прямое обращение</SelectItem>
                      <SelectItem value="advertisement">Реклама</SelectItem>
                      <SelectItem value="other">Другое</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <Select
                value={categoryFilter || "all"}
                onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-8" data-testid="select-category-filter">
                  <SelectValue placeholder="Фильтр по категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {clientCategoryItems.length > 0 ? (
                    clientCategoryItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="category_ab">Категория А и В (Даты и бюджет)</SelectItem>
                      <SelectItem value="category_c">Категория C (Неопределились)</SelectItem>
                      <SelectItem value="category_d">Категория D (Нет бюджета)</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="not_segmented">Не сегментированный</SelectItem>
                      <SelectItem value="travel_agent">Турагент</SelectItem>
                      <SelectItem value="tariff_standard">Тариф стандарт</SelectItem>
                      <SelectItem value="tariff_economy">Тариф эконом</SelectItem>
                      <SelectItem value="tariff_vip">Тариф VIP</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Tour Filter */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <Select
                value={tourFilter || "all"}
                onValueChange={(value) => setTourFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-8" data-testid="select-tour-filter">
                  <SelectValue placeholder="Фильтр по туру" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все туры</SelectItem>
                  {events.filter(event => !event.isArchived).map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Filter */}
            <div className="flex items-center gap-2 min-w-[180px]">
              <Select
                value={colorFilter || "all"}
                onValueChange={(value) => setColorFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-8" data-testid="select-color-filter">
                  <SelectValue placeholder="Фильтр по цвету" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все цвета</SelectItem>
                  <SelectItem value="red">
                    <div className="flex items-center gap-2">
                      <ColorIndicator color="red" />
                      <span>Красный</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="blue">
                    <div className="flex items-center gap-2">
                      <ColorIndicator color="blue" />
                      <span>Синий</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="green">
                    <div className="flex items-center gap-2">
                      <ColorIndicator color="green" />
                      <span>Зеленый</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="yellow">
                    <div className="flex items-center gap-2">
                      <ColorIndicator color="yellow" />
                      <span>Желтый</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="purple">
                    <div className="flex items-center gap-2">
                      <ColorIndicator color="purple" />
                      <span>Фиолетовый</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="none">Без цвета</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Outcome Filter (Postponed/Failed reasons) */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <Select
                value={outcomeFilter || "all"}
                onValueChange={(value) => setOutcomeFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-8" data-testid="select-outcome-filter">
                  <SelectValue placeholder="Отложен/Провал" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все исходы</SelectItem>
                  <SelectItem value="postponed">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Все отложенные</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="failed">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      <span>Все провалы</span>
                    </div>
                  </SelectItem>
                  <SelectItem disabled value="divider-postpone" className="opacity-50 text-xs">
                    — Причины отложения —
                  </SelectItem>
                  {postponeReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{reason.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem disabled value="divider-failure" className="opacity-50 text-xs">
                    — Причины провала —
                  </SelectItem>
                  {failureReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span>{reason.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Archive Toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-archived-leads"
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(checked === true)}
                data-testid="checkbox-show-archived"
              />
              <label
                htmlFor="show-archived-leads"
                className="text-sm cursor-pointer select-none flex items-center gap-1"
              >
                <Archive className="h-3.5 w-3.5" />
                Только архивные
              </label>
            </div>

            {/* Clear Filters */}
            {(searchQuery || statusFilter.length > 0 || sourceFilter || categoryFilter || tourFilter || colorFilter || outcomeFilter || dateRange.from || dateRange.to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter([]);
                  setSourceFilter('');
                  setCategoryFilter('');
                  setTourFilter('');
                  setColorFilter('');
                  setOutcomeFilter('');
                  setDateRange({});
                }}
                data-testid="button-clear-filters"
              >
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          leads={filteredLeads}
          events={events}
          isLoading={isLoading}
          onStatusChange={(leadId, newStatus) => {
            // If changing to "lost" status, show defer dialog
            if (newStatus === 'lost') {
              const lead = leads.find(l => l.id === leadId);
              if (lead) {
                setLeadToDefer({ id: leadId, name: getLeadName(lead) });
                setIsDeferDialogOpen(true);
              }
            } else {
              // For other status changes, update directly
              updateMutation.mutate({ id: leadId, data: { status: newStatus } });
            }
          }}
          onEdit={setEditingLead}
          onDelete={(leadId) => {
            if (confirm("Вы уверены, что хотите удалить этот лид?")) {
              deleteMutation.mutate(leadId);
            }
          }}
          onArchive={(leadId) => archiveMutation.mutate(leadId)}
          onUnarchive={(leadId) => unarchiveMutation.mutate(leadId)}
          getLeadName={getLeadName}
        />
      ) : (
        // Table View
        <Card data-testid="card-leads-table">
          <CardHeader>
            <CardTitle>Все лиды</CardTitle>
            <CardDescription>Список всех лидов в CRM системе</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {leads.length === 0 ? 'Нет лидов. Создайте первый лид.' : 'Нет лидов соответствующих фильтрам.'}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Тур</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const event = events.find(e => e.id === lead.eventId);
                  const displayColor = getLeadDisplayColor(lead);
                  const pastelClasses = displayColor ? getPastelClasses(displayColor) : { bg: "", border: "" };
                  const showFill = (colorDisplayMode === "fill" || colorDisplayMode === "both") && displayColor;
                  const showDot = (colorDisplayMode === "dot" || colorDisplayMode === "both");
                  
                  const handleStatusChange = (newStatus: string) => {
                    if (newStatus === 'lost') {
                      setLeadToDefer({ id: lead.id, name: getLeadName(lead) });
                      setIsDeferDialogOpen(true);
                    } else {
                      updateMutation.mutate({ id: lead.id, data: { status: newStatus } });
                    }
                  };
                  
                  return (
                  <ContextMenu key={lead.id}>
                    <ContextMenuTrigger asChild>
                      <TableRow 
                        data-testid={`row-lead-${lead.id}`}
                        className={`cursor-context-menu ${showFill ? `${pastelClasses.bg}` : ""}`}
                        onTouchStart={(e) => {
                          const timer = setTimeout(() => {
                            e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', {
                              bubbles: true,
                              clientX: e.touches[0].clientX,
                              clientY: e.touches[0].clientY
                            }));
                          }, 500);
                          (e.currentTarget as any)._longPressTimer = timer;
                        }}
                        onTouchEnd={(e) => {
                          if ((e.currentTarget as any)._longPressTimer) {
                            clearTimeout((e.currentTarget as any)._longPressTimer);
                          }
                        }}
                        onTouchMove={(e) => {
                          if ((e.currentTarget as any)._longPressTimer) {
                            clearTimeout((e.currentTarget as any)._longPressTimer);
                          }
                        }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {showDot && <ColorIndicator color={displayColor} />}
                            <span>{getLeadName(lead)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={leadStatusMap[lead.status]?.variant || "default"} 
                                className={leadStatusMap[lead.status]?.customClass || ""}
                                data-testid={`status-${lead.id}`}
                              >
                                {getLeadStatusLabel(lead)}
                              </Badge>
                              {lead.hasBeenContacted && (
                                <Badge variant="secondary" className="text-[10px]" data-testid={`badge-reactivated-table-${lead.id}`}>
                                  Лид из Отложенных
                                </Badge>
                              )}
                              {lead.isArchived && (
                                <Badge variant="outline" className="text-[10px] bg-muted" data-testid={`badge-archived-table-${lead.id}`}>
                                  <Archive className="h-3 w-3 mr-1" />
                                  Архив
                                </Badge>
                              )}
                            </div>
                            {/* Show date and reason for postponed/failed leads */}
                            {lead.status === 'lost' && (
                              <div className={`text-xs ${lead.outcomeType === 'failed' ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                                {lead.outcomeType === 'failed' ? (
                                  <div className="flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    <span>{failureReasonLabels[lead.failureReason || ''] || lead.failureReason || 'Провал'}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {lead.postponedUntil 
                                          ? `До ${format(new Date(lead.postponedUntil), "dd.MM.yy", { locale: ru })}`
                                          : "Отложен"
                                        }
                                      </span>
                                    </div>
                                    {lead.postponeReason && (
                                      <span className="text-[10px] italic ml-4">
                                        {postponeReasonLabels[lead.postponeReason] || lead.postponeReason}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {event ? (
                            <div className="flex flex-col">
                              <span>{event.name}</span>
                              {event.startDate && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(event.startDate), "dd.MM.yy", { locale: ru })}
                                  {event.endDate && ` - ${format(new Date(event.endDate), "dd.MM.yy", { locale: ru })}`}
                                </span>
                              )}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{lead.phone || "—"}</TableCell>
                        <TableCell>{dynamicLeadSourceMap[lead.source] || lead.source}</TableCell>
                        <TableCell>
                          {lead.clientCategory ? (
                            <Badge variant="outline" data-testid={`category-${lead.id}`}>
                              {dynamicClientCategoryMap[lead.clientCategory] || lead.clientCategory}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
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
                            {isAdmin && (
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
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuLabel className="text-xs text-muted-foreground">
                        Изменить статус
                      </ContextMenuLabel>
                      <ContextMenuSeparator />
                      {Object.entries(leadStatusMap).map(([status, config]) => (
                        <ContextMenuItem
                          key={status}
                          disabled={lead.status === status}
                          onClick={() => {
                            if (lead.status !== status) {
                              handleStatusChange(status);
                            }
                          }}
                          className={lead.status === status ? "bg-accent font-medium" : ""}
                          data-testid={`table-context-status-${status}-${lead.id}`}
                        >
                          <Badge 
                            variant={config.variant} 
                            className={`mr-2 text-[10px] ${config.customClass || ""}`}
                          >
                            {config.label}
                          </Badge>
                          {lead.status === status && <span className="ml-auto text-xs">✓</span>}
                        </ContextMenuItem>
                      ))}
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => setEditingLead(lead)}
                        data-testid={`table-context-edit-${lead.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Редактировать
                      </ContextMenuItem>
                      {lead.isArchived ? (
                        <ContextMenuItem
                          onClick={() => unarchiveMutation.mutate(lead.id)}
                          data-testid={`table-context-unarchive-${lead.id}`}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Восстановить из архива
                        </ContextMenuItem>
                      ) : (
                        <ContextMenuItem
                          onClick={() => archiveMutation.mutate(lead.id)}
                          data-testid={`table-context-archive-${lead.id}`}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          В архив
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                  );
                })}
              </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {editingLead && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="mb-4 w-full flex flex-wrap h-auto gap-1">
                <TabsTrigger value="details" data-testid="tab-lead-details">
                  <Edit className="h-4 w-4 mr-2" />
                  Редактирование
                </TabsTrigger>
                <TabsTrigger value="chat" data-testid="tab-lead-chat">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Чат
                </TabsTrigger>
                <TabsTrigger value="documents" data-testid="tab-lead-documents">
                  <FileText className="h-4 w-4 mr-2" />
                  Документы
                </TabsTrigger>
              </TabsList>
              <TabsContent value="details" forceMount className="data-[state=inactive]:hidden">
                <LeadForm
                  lead={editingLead}
                  onSubmit={(data) => {
                    if (data.status === 'lost' && editingLead.status !== 'lost') {
                      setPendingFormData(data);
                      setLeadToDefer({ id: editingLead.id, name: getLeadName(editingLead) });
                      setIsDeferDialogOpen(true);
                      setEditingLead(null);
                    } else {
                      updateMutation.mutate({ id: editingLead.id, data });
                    }
                  }}
                  isPending={updateMutation.isPending}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isAdmin={isAdmin}
                />
              </TabsContent>
              <TabsContent value="chat" forceMount className="data-[state=inactive]:hidden">
                <Wazzup24Chat lead={editingLead} />
              </TabsContent>
              <TabsContent value="documents" forceMount className="data-[state=inactive]:hidden">
                <div className="space-y-6">
                  <div className="text-sm text-muted-foreground">
                    Генерация документов для лида. Скачайте договор и лист бронирования в формате DOCX.
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Договор</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Договор бронирования услуги по организации отдыха с полным текстом условий.
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          window.open(`/api/leads/${editingLead.id}/documents/contract`, '_blank');
                        }}
                        data-testid="button-download-contract"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Скачать DOCX
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Лист бронирования</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Заявка на бронирование услуг с данными туристов, маршрутом и стоимостью.
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          const missingFields: string[] = [];
                          
                          // Validate lead data
                          if (!editingLead.eventId) {
                            missingFields.push("Лид: не выбран тур (для дат поездки)");
                          }
                          if (!editingLead.roomType) {
                            missingFields.push("Лид: тип номера");
                          }
                          if (!editingLead.meals) {
                            missingFields.push("Лид: питание");
                          }
                          if (!editingLead.tourCost) {
                            missingFields.push("Лид: общая стоимость");
                          }
                          if (!editingLead.advancePayment) {
                            missingFields.push("Лид: предоплата");
                          }
                          if (!editingLead.remainingPayment) {
                            missingFields.push("Лид: остаток оплаты");
                          }
                          
                          // Find primary tourist
                          const primaryTourist = editingLeadTourists.find(t => t.isPrimary) || editingLeadTourists[0];
                          
                          // Validate primary tourist (Заказчик) - Russian passport data
                          if (primaryTourist) {
                            const primaryName = `${primaryTourist.lastName || ''} ${primaryTourist.firstName || ''}`.trim() || 'Заказчик';
                            if (!primaryTourist.passportSeries) {
                              missingFields.push(`${primaryName}: серия и номер паспорта РФ`);
                            }
                            if (!primaryTourist.passportIssuedBy) {
                              missingFields.push(`${primaryName}: кем выдан паспорт РФ`);
                            }
                            if (!primaryTourist.dateOfBirth) {
                              missingFields.push(`${primaryName}: дата рождения`);
                            }
                          }
                          
                          // Validate all tourists - foreign passport data
                          editingLeadTourists.forEach(tourist => {
                            const touristName = `${tourist.lastName || ''} ${tourist.firstName || ''}`.trim() || 'Турист';
                            if (!tourist.foreignPassportName) {
                              missingFields.push(`${touristName}: имя в загранпаспорте`);
                            }
                            if (!tourist.foreignPassportNumber) {
                              missingFields.push(`${touristName}: номер загранпаспорта`);
                            }
                            if (!tourist.dateOfBirth) {
                              if (!missingFields.some(f => f.includes(touristName) && f.includes('дата рождения'))) {
                                missingFields.push(`${touristName}: дата рождения`);
                              }
                            }
                          });
                          
                          if (missingFields.length > 0) {
                            toast({
                              title: "Невозможно скачать лист бронирования",
                              description: `Не заполнены обязательные поля:\n${missingFields.slice(0, 5).join('\n')}${missingFields.length > 5 ? `\n...и ещё ${missingFields.length - 5}` : ''}`,
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          window.open(`/api/leads/${editingLead.id}/documents/booking-sheet`, '_blank');
                        }}
                        data-testid="button-download-booking-sheet"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Скачать DOCX
                      </Button>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertDescription>
                      Документы генерируются автоматически на основе данных лида и туристов. 
                      Убедитесь, что данные заполнены корректно перед скачиванием.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <DeferLeadDialog
        open={isDeferDialogOpen}
        onOpenChange={(open) => {
          setIsDeferDialogOpen(open);
          if (!open) {
            // Clear pending data if dialog is cancelled
            setPendingFormData(null);
            setLeadToDefer(null);
          }
        }}
        leadName={leadToDefer?.name}
        onConfirm={(data: DeferLeadDialogResult) => {
          if (leadToDefer) {
            const updateData: Partial<InsertLead> = {
              ...(pendingFormData || {}),
              status: 'lost',
              outcomeType: data.outcomeType,
              postponedUntil: data.outcomeType === 'postponed' ? data.postponedUntil : null,
              postponeReason: data.outcomeType === 'postponed' ? data.postponeReason : null,
              failureReason: data.outcomeType === 'failed' ? data.failureReason : null,
            };
            
            updateMutation.mutate({
              id: leadToDefer.id,
              data: updateData,
            });
            setIsDeferDialogOpen(false);
            setLeadToDefer(null);
            setPendingFormData(null);
          }
        }}
      />
    </div>
  );
}

// Kanban Board Component
interface KanbanBoardProps {
  leads: LeadWithTouristCount[];
  events: Event[];
  isLoading: boolean;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEdit: (lead: LeadWithTouristCount) => void;
  onDelete: (leadId: string) => void;
  onArchive: (leadId: string) => void;
  onUnarchive: (leadId: string) => void;
  getLeadName: (lead: Lead) => string;
}

function KanbanBoard({ leads, events, isLoading, onStatusChange, onEdit, onDelete, onArchive, onUnarchive, getLeadName }: KanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<LeadWithTouristCount | null>(null);
  const [colorDisplayMode, setColorDisplayMode] = useState<ColorDisplayMode>(() => getColorDisplayMode());

  // Dictionary queries for dynamic display
  const { data: clientCategoryItems = [] } = useSystemDictionary("client_category");
  const { data: leadSourceItems = [] } = useSystemDictionary("lead_source");

  const dynamicClientCategoryMap = useMemo(() => {
    if (clientCategoryItems.length > 0) {
      return clientCategoryItems.reduce((acc, item) => {
        acc[item.value] = item.label;
        return acc;
      }, {} as Record<string, string>);
    }
    return clientCategoryMap;
  }, [clientCategoryItems]);

  const dynamicLeadSourceMap = useMemo(() => {
    if (leadSourceItems.length > 0) {
      return leadSourceItems.reduce((acc, item) => {
        acc[item.value] = item.label;
        return acc;
      }, {} as Record<string, string>);
    }
    return leadSourceMap;
  }, [leadSourceItems]);
  
  // Listen for color display mode changes from Settings
  useEffect(() => {
    const handleColorModeChange = () => {
      setColorDisplayMode(getColorDisplayMode());
    };
    window.addEventListener("colorDisplayModeChanged", handleColorModeChange);
    return () => {
      window.removeEventListener("colorDisplayModeChanged", handleColorModeChange);
    };
  }, []);

  const columns: { 
    status: string; 
    label: string;
    shortLabel: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    customClass?: string;
  }[] = [
    { status: "new", label: "Новый", shortLabel: "Нов.", variant: "secondary" },
    { status: "contacted", label: "Квалифицирован", shortLabel: "Квал.", variant: "secondary" },
    { status: "qualified", label: "Забронирован", shortLabel: "Забр.", variant: "outline", customClass: "bg-[#f4a825] dark:bg-[#f4a825] text-white dark:text-white !border-[#d89420]" },
    { status: "converted", label: "Подтвержден", shortLabel: "Подтв.", variant: "default", customClass: "bg-green-700 dark:bg-green-800 text-white border-green-800 dark:border-green-900" },
    { status: "lost", label: "Отложен/Провал", shortLabel: "Отл./Пров.", variant: "destructive" },
  ];

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: string) => {
    if (draggedLead && draggedLead.status !== status) {
      onStatusChange(draggedLead.id, status);
    }
    setDraggedLead(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Нет лидов. Создайте первый лид.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4" data-testid="kanban-board">
      {columns.map((column) => {
        const columnLeads = leads
          .filter((lead) => lead.status === column.status)
          .sort((a, b) => {
            // For "new" status: sort by createdAt DESC (newest first)
            // For other statuses: sort by updatedAt DESC (recently moved first)
            if (column.status === 'new') {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else {
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
          });
        
        return (
          <div
            key={column.status}
            className="flex flex-col gap-2"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.status)}
            data-testid={`kanban-column-${column.status}`}
          >
            <Card className="bg-muted/50">
              <CardHeader className="p-2 sm:p-4">
                <div className="flex items-center justify-between gap-1">
                  <CardTitle 
                    className="text-xs sm:text-sm font-medium cursor-default" 
                    title={column.label}
                  >
                    <span className="md:hidden">{column.shortLabel}</span>
                    <span className="hidden md:inline">{column.label}</span>
                  </CardTitle>
                  <Badge 
                    variant={column.variant} 
                    className={column.customClass ? `text-[10px] sm:text-xs ${column.customClass}` : "text-[10px] sm:text-xs"}
                  >
                    {columnLeads.length}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
            
            <div className="space-y-2 min-h-[200px]">
              {columnLeads.map((lead) => {
                const event = events.find(e => e.id === lead.eventId);
                const displayColor = getLeadDisplayColor(lead);
                const pastelClasses = displayColor ? getPastelClasses(displayColor) : { bg: "", border: "" };
                const showFill = (colorDisplayMode === "fill" || colorDisplayMode === "both") && displayColor;
                const showDot = (colorDisplayMode === "dot" || colorDisplayMode === "both");
                const isFailedLead = lead.status === 'lost' && lead.outcomeType === 'failed';
                const isPostponedLead = lead.status === 'lost' && lead.outcomeType !== 'failed';
                return (
                <ContextMenu key={lead.id}>
                  <ContextMenuTrigger asChild>
                    <Card
                      className={`cursor-move hover-elevate active-elevate-2 transition-shadow ${isFailedLead ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 border" : ""} ${showFill && !isFailedLead ? `${pastelClasses.bg} ${pastelClasses.border} border` : ""}`}
                      draggable
                      onDragStart={() => handleDragStart(lead)}
                      data-testid={`kanban-card-${lead.id}`}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="space-y-2">
                          {/* ФИО и кнопки Edit/Convert на одной линии */}
                          <div className="flex items-start justify-between gap-1 sm:gap-2">
                            <div className="font-medium flex-1 min-w-0 flex items-center gap-1 sm:gap-2">
                              {showDot && <ColorIndicator color={displayColor} />}
                              <span className="truncate">{getLeadName(lead)}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-9 sm:w-9"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(lead);
                                }}
                                data-testid={`kanban-edit-${lead.id}`}
                              >
                                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5 sm:space-y-1">
                            {lead.phone && <div className="truncate">{lead.phone}</div>}
                            {lead.email && <div className="truncate">{lead.email}</div>}
                            {event && (
                              <div className="space-y-0.5">
                                <div className="font-medium text-primary truncate">{event.name}</div>
                                <div className="text-muted-foreground">
                                  {format(new Date(event.startDate), "dd.MM", { locale: ru })} - {format(new Date(event.endDate), "dd.MM.yy", { locale: ru })}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            {lead.clientCategory && (
                              <Badge variant="outline" className="text-[9px] sm:text-[10px] truncate max-w-[100px] sm:max-w-none">
                                {dynamicClientCategoryMap[lead.clientCategory] || lead.clientCategory}
                              </Badge>
                            )}
                            {lead.touristCount !== undefined && lead.touristCount > 0 && (
                              <Badge variant="secondary" className="text-[9px] sm:text-[10px]">
                                <Users className="h-3 w-3 mr-0.5 sm:mr-1" />
                                {lead.touristCount}
                              </Badge>
                            )}
                            {lead.hasBeenContacted && (
                              <Badge variant="secondary" className="text-[9px] sm:text-[10px] truncate max-w-[80px] sm:max-w-none" data-testid={`badge-reactivated-${lead.id}`}>
                                Из Отлож.
                              </Badge>
                            )}
                            {lead.isArchived && (
                              <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-muted" data-testid={`badge-archived-${lead.id}`}>
                                <Archive className="h-3 w-3 mr-0.5" />
                                Архив
                              </Badge>
                            )}
                          </div>
                          {/* Outcome indicator for lost status */}
                          {lead.status === 'lost' && (
                            <div className={`flex flex-col gap-0.5 text-xs ${isFailedLead ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                              <div className="flex items-center gap-1">
                                {isFailedLead ? (
                                  <>
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span>Провал</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>
                                      {lead.postponedUntil 
                                        ? `До ${format(new Date(lead.postponedUntil), "dd.MM.yy", { locale: ru })}`
                                        : "Отложен"
                                      }
                                    </span>
                                  </>
                                )}
                              </div>
                              {/* Show reason */}
                              {isFailedLead && lead.failureReason && (
                                <div className="text-[10px] italic truncate">
                                  {failureReasonLabels[lead.failureReason] || lead.failureReason}
                                </div>
                              )}
                              {!isFailedLead && lead.postponeReason && (
                                <div className="text-[10px] italic truncate">
                                  {postponeReasonLabels[lead.postponeReason] || lead.postponeReason}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    <ContextMenuLabel className="text-xs text-muted-foreground">
                      Изменить статус
                    </ContextMenuLabel>
                    <ContextMenuSeparator />
                    {columns.map((col) => (
                      <ContextMenuItem
                        key={col.status}
                        disabled={lead.status === col.status}
                        onClick={() => {
                          if (lead.status !== col.status) {
                            onStatusChange(lead.id, col.status);
                          }
                        }}
                        className={lead.status === col.status ? "bg-accent font-medium" : ""}
                        data-testid={`context-status-${col.status}-${lead.id}`}
                      >
                        <Badge 
                          variant={col.variant} 
                          className={`mr-2 text-[10px] ${col.customClass || ""}`}
                        >
                          {col.label}
                        </Badge>
                        {lead.status === col.status && <span className="ml-auto text-xs">✓</span>}
                      </ContextMenuItem>
                    ))}
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => onEdit(lead)}
                      data-testid={`context-edit-${lead.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </ContextMenuItem>
                    {lead.isArchived ? (
                      <ContextMenuItem
                        onClick={() => onUnarchive(lead.id)}
                        data-testid={`context-unarchive-${lead.id}`}
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Восстановить из архива
                      </ContextMenuItem>
                    ) : (
                      <ContextMenuItem
                        onClick={() => onArchive(lead.id)}
                        data-testid={`context-archive-${lead.id}`}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        В архив
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
                )
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface LeadFormProps {
  lead?: Lead;
  onSubmit: (data: InsertLead) => void;
  isPending: boolean;
  onDelete?: (id: string) => void;
  isAdmin?: boolean; // Only admins can delete leads
}

function LeadForm({ lead, onSubmit, isPending, onDelete, isAdmin = false }: LeadFormProps) {
  const { toast } = useToast();
  const [isTouristDialogOpen, setIsTouristDialogOpen] = useState(false);
  const [editingTourist, setEditingTourist] = useState<LeadTourist | null>(null);
  const [prefillData, setPrefillData] = useState<Partial<InsertLeadTourist> | null>(null);
  // Track focus state for number fields to control formatting
  const [isTourCostFocused, setIsTourCostFocused] = useState(false);
  // Tour search combobox state
  const [tourSearchOpen, setTourSearchOpen] = useState(false);
  const [isAdvanceFocused, setIsAdvanceFocused] = useState(false);
  const [isRemainingFocused, setIsRemainingFocused] = useState(false);
  
  // Track if initial load is complete to avoid overwriting DB values
  const isInitializedRef = useRef(false);

  // Dictionary queries for dynamic form options
  const { data: clientCategoryItems = [] } = useSystemDictionary("client_category");
  const { data: leadSourceItems = [] } = useSystemDictionary("lead_source");
  const { data: hotelCategoryItems = [] } = useSystemDictionary("hotel_category");
  const { data: roomTypeItems = [] } = useSystemDictionary("room_type");

  // Helper function to get lead display name
  const getLeadName = (lead: Lead) => {
    return `${lead.lastName || ''} ${lead.firstName || ''}`.trim() || 'Без имени';
  };

  const form = useForm<z.infer<typeof createLeadFormSchema>>({
    resolver: zodResolver(createLeadFormSchema),
    defaultValues: {
      lastName: lead?.lastName || "",
      firstName: lead?.firstName || "",
      middleName: lead?.middleName || null,
      phone: lead?.phone || null,
      email: lead?.email || null,
      eventId: lead?.eventId || null,
      selectedCities: lead?.selectedCities || null,
      tourCost: lead?.tourCost || null,
      tourCostCurrency: lead?.tourCostCurrency || "RUB",
      advancePayment: lead?.advancePayment || null,
      advancePaymentCurrency: lead?.advancePaymentCurrency || "RUB",
      remainingPayment: lead?.remainingPayment || null,
      remainingPaymentCurrency: lead?.remainingPaymentCurrency || "RUB",
      roomType: lead?.roomType || null,
      transfers: lead?.transfers || null,
      meals: lead?.meals || null,
      hotelCategory: lead?.hotelCategory || null,
      clientCategory: lead?.clientCategory || null,
      color: lead?.color ?? null,
      status: lead?.status || "new",
      source: lead?.source || "direct",
      notes: lead?.notes || null,
      formId: lead?.formId || null,
      assignedUserId: lead?.assignedUserId || null,
      createdByUserId: lead?.createdByUserId || null,
      // Primary tourist data
      dateOfBirth: null,
      passportSeries: null,
      passportIssuedBy: null,
      registrationAddress: null,
      foreignPassportName: null,
      foreignPassportNumber: null,
      foreignPassportValidUntil: null,
    },
  });

  // Fetch events for tour selection
  const { data: events = [] } = useQuery<EventWithStats[]>({
    queryKey: ["/api/events"],
  });

  // Fetch managers and admins for assignee selection
  const { data: managersAndAdmins = [] } = useQuery<User[]>({
    queryKey: ["/api/users/managers-and-admins"],
  });

  // Fetch tourists only if editing an existing lead
  const { data: tourists = [], isLoading: isLoadingTourists } = useQuery<LeadTourist[]>({
    queryKey: ["/api/leads", lead?.id, "tourists"],
    enabled: !!lead?.id,
  });

  // Reset form when lead changes (for edit mode)
  useEffect(() => {
    if (lead) {
      // If lead has eventId but no selectedCities, initialize with all event cities
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
        roomType: lead.roomType || null,
        transfers: lead.transfers || null,
        meals: lead.meals || null,
        hotelCategory: lead.hotelCategory || null,
        clientCategory: lead.clientCategory || null,
        color: lead.color ?? null,
        status: lead.status || "new",
        source: lead.source || "direct",
        notes: lead.notes || null,
        formId: lead.formId || null,
        assignedUserId: lead.assignedUserId || null,
        createdByUserId: lead.createdByUserId || null,
      });
      // Reset flags when editing a different lead
      isInitializedRef.current = false;
    } else {
      // For new leads, mark as initialized immediately since there's no DB value to preserve
      isInitializedRef.current = true;
    }
  }, [lead, form, events]);
  
  // Additional effect to update selectedCities when events load after lead
  useEffect(() => {
    if (lead && lead.eventId && !form.getValues("selectedCities") && events.length > 0) {
      const event = events.find(e => e.id === lead.eventId);
      if (event?.cities) {
        form.setValue("selectedCities", [...event.cities]);
      }
    }
  }, [events, lead, form]);

  // Create tourist mutation
  const createTouristMutation = useMutation({
    mutationFn: async (data: InsertLeadTourist) => {
      console.log("[TOURIST] Creating tourist for lead:", lead?.id, "data:", data);
      if (!lead?.id) throw new Error("Lead ID is required");
      const result = await apiRequest("POST", `/api/leads/${lead.id}/tourists`, data);
      console.log("[TOURIST] Tourist created:", result);
      return result;
    },
    onSuccess: async () => {
      console.log("[TOURIST] onSuccess - invalidating queries");
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tourists"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      // Invalidate event participants cache if lead has an event assigned
      if (lead?.eventId) {
        console.log("[TOURIST] Invalidating event participants for event:", lead.eventId);
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${lead.eventId}/participants`] });
      }
      
      setIsTouristDialogOpen(false);
      setEditingTourist(null);
      toast({
        title: "Успешно",
        description: "Турист добавлен",
      });
    },
    onError: (error: Error) => {
      console.error("[TOURIST] Error creating tourist:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update tourist mutation
  const updateTouristMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLeadTourist> }) => {
      return await apiRequest("PATCH", `/api/tourists/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tourists"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      // Invalidate event participants cache if lead has an event assigned
      if (lead?.eventId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/events/${lead.eventId}/participants`] });
      }
      
      setIsTouristDialogOpen(false);
      setEditingTourist(null);
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

  // Toggle primary mutation (doesn't close dialog)
  const togglePrimaryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLeadTourist> }) => {
      return await apiRequest("PATCH", `/api/tourists/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tourists"] });
      // Note: deliberately not invalidating "/api/leads" to avoid closing parent dialog
      
      // Invalidate event participants cache if lead has an event assigned
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

  // Delete tourist mutation
  const deleteTouristMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tourists/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tourists"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      // Invalidate event participants cache if lead has an event assigned
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

  const handleDeleteTourist = (tourist: LeadTourist) => {
    // Prevent deletion of last tourist
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

  const handleTogglePrimary = (tourist: LeadTourist) => {
    // If already primary, do nothing
    if (tourist.isPrimary) return;

    // Backend's togglePrimaryTourist will atomically demote the old primary
    // and promote this tourist, so we only need to send isPrimary=true for this one
    togglePrimaryMutation.mutate({
      id: tourist.id,
      data: { isPrimary: true },
    });
  };

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0} disableHoverableContent>
      <DialogHeader>
        <DialogTitle>{lead ? "Редактировать лид" : "Создать новый лид"}</DialogTitle>
        <DialogDescription>
          {lead ? "Обновите информацию о лиде" : "Введите данные для создания нового лида"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <Input placeholder="Иванов" {...field} data-testid="input-lastName" />
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
                      <Input placeholder="Иван" {...field} data-testid="input-firstName" />
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
                        data-testid="input-middleName" 
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
                name="email"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="example@mail.com"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Паспортные данные основного туриста - только при создании нового лида */}
          {!lead && (
            <>
              {/* Дата рождения */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-semibold text-foreground">Дата рождения</h4>
                <div className="grid grid-cols-2 gap-4">
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
                            data-testid="input-dateOfBirth"
                          />
                        </FormControl>
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
                        <FormLabel>Серия и номер паспорта</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="45 12 123456"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-passportSeries"
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
                        <FormLabel>Кем выдан</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Отделом УФМС..."
                            {...field}
                            value={field.value || ""}
                            data-testid="input-passportIssuedBy"
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
                            data-testid="input-registrationAddress"
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
                            data-testid="input-foreignPassportName"
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
                            data-testid="input-foreignPassportNumber"
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
                            data-testid="input-foreignPassportValidUntil"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </>
          )}

          {/* Тур и оплата */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground">Тур и оплата</h4>
            <div className="grid grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="eventId"
                render={({ field }) => {
                  const selectedEvent = events.find(e => e.id === field.value);
                  const eventCities = selectedEvent?.cities || [];
                  const currentSelectedCities = form.watch("selectedCities") || [];
                  
                  return (
                    <FormItem className="col-span-2">
                      <FormLabel>Тур</FormLabel>
                      <div className="flex gap-2">
                        <Popover open={tourSearchOpen} onOpenChange={setTourSearchOpen} modal={false}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button 
                                variant="outline" 
                                role="combobox" 
                                aria-expanded={tourSearchOpen}
                                className="w-full justify-between font-normal"
                                data-testid="select-eventId"
                              >
                                {field.value 
                                  ? events.find(e => e.id === field.value)?.name 
                                    ? `${events.find(e => e.id === field.value)?.name} (${format(new Date(events.find(e => e.id === field.value)!.startDate), "dd.MM.yyyy", { locale: ru })})`
                                    : "Выберите тур"
                                  : "Выберите тур"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent 
                              className="w-[400px] p-0 pointer-events-auto" 
                              align="start"
                              onWheel={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                            >
                            <Command className="flex flex-col">
                              <CommandInput placeholder="Поиск тура..." />
                              <CommandList className="max-h-[280px]">
                                <CommandEmpty>Тур не найден</CommandEmpty>
                                <CommandGroup>
                                  {events.filter(event => !event.isArchived).map((event) => (
                                    <CommandItem
                                      key={event.id}
                                      value={`${event.name} ${format(new Date(event.startDate), "dd.MM.yyyy")}`}
                                      onSelect={() => {
                                        field.onChange(event.id);
                                        const newEvent = events.find(e => e.id === event.id);
                                        if (newEvent?.cities) {
                                          form.setValue("selectedCities", [...newEvent.cities]);
                                        } else {
                                          form.setValue("selectedCities", null);
                                        }
                                        setTourSearchOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", field.value === event.id ? "opacity-100" : "opacity-0")} />
                                      {event.name} ({format(new Date(event.startDate), "dd.MM.yyyy", { locale: ru })} - {format(new Date(event.endDate), "dd.MM.yyyy", { locale: ru })})
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        
                        {field.value && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => window.open(`/events/${field.value}/summary`, '_blank')}
                            title="Открыть тур"
                            data-testid="link-to-tour"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                      
                      {/* City checkboxes - shown when tour is selected */}
                      {eventCities.length > 0 && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-md">
                          <div className="text-sm font-medium mb-2">Города маршрута:</div>
                          <div className="flex flex-wrap gap-3">
                            {eventCities.map((city) => {
                              const isChecked = currentSelectedCities.includes(city);
                              return (
                                <label key={city} className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const current = currentSelectedCities || [];
                                      if (checked) {
                                        form.setValue("selectedCities", [...current, city]);
                                      } else {
                                        form.setValue("selectedCities", current.filter(c => c !== city));
                                      }
                                    }}
                                    data-testid={`checkbox-city-${city}`}
                                  />
                                  <span className="text-sm">{city}</span>
                                </label>
                              );
                            })}
                          </div>
                          {currentSelectedCities.length < eventCities.length && (
                            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Ограниченный маршрут ({currentSelectedCities.length} из {eventCities.length} городов)
                            </div>
                          )}
                        </div>
                      )}
                    </FormItem>
                  );
                }}
              />

              <FormItem>
                <FormLabel>Стоимость тура</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="tourCost"
                    render={({ field }) => {
                      const formatNumberInput = (value: string) => {
                        if (!value) return "";
                        const cleanValue = value.replace(/\s/g, '').replace(/,/g, '.');
                        const num = parseFloat(cleanValue);
                        if (isNaN(num)) return "";
                        return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      };
                      
                      const parseNumberInput = (value: string) => {
                        if (!value || value.trim() === "") return null;
                        let cleanValue = value.replace(/\s/g, '');
                        const lastCommaIndex = cleanValue.lastIndexOf(',');
                        const lastDotIndex = cleanValue.lastIndexOf('.');
                        if (lastCommaIndex > lastDotIndex) {
                          cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                        } else if (lastDotIndex > lastCommaIndex) {
                          cleanValue = cleanValue.replace(/,/g, '');
                        } else if (lastCommaIndex !== -1 && lastDotIndex === -1) {
                          cleanValue = cleanValue.replace(',', '.');
                        }
                        const sanitized = cleanValue.replace(/[^\d.-]/g, '');
                        if (!/^-?\d*\.?\d*$/.test(sanitized) || sanitized === "-") {
                          return field.value;
                        }
                        return sanitized;
                      };
                      
                      const displayValue = isTourCostFocused 
                        ? (field.value || "") 
                        : formatNumberInput(field.value || "");
                      
                      return (
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0,00"
                            value={displayValue}
                            onFocus={() => setIsTourCostFocused(true)}
                            onBlur={() => setIsTourCostFocused(false)}
                            onChange={(e) => {
                              const rawValue = parseNumberInput(e.target.value);
                              field.onChange(rawValue);
                            }}
                            className="flex-1"
                            data-testid="input-tourCost"
                          />
                        </FormControl>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="tourCostCurrency"
                    render={({ field }) => (
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || "RUB"}>
                          <SelectTrigger className="w-20" data-testid="select-tourCostCurrency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RUB">₽</SelectItem>
                            <SelectItem value="USD">$</SelectItem>
                            <SelectItem value="CNY">¥</SelectItem>
                            <SelectItem value="EUR">€</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    )}
                  />
                </div>
                <FormMessage />
              </FormItem>

              <FormItem>
                <FormLabel>Аванс</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="advancePayment"
                    render={({ field }) => {
                      const formatNumberInput = (value: string) => {
                        if (!value) return "";
                        const cleanValue = value.replace(/\s/g, '').replace(/,/g, '.');
                        const num = parseFloat(cleanValue);
                        if (isNaN(num)) return "";
                        return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      };
                      
                      const parseNumberInput = (value: string) => {
                        if (!value || value.trim() === "") return null;
                        let cleanValue = value.replace(/\s/g, '');
                        const lastCommaIndex = cleanValue.lastIndexOf(',');
                        const lastDotIndex = cleanValue.lastIndexOf('.');
                        if (lastCommaIndex > lastDotIndex) {
                          cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                        } else if (lastDotIndex > lastCommaIndex) {
                          cleanValue = cleanValue.replace(/,/g, '');
                        } else if (lastCommaIndex !== -1 && lastDotIndex === -1) {
                          cleanValue = cleanValue.replace(',', '.');
                        }
                        const sanitized = cleanValue.replace(/[^\d.-]/g, '');
                        if (!/^-?\d*\.?\d*$/.test(sanitized) || sanitized === "-") {
                          return field.value;
                        }
                        return sanitized;
                      };
                      
                      const displayValue = isAdvanceFocused 
                        ? (field.value || "") 
                        : formatNumberInput(field.value || "");
                      
                      return (
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0,00"
                            value={displayValue}
                            onFocus={() => setIsAdvanceFocused(true)}
                            onBlur={() => setIsAdvanceFocused(false)}
                            onChange={(e) => {
                              const rawValue = parseNumberInput(e.target.value);
                              field.onChange(rawValue);
                            }}
                            className="flex-1"
                            data-testid="input-advancePayment"
                          />
                        </FormControl>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="advancePaymentCurrency"
                    render={({ field }) => (
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || "RUB"}>
                          <SelectTrigger className="w-20" data-testid="select-advancePaymentCurrency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RUB">₽</SelectItem>
                            <SelectItem value="USD">$</SelectItem>
                            <SelectItem value="CNY">¥</SelectItem>
                            <SelectItem value="EUR">€</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    )}
                  />
                </div>
                <FormMessage />
              </FormItem>

              <FormItem className="col-span-2">
                <FormLabel>Остаток</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="remainingPayment"
                    render={({ field }) => {
                      const formatNumberInput = (value: string) => {
                        if (!value) return "";
                        const cleanValue = value.replace(/\s/g, '').replace(/,/g, '.');
                        const num = parseFloat(cleanValue);
                        if (isNaN(num)) return "";
                        return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      };
                      
                      const parseNumberInput = (value: string) => {
                        if (!value || value.trim() === "") return null;
                        let cleanValue = value.replace(/\s/g, '');
                        const lastCommaIndex = cleanValue.lastIndexOf(',');
                        const lastDotIndex = cleanValue.lastIndexOf('.');
                        if (lastCommaIndex > lastDotIndex) {
                          cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                        } else if (lastDotIndex > lastCommaIndex) {
                          cleanValue = cleanValue.replace(/,/g, '');
                        } else if (lastCommaIndex !== -1 && lastDotIndex === -1) {
                          cleanValue = cleanValue.replace(',', '.');
                        }
                        const sanitized = cleanValue.replace(/[^\d.-]/g, '');
                        if (!/^-?\d*\.?\d*$/.test(sanitized) || sanitized === "-") {
                          return field.value;
                        }
                        return sanitized;
                      };
                      
                      const displayValue = isRemainingFocused 
                        ? (field.value || "") 
                        : formatNumberInput(field.value || "");
                      
                      return (
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0,00"
                            value={displayValue}
                            onFocus={() => setIsRemainingFocused(true)}
                            onBlur={() => setIsRemainingFocused(false)}
                            onChange={(e) => {
                              const rawValue = parseNumberInput(e.target.value);
                              field.onChange(rawValue);
                            }}
                            className="flex-1"
                            data-testid="input-remainingPayment"
                          />
                        </FormControl>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="remainingPaymentCurrency"
                    render={({ field }) => (
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || "RUB"}>
                          <SelectTrigger className="w-20" data-testid="select-remainingPaymentCurrency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RUB">₽</SelectItem>
                            <SelectItem value="USD">$</SelectItem>
                            <SelectItem value="CNY">¥</SelectItem>
                            <SelectItem value="EUR">€</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    )}
                  />
                </div>
                <FormMessage />
              </FormItem>

              <FormField
                control={form.control}
                name="roomType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип номера</FormLabel>
                    <FormControl>
                      <MultiSelectField
                        dictionaryType="room_type"
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Выберите тип"
                        fallbackOptions={[
                          { value: "Single", label: "Single" },
                          { value: "Twin", label: "Twin" },
                          { value: "Double", label: "Double" },
                        ]}
                        data-testid="select-roomType"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hotelCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория отелей</FormLabel>
                    <FormControl>
                      <MultiSelectField
                        dictionaryType="hotel_category"
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Выберите категорию"
                        fallbackOptions={[
                          { value: "3*", label: "3*" },
                          { value: "4*", label: "4*" },
                          { value: "5*", label: "5*" },
                        ]}
                        data-testid="select-hotelCategory"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transfers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Трансферы</FormLabel>
                    <FormControl>
                      <MultiSelectField
                        dictionaryType="transfers"
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Выберите тип"
                        fallbackOptions={[
                          { value: "group", label: "Групповой" },
                          { value: "individual", label: "Индивидуальный" },
                          { value: "self", label: "Самостоятельно" },
                          { value: "none", label: "Без трансфера" },
                        ]}
                        data-testid="select-transfers"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Питание</FormLabel>
                    <FormControl>
                      <MultiSelectField
                        dictionaryType="meals"
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Выберите тип"
                        fallbackOptions={[
                          { value: "RO", label: "RO (Без питания)" },
                          { value: "BB", label: "BB (Завтрак)" },
                          { value: "HB", label: "HB (Завтрак + Ужин)" },
                          { value: "FB", label: "FB (Полный пансион)" },
                          { value: "AI", label: "AI (Всё включено)" },
                        ]}
                        data-testid="select-meals"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Информация о лиде */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground">Информация о лиде</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория клиента</FormLabel>
                    <FormControl>
                      <MultiSelectField
                        dictionaryType="client_category"
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Выберите категорию"
                        fallbackOptions={[
                          { value: "category_ab", label: "Категория А и В (Даты и бюджет)" },
                          { value: "category_c", label: "Категория C (Неопределились)" },
                          { value: "category_d", label: "Категория D (Нет бюджета)" },
                          { value: "vip", label: "VIP" },
                          { value: "not_segmented", label: "Не сегментированный" },
                          { value: "travel_agent", label: "Турагент" },
                          { value: "tariff_standard", label: "Тариф стандарт" },
                          { value: "tariff_economy", label: "Тариф эконом" },
                          { value: "tariff_vip", label: "Тариф VIP" },
                        ]}
                        data-testid="select-clientCategory"
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
                    <FormControl>
                      <MultiSelectField
                        dictionaryType="lead_source"
                        value={field.value}
                        onChange={(value) => field.onChange(value || "direct")}
                        placeholder="Выберите источник"
                        fallbackOptions={[
                          { value: "form", label: "Веб-форма" },
                          { value: "referral", label: "Рекомендация" },
                          { value: "direct", label: "Прямое обращение" },
                          { value: "advertisement", label: "Реклама" },
                          { value: "other", label: "Другое" },
                        ]}
                        data-testid="select-source"
                      />
                    </FormControl>
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
                      onValueChange={field.onChange} 
                      value={field.value ?? ''} 
                      data-testid="select-assignedUserId"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите ответственного" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                  <FormItem className="col-span-2">
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
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Tourists Section - Only show when editing an existing lead */}
          {lead?.id && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Туристы</h3>
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
                                <>
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
                                  <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                                    Договор
                                  </Badge>
                                </>
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
          )}

          <DialogFooter className="flex justify-between items-center">
            {lead && onDelete && isAdmin && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (confirm(`Вы уверены, что хотите удалить лид "${getLeadName(lead)}"?`)) {
                    onDelete(lead.id);
                  }
                }}
                data-testid="button-delete-lead"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </Button>
            )}
            <Button type="submit" disabled={isPending} data-testid="button-submit-lead">
              {isPending ? "Сохранение..." : lead ? "Обновить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      {/* Tourist Dialog */}
      {lead?.id && (
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
      )}
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
      passportScans: tourist?.passportScans || null,
      touristType: tourist?.touristType || "adult",
      isPrimary: tourist?.isPrimary || false,
      notes: tourist?.notes || null,
      order: tourist?.order || tourists.length,
    },
  });

  // Reset form when tourist or prefillData changes
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
        passportScans: tourist.passportScans,
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
        passportScans: null,
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
        passportScans: null,
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
                          placeholder="12 3456789"
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
                      <FormLabel>Загранпаспорт действителен до</FormLabel>
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

                <div className="col-span-2">
                  <FormLabel className="block mb-2">Скан загранпаспорта</FormLabel>
                  {tourist?.id ? (
                    <PassportScansField
                      touristId={tourist.id}
                      initialScans={tourist.passportScans || []}
                      onUpdate={(scans) => form.setValue("passportScans", scans.length > 0 ? scans : null)}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                      Сохраните туриста, чтобы загрузить сканы паспорта
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Тип и настройки туриста */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold text-foreground">Тип и настройки</h4>
              <FormField
                control={form.control}
                name="touristType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-tourist-type">
                      <FormControl>
                        <SelectTrigger>
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
                render={({ field }) => {
                  const hasPrimaryTourist = tourists.some(t => t.isPrimary && (!tourist || t.id !== tourist.id));
                  const isDisabled = hasPrimaryTourist;
                  
                  return (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isDisabled}
                          data-testid="checkbox-tourist-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Основной турист</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {hasPrimaryTourist 
                            ? "Основной турист уже выбран для этого лида" 
                            : "Должен быть только один основной турист"
                          }
                        </p>
                      </div>
                    </FormItem>
                  );
                }}
              />

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
                        rows={2}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-tourist"
              >
                Отмена
              </Button>
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
