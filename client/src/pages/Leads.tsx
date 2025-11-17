import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Users, TrendingUp, Clock, CheckCircle, Edit, Trash2, LayoutGrid, LayoutList, Filter, Star, User as UserIcon, UserRound, Baby, RotateCcw, Search } from "lucide-react";
import type { Lead, LeadWithTouristCount, InsertLead, LeadTourist, InsertLeadTourist, Event, EventWithStats, User } from "@shared/schema";
import { insertLeadSchema, insertLeadTouristSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { DataCompletenessIndicator } from "@/components/DataCompletenessIndicator";
import { calculateTouristDataCompleteness, formatCurrency } from "@/lib/utils";
import { ColorPicker, ColorIndicator, type ColorOption } from "@/components/ColorPicker";
import { DeferLeadDialog } from "@/components/DeferLeadDialog";
import { z } from "zod";

const leadStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Новый", variant: "default" },
  contacted: { label: "Квалифицирован", variant: "secondary" },
  qualified: { label: "Забронирован", variant: "outline" },
  converted: { label: "Подтвержден", variant: "default" },
  lost: { label: "Отложен", variant: "destructive" },
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
};

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

// Form schema with color field
const createLeadFormSchema = insertLeadSchema.extend({
  color: z.string().nullable(),
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
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data: leads = [], isLoading } = useQuery<LeadWithTouristCount[]>({
    queryKey: ["/api/leads"],
  });

  const { data: events = [] } = useQuery<EventWithStats[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation<Lead, Error, InsertLead>({
    mutationFn: async (data: InsertLead) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return await res.json();
    },
    onSuccess: (newLead: Lead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      // If lead was created with eventId, invalidate participants cache for that event
      if (newLead.eventId) {
        queryClient.invalidateQueries({ queryKey: ["/api/events", newLead.eventId, "participants"] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      await queryClient.refetchQueries({ queryKey: ["/api/leads"] });
      
      // Refetch events to update status counters in EventCard
      await queryClient.refetchQueries({ queryKey: ["/api/events"] });
      
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

  // Save viewMode to localStorage
  useEffect(() => {
    localStorage.setItem('leadsViewMode', viewMode);
  }, [viewMode]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    const filtered = leads.filter(lead => {
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
  }, [leads, searchQuery, statusFilter, sourceFilter, categoryFilter, tourFilter, colorFilter, dateRange]);

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
                  <SelectItem value="form">Веб-форма</SelectItem>
                  <SelectItem value="referral">Рекомендация</SelectItem>
                  <SelectItem value="direct">Прямое обращение</SelectItem>
                  <SelectItem value="advertisement">Реклама</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
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
                  <SelectItem value="category_ab">Категория А и В (Даты и бюджет)</SelectItem>
                  <SelectItem value="category_c">Категория C (Неопределились)</SelectItem>
                  <SelectItem value="category_d">Категория D (Нет бюджета)</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="not_segmented">Не сегментированный</SelectItem>
                  <SelectItem value="travel_agent">Турагент</SelectItem>
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

            {/* Clear Filters */}
            {(searchQuery || statusFilter.length > 0 || sourceFilter || categoryFilter || tourFilter || colorFilter || dateRange.from || dateRange.to) && (
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
                  <TableHead>Телефон</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Тур</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const event = events.find(e => e.id === lead.eventId);
                  const displayColor = getLeadDisplayColor(lead);
                  return (
                  <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <ColorIndicator color={displayColor} />
                        <span>{getLeadName(lead)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{lead.phone || "—"}</TableCell>
                    <TableCell>{lead.email || "—"}</TableCell>
                    <TableCell>{event?.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={leadStatusMap[lead.status]?.variant || "default"} data-testid={`status-${lead.id}`}>
                          {leadStatusMap[lead.status]?.label || lead.status}
                        </Badge>
                        {lead.hasBeenContacted && (
                          <Badge variant="secondary" className="text-[10px]" data-testid={`badge-reactivated-table-${lead.id}`}>
                            Лид из Отложенных
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{leadSourceMap[lead.source] || lead.source}</TableCell>
                    <TableCell>
                      {lead.clientCategory ? (
                        <Badge variant="outline" data-testid={`category-${lead.id}`}>
                          {clientCategoryMap[lead.clientCategory] || lead.clientCategory}
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
            <LeadForm
              lead={editingLead}
              onSubmit={(data) => {
                // If changing to "lost" status, show defer dialog
                if (data.status === 'lost' && editingLead.status !== 'lost') {
                  // Store pending form data to apply after defer dialog confirmation
                  setPendingFormData(data);
                  setLeadToDefer({ id: editingLead.id, name: getLeadName(editingLead) });
                  setIsDeferDialogOpen(true);
                  setEditingLead(null); // Close the edit dialog
                } else {
                  // For other changes, update directly
                  updateMutation.mutate({ id: editingLead.id, data });
                }
              }}
              isPending={updateMutation.isPending}
              onDelete={(id) => deleteMutation.mutate(id)}
              isAdmin={isAdmin}
            />
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
        onConfirm={(data) => {
          if (leadToDefer) {
            // Merge pending form data with defer data
            const updateData: Partial<InsertLead> = {
              ...(pendingFormData || {}),
              status: 'lost',
              postponedUntil: data.postponedUntil,
              postponeReason: data.postponeReason,
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
  getLeadName: (lead: Lead) => string;
}

function KanbanBoard({ leads, events, isLoading, onStatusChange, onEdit, onDelete, getLeadName }: KanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<LeadWithTouristCount | null>(null);

  const columns: { 
    status: string; 
    label: string; 
    variant: "default" | "secondary" | "outline" | "destructive";
    customClass?: string;
  }[] = [
    { status: "new", label: "Новый", variant: "secondary" },
    { status: "contacted", label: "Квалифицирован", variant: "secondary" },
    { status: "qualified", label: "Забронирован", variant: "outline", customClass: "bg-[#f4a825] dark:bg-[#f4a825] text-white dark:text-white !border-[#d89420]" },
    { status: "converted", label: "Подтвержден", variant: "default", customClass: "bg-green-700 dark:bg-green-800 text-white border-green-800 dark:border-green-900" },
    { status: "lost", label: "Отложен", variant: "destructive" },
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
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4" data-testid="kanban-board">
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
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{column.label}</CardTitle>
                  <Badge 
                    variant={column.variant} 
                    className={column.customClass ? `ml-2 ${column.customClass}` : "ml-2"}
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
                return (
                <Card
                  key={lead.id}
                  className="cursor-move hover-elevate active-elevate-2 transition-shadow"
                  draggable
                  onDragStart={() => handleDragStart(lead)}
                  data-testid={`kanban-card-${lead.id}`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {/* ФИО и кнопки Edit/Convert на одной линии */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="font-medium flex-1 flex items-center gap-2">
                          <ColorIndicator color={displayColor} />
                          <span>{getLeadName(lead)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(lead);
                            }}
                            data-testid={`kanban-edit-${lead.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {lead.phone && <div>{lead.phone}</div>}
                        {lead.email && <div>{lead.email}</div>}
                        {event && <div className="font-medium text-primary">{event.name}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {leadSourceMap[lead.source] || lead.source}
                        </Badge>
                        {lead.clientCategory && (
                          <Badge variant="outline" className="text-[10px]">
                            {clientCategoryMap[lead.clientCategory] || lead.clientCategory}
                          </Badge>
                        )}
                        {lead.touristCount !== undefined && lead.touristCount > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Users className="h-3 w-3 mr-1" />
                            {lead.touristCount}
                          </Badge>
                        )}
                        {lead.hasBeenContacted && (
                          <Badge variant="secondary" className="text-[10px]" data-testid={`badge-reactivated-${lead.id}`}>
                            Лид из Отложенных
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
  const [costCalculation, setCostCalculation] = useState<{ pricePerPerson: string; touristCount: number } | null>(null);
  
  // Track focus state for number fields to control formatting
  const [isTourCostFocused, setIsTourCostFocused] = useState(false);
  const [isAdvanceFocused, setIsAdvanceFocused] = useState(false);
  
  // Track if initial load is complete to avoid overwriting DB values
  const isInitializedRef = useRef(false);
  
  // Track if user manually edited tourCost to prevent auto-recalculation
  const hasManualCostOverrideRef = useRef(false);

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
      tourCost: lead?.tourCost || null,
      advancePayment: lead?.advancePayment || null,
      remainingPayment: lead?.remainingPayment || null,
      clientCategory: lead?.clientCategory || null,
      color: lead?.color ?? null,
      status: lead?.status || "new",
      source: lead?.source || "direct",
      notes: lead?.notes || null,
      formId: lead?.formId || null,
      assignedUserId: lead?.assignedUserId || null,
      createdByUserId: lead?.createdByUserId || null,
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
      form.reset({
        lastName: lead.lastName || "",
        firstName: lead.firstName || "",
        middleName: lead.middleName || null,
        phone: lead.phone || null,
        email: lead.email || null,
        eventId: lead.eventId || null,
        tourCost: lead.tourCost || null,
        advancePayment: lead.advancePayment || null,
        remainingPayment: lead.remainingPayment || null,
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
      hasManualCostOverrideRef.current = false;
    } else {
      // For new leads, mark as initialized immediately since there's no DB value to preserve
      isInitializedRef.current = true;
      hasManualCostOverrideRef.current = false;
    }
  }, [lead, form]);

  // Auto-update cost calculation when event selection changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (value.eventId && events.length > 0) {
        const selectedEvent = events.find(e => e.id === value.eventId);
        if (selectedEvent) {
          const touristCount = tourists.length || 1;
          const pricePerPerson = parseFloat(selectedEvent.price);
          const totalCost = pricePerPerson * touristCount;
          
          // Update tourCost field only when event changes (not when user manually edits tourCost)
          if (name === "eventId") {
            form.setValue("tourCost", totalCost.toFixed(2));
            
            // Recalculate remaining payment
            const advancePayment = parseFloat(value.advancePayment || "0") || 0;
            form.setValue("remainingPayment", (totalCost - advancePayment).toFixed(2));
            
            // Reset manual override flag when event changes
            hasManualCostOverrideRef.current = false;
          }
          
          // Always update calculation info for display
          setCostCalculation({
            pricePerPerson: pricePerPerson.toFixed(2),
            touristCount
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, events, tourists.length]);

  // Update cost calculation when tourist count changes (after adding/deleting tourists)
  useEffect(() => {
    const eventId = form.getValues("eventId");
    if (eventId && events.length > 0) {
      const selectedEvent = events.find(e => e.id === eventId);
      if (selectedEvent) {
        const touristCount = tourists.length || 1; // Minimum 1 tourist for calculation
        const pricePerPerson = parseFloat(selectedEvent.price);
        const totalCost = pricePerPerson * touristCount;
        
        // Only update tourCost after initial load AND if user hasn't manually overridden it
        if (isInitializedRef.current && !hasManualCostOverrideRef.current) {
          // Update the tourCost field value with proper precision
          form.setValue("tourCost", totalCost.toFixed(2));
          
          // Recalculate remaining payment
          const advancePayment = parseFloat(form.getValues("advancePayment") || "0") || 0;
          form.setValue("remainingPayment", (totalCost - advancePayment).toFixed(2));
        } else if (!isInitializedRef.current) {
          // Mark as initialized after first render
          isInitializedRef.current = true;
        }
        
        // Always update calculation display
        setCostCalculation({
          pricePerPerson: pricePerPerson.toFixed(2),
          touristCount
        });
      }
    }
  }, [tourists.length, events, form]);

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
        await queryClient.invalidateQueries({ queryKey: ["/api/events", lead.eventId, "participants"] });
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
        await queryClient.invalidateQueries({ queryKey: ["/api/events", lead.eventId, "participants"] });
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
        await queryClient.invalidateQueries({ queryKey: ["/api/events", lead.eventId, "participants"] });
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
        await queryClient.invalidateQueries({ queryKey: ["/api/events", lead.eventId, "participants"] });
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

    const fullName = tourist.foreignPassportName || `${tourist.lastName} ${tourist.firstName}`;
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

          {/* Тур и оплата */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-foreground">Тур и оплата</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Тур</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Auto-calculate tour cost based on selected event
                        const selectedEvent = events.find(e => e.id === value);
                        if (selectedEvent) {
                          const touristCount = tourists.length || 1; // Minimum 1 tourist
                          const pricePerPerson = parseFloat(selectedEvent.price);
                          const totalCost = pricePerPerson * touristCount;
                          
                          // Set the calculated cost with proper precision
                          form.setValue("tourCost", totalCost.toFixed(2));
                          
                          // Update calculation info for display
                          setCostCalculation({
                            pricePerPerson: pricePerPerson.toFixed(2),
                            touristCount
                          });
                          
                          // Recalculate remaining payment
                          const advancePayment = parseFloat(form.getValues("advancePayment") || "0") || 0;
                          form.setValue("remainingPayment", (totalCost - advancePayment).toFixed(2));
                          
                          // Reset manual override flag when event changes
                          hasManualCostOverrideRef.current = false;
                        } else {
                          setCostCalculation(null);
                        }
                      }}
                      value={field.value || undefined}
                      data-testid="select-eventId"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тур" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {events.filter(event => !event.isArchived).map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name} ({format(new Date(event.startDate), "dd.MM.yyyy", { locale: ru })} - {format(new Date(event.endDate), "dd.MM.yyyy", { locale: ru })})
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
                name="tourCost"
                render={({ field }) => {
                  // Format number with thousand separators for display
                  const formatNumberInput = (value: string) => {
                    if (!value) return "";
                    // Handle both comma and dot as decimal separator
                    const cleanValue = value.replace(/\s/g, '').replace(/,/g, '.');
                    const num = parseFloat(cleanValue);
                    if (isNaN(num)) return "";
                    return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  };
                  
                  // Parse formatted string back to plain number string (with dot as decimal separator)
                  const parseNumberInput = (value: string) => {
                    if (!value || value.trim() === "") return null;
                    
                    // Remove all spaces first
                    let cleanValue = value.replace(/\s/g, '');
                    
                    // Smart decimal separator detection:
                    // If both comma and dot exist, the rightmost one is the decimal separator
                    const lastCommaIndex = cleanValue.lastIndexOf(',');
                    const lastDotIndex = cleanValue.lastIndexOf('.');
                    
                    if (lastCommaIndex > lastDotIndex) {
                      // Comma is decimal separator (European format: 1.234.567,89)
                      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                    } else if (lastDotIndex > lastCommaIndex) {
                      // Dot is decimal separator (US format: 1,234,567.89)
                      cleanValue = cleanValue.replace(/,/g, '');
                    } else if (lastCommaIndex !== -1 && lastDotIndex === -1) {
                      // Only comma exists (Russian format: 123456,78)
                      cleanValue = cleanValue.replace(',', '.');
                    }
                    // else: only dot or no separators - keep as is
                    
                    // Keep only digits, dot, and minus sign
                    const sanitized = cleanValue.replace(/[^\d.-]/g, '');
                    
                    // Validate format: optional minus, digits, optional decimal part
                    if (!/^-?\d*\.?\d*$/.test(sanitized) || sanitized === "-") {
                      return field.value;  // Preserve previous valid value
                    }
                    
                    return sanitized;
                  };
                  
                  // Display formatted value when not focused, raw value when focused
                  const displayValue = isTourCostFocused 
                    ? (field.value || "") 
                    : formatNumberInput(field.value || "");
                  
                  return (
                    <FormItem>
                      <FormLabel>Стоимость тура</FormLabel>
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
                            const tourCost = parseFloat(rawValue || "0") || 0;
                            const advancePayment = parseFloat(form.getValues("advancePayment") || "0") || 0;
                            form.setValue("remainingPayment", (tourCost - advancePayment).toFixed(2));
                            
                            // Mark that user manually edited tourCost
                            hasManualCostOverrideRef.current = true;
                          }}
                          data-testid="input-tourCost"
                        />
                      </FormControl>
                      {costCalculation && (
                        <FormDescription className="text-xs text-muted-foreground">
                          Рассчитано: {formatCurrency(costCalculation.pricePerPerson)} руб × {costCalculation.touristCount} {costCalculation.touristCount === 1 ? 'турист' : costCalculation.touristCount > 4 ? 'туристов' : 'туриста'} = {formatCurrency(parseFloat(costCalculation.pricePerPerson) * costCalculation.touristCount)} руб
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="advancePayment"
                render={({ field }) => {
                  // Format number with thousand separators for display
                  const formatNumberInput = (value: string) => {
                    if (!value) return "";
                    // Handle both comma and dot as decimal separator
                    const cleanValue = value.replace(/\s/g, '').replace(/,/g, '.');
                    const num = parseFloat(cleanValue);
                    if (isNaN(num)) return "";
                    return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  };
                  
                  // Parse formatted string back to plain number string (with dot as decimal separator)
                  const parseNumberInput = (value: string) => {
                    if (!value || value.trim() === "") return null;
                    
                    // Remove all spaces first
                    let cleanValue = value.replace(/\s/g, '');
                    
                    // Smart decimal separator detection:
                    // If both comma and dot exist, the rightmost one is the decimal separator
                    const lastCommaIndex = cleanValue.lastIndexOf(',');
                    const lastDotIndex = cleanValue.lastIndexOf('.');
                    
                    if (lastCommaIndex > lastDotIndex) {
                      // Comma is decimal separator (European format: 1.234.567,89)
                      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                    } else if (lastDotIndex > lastCommaIndex) {
                      // Dot is decimal separator (US format: 1,234,567.89)
                      cleanValue = cleanValue.replace(/,/g, '');
                    } else if (lastCommaIndex !== -1 && lastDotIndex === -1) {
                      // Only comma exists (Russian format: 123456,78)
                      cleanValue = cleanValue.replace(',', '.');
                    }
                    // else: only dot or no separators - keep as is
                    
                    // Keep only digits, dot, and minus sign
                    const sanitized = cleanValue.replace(/[^\d.-]/g, '');
                    
                    // Validate format: optional minus, digits, optional decimal part
                    if (!/^-?\d*\.?\d*$/.test(sanitized) || sanitized === "-") {
                      return field.value;  // Preserve previous valid value
                    }
                    
                    return sanitized;
                  };
                  
                  // Display formatted value when not focused, raw value when focused
                  const displayValue = isAdvanceFocused 
                    ? (field.value || "") 
                    : formatNumberInput(field.value || "");
                  
                  return (
                    <FormItem>
                      <FormLabel>Аванс</FormLabel>
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
                            const tourCost = parseFloat(form.getValues("tourCost") || "0") || 0;
                            const advancePayment = parseFloat(rawValue || "0") || 0;
                            form.setValue("remainingPayment", (tourCost - advancePayment).toFixed(2));
                          }}
                          data-testid="input-advancePayment"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="remainingPayment"
                render={({ field }) => {
                  // Format number with thousand separators for display
                  const formatNumberInput = (value: string) => {
                    if (!value) return "";
                    // Clean value: remove spaces and replace commas with dots
                    const cleanValue = value.replace(/\s/g, '').replace(/,/g, '.');
                    const num = parseFloat(cleanValue);
                    if (isNaN(num)) return "";
                    return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  };
                  
                  return (
                    <FormItem className="col-span-2">
                      <FormLabel>Остаток</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0,00"
                          value={formatNumberInput(field.value || "")}
                          data-testid="input-remainingPayment"
                          disabled
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
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
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || undefined} 
                      data-testid="select-clientCategory"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="category_ab">Категория А и В (Даты и бюджет)</SelectItem>
                        <SelectItem value="category_c">Категория C (Неопределились)</SelectItem>
                        <SelectItem value="category_d">Категория D (Нет бюджета)</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="not_segmented">Не сегментированный</SelectItem>
                        <SelectItem value="travel_agent">Турагент</SelectItem>
                      </SelectContent>
                    </Select>
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
                name="assignedUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ответственный</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || undefined} 
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
                              {tourist.foreignPassportName || `${tourist.lastName} ${tourist.firstName} ${tourist.middleName || ""}`.trim()}
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
