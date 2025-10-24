import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Hotel } from "lucide-react";
import type { City } from "@shared/schema";

interface CityCardProps {
  city: City;
  cityNameCn: string;
  touristCount: number;
  hotels: string[];
  imageSrc: string;
  onClick?: () => void;
}

export default function CityCard({
  city,
  cityNameCn,
  touristCount,
  hotels,
  imageSrc,
  onClick,
}: CityCardProps) {
  return (
    <Card
      className="overflow-hidden hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`card-city-${city.toLowerCase()}`}
    >
      <div className="relative h-32">
        <img
          src={imageSrc}
          alt={`${city} - ${cityNameCn}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-4 right-4">
          <CardTitle className="text-white text-xl font-semibold">
            {city}
          </CardTitle>
          <p className="text-white/90 text-sm font-medium">{cityNameCn}</p>
        </div>
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Город на маршруте</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Туристов:</span>
          </div>
          <Badge variant="secondary" data-testid={`badge-tourist-count-${city.toLowerCase()}`}>
            {touristCount}
          </Badge>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm mb-2">
            <Hotel className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Отели:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {hotels.slice(0, 3).map((hotel, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs"
                data-testid={`badge-hotel-${city.toLowerCase()}-${idx}`}
              >
                {hotel}
              </Badge>
            ))}
            {hotels.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{hotels.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
