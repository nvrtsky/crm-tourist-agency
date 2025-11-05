import { Lead } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, User } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Вручную",
  bitrix24: "Bitrix24",
  form: "Форма",
  import: "Импорт",
  other: "Другое",
};

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`lead-card-${lead.id}`}
    >
      <Card
        className="cursor-pointer hover-elevate active-elevate-2"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate" data-testid="lead-name">
                {lead.name}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {SOURCE_LABELS[lead.source] || lead.source}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {lead.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate" data-testid="lead-email">
                {lead.email}
              </span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate" data-testid="lead-phone">
                {lead.phone}
              </span>
            </div>
          )}
          {lead.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2" data-testid="lead-notes">
              {lead.notes}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
