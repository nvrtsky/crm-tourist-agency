import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Calendar, Hotel, Loader2, Database, Trash2, DollarSign, Bed } from "lucide-react";
import CityCard from "@/components/CityCard";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { City, TouristWithVisits } from "@shared/schema";
import { useTranslation } from "react-i18next";

import beijingImg from '@assets/generated_images/Beijing_Forbidden_City_landmark_8163e9fe.png';
import luoyangImg from '@assets/generated_images/Luoyang_Longmen_Grottoes_sculptures_ddd49a2d.png';
import xianImg from "@assets/generated_images/Xi'an_Terracotta_Warriors_site_4830e36b.png";
import zhangjiajieImg from '@assets/generated_images/Zhangjiajie_Avatar_Mountains_landscape_30f1cc22.png';
import shanghaiImg from '@assets/generated_images/Shanghai_Oriental_Pearl_Tower_skyline_97bf97cf.png';

const cityImages: Record<City, string> = {
  Beijing: beijingImg,
  Luoyang: luoyangImg,
  Xian: xianImg,
  Zhangjiajie: zhangjiajieImg,
  Shanghai: shanghaiImg,
};

const cityNames: Record<City, { en: string; cn: string }> = {
  Beijing: { en: "Beijing", cn: "北京" },
  Luoyang: { en: "Luoyang", cn: "洛阳" },
  Xian: { en: "Xi'an", cn: "西安" },
  Zhangjiajie: { en: "Zhangjiajie", cn: "张家界" },
  Shanghai: { en: "Shanghai", cn: "上海" },
};

