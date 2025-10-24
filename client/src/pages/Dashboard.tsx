import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Calendar, Hotel } from "lucide-react";
import CityCard from "@/components/CityCard";
import type { City } from "@shared/schema";

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
  //todo: remove mock functionality
  const mockStats = {
    totalTourists: 24,
    activeCities: 4,
    upcomingArrivals: 8,
    totalHotels: 12,
  };

  const mockCityData = {
    Beijing: { touristCount: 12, hotels: ["Grand Hotel Beijing", "Beijing Palace Hotel", "Imperial Inn"] },
    Luoyang: { touristCount: 8, hotels: ["Luoyang Grand", "Dragon Hotel"] },
    Xian: { touristCount: 10, hotels: ["Xi'an Sheraton", "Imperial Hotel", "Terra Cotta Inn"] },
    Zhangjiajie: { touristCount: 6, hotels: ["Mountain View Hotel", "Avatar Resort"] },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold" data-testid="text-page-title">
          Обзор группового тура
        </h1>
        <p className="text-muted-foreground mt-2">
          Групповой тур по 4 городам Китая: Пекин → Лоян → Сиань → Чжанцзяцзе
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Всего туристов
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-tourists">
              {mockStats.totalTourists}
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
              {mockStats.activeCities}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Пекин, Лоян, Сиань, Чжанцзяцзе
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
              {mockStats.upcomingArrivals}
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
              {mockStats.totalHotels}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Партнерских отелей
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Города на маршруте</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(cityNames) as City[]).map((city) => (
            <CityCard
              key={city}
              city={city}
              cityNameCn={cityNames[city].cn}
              touristCount={mockCityData[city].touristCount}
              hotels={mockCityData[city].hotels}
              imageSrc={cityImages[city]}
              onClick={() => console.log(`Clicked ${city}`)}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Распределение туристов по городам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(Object.keys(cityNames) as City[]).map((city) => {
              const data = mockCityData[city];
              const percentage = (data.touristCount / mockStats.totalTourists) * 100;
              return (
                <div key={city} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cityNames[city].en}</span>
                      <span className="text-sm text-muted-foreground">
                        {cityNames[city].cn}
                      </span>
                    </div>
                    <Badge variant="secondary">{data.touristCount} туристов</Badge>
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
    </div>
  );
}
