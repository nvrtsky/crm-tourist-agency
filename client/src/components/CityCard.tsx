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
      className="overflow-hidden hover-elevate cursor-pointer border-t-4 border-t-primary shadow-lg transition-all duration-300"
      onClick={onClick}
      data-testid={`card-city-${city.toLowerCase()}`}
    >
      <div className="relative h-48">
        <img
          src={imageSrc}
          alt={`${city} - ${cityNameCn}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6">
          <CardTitle className="text-white text-2xl font-bold tracking-wide">
            {city}
          </CardTitle>
          <p className="text-white/95 text-base font-medium mt-1">{cityNameCn}</p>
        </div>
      </div>
      <CardHeader className="pb-4 pt-6">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Город на маршруте</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Туристов</span>
          </div>
          <Badge variant="default" className="text-base font-bold px-4 py-1" data-testid={`badge-tourist-count-${city.toLowerCase()}`}>
            {touristCount}
          </Badge>
        </div>
        <div>
          <div className="flex items-center gap-3 text-sm mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Hotel className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Отели</span>
          </div>
          <div className="flex flex-wrap gap-2 pl-13">
            {hotels.slice(0, 3).map((hotel, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs font-medium"
                data-testid={`badge-hotel-${city.toLowerCase()}-${idx}`}
              >
                {hotel}
              </Badge>
            ))}
            {hotels.length > 3 && (
              <Badge variant="secondary" className="text-xs font-medium">
                +{hotels.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