export default function Dashboard() {
  const { entityId, entityTypeId } = useBitrix24();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Fetch tourists for current entity
  const { data: tourists, isLoading, error } = useQuery<TouristWithVisits[]>({
    queryKey: ["/api/tourists", entityId],
    enabled: !!entityId,
  });

  // Seed test data mutation
  const seedDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seed-tourists", { entityId, entityTypeId });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourists", entityId] });
      toast({
        title: t("dashboard.dataLoaded"),
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("dashboard.loadDataError") || "Failed to load test data",
        variant: "destructive",
      });
    },
  });

  // Clear all data mutation
  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/tourists/entity/${entityId}`);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourists", entityId] });
      toast({
        title: t("dashboard.dataCleared"),
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("dashboard.clearDataError") || "Failed to clear data",
        variant: "destructive",
      });
    },
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
        revenueByRUB: 0,
        revenueByCNY: 0,
        averageRevenueRUB: 0,
        averageRevenueCNY: 0,
        touristsCountRUB: 0,
        touristsCountCNY: 0,
        hotelRoomStats: [] as Array<{
          city: City;
          hotelName: string;
          twinCount: number;
          doubleCount: number;
          totalRooms: number;
        }>,
      };
    }

    const cityData: Record<City, { touristCount: number; hotels: Set<string> }> = {
      Beijing: { touristCount: 0, hotels: new Set() },
      Luoyang: { touristCount: 0, hotels: new Set() },
      Xian: { touristCount: 0, hotels: new Set() },
      Zhangjiajie: { touristCount: 0, hotels: new Set() },
      Shanghai: { touristCount: 0, hotels: new Set() },
    };

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let upcomingArrivals = 0;

    // Financial metrics - separate by currency
    let revenueByRUB = 0;
    let revenueByCNY = 0;
    let touristsCountRUB = 0;
    let touristsCountCNY = 0;

    // Hotel room statistics
    const hotelRooms = new Map<string, { city: City; twin: number; double: number }>();

    tourists.forEach((tourist) => {
      // Calculate revenue per currency
      const amount = parseFloat(tourist.amount || "0");
      if (tourist.currency === "RUB") {
        revenueByRUB += amount;
        touristsCountRUB++;
      } else if (tourist.currency === "CNY") {
        revenueByCNY += amount;
        touristsCountCNY++;
      }

      tourist.visits.forEach((visit) => {
        const city = visit.city as City;
        if (cityData[city]) {
          cityData[city].touristCount++;
          cityData[city].hotels.add(visit.hotelName);

          const arrivalDate = new Date(visit.arrivalDate);
          if (arrivalDate >= now && arrivalDate <= nextWeek) {
            upcomingArrivals++;
          }

          // Count room types per hotel
          const hotelKey = `${city}:${visit.hotelName}`;
          if (!hotelRooms.has(hotelKey)) {
            hotelRooms.set(hotelKey, { city, twin: 0, double: 0 });
          }
          const hotelData = hotelRooms.get(hotelKey)!;
          if (visit.roomType === "twin") {
            hotelData.twin++;
          } else if (visit.roomType === "double") {
            hotelData.double++;
          }
        }
      });
    });

    const activeCities = Object.values(cityData).filter((c) => c.touristCount > 0).length;
    const allHotels = new Set<string>();
    Object.values(cityData).forEach((c) => {
      c.hotels.forEach((h) => allHotels.add(h));
    });

    // Convert hotel room stats to array
    const hotelRoomStats = Array.from(hotelRooms.entries()).map(([key, data]) => {
      const hotelName = key.split(":")[1];
      return {
        city: data.city,
        hotelName,
        twinCount: data.twin,
        doubleCount: data.double,
        totalRooms: data.twin + data.double,
      };
    }).sort((a, b) => a.city.localeCompare(b.city));

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
      revenueByRUB,
      revenueByCNY,
      averageRevenueRUB: touristsCountRUB > 0 ? revenueByRUB / touristsCountRUB : 0,
      averageRevenueCNY: touristsCountCNY > 0 ? revenueByCNY / touristsCountCNY : 0,
      touristsCountRUB,
      touristsCountCNY,
      hotelRoomStats,
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => seedDataMutation.mutate()}
          disabled={seedDataMutation.isPending}
          data-testid="button-seed-data"
        >
          {seedDataMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          {t("dashboard.seedData")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearDataMutation.mutate()}
          disabled={clearDataMutation.isPending || stats.totalTourists === 0}
          data-testid="button-clear-data"
        >
          {clearDataMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          {t("dashboard.clearData")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.totalTourists")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-tourists">
              {stats.totalTourists}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.registeredInTour")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.cityRoute")}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-cities">
              {stats.activeCities} / 5
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.citiesWithTourists")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.upcomingArrivals")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-upcoming-arrivals">
              {stats.upcomingArrivals}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.nextSevenDays")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.hotels")}
            </CardTitle>
            <Hotel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-hotels">
              {stats.totalHotels}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.usedHotels")}
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.totalTourists > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{t("dashboard.financialSummary")}</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {stats.touristsCountRUB > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">RUB</Badge>
                    <span className="text-sm text-muted-foreground">
                      {stats.touristsCountRUB} {stats.touristsCountRUB === 1 ? t("tourist.name") : t("tourist.name")}
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold" data-testid="stat-revenue-rub">
                      {stats.revenueByRUB.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("dashboard.totalAmount")}
                    </p>
                  </div>
                  <div>
                    <div className="text-xl font-semibold" data-testid="stat-average-revenue-rub">
                      {stats.averageRevenueRUB.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("dashboard.averageCheck")}
                    </p>
                  </div>
                </div>
              )}
              {stats.touristsCountCNY > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">CNY</Badge>
                    <span className="text-sm text-muted-foreground">
                      {stats.touristsCountCNY} {stats.touristsCountCNY === 1 ? t("tourist.name") : t("tourist.name")}
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold" data-testid="stat-revenue-cny">
                      {stats.revenueByCNY.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ¥
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("dashboard.totalAmount")}
                    </p>
                  </div>
                  <div>
                    <div className="text-xl font-semibold" data-testid="stat-average-revenue-cny">
                      {stats.averageRevenueCNY.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ¥
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("dashboard.averageCheck")}
                    </p>
                  </div>
                </div>
              )}
              {stats.touristsCountRUB === 0 && stats.touristsCountCNY === 0 && (
                <div className="col-span-2 text-center text-muted-foreground py-4">
                  {t("common.noData")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-semibold mb-4">{t("dashboard.citiesOnRoute")}</h2>
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
            <CardTitle>{t("dashboard.touristDistribution")}</CardTitle>
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
                        <span className="font-medium">{t(`cities.${city}`)}</span>
                        <span className="text-sm text-muted-foreground">
                          {cityNames[city].cn}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {data.touristCount} {data.touristCount === 1 ? t("tourist.name") : t("tourist.name")}
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

      {stats.hotelRoomStats.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{t("dashboard.hotelRoomSummary")}</CardTitle>
              <Bed className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.keys(cityNames) as City[]).map((city) => {
                const cityHotels = stats.hotelRoomStats.filter((h) => h.city === city);
                if (cityHotels.length === 0) return null;

                return (
                  <div key={city} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <span className="font-semibold">{t(`cities.${city}`)}</span>
                      <span className="text-sm text-muted-foreground">
                        {cityNames[city].cn}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {cityHotels.map((hotel) => (
                        <div
                          key={`${hotel.city}-${hotel.hotelName}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                        >
                          <div className="font-medium text-sm" data-testid={`hotel-${hotel.hotelName}`}>
                            {hotel.hotelName}
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {t("dashboard.twin")}
                              </Badge>
                              <span className="text-sm font-semibold" data-testid={`hotel-${hotel.hotelName}-twin`}>
                                {hotel.twinCount}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {t("dashboard.double")}
                              </Badge>
                              <span className="text-sm font-semibold" data-testid={`hotel-${hotel.hotelName}-double`}>
                                {hotel.doubleCount}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {t("common.total")}
                              </Badge>
                              <span className="text-sm font-bold" data-testid={`hotel-${hotel.hotelName}-total`}>
                                {hotel.totalRooms}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
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
