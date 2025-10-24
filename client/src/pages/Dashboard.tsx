import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Calendar, Hotel, Loader2 } from "lucide-react";
import CityCard from "@/components/CityCard";
import { useBitrix24 } from "@/hooks/useBitrix24";
import type { City, TouristWithVisits } from "@shared/schema";

import beijingImg from '@assets/generated_images/Beijing_Forbidden_City_landmark_8163e9fe.png';
import luoyangImg from '@assets/generated_images/Luoyang_Longmen_Grottoes_sculptures_ddd49a2d.png';
import xianImg from "@assets/generated_images/Xi'an_Terracotta_Warriors_site_4830e36b.png";
import zhangjiajieImg from '@assets/generated_images/Zhangjiajie_Avatar_Mountains_landscape_30f1cc22.png';

const cityImages: Record<City, string> = {
  Beijing: beijingImg,
  Luoyang: luoyangImg,
  Xian: xianImg,
  Zhangjiajie: zhangjiajieImg,
};

const cityNames: Record<City, { en: string; cn: string }> = {
  Beijing: { en: "Beijing", cn: "北京" },
  Luoyang: { en: "Luoyang", cn: "洛阳" },
  Xian: { en: "Xi'an", cn: "西安" },
  Zhangjiajie: { en: "Zhangjiajie", cn: "张家界" },
};

export default function Dashboard() {
  const { entityId } = useBitrix24();

  // Fetch tourists for current entity
  const { data: tourists, isLoading } = useQuery<TouristWithVisits[]>({
    queryKey: ["/api/tourists", entityId],
    enabled: !!entityId,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!tourists) {
      return {
        totalTourists: 0,
        activeCities: 0,
        upcomingArrivals: 0,
        totalHotels: 0,
        cityData: {} as Record<City, { touristCount: number; hotels: string[] }>,
      };
    }

    const cityData: Record<City, { touristCount: number; hotels: Set<string> }> = {
      Beijing: { touristCount: 0, hotels: new Set() },
      Luoyang: { touristCount: 0, hotels: new Set() },
      Xian: { touristCount: 0, hotels: new Set() },
      Zhangjiajie: { touristCount: 0, hotels: new Set() },
    };

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let upcomingArrivals = 0;

    tourists.forEach((tourist) => {
      tourist.visits.forEach((visit) => {
        const city = visit.city as City;
        if (cityData[city]) {
          cityData[city].touristCount++;
          cityData[city].hotels.add(visit.hotelName);

          const arrivalDate = new Date(visit.arrivalDate);
          if (arrivalDate >= now && arrivalDate <= nextWeek) {
            upcomingArrivals++;
          }
        }
      });
    });

    const activeCities = Object.values(cityData).filter((c) => c.touristCount > 0).length;
    const allHotels = new Set<string>();
    Object.values(cityData).forEach((c) => {
      c.hotels.forEach((h) => allHotels.add(h));
    });

    return {
      totalTourists: tourists.length,
      activeCities,
      upcomingArrivals,
      totalHotels: allHotels.size,
      cityData: Object.fromEntries(
        Object.entries(cityData).map(([city, data]) => [
          city,
          {
            touristCount: data.touristCount,
            hotels: Array.from(data.hotels),
          },
        ])
      ) as Record<City, { touristCount: number; hotels: string[] }>,
    };
  }, [tourists]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Обзор группового тура
        </h1>
        <p className="text-muted-foreground mt-1">
          Групповой тур по 4 городам Китая: Пекин → Лоян → Сиань → Чжанцзяцзе
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего туристов
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-tourists">
              {stats.totalTourists}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Зарегистрировано в туре
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Города маршрута
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-cities">
              {stats.activeCities} / 4
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Городов с туристами
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Предстоящие прибытия
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-upcoming-arrivals">
              {stats.upcomingArrivals}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              В ближайшие 7 дней
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Отели
            </CardTitle>
            <Hotel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-hotels">
              {stats.totalHotels}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Используемых отелей
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Города на маршруте</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(cityNames) as City[]).map((city) => (
            <CityCard
              key={city}
              city={city}
              cityNameCn={cityNames[city].cn}
              touristCount={stats.cityData[city]?.touristCount || 0}
              hotels={stats.cityData[city]?.hotels || []}
              imageSrc={cityImages[city]}
              onClick={() => console.log(`Clicked ${city}`)}
            />
          ))}
        </div>
      </div>

      {stats.totalTourists > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Распределение туристов по городам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(Object.keys(cityNames) as City[]).map((city) => {
                const data = stats.cityData[city];
                const percentage = stats.totalTourists > 0
                  ? (data.touristCount / stats.totalTourists) * 100
                  : 0;
                return (
                  <div key={city} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cityNames[city].en}</span>
                        <span className="text-sm text-muted-foreground">
                          {cityNames[city].cn}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {data.touristCount} {data.touristCount === 1 ? "турист" : "туристов"}
                      </Badge>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
