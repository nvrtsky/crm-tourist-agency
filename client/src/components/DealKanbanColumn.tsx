import { Deal, Contact } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DealCard } from "./DealCard";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export type DealStatus = "new" | "negotiation" | "payment" | "confirmed" | "cancelled";

interface DealKanbanColumnProps {
  status: DealStatus;
  title: string;
  deals: Deal[];
  contacts: Map<string, Contact>;
  onDealClick: (deal: Deal) => void;
}

const STATUS_COLORS: Record<DealStatus, string> = {
  new: "bg-info text-info-foreground",
  negotiation: "bg-warning text-warning-foreground",
  payment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  confirmed: "bg-success text-success-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function DealKanbanColumn({ 
  status, 
  title, 
  deals, 
  contacts,
  onDealClick 
}: DealKanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });
  const dealIds = deals.map((deal) => deal.id);

  return (
    <div className="flex flex-col min-h-0 flex-1" data-testid={`deal-kanban-column-${status}`}>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge className={STATUS_COLORS[status]} data-testid={`deal-badge-count-${status}`}>
              {deals.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-0">
          <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
            <div ref={setNodeRef} className="space-y-3 min-h-full">
              {deals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm" data-testid={`deal-empty-${status}`}>
                  Нет сделок
                </div>
              ) : (
                deals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    contact={contacts.get(deal.contactId)}
                    onClick={() => onDealClick(deal)}
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
