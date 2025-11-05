import { Lead, LeadStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadCard } from "./LeadCard";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface KanbanColumnProps {
  status: LeadStatus;
  title: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-info text-info-foreground",
  contacted: "bg-warning text-warning-foreground",
  qualified: "bg-success text-success-foreground",
  won: "bg-success text-success-foreground",
  lost: "bg-muted text-muted-foreground",
};

export function KanbanColumn({ status, title, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });
  const leadIds = leads.map((lead) => lead.id);

  return (
    <div className="flex flex-col min-h-0 flex-1" data-testid={`kanban-column-${status}`}>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge className={STATUS_COLORS[status]} data-testid={`badge-count-${status}`}>
              {leads.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-0">
          <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
            <div ref={setNodeRef} className="space-y-3 min-h-full">
              {leads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm" data-testid={`empty-${status}`}>
                  Нет лидов
                </div>
              ) : (
                leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onLeadClick(lead)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
}
