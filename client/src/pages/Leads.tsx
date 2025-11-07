import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Users, TrendingUp, Clock, CheckCircle, Edit, Trash2, UserPlus, LayoutGrid, LayoutList, Filter, Star, User, Baby } from "lucide-react";
import type { Lead, LeadWithTouristCount, InsertLead, LeadTourist, InsertLeadTourist, Event } from "@shared/schema";
import { insertLeadSchema, insertLeadTouristSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { DataCompletenessIndicator } from "@/components/DataCompletenessIndicator";
import { calculateTouristDataCompleteness } from "@/lib/utils";

const leadStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Новый", variant: "default" },
  contacted: { label: "Связались", variant: "secondary" },
  qualified: { label: "Квалифицирован", variant: "outline" },
  converted: { label: "Конвертирован", variant: "default" },
  lost: { label: "Потерян", variant: "destructive" },
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

export default function Leads() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  
  // View and filter state
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    return (localStorage.getItem('leadsViewMode') as 'table' | 'kanban') || 'kanban';
  });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data: leads = [], isLoading } = useQuery<LeadWithTouristCount[]>({
    queryKey: ["/api/leads"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      return await apiRequest("POST", "/api/leads", data);
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
      return await apiRequest("PATCH", `/api/leads/${id}`, data);
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
      return await apiRequest("DELETE", `/api/leads/${id}`);
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

  // Save viewMode to localStorage
  useEffect(() => {
    localStorage.setItem('leadsViewMode', viewMode);
  }, [viewMode]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(lead.status)) {
        return false;
      }
      
      // Source filter
      if (sourceFilter && lead.source !== sourceFilter) {
        return false;
      }
      
      // Date range filter
      if (dateRange.from || dateRange.to) {
        const leadDate = new Date(lead.createdAt);
        if (dateRange.from && leadDate < dateRange.from) return false;
        if (dateRange.to && leadDate > dateRange.to) return false;
      }
      
      return true;
    });
  }, [leads, statusFilter, sourceFilter, dateRange]);

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

      {/* Filters and View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
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
                  <SelectItem value="contacted">Связались</SelectItem>
                  <SelectItem value="qualified">Квалифицирован</SelectItem>
                  <SelectItem value="converted">Конвертирован</SelectItem>
                  <SelectItem value="lost">Потерян</SelectItem>
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

            {/* Clear Filters */}
            {(statusFilter.length > 0 || sourceFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter([]);
                  setSourceFilter('');
                }}
                data-testid="button-clear-filters"
              >
                Сбросить фильтры
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
            updateMutation.mutate({ id: leadId, data: { status: newStatus } });
          }}
          onEdit={setEditingLead}
          onDelete={(leadId) => {
            if (confirm("Вы уверены, что хотите удалить этот лид?")) {
              deleteMutation.mutate(leadId);
            }
          }}
          onConvert={setConvertingLead}
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
                  return (
                  <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                    <TableCell className="font-medium">{getLeadName(lead)}</TableCell>
                    <TableCell>{lead.phone || "—"}</TableCell>
                    <TableCell>{lead.email || "—"}</TableCell>
                    <TableCell>{event?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={leadStatusMap[lead.status]?.variant || "default"} data-testid={`status-${lead.id}`}>
                        {leadStatusMap[lead.status]?.label || lead.status}
                      </Badge>
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
              onSubmit={(data) => updateMutation.mutate({ id: editingLead.id, data })}
              isPending={updateMutation.isPending}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {convertingLead && (
        <ConvertLeadDialog
          lead={convertingLead}
          onClose={() => setConvertingLead(null)}
          getLeadName={getLeadName}
        />
      )}
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
  onConvert: (lead: LeadWithTouristCount) => void;
  getLeadName: (lead: Lead) => string;
}

function KanbanBoard({ leads, events, isLoading, onStatusChange, onEdit, onDelete, onConvert, getLeadName }: KanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<LeadWithTouristCount | null>(null);

  const columns: { status: string; label: string; variant: "default" | "secondary" | "outline" | "destructive" }[] = [
    { status: "new", label: "Новый", variant: "default" },
    { status: "contacted", label: "Связались", variant: "secondary" },
    { status: "qualified", label: "Квалифицирован", variant: "outline" },
    { status: "converted", label: "Конвертирован", variant: "default" },
    { status: "lost", label: "Потерян", variant: "destructive" },
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
        const columnLeads = leads.filter((lead) => lead.status === column.status);
        
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
                  <Badge variant={column.variant} className="ml-2">
                    {columnLeads.length}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
            
            <div className="space-y-2 min-h-[200px]">
              {columnLeads.map((lead) => {
                const event = events.find(e => e.id === lead.eventId);
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
                        <div className="font-medium flex-1">{getLeadName(lead)}</div>
                        <div className="flex items-center gap-1">
                          {lead.status === "qualified" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onConvert(lead);
                                  }}
                                  data-testid={`kanban-convert-${lead.id}`}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Конвертировать</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
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
}

function LeadForm({ lead, onSubmit, isPending, onDelete }: LeadFormProps) {
  const { toast } = useToast();
  const [isTouristDialogOpen, setIsTouristDialogOpen] = useState(false);
  const [editingTourist, setEditingTourist] = useState<LeadTourist | null>(null);

  // Helper function to get lead display name
  const getLeadName = (lead: Lead) => {
    return `${lead.lastName || ''} ${lead.firstName || ''}`.trim() || 'Без имени';
  };

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
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
      status: lead?.status || "new",
      source: lead?.source || "direct",
      notes: lead?.notes || null,
      formId: lead?.formId || null,
      assignedUserId: lead?.assignedUserId || null,
      createdByUserId: lead?.createdByUserId || null,
    },
  });

  // Fetch events for tour selection
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Fetch tourists only if editing an existing lead
  const { data: tourists = [], isLoading: isLoadingTourists } = useQuery<LeadTourist[]>({
    queryKey: ["/api/leads", lead?.id, "tourists"],
    enabled: !!lead?.id,
  });

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

    const fullName = `${tourist.lastName} ${tourist.firstName}`;
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
    <>
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
                      onValueChange={field.onChange} 
                      value={field.value || undefined}
                      data-testid="select-eventId"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тур" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {events.map((event) => (
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Стоимость тура</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          const tourCost = parseFloat(e.target.value) || 0;
                          const advancePayment = parseFloat(form.getValues("advancePayment") || "0") || 0;
                          form.setValue("remainingPayment", (tourCost - advancePayment).toFixed(2));
                        }}
                        data-testid="input-tourCost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="advancePayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Аванс</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          const tourCost = parseFloat(form.getValues("tourCost") || "0") || 0;
                          const advancePayment = parseFloat(e.target.value) || 0;
                          form.setValue("remainingPayment", (tourCost - advancePayment).toFixed(2));
                        }}
                        data-testid="input-advancePayment"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remainingPayment"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Остаток</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-remainingPayment"
                        disabled
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingTourist(null);
                    setIsTouristDialogOpen(true);
                  }}
                  data-testid="button-add-tourist"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить туриста
                </Button>
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
                        <TableHead>Email</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>Дата рождения</TableHead>
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
                              {tourist.lastName} {tourist.firstName} {tourist.middleName || ""}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-[10px] font-semibold transition-colors">
                                    {tourist.touristType === "adult" ? (
                                      <User className="h-3 w-3" />
                                    ) : (
                                      <Baby className="h-3 w-3" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{tourist.touristType === "adult" ? "Взрослый" : tourist.touristType === "child" ? "Ребенок" : "Младенец"}</p>
                                </TooltipContent>
                              </Tooltip>
                              {tourist.isPrimary ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className="inline-flex items-center rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition-colors"
                                      data-testid={`badge-primary-${tourist.id}`}
                                    >
                                      <Star className="h-3 w-3" />
                                    </div>
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
                        <TableCell>{tourist.email || "—"}</TableCell>
                        <TableCell>{tourist.phone || "—"}</TableCell>
                        <TableCell>
                          {tourist.dateOfBirth
                            ? format(new Date(tourist.dateOfBirth), "dd.MM.yyyy")
                            : "—"}
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
            {lead && onDelete && (
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
          onOpenChange={setIsTouristDialogOpen}
          tourist={editingTourist}
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
    </>
  );
}

interface TouristDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourist: LeadTourist | null;
  leadId: string;
  tourists: LeadTourist[];
  onSubmit: (data: InsertLeadTourist) => void;
  isPending: boolean;
}

function TouristDialog({
  open,
  onOpenChange,
  tourist,
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

  // Reset form when tourist changes
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
  }, [tourist, leadId, tourists.length, form]);

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
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-tourist-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Основной турист</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Должен быть только один основной турист
                      </p>
                    </div>
                  </FormItem>
                )}
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

