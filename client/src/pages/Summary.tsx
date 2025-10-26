import { useQuery } from "@tanstack/react-query";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { TouristWithVisits, CITIES, City } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Plane, Train, List, Grid } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";

const CITY_NAMES: Record<City, string> = {
  Beijing: "Пекин",
  Luoyang: "Лоян",
  Xian: "Сиань",
  Zhangjiajie: "Чжанцзяцзе",
};

export default function Summary() {
  const { entityId } = useBitrix24();
  const [isGrouped, setIsGrouped] = useState(false);

  const { data: tourists, isLoading } = useQuery<TouristWithVisits[]>({
    queryKey: ["/api/tourists", entityId],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-summary" />
      </div>
    );
  }

  const touristCount = tourists?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="summary-title">
            Сводная таблица туристов
          </h1>
          <p className="text-sm text-muted-foreground">
            Всего туристов: {touristCount}
          </p>
        </div>
        <Button
          variant={isGrouped ? "default" : "outline"}
          size="sm"
          onClick={() => setIsGrouped(!isGrouped)}
          data-testid="button-toggle-group"
        >
          {isGrouped ? <List className="h-4 w-4 mr-2" /> : <Grid className="h-4 w-4 mr-2" />}
          {isGrouped ? "Разгруппировать" : "Сгруппировать"}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium border-b" data-testid="header-number">
                  #
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium border-b min-w-[200px]" data-testid="header-name">
                  Туристы
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium border-b min-w-[140px]" data-testid="header-phone">
                  Телефон
                </th>
                {CITIES.map((city) => (
                  <th
                    key={city}
                    className="px-4 py-3 text-left text-sm font-medium border-b min-w-[120px]"
                    data-testid={`header-city-${city.toLowerCase()}`}
                  >
                    {CITY_NAMES[city]}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-sm font-medium border-b min-w-[180px]" data-testid="header-hotels">
                  Отели
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium border-b min-w-[120px]" data-testid="header-transport">
                  Транспорт
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium border-b min-w-[160px]" data-testid="header-dates">
                  Даты прибытия
                </th>
              </tr>
            </thead>
            <tbody>
              {!tourists || tourists.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground" data-testid="empty-message">
                    Туристы не добавлены
                  </td>
                </tr>
              ) : (
                tourists.map((tourist, index) => {
                  const visitsByCity = CITIES.reduce((acc, city) => {
                    acc[city] = tourist.visits.find(v => v.city === city);
                    return acc;
                  }, {} as Record<City, typeof tourist.visits[0] | undefined>);

                  const hotels = tourist.visits
                    .map(v => v.hotelName)
                    .filter((name, i, arr) => arr.indexOf(name) === i);

                  const transports = tourist.visits.map(v => v.transportType);
                  const dates = tourist.visits.map(v => v.arrivalDate).sort();

                  return (
                    <tr
                      key={tourist.id}
                      className="hover-elevate border-b last:border-b-0"
                      data-testid={`tourist-row-${index}`}
                    >
                      <td className="px-4 py-3 text-sm" data-testid={`tourist-number-${index}`}>
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" data-testid={`tourist-name-${index}`}>
                        {tourist.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`tourist-phone-${index}`}>
                        {tourist.phone || "—"}
                      </td>
                      {CITIES.map((city) => {
                        const visit = visitsByCity[city];
                        return (
                          <td
                            key={city}
                            className="px-4 py-3 text-sm"
                            data-testid={`tourist-${index}-city-${city.toLowerCase()}`}
                          >
                            {visit ? (
                              <Badge variant="secondary" className="text-xs">
                                {format(new Date(visit.arrivalDate), "dd.MM", { locale: ru })}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-sm" data-testid={`tourist-hotels-${index}`}>
                        <div className="space-y-1">
                          {hotels.map((hotel, i) => (
                            <div key={i} className="text-xs truncate" title={hotel}>
                              {hotel}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3" data-testid={`tourist-transport-${index}`}>
                        <div className="flex gap-1">
                          {transports.map((type, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {type === "plane" ? (
                                <Plane className="h-3 w-3" />
                              ) : (
                                <Train className="h-3 w-3" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`tourist-dates-${index}`}>
                        <div className="space-y-1">
                          {dates.map((date, i) => (
                            <div key={i} className="text-xs">
                              {format(new Date(date), "dd.MM.yyyy", { locale: ru })}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {tourists && tourists.length > 0 && (
              <tfoot className="bg-muted/50 border-t-2">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold" data-testid="footer-total-label">
                    Итого:
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" data-testid="footer-total-count">
                    {touristCount} туристов
                  </td>
                  <td colSpan={7} className="px-4 py-3 text-sm text-muted-foreground">
                    {/* Дополнительная статистика может быть добавлена здесь */}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
