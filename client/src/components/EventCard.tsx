import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, MapPin, Users, DollarSign, ArrowRight, Pencil, Copy, Trash2, Archive } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ColorIndicator, type ColorOption } from "@/components/ColorPicker";
import type { Event } from "@shared/schema";
import { useAuth } from "@/lib/auth";

// Helper function to translate tour type to Russian
function getTourTypeLabel(tourType: string): string {
  const labels: Record<string, string> = {
    group: "Групповой",
    individual: "Индивидуальный",
    excursion: "Экскурсия",
    transfer: "Трансфер",
  };
  return labels[tourType] || tourType;
}

interface EventWithStats extends Event {
  bookedCount: number;
  availableSpots: number;
}

interface EventCardProps {
  event: EventWithStats;
  onViewSummary: (eventId: string) => void;
  onEdit: (event: Event) => void;
  onCopy: (event: Event) => void;
  onDelete: (eventId: string) => void;
}

export function EventCard({ event, onViewSummary, onEdit, onCopy, onDelete }: EventCardProps) {
  const { user } = useAuth();
  const canModify = user?.role === "admin"; // Only admins can modify/delete events
  const availablePercentage = (event.availableSpots / event.participantLimit) * 100;
  
  const getStatusClasses = () => {
    if (availablePercentage === 0 || availablePercentage < 10) {
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800";
    }
    if (availablePercentage <= 30) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800";
    }
    return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800";
  };

  const getStatusText = () => {
    if (event.availableSpots === 0) {
      return "Группа заполнена";
    }
    if (availablePercentage < 10) {
      return `Осталось ${event.availableSpots} мест`;
    }
    return `${event.availableSpots} мест доступно`;
  };

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-event-${event.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <ColorIndicator color={event.color as ColorOption} />
            <CardTitle className="text-lg" data-testid={`text-event-name-${event.id}`}>
              {event.name}
            </CardTitle>
            {event.tourType && (
              <Badge variant="secondary" data-testid={`badge-tour-type-${event.id}`}>
                {getTourTypeLabel(event.tourType)}
              </Badge>
            )}
            {event.isArchived && (
              <Badge variant="outline" className="gap-1" data-testid={`badge-archived-${event.id}`}>
                <Archive className="h-3 w-3" />
                Архив
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canModify && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onCopy(event)}
                  data-testid={`button-copy-event-${event.id}`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(event)}
                  data-testid={`button-edit-event-${event.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
            <Badge className={getStatusClasses()} data-testid={`badge-status-${event.id}`}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{event.country}:</span>
            <span className="font-medium" data-testid={`text-cities-${event.id}`}>
              {event.cities.join(", ")}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span data-testid={`text-dates-${event.id}`}>
              {format(new Date(event.startDate), "d MMM", { locale: ru })} - {format(new Date(event.endDate), "d MMM yyyy", { locale: ru })}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span data-testid={`text-participants-${event.id}`}>
              {event.bookedCount} / {event.participantLimit} участников
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold" data-testid={`text-price-${event.id}`}>
              {Number(event.price).toLocaleString()} ₽
            </span>
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${event.id}`}>
            {event.description}
          </p>
        )}

        <div className="pt-2 space-y-2">
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => onViewSummary(event.id)}
            data-testid={`button-view-summary-${event.id}`}
          >
            Сводная таблица
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          {canModify && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full" 
                  variant="outline"
                  data-testid={`button-delete-event-${event.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить тур?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы действительно хотите удалить тур "{event.name}"? Это действие нельзя отменить.
                    {event.bookedCount > 0 && (
                      <span className="block mt-2 text-destructive font-semibold">
                        Внимание: В этом туре {event.bookedCount} участников!
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(event.id)}
                    className="bg-destructive hover:bg-destructive/90"
                    data-testid="button-confirm-delete"
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