interface ConvertLeadDialogProps {
  lead: Lead;
  onClose: () => void;
  getLeadName: (lead: Lead) => string;
}

function ConvertLeadDialog({ lead, onClose, getLeadName }: ConvertLeadDialogProps) {
  const { toast } = useToast();
  const [eventId, setEventId] = useState("");

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  // Fetch tourists to show info
  const { data: tourists = [] } = useQuery<LeadTourist[]>({
    queryKey: ["/api/leads", lead.id, "tourists"],
    enabled: !!lead.id,
  });

  const convertMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest("POST", `/api/leads/${lead.id}/convert`, { eventId });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      const message = data.message || 
        (tourists.length > 1 
          ? `Лид конвертирован. Создано ${tourists.length} контактов и семейная группа.`
          : "Лид успешно конвертирован в контакт и сделку.");
      
      toast({
        title: "Успешно",
        description: message,
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

    // Check if tourists exist
    if (tourists.length === 0) {
      toast({
        title: "Внимание",
        description: "У лида нет туристов. Будет создан контакт из данных лида.",
      });
    }

    convertMutation.mutate(eventId);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Конвертировать лид: {getLeadName(lead)}</DialogTitle>
          <DialogDescription>
            {tourists.length > 1
              ? `Будет создано ${tourists.length} контактов и семейная группа`
              : tourists.length === 1
              ? "Будет создан 1 контакт и сделка"
              : "Будет создан контакт из данных лида"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {tourists.length > 0 && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">Туристы ({tourists.length}):</p>
              <ul className="text-sm space-y-1">
                {tourists.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    {t.isPrimary && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                    <span>{t.lastName} {t.firstName} {t.middleName || ""}</span>
                    {t.touristType === 'child' && <Badge variant="outline" className="text-xs">Ребенок</Badge>}
                    {t.touristType === 'infant' && <Badge variant="outline" className="text-xs">Младенец</Badge>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Отмена
            </Button>
            <Button type="submit" disabled={convertMutation.isPending} data-testid="button-submit-convert">
              {convertMutation.isPending ? "Конвертация..." : "Конвертировать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
