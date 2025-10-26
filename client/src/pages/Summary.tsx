import { useQuery } from "@tanstack/react-query";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { TouristWithVisits, CITIES, City } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plane, Train, List, Grid, Share2, Link as LinkIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
import { utils, writeFile } from "xlsx";
import { useToast } from "@/hooks/use-toast";

const CITY_NAMES: Record<City, string> = {
  Beijing: "Пекин",
  Luoyang: "Лоян",
  Xian: "Сиань",
  Zhangjiajie: "Чжанцзяцзе",
};

export default function Summary() {
  const { entityId } = useBitrix24();
  const [isGrouped, setIsGrouped] = useState(false);
  const { toast } = useToast();

  const { data: tourists, isLoading } = useQuery<TouristWithVisits[]>({
    queryKey: ["/api/tourists", entityId],
    refetchOnMount: true,
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Ссылка скопирована",
        description: "Ссылка на сводную таблицу скопирована в буфер обмена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      });
    }
  };

  const handleExportToExcel = () => {
    if (!tourists || tourists.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нечего экспортировать",
        variant: "destructive",
      });
      return;
    }

    const data = tourists.map((tourist, index) => {
      const visitsByCity = CITIES.reduce((acc, city) => {
        const visit = tourist.visits.find(v => v.city === city);
        if (visit) {
          const arrivalDate = format(new Date(visit.arrivalDate), "dd.MM.yyyy", { locale: ru });
          const arrivalTime = visit.arrivalTime ? ` ${visit.arrivalTime}` : "";
          const departureDate = visit.departureDate 
            ? format(new Date(visit.departureDate), "dd.MM.yyyy", { locale: ru })
            : "";
          const departureTime = visit.departureTime ? ` ${visit.departureTime}` : "";
          acc[CITY_NAMES[city]] = departureDate 
            ? `${arrivalDate}${arrivalTime} - ${departureDate}${departureTime}` 
            : `${arrivalDate}${arrivalTime}`;
        } else {
          acc[CITY_NAMES[city]] = "—";
        }
        return acc;
      }, {} as Record<string, string>);

      const hotels = tourist.visits
        .map(v => v.hotelName)
        .filter((name, i, arr) => arr.indexOf(name) === i)
        .join(", ");

      const transports = tourist.visits
        .map(v => {
          const arrival = v.transportType === "plane" ? "Самолет" : "Поезд";
          const departure = v.departureTransportType 
            ? (v.departureTransportType === "plane" ? "Самолет" : "Поезд")
            : "";
          return departure ? `${arrival} → ${departure}` : arrival;
        })
        .join(", ");

      const flightNumbers = tourist.visits
        .map(v => v.flightNumber || "—")
        .join(", ");

      return {
        "№": index + 1,
        "Турист": tourist.name,
        "Телефон": tourist.phone || "—",
        ...visitsByCity,
        "Отели": hotels,
        "Транспорт": transports,
        "Номер рейса": flightNumbers,
      };
    });

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Туристы");

    const fileName = `tourists_summary_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
    writeFile(workbook, fileName);

    toast({
      title: "Экспорт завершен",
      description: `Файл ${fileName} загружен`,
    });
  };

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold truncate" data-testid="summary-title">
            Сводная таблица туристов
          </h1>
          <p className="text-sm text-muted-foreground">
            Всего туристов: {touristCount}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isGrouped ? "default" : "outline"}
            size="sm"
            onClick={() => setIsGrouped(!isGrouped)}
            data-testid="button-toggle-group"
            className="hidden sm:flex"
          >
            {isGrouped ? <List className="h-4 w-4 mr-2" /> : <Grid className="h-4 w-4 mr-2" />}
            {isGrouped ? "Разгруппировать" : "Сгруппировать"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" data-testid="button-share">
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Поделиться</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyLink} data-testid="menu-copy-link">
                <LinkIcon className="h-4 w-4 mr-2" />
                Копировать ссылку
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportToExcel} data-testid="menu-export-excel">
                <Download className="h-4 w-4 mr-2" />
                Экспорт в Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop: Table view */}
      <Card className="overflow-hidden hidden md:block">
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
                <th className="px-4 py-3 text-left text-sm font-medium border-b min-w-[120px]" data-testid="header-flight-number">
                  Номер рейса
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium border-b min-w-[160px]" data-testid="header-dates">
                  Даты (прибытие - выезд)
                </th>
              </tr>
            </thead>
            <tbody>
              {!tourists || tourists.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground" data-testid="empty-message">
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

                  const transports = tourist.visits.map(v => ({
                    arrival: v.transportType,
                    departure: v.departureTransportType,
                  }));
                  const dateRanges = tourist.visits.map(v => ({
                    arrival: v.arrivalDate,
                    departure: v.departureDate,
                  })).sort((a, b) => a.arrival.localeCompare(b.arrival));

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
                              <div className="flex flex-col gap-1">
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                  {format(new Date(visit.arrivalDate), "dd.MM", { locale: ru })}
                                  {visit.arrivalTime && <span className="text-muted-foreground"> {visit.arrivalTime}</span>}
                                  {visit.departureDate && (
                                    <span>
                                      {" - "}
                                      {format(new Date(visit.departureDate), "dd.MM", { locale: ru })}
                                      {visit.departureTime && <span className="text-muted-foreground"> {visit.departureTime}</span>}
                                    </span>
                                  )}
                                </Badge>
                              </div>
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
                        <div className="flex flex-col gap-1">
                          {transports.map((transport, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {transport.arrival === "plane" ? (
                                  <Plane className="h-3 w-3" />
                                ) : (
                                  <Train className="h-3 w-3" />
                                )}
                              </Badge>
                              {transport.departure && (
                                <>
                                  <span className="text-xs text-muted-foreground">→</span>
                                  <Badge variant="outline" className="text-xs">
                                    {transport.departure === "plane" ? (
                                      <Plane className="h-3 w-3" />
                                    ) : (
                                      <Train className="h-3 w-3" />
                                    )}
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" data-testid={`tourist-flight-number-${index}`}>
                        <div className="space-y-1">
                          {tourist.visits.map((visit, i) => (
                            <div key={i} className="text-xs">
                              {visit.flightNumber || "—"}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`tourist-dates-${index}`}>
                        <div className="space-y-1">
                          {dateRanges.map((range, i) => (
                            <div key={i} className="text-xs whitespace-nowrap">
                              {format(new Date(range.arrival), "dd.MM.yyyy", { locale: ru })}
                              {range.departure && (
                                <> - {format(new Date(range.departure), "dd.MM.yyyy", { locale: ru })}</>
                              )}
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
                  <td colSpan={8} className="px-4 py-3 text-sm text-muted-foreground">
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {!tourists || tourists.length === 0 ? (
          <Card className="p-8">
            <p className="text-center text-muted-foreground" data-testid="empty-message-mobile">
              Туристы не добавлены
            </p>
          </Card>
        ) : (
          tourists.map((tourist, index) => {
            const visitsByCity = CITIES.reduce((acc, city) => {
              acc[city] = tourist.visits.find(v => v.city === city);
              return acc;
            }, {} as Record<City, typeof tourist.visits[0] | undefined>);

            const hotels = tourist.visits
              .map(v => v.hotelName)
              .filter((name, i, arr) => arr.indexOf(name) === i);

            const transports = tourist.visits.map(v => ({
              arrival: v.transportType,
              departure: v.departureTransportType,
            }));

            return (
              <Card key={tourist.id} data-testid={`tourist-card-mobile-${index}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
                        <h3 className="font-semibold truncate" data-testid={`tourist-card-name-${index}`}>
                          {tourist.name}
                        </h3>
                      </div>
                      {tourist.phone && (
                        <p className="text-sm text-muted-foreground mt-1">{tourist.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Города:</div>
                    <div className="flex flex-wrap gap-1">
                      {CITIES.map((city) => {
                        const visit = visitsByCity[city];
                        return visit ? (
                          <div key={city} className="flex flex-col gap-0.5">
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                              {CITY_NAMES[city]} {format(new Date(visit.arrivalDate), "dd.MM", { locale: ru })}
                              {visit.arrivalTime && <span className="text-muted-foreground"> {visit.arrivalTime}</span>}
                              {visit.departureDate && (
                                <>
                                  {" - "}
                                  {format(new Date(visit.departureDate), "dd.MM", { locale: ru })}
                                  {visit.departureTime && <span className="text-muted-foreground"> {visit.departureTime}</span>}
                                </>
                              )}
                            </Badge>
                            {visit.flightNumber && (
                              <span className="text-xs text-muted-foreground pl-1">
                                Рейс: {visit.flightNumber}
                              </span>
                            )}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {hotels.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Отели:</div>
                      <div className="text-sm">
                        {hotels.map((hotel, i) => (
                          <div key={i}>{hotel}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {transports.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Транспорт:</div>
                      <div className="flex flex-wrap gap-2">
                        {transports.map((transport, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {transport.arrival === "plane" ? (
                                <>
                                  <Plane className="h-3 w-3 mr-1" />
                                  Самолет
                                </>
                              ) : (
                                <>
                                  <Train className="h-3 w-3 mr-1" />
                                  Поезд
                                </>
                              )}
                            </Badge>
                            {transport.departure && (
                              <>
                                <span className="text-xs text-muted-foreground">→</span>
                                <Badge variant="outline" className="text-xs">
                                  {transport.departure === "plane" ? (
                                    <>
                                      <Plane className="h-3 w-3 mr-1" />
                                      Самолет
                                    </>
                                  ) : (
                                    <>
                                      <Train className="h-3 w-3 mr-1" />
                                      Поезд
                                    </>
                                  )}
                                </Badge>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Mobile: Total */}
      {tourists && tourists.length > 0 && (
        <Card className="md:hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Итого:</span>
              <span className="text-sm font-medium">{touristCount} туристов</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
