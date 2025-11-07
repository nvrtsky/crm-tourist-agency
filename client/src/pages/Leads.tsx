import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Users, TrendingUp, Clock, CheckCircle, Edit, Trash2, UserPlus, LayoutGrid, LayoutList, Filter, Star } from "lucide-react";
import type { Lead, InsertLead, LeadParticipant, InsertLeadParticipant } from "@shared/schema";
import { insertLeadSchema, insertLeadParticipantSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  const [onlyWithFamily, setOnlyWithFamily] = useState(false);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Will be calculated after filteredLeads is defined

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
      
      // Family filter
      if (onlyWithFamily && (!lead.familyMembersCount || lead.familyMembersCount <= 1)) {
        return false;
      }
      
      return true;
    });
  }, [leads, statusFilter, sourceFilter, dateRange, onlyWithFamily]);

  // Calculate stats from filtered leads
  const stats = {
    total: filteredLeads.length,
    new: filteredLeads.filter((l) => l.status === "new").length,
    inProgress: filteredLeads.filter((l) => ["contacted", "qualified"].includes(l.status)).length,
    completed: filteredLeads.filter((l) => l.status === "converted").length,
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

            {/* Family Filter */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="only-family"
                checked={onlyWithFamily}
                onCheckedChange={(checked) => setOnlyWithFamily(checked as boolean)}
                data-testid="checkbox-only-family"
              />
              <label
                htmlFor="only-family"
                className="text-sm font-medium leading-none cursor-pointer select-none"
              >
                Только семьи
              </label>
            </div>

            {/* Clear Filters */}
            {(statusFilter.length > 0 || sourceFilter || onlyWithFamily) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter([]);
                  setSourceFilter('');
                  setOnlyWithFamily(false);
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
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Семья</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.email || "—"}</TableCell>
                    <TableCell>{lead.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={leadStatusMap[lead.status]?.variant || "default"} data-testid={`status-${lead.id}`}>
                        {leadStatusMap[lead.status]?.label || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{leadSourceMap[lead.source] || lead.source}</TableCell>
                    <TableCell>
                      {lead.familyMembersCount && lead.familyMembersCount > 1 ? (
                        <Badge variant="outline" data-testid={`family-${lead.id}`}>
                          {lead.familyMembersCount} чел.
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(lead.createdAt), "dd.MM.yyyy")}</TableCell>
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
                ))}
              </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent className="max-w-2xl">
          {editingLead && (
            <LeadForm
              lead={editingLead}
              onSubmit={(data) => updateMutation.mutate({ id: editingLead.id, data })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {convertingLead && (
        <ConvertLeadDialog
          lead={convertingLead}
          onClose={() => setConvertingLead(null)}
        />
      )}
    </div>
  );
}

// Kanban Board Component
interface KanbanBoardProps {
  leads: Lead[];
  isLoading: boolean;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onConvert: (lead: Lead) => void;
}

function KanbanBoard({ leads, isLoading, onStatusChange, onEdit, onDelete, onConvert }: KanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

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
              {columnLeads.map((lead) => (
                <Card
                  key={lead.id}
                  className="cursor-move hover-elevate active-elevate-2 transition-shadow"
                  draggable
                  onDragStart={() => handleDragStart(lead)}
                  data-testid={`kanban-card-${lead.id}`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="font-medium">{lead.name}</div>
                      {lead.email && (
                        <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
                      )}
                      {lead.phone && (
                        <div className="text-xs text-muted-foreground">{lead.phone}</div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {leadSourceMap[lead.source] || lead.source}
                        </Badge>
                        {lead.familyMembersCount && lead.familyMembersCount > 1 && (
                          <Badge variant="outline" className="text-[10px]">
                            <Users className="h-3 w-3 mr-1" />
                            {lead.familyMembersCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onEdit(lead)}
                          data-testid={`kanban-edit-${lead.id}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Ред.
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive"
                          onClick={() => onDelete(lead.id)}
                          data-testid={`kanban-delete-${lead.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {lead.status === "qualified" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => onConvert(lead)}
                            data-testid={`kanban-convert-${lead.id}`}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Конв.
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
}

function LeadForm({ lead, onSubmit, isPending }: LeadFormProps) {
  const { toast } = useToast();
  const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<LeadParticipant | null>(null);

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      name: lead?.name || "",
      email: lead?.email || null,
      phone: lead?.phone || null,
      status: lead?.status || "new",
      source: lead?.source || "direct",
      familyMembersCount: lead?.familyMembersCount || null,
      notes: lead?.notes || null,
      formId: lead?.formId || null,
      assignedUserId: lead?.assignedUserId || null,
      createdByUserId: lead?.createdByUserId || null,
    },
  });

  // Fetch participants only if editing an existing lead
  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery<LeadParticipant[]>({
    queryKey: ["/api/leads", lead?.id, "participants"],
    enabled: !!lead?.id,
  });

  // Auto-update familyMembersCount when participants change
  useEffect(() => {
    if (lead?.id && participants.length > 0) {
      const newCount = participants.length;
      const currentCount = lead.familyMembersCount;
      
      // Only update if different
      if (currentCount !== newCount) {
        apiRequest("PATCH", `/api/leads/${lead.id}`, { familyMembersCount: newCount })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
          })
          .catch((error) => {
            console.error("Failed to update familyMembersCount:", error);
          });
      }
    }
  }, [participants.length, lead?.id, lead?.familyMembersCount]);

  // Create participant mutation
  const createParticipantMutation = useMutation({
    mutationFn: async (data: InsertLeadParticipant) => {
      if (!lead?.id) throw new Error("Lead ID is required");
      return await apiRequest("POST", `/api/leads/${lead.id}/participants`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "participants"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsParticipantDialogOpen(false);
      setEditingParticipant(null);
      toast({
        title: "Успешно",
        description: "Участник добавлен",
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

  // Update participant mutation
  const updateParticipantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLeadParticipant> }) => {
      return await apiRequest("PATCH", `/api/participants/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "participants"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsParticipantDialogOpen(false);
      setEditingParticipant(null);
      toast({
        title: "Успешно",
        description: "Участник обновлен",
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

  // Delete participant mutation
  const deleteParticipantMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/participants/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "participants"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Успешно",
        description: "Участник удален",
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

  const handleDeleteParticipant = (participant: LeadParticipant) => {
    // Prevent deletion of last participant
    if (participants.length <= 1) {
      toast({
        title: "Ошибка",
        description: "Должен быть хотя бы один участник",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Вы уверены, что хотите удалить участника ${participant.name}?`)) {
      deleteParticipantMutation.mutate(participant.id);
    }
  };

  const handleTogglePrimary = async (participant: LeadParticipant) => {
    // If already primary, do nothing
    if (participant.isPrimary) return;

    // Update all participants: unset others, set this one
    const updates = participants.map((p) => {
      if (p.id === participant.id) {
        return updateParticipantMutation.mutateAsync({
          id: p.id,
          data: { isPrimary: true },
        });
      } else if (p.isPrimary) {
        return updateParticipantMutation.mutateAsync({
          id: p.id,
          data: { isPrimary: false },
        });
      }
      return Promise.resolve();
    });

    await Promise.all(updates);
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя *</FormLabel>
                  <FormControl>
                    <Input placeholder="Иван Иванов" {...field} data-testid="input-name" />
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

            <FormField
              control={form.control}
              name="familyMembersCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Количество членов семьи</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      data-testid="input-family-members"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

          {/* Participants Section - Only show when editing an existing lead */}
          {lead?.id && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Участники</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingParticipant(null);
                    setIsParticipantDialogOpen(true);
                  }}
                  data-testid="button-add-participant"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить участника
                </Button>
              </div>

              {isLoadingParticipants ? (
                <div className="text-center py-4 text-muted-foreground">Загрузка участников...</div>
              ) : participants.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Нет участников. Добавьте первого участника.
                </div>
              ) : (
                <Table data-testid="table-participants">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Дата рождения</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Основной</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant) => (
                      <TableRow key={participant.id} data-testid={`row-participant-${participant.id}`}>
                        <TableCell className="font-medium">{participant.name}</TableCell>
                        <TableCell>{participant.email || "—"}</TableCell>
                        <TableCell>{participant.phone || "—"}</TableCell>
                        <TableCell>
                          {participant.dateOfBirth
                            ? format(new Date(participant.dateOfBirth), "dd.MM.yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={participant.participantType === "adult" ? "default" : "secondary"}>
                            {participant.participantType === "adult" ? "Взрослый" : "Ребенок"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {participant.isPrimary ? (
                            <Badge variant="default" data-testid={`badge-primary-${participant.id}`}>
                              <Star className="h-3 w-3 mr-1" />
                              Основной
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePrimary(participant)}
                              data-testid={`button-set-primary-${participant.id}`}
                            >
                              Сделать основным
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingParticipant(participant);
                                setIsParticipantDialogOpen(true);
                              }}
                              data-testid={`button-edit-participant-${participant.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteParticipant(participant)}
                              disabled={participants.length <= 1}
                              data-testid={`button-delete-participant-${participant.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending} data-testid="button-submit-lead">
              {isPending ? "Сохранение..." : lead ? "Обновить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      {/* Participant Dialog */}
      {lead?.id && (
        <ParticipantDialog
          open={isParticipantDialogOpen}
          onOpenChange={setIsParticipantDialogOpen}
          participant={editingParticipant}
          leadId={lead.id}
          participants={participants}
          onSubmit={(data) => {
            if (editingParticipant) {
              updateParticipantMutation.mutate({ id: editingParticipant.id, data });
            } else {
              createParticipantMutation.mutate(data);
            }
          }}
          isPending={createParticipantMutation.isPending || updateParticipantMutation.isPending}
        />
      )}
    </>
  );
}

interface ParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: LeadParticipant | null;
  leadId: string;
  participants: LeadParticipant[];
  onSubmit: (data: InsertLeadParticipant) => void;
  isPending: boolean;
}

function ParticipantDialog({
  open,
  onOpenChange,
  participant,
  leadId,
  participants,
  onSubmit,
  isPending,
}: ParticipantDialogProps) {
  const form = useForm<InsertLeadParticipant>({
    resolver: zodResolver(insertLeadParticipantSchema),
    defaultValues: {
      leadId,
      name: participant?.name || "",
      email: participant?.email || null,
      phone: participant?.phone || null,
      dateOfBirth: participant?.dateOfBirth || null,
      participantType: participant?.participantType || "adult",
      isPrimary: participant?.isPrimary || false,
      notes: participant?.notes || null,
      order: participant?.order || participants.length,
    },
  });

  // Reset form when participant changes
  useEffect(() => {
    if (participant) {
      form.reset({
        leadId,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        dateOfBirth: participant.dateOfBirth,
        participantType: participant.participantType,
        isPrimary: participant.isPrimary,
        notes: participant.notes,
        order: participant.order,
      });
    } else {
      form.reset({
        leadId,
        name: "",
        email: null,
        phone: null,
        dateOfBirth: null,
        participantType: "adult",
        isPrimary: participants.length === 0,
        notes: null,
        order: participants.length,
      });
    }
  }, [participant, leadId, participants.length, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {participant ? "Редактировать участника" : "Добавить участника"}
          </DialogTitle>
          <DialogDescription>
            {participant ? "Обновите информацию об участнике" : "Введите данные нового участника"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя *</FormLabel>
                  <FormControl>
                    <Input placeholder="Иван Иванов" {...field} data-testid="input-participant-name" />
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
                      data-testid="input-participant-email"
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
                      data-testid="input-participant-phone"
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
                      data-testid="input-participant-dob"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="participantType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-participant-type">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="adult">Взрослый</SelectItem>
                      <SelectItem value="child">Ребенок</SelectItem>
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
                      data-testid="checkbox-participant-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Основной участник</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Должен быть только один основной участник
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
                      data-testid="input-participant-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-participant"
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-participant">
                {isPending ? "Сохранение..." : participant ? "Обновить" : "Добавить"}
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
}

function ConvertLeadDialog({ lead, onClose }: ConvertLeadDialogProps) {
  const { toast } = useToast();
  const [eventId, setEventId] = useState("");

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  // Fetch participants to show info
  const { data: participants = [] } = useQuery<LeadParticipant[]>({
    queryKey: ["/api/leads", lead.id, "participants"],
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
        (participants.length > 1 
          ? `Лид конвертирован. Создано ${participants.length} контактов и семейная группа.`
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

    // Check if participants exist
    if (participants.length === 0) {
      toast({
        title: "Внимание",
        description: "У лида нет участников. Будет создан контакт из данных лида.",
      });
    }

    convertMutation.mutate(eventId);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Конвертировать лид: {lead.name}</DialogTitle>
          <DialogDescription>
            {participants.length > 1
              ? `Будет создано ${participants.length} контактов и семейная группа`
              : participants.length === 1
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

          {participants.length > 0 && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">Участники ({participants.length}):</p>
              <ul className="text-sm space-y-1">
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    {p.isPrimary && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                    <span>{p.name}</span>
                    {p.participantType === 'child' && <Badge variant="outline" className="text-xs">Ребенок</Badge>}
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
