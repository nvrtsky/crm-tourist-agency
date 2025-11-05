import { Deal, Contact } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, User, Calendar, TrendingUp } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DealCardProps {
  deal: Deal;
  contact?: Contact | null;
  onClick: () => void;
}

export function DealCard({ deal, contact, onClick }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`deal-card-${deal.id}`}
    >
      <Card
        className="cursor-pointer hover-elevate active-elevate-2"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="space-y-2">
            <h3 className="font-medium line-clamp-2 leading-tight" data-testid="deal-title">
              {deal.title}
            </h3>
            {deal.amount && (
              <div className="flex items-center gap-2 text-primary font-semibold">
                <DollarSign className="h-4 w-4 flex-shrink-0" />
                <span data-testid="deal-amount">{formatAmount(deal.amount)}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {contact && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate" data-testid="deal-contact">
                {contact.name}
              </span>
            </div>
          )}
          {deal.probability !== null && deal.probability !== 50 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-3 w-3 flex-shrink-0" />
              <span data-testid="deal-probability">{deal.probability}%</span>
            </div>
          )}
          {deal.expectedCloseDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span data-testid="deal-close-date">
                {formatDate(deal.expectedCloseDate)}
              </span>
            </div>
          )}
          {deal.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2" data-testid="deal-notes">
              {deal.notes}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
