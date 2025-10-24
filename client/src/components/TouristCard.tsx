import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, MapPin, Calendar, Plane, Train, Hotel, Pencil, Trash2 } from "lucide-react";
import type { TouristWithVisits, City } from "@shared/schema";

interface TouristCardProps {
  tourist: TouristWithVisits;
  onEdit?: () => void;
  onDelete?: () => void;
}

const cityNames: Record<City, { en: string; cn: string }> = {
  Beijing: { en: "Beijing", cn: "北京" },
  Luoyang: { en: "Luoyang", cn: "洛阳" },
  Xian: { en: "Xi'an", cn: "西安" },
  Zhangjiajie: { en: "Zhangjiajie", cn: "张家界" },
};

export default function TouristCard({ tourist, onEdit, onDelete }: TouristCardProps) {
  return (
    <Card data-testid={`card-tourist-${tourist.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg" data-testid={`text-tourist-name-${tourist.id}`}>
                {tourist.name}
              </CardTitle>
              <div className="flex flex-col gap-1 mt-1">
                {tourist.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{tourist.email}</span>
                  </div>
                )}
                {tourist.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{tourist.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                data-testid={`button-edit-${tourist.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                data-testid={`button-delete-${tourist.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Маршрут тура:</span>
            <Badge variant="secondary">{tourist.visits.length} городов</Badge>
          </div>
          <div className="space-y-2">
            {tourist.visits.map((visit, idx) => {
              const cityInfo = cityNames[visit.city as City];
              return (
                <div
                  key={visit.id}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`visit-${tourist.id}-${idx}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background border">
                    <span className="text-xs font-medium">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{cityInfo.en}</span>
                      <span className="text-sm text-muted-foreground">{cityInfo.cn}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(visit.arrivalDate).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        {visit.transportType === 'plane' ? (
                          <Plane className="h-3.5 w-3.5" />
                        ) : (
                          <Train className="h-3.5 w-3.5" />
                        )}
                        <span>{visit.transportType === 'plane' ? 'Самолет' : 'Поезд'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Hotel className="h-3.5 w-3.5" />
                        <span className="truncate">{visit.hotelName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
