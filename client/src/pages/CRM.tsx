import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lead, LeadStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ViewToggle, ViewMode } from "@/components/ViewToggle";
import { KanbanColumn } from "@/components/KanbanColumn";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { Users, TrendingUp, Clock, CheckCircle, Plus } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LeadCard } from "@/components/LeadCard";
import { useToast } from "@/hooks/use-toast";

const LEAD_COLUMNS = [
  { status: "new" as LeadStatus, title: "Новые" },
  { status: "contacted" as LeadStatus, title: "В контакте" },
  { status: "qualified" as LeadStatus, title: "Квалифицированы" },
  { status: "won" as LeadStatus, title: "Успех" },
  { status: "lost" as LeadStatus, title: "Проиграны" },
];

export default function CRM() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      return await apiRequest("PATCH", `/api/leads/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const convertLeadToDealMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return await apiRequest("POST", `/api/leads/${leadId}/convert-to-deal`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({
        title: "Успешно",
        description: "Лид конвертирован в контакт и сделку",
      });
      setIsModalOpen(false);
      setSelectedLead(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось конвертировать лид",
        variant: "destructive",
      });
    },
  });

  const groupedLeads = LEAD_COLUMNS.reduce(
    (acc, { status }) => {
      acc[status] = leads.filter((lead) => lead.status === status);
      return acc;
    },
    {} as Record<LeadStatus, Lead[]>
  );

  const stats = [
    {
      title: "Всего лидов",
      value: leads.length.toString(),
      icon: Users,
      description: "Всего в системе",
      testId: "stat-total-leads",
    },
    {
      title: "Новые",
      value: groupedLeads.new?.length.toString() || "0",
      icon: TrendingUp,
      description: "Требуют внимания",
      testId: "stat-new-leads",
    },
    {
      title: "В работе",
      value: (
        (groupedLeads.contacted?.length || 0) + (groupedLeads.qualified?.length || 0)
      ).toString(),
      icon: Clock,
      description: "Активные лиды",
      testId: "stat-in-progress",
    },
    {
      title: "Завершено",
      value: (
        (groupedLeads.won?.length || 0) + (groupedLeads.lost?.length || 0)
      ).toString(),
      icon: CheckCircle,
      description: "Успешно + проиграны",
      testId: "stat-completed",
    },
  ];

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  };

  const isLeadStatus = (status: string): status is LeadStatus => {
    return ['new', 'contacted', 'qualified', 'won', 'lost'].includes(status);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;

    if (!over) return;

    const leadId = active.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Determine the target column status
    // If dropped on a column directly, over.id is the column status
    // If dropped on another card, we need to find which column it belongs to
    const overId = String(over.id);
    
    let newStatus: LeadStatus;
    
    // Check if over.id is a valid LeadStatus (column)
    if (isLeadStatus(overId)) {
      newStatus = overId;
    } else {
      // over.id is another lead's ID, find which column it's in
      const targetLead = leads.find((l) => l.id === overId);
      if (!targetLead) return;
      newStatus = targetLead.status as LeadStatus;
    }

    if (lead.status === newStatus) return;

    updateLeadMutation.mutate({ id: leadId, status: newStatus });
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleLeadDelete = (leadId: string) => {
    if (confirm("Вы уверены, что хотите удалить этот лид?")) {
      deleteLeadMutation.mutate(leadId);
    }
  };

  const handleConvertToDeal = (leadId: string) => {
    convertLeadToDealMutation.mutate(leadId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="page-crm">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full flex flex-col" data-testid="page-crm">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold">{t("nav.crm")}</h1>
          <p className="text-muted-foreground mt-2">
            Управление лидами и воронкой продаж
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onValueChange={setViewMode} />
          <Button data-testid="button-add-lead">
            <Plus className="h-4 w-4 mr-2" />
            Добавить лид
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
        {stats.map((stat) => (
          <Card key={stat.testId} data-testid={stat.testId}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto flex-1 min-h-0" data-testid="kanban-board">
            {LEAD_COLUMNS.map(({ status, title }) => (
              <div key={status} className="min-w-[280px] max-w-[320px] flex-1">
                <KanbanColumn
                  status={status}
                  title={title}
                  leads={groupedLeads[status] || []}
                  onLeadClick={handleLeadClick}
                />
              </div>
            ))}
          </div>
          <DragOverlay>
            {activeLead ? (
              <LeadCard lead={activeLead} onClick={() => {}} />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div data-testid="table-view" className="flex-1 min-h-0 overflow-auto">
          <LeadsTable
            leads={leads}
            onLeadClick={handleLeadClick}
            onLeadDelete={handleLeadDelete}
          />
        </div>
      )}

      <LeadDetailModal
        lead={selectedLead}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConvertToDeal={handleConvertToDeal}
        isConvertingToDeal={convertLeadToDealMutation.isPending}
      />
    </div>
  );
}
