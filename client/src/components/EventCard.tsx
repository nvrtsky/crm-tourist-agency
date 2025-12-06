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
import { Calendar, MapPin, Users, ArrowRight, Pencil, Copy, Trash2, Archive } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ColorIndicator, type ColorOption, type ColorDisplayMode, getColorDisplayMode, getPastelClasses } from "@/components/ColorPicker";
import type { Event, EventWithStats } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";

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

interface EventCardProps {
  event: EventWithStats;
  onViewSummary: (eventId: string) => void;
  onEdit?: (event: Event) => void;
  onCopy?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
}

export function EventCard({ event, onViewSummary, onEdit, onCopy, onDelete }: EventCardProps) {
  const { user } = useAuth();
  const canModify = (user?.role === "admin" || user?.role === "manager") && (onEdit || onCopy || onDelete); // Admins and managers can modify/delete events if handlers provided
  const availablePercentage = (event.availableSpots / event.participantLimit) * 100;
  
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
  
  const eventColor = event.color as ColorOption;
  const pastelClasses = eventColor ? getPastelClasses(eventColor) : { bg: "", border: "" };
  const showFill = (colorDisplayMode === "fill" || colorDisplayMode === "both") && eventColor;
  const showDot = (colorDisplayMode === "dot" || colorDisplayMode === "both");
  
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
    <Card className={`overflow-hidden hover-elevate ${showFill ? `${pastelClasses.bg} ${pastelClasses.border} border` : ""}`} data-testid={`card-event-${event.id}`}>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="space-y-2">
          {/* Title row - name on its own line for better visibility */}
          <div className="flex items-center gap-1 sm:gap-2">
            {showDot && <ColorIndicator color={eventColor} />}
            <CardTitle className="text-base sm:text-lg line-clamp-2" data-testid={`text-event-name-${event.id}`}>
              {event.name}
            </CardTitle>
          </div>
          {/* Action buttons row */}
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            <div className="flex items-center gap-0.5 sm:gap-1">
              {canModify && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 sm:h-9 sm:w-9"
                    onClick={() => onCopy?.(event)}
                    data-testid={`button-copy-event-${event.id}`}
                  >
                    <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 sm:h-9 sm:w-9"
                    onClick={() => onEdit?.(event)}
                    data-testid={`button-edit-event-${event.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 sm:h-9 sm:w-9"
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                          onClick={() => onDelete?.(event.id)}
                          className="bg-destructive hover:bg-destructive/90"
                          data-testid="button-confirm-delete"
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
            <Badge className={`${getStatusClasses()} text-[10px] sm:text-xs whitespace-nowrap`} data-testid={`badge-status-${event.id}`}>
              {getStatusText()}
            </Badge>
          </div>
          {/* Badges row */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {event.tourType && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs" data-testid={`badge-tour-type-${event.id}`}>
                {getTourTypeLabel(event.tourType)}
              </Badge>
            )}
            {event.isArchived && (
              <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs" data-testid={`badge-archived-${event.id}`}>
                <Archive className="h-3 w-3" />
                Архив
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-muted-foreground">{event.country}: </span>
              <span className="font-medium" data-testid={`text-cities-${event.id}`}>
                {event.cities.join(", ")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <span data-testid={`text-dates-${event.id}`}>
              {format(new Date(event.startDate), "d MMM", { locale: ru })} - {format(new Date(event.endDate), "d MMM yyyy", { locale: ru })}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-wrap">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <span data-testid={`text-participants-${event.id}`}>
              {event.bookedCount} / {event.participantLimit} участников
            </span>
            
            {/* Status badges inline */}
            {event.statusCounts && (event.statusCounts.pending > 0 || event.statusCounts.confirmed > 0 || event.statusCounts.cancelled > 0) && (
              <>
                {event.statusCounts.confirmed > 0 && (
                  <Badge 
                    variant="default" 
                    className="bg-green-700 dark:bg-green-800 text-white border-green-800 dark:border-green-900 text-[10px] sm:text-xs"
                    data-testid={`badge-confirmed-${event.id}`}
                  >
                    {event.statusCounts.confirmed} Подтв.
                  </Badge>
                )}
                {event.statusCounts.pending > 0 && (
                  <Badge 
                    variant="outline" 
                    className="bg-[#f4a825] dark:bg-[#f4a825] text-white dark:text-white !border-[#d89420] text-[10px] sm:text-xs"
                    data-testid={`badge-pending-${event.id}`}
                  >
                    {event.statusCounts.pending} Ожид.
                  </Badge>
                )}
                {event.statusCounts.cancelled > 0 && (
                  <Badge 
                    variant="destructive"
                    className="text-[10px] sm:text-xs"
                    data-testid={`badge-cancelled-${event.id}`}
                  >
                    {event.statusCounts.cancelled} Отм.
                  </Badge>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <span className="font-semibold" data-testid={`text-price-${event.id}`}>
              {formatCurrency(event.price)} ₽
            </span>
          </div>
        </div>

        {event.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${event.id}`}>
            {event.description}
          </p>
        )}

        <div className="pt-1 sm:pt-2">
          <Button 
            className="w-full h-8 sm:h-9 text-xs sm:text-sm" 
            variant="outline"
            onClick={() => onViewSummary(event.id)}
            data-testid={`button-view-summary-${event.id}`}
          >
            Сводная таблица
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5 sm:ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
