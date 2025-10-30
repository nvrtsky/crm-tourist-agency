import { useQuery } from "@tanstack/react-query";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { TouristWithVisits, CITIES, City } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Shanghai: "Шанхай",
};

export default function Summary() {
  const { entityId } = useBitrix24();
  const [isGrouped, setIsGrouped] = useState(false);
  const [selectedTourists, setSelectedTourists] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: tourists, isLoading } = useQuery<TouristWithVisits[]>({
    queryKey: ["/api/tourists", entityId],
    refetchOnMount: true,
  });

  const toggleSelectAll = () => {
    if (!tourists) return;
    if (selectedTourists.size === tourists.length) {
      setSelectedTourists(new Set());
    } else {
      setSelectedTourists(new Set(tourists.map(t => t.id)));
    }
  };

  const toggleTourist = (id: string) => {
    const newSelected = new Set(selectedTourists);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTourists(newSelected);
  };

  // Group tourists by dealId when isGrouped is true
  const getProcessedTourists = () => {
    if (!tourists || tourists.length === 0) return [];

    if (!isGrouped) {
      return tourists.map((tourist, index) => ({
        tourist,
        originalIndex: index,
        isFirstInGroup: false,
        groupIndex: 0,
        groupSize: 0,
        dealId: tourist.bitrixDealId,
      }));
    }

    // Group by dealId
    const grouped = tourists.reduce((acc, tourist) => {
      const dealId = tourist.bitrixDealId || 'no-deal';
      if (!acc[dealId]) {
        acc[dealId] = [];
      }
      acc[dealId].push(tourist);
      return acc;
    }, {} as Record<string, TouristWithVisits[]>);

    // Convert to array and sort groups
    const groupedArray = Object.entries(grouped).map(([dealId, tourists]) => ({
      dealId,
      tourists,
    }));

    // Sort groups by dealId (nulls last)
    groupedArray.sort((a, b) => {
      if (a.dealId === 'no-deal') return 1;
      if (b.dealId === 'no-deal') return -1;
      return a.dealId.localeCompare(b.dealId);
    });

    // Flatten with group metadata
    let currentIndex = 0;
    return groupedArray.flatMap((group, groupIndex) => 
      group.tourists.map((tourist, indexInGroup) => ({
        tourist,
        originalIndex: currentIndex++,
        isFirstInGroup: indexInGroup === 0,
        groupIndex,
        groupSize: group.tourists.length,
        dealId: group.dealId,
      }))
    );
  };

  const processedTourists = getProcessedTourists();

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

  const handleExportCity = (city: City) => {
    if (!tourists || tourists.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нечего экспортировать",
        variant: "destructive",
      });
      return;
    }

    const data = tourists.map((tourist, index) => {
      const visit = tourist.visits.find(v => v.city === city);
      let cityData = "—";
      
      if (visit) {
        const arrivalDate = format(new Date(visit.arrivalDate), "dd.MM.yyyy", { locale: ru });
        const arrivalTime = visit.arrivalTime ? ` ${visit.arrivalTime}` : "";
        const departureDate = visit.departureDate 
          ? format(new Date(visit.departureDate), "dd.MM.yyyy", { locale: ru })
          : "";
        const departureTime = visit.departureTime ? ` ${visit.departureTime}` : "";
        
        const dateRange = departureDate 
          ? `${arrivalDate}${arrivalTime} - ${departureDate}${departureTime}` 
          : `${arrivalDate}${arrivalTime}`;
        
        const hotel = `Отель: ${visit.hotelName}`;
        const roomType = visit.roomType ? `Тип: ${visit.roomType === "twin" ? "Twin" : "Double"}` : "";
        
        const arrivalParts = [
          visit.transportType === "plane" ? "Самолет" : "Поезд",
          visit.flightNumber ? `Рейс: ${visit.flightNumber}` : "",
          visit.airport ? `Аэропорт: ${visit.airport}` : "",
          visit.transfer ? `Трансфер: ${visit.transfer}` : "",
        ].filter(Boolean);
        
        const departureParts = [];
        if (visit.departureTransportType) {
          departureParts.push(visit.departureTransportType === "plane" ? "Самолет" : "Поезд");
          if (visit.departureFlightNumber) departureParts.push(`Рейс: ${visit.departureFlightNumber}`);
          if (visit.departureAirport) departureParts.push(`Аэропорт: ${visit.departureAirport}`);
          if (visit.departureTransfer) departureParts.push(`Трансфер: ${visit.departureTransfer}`);
        }
        
        const transport = departureParts.length > 0
          ? `Прибытие: ${arrivalParts.join(", ")}\nУбытие: ${departureParts.join(", ")}`
          : `Прибытие: ${arrivalParts.join(", ")}`;
        
        cityData = [dateRange, hotel, roomType, transport]
          .filter(Boolean)
          .join("\n");
      }

      const touristInfo = [
        tourist.name,
        tourist.phone || "",
        tourist.passport ? `Загранпаспорт: ${tourist.passport}` : "",
        tourist.birthDate ? `ДР: ${format(new Date(tourist.birthDate), "dd.MM.yyyy", { locale: ru })}` : "",
        tourist.amount ? `Сумма: ${tourist.amount} ${tourist.currency === "CNY" ? "¥" : "₽"}` : "",
        tourist.nights ? `Ночей: ${tourist.nights}` : "",
      ].filter(Boolean).join("\n");

      return {
        "№": index + 1,
        "Турист": touristInfo,
        [CITY_NAMES[city]]: cityData,
      };
    });

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, CITY_NAMES[city]);

    const fileName = `tourists_${city.toLowerCase()}_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
    writeFile(workbook, fileName);

    toast({
      title: "Экспорт завершен",
      description: `Файл ${fileName} загружен`,
    });
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
          
          const dateRange = departureDate 
            ? `${arrivalDate}${arrivalTime} - ${departureDate}${departureTime}` 
            : `${arrivalDate}${arrivalTime}`;
          
          const hotel = `Отель: ${visit.hotelName}`;
          const roomType = visit.roomType ? `Тип: ${visit.roomType === "twin" ? "Twin" : "Double"}` : "";
          
          const arrivalParts = [
            visit.transportType === "plane" ? "Самолет" : "Поезд",
            visit.flightNumber ? `Рейс: ${visit.flightNumber}` : "",
            visit.airport ? `Аэропорт: ${visit.airport}` : "",
            visit.transfer ? `Трансфер: ${visit.transfer}` : "",
          ].filter(Boolean);
          
          const departureParts = [];
          if (visit.departureTransportType) {
            departureParts.push(visit.departureTransportType === "plane" ? "Самолет" : "Поезд");
            if (visit.departureFlightNumber) departureParts.push(`Рейс: ${visit.departureFlightNumber}`);
            if (visit.departureAirport) departureParts.push(`Аэропорт: ${visit.departureAirport}`);
            if (visit.departureTransfer) departureParts.push(`Трансфер: ${visit.departureTransfer}`);
          }
          
          const transport = departureParts.length > 0
            ? `Прибытие: ${arrivalParts.join(", ")}\nУбытие: ${departureParts.join(", ")}`
            : `Прибытие: ${arrivalParts.join(", ")}`;
          
          acc[CITY_NAMES[city]] = [dateRange, hotel, roomType, transport]
            .filter(Boolean)
            .join("\n");
        } else {
          acc[CITY_NAMES[city]] = "—";
        }
        return acc;
      }, {} as Record<string, string>);

      const touristInfo = [
        tourist.name,
        tourist.phone || "",
        tourist.passport ? `Загранпаспорт: ${tourist.passport}` : "",
        tourist.birthDate ? `ДР: ${format(new Date(tourist.birthDate), "dd.MM.yyyy", { locale: ru })}` : "",
        tourist.amount ? `Сумма: ${tourist.amount} ${tourist.currency === "CNY" ? "¥" : "₽"}` : "",
        tourist.nights ? `Ночей: ${tourist.nights}` : "",
      ].filter(Boolean).join("\n");

      return {
        "№": index + 1,
        "Турист": touristInfo,
        ...visitsByCity,
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
                <th className="px-4 py-3 text-left border-b" data-testid="header-checkbox">
                  <Checkbox
                    checked={tourists && tourists.length > 0 && selectedTourists.size === tourists.length}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium border-b" data-testid="header-number">
                  #
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium border-b min-w-[280px]" data-testid="header-tourist">
                  Турист
                </th>
                {CITIES.map((city) => (
                  <th
                    key={city}
                    className="px-4 py-3 text-left text-sm font-medium border-b min-w-[220px]"
                    data-testid={`header-city-${city.toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{CITY_NAMES[city]}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleExportCity(city)}
                        className="h-6 w-6 shrink-0"
                        data-testid={`button-export-city-${city.toLowerCase()}`}
                        title={`Экспорт ${CITY_NAMES[city]}`}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!tourists || tourists.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground" data-testid="empty-message">
                    Туристы не добавлены
                  </td>
                </tr>
              ) : (
                processedTourists.map((item) => {
                  const { tourist, originalIndex, isFirstInGroup, groupIndex, groupSize, dealId } = item;
                  const visitsByCity = CITIES.reduce((acc, city) => {
                    acc[city] = tourist.visits.find(v => v.city === city);
                    return acc;
                  }, {} as Record<City, typeof tourist.visits[0] | undefined>);

                  // Alternating background for groups
                  const groupBgClass = isGrouped && groupIndex % 2 === 1 ? "bg-muted/30" : "";

                  return (
                    <>
                      {/* Group header - only show for first tourist in group when grouped */}
                      {isGrouped && isFirstInGroup && (
                        <tr key={`group-header-${dealId}`} className={`border-t-2 border-primary ${groupBgClass}`}>
                          <td colSpan={8} className="px-4 py-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <span>Сделка #{dealId === 'no-deal' ? 'Без сделки' : dealId}</span>
                              <Badge variant="outline" className="text-xs">
                                {groupSize} {groupSize === 1 ? 'турист' : groupSize < 5 ? 'туриста' : 'туристов'}
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {/* Tourist row */}
                      <tr
                        key={tourist.id}
                        className={`hover-elevate border-b last:border-b-0 ${groupBgClass}`}
                        data-testid={`tourist-row-${originalIndex}`}
                      >
                        <td className="px-4 py-3" data-testid={`tourist-checkbox-${originalIndex}`}>
                          <Checkbox
                            checked={selectedTourists.has(tourist.id)}
                            onCheckedChange={() => toggleTourist(tourist.id)}
                            data-testid={`checkbox-tourist-${originalIndex}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm" data-testid={`tourist-number-${originalIndex}`}>
                          {originalIndex + 1}
                        </td>
                      <td className="px-4 py-3" data-testid={`tourist-info-${originalIndex}`}>
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-sm">{tourist.name}</div>
                          {tourist.phone && (
                            <div className="text-xs text-muted-foreground">{tourist.phone}</div>
                          )}
                          {tourist.passport && (
                            <div className="text-xs text-muted-foreground">Загранпаспорт: {tourist.passport}</div>
                          )}
                          {tourist.birthDate && (
                            <div className="text-xs text-muted-foreground">
                              ДР: {format(new Date(tourist.birthDate), "dd.MM.yyyy", { locale: ru })}
                            </div>
                          )}
                          {tourist.amount && (
                            <div className="text-xs text-muted-foreground">
                              Сумма: {tourist.amount} {tourist.currency === "CNY" ? "¥" : "₽"}
                            </div>
                          )}
                          {tourist.nights && (
                            <div className="text-xs text-muted-foreground">Ночей: {tourist.nights}</div>
                          )}
                        </div>
                      </td>
                      {CITIES.map((city) => {
                        const visit = visitsByCity[city];
                        return (
                          <td
                            key={city}
                            className="px-4 py-3 text-sm"
                            data-testid={`tourist-${originalIndex}-city-${city.toLowerCase()}`}
                          >
                            {visit ? (
                              <div className="flex flex-col gap-1.5">
                                <Badge variant="secondary" className="text-xs whitespace-nowrap w-fit">
                                  <span>
                                    <span className="font-bold">{format(new Date(visit.arrivalDate), "dd.MM", { locale: ru })}</span>
                                    {visit.arrivalTime && <span className="text-muted-foreground"> {visit.arrivalTime}</span>}
                                  </span>
                                  {visit.departureDate && (
                                    <span>
                                      {" - "}
                                      <span className="font-bold">{format(new Date(visit.departureDate), "dd.MM", { locale: ru })}</span>
                                      {visit.departureTime && <span className="text-muted-foreground"> {visit.departureTime}</span>}
                                    </span>
                                  )}
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  <div className="truncate" title={visit.hotelName}>
                                    Отель: {visit.hotelName}
                                  </div>
                                  {visit.roomType && (
                                    <div className="mt-0.5">
                                      Тип: {visit.roomType === "twin" ? "Twin" : "Double"}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs cursor-help">
                                          {visit.transportType === "plane" ? (
                                            <Plane className="h-3 w-3" />
                                          ) : (
                                            <Train className="h-3 w-3" />
                                          )}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Прибытие {visit.transportType === "plane" ? "самолетом" : "поездом"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  {visit.departureTransportType && (
                                    <>
                                      <span className="text-xs text-muted-foreground">→</span>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-xs cursor-help">
                                              {visit.departureTransportType === "plane" ? (
                                                <Plane className="h-3 w-3" />
                                              ) : (
                                                <Train className="h-3 w-3" />
                                              )}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Убытие {visit.departureTransportType === "plane" ? "самолетом" : "поездом"}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </>
                                  )}
                                </div>
                                {(visit.flightNumber || visit.airport || visit.transfer) && (
                                  <div className="text-xs text-muted-foreground space-y-0.5">
                                    {visit.flightNumber && <div>Рейс: {visit.flightNumber}</div>}
                                    {visit.airport && <div>Аэропорт: {visit.airport}</div>}
                                    {visit.transfer && <div>Трансфер: {visit.transfer}</div>}
                                  </div>
                                )}
                                {(visit.departureFlightNumber || visit.departureAirport || visit.departureTransfer) && (
                                  <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-1 mt-1">
                                    {visit.departureFlightNumber && <div>Убытие рейс: {visit.departureFlightNumber}</div>}
                                    {visit.departureAirport && <div>Убытие аэропорт: {visit.departureAirport}</div>}
                                    {visit.departureTransfer && <div>Убытие трансфер: {visit.departureTransfer}</div>}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    </>
                  );
                })
              )}
            </tbody>
            {tourists && tourists.length > 0 && (
              <tfoot className="bg-muted/50 border-t-2">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold" data-testid="footer-total-label">
                    Итого: {touristCount} туристов
                  </td>
                  <td colSpan={4} className="px-4 py-3 text-sm text-muted-foreground">
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
          processedTourists.map((item) => {
            const { tourist, originalIndex, isFirstInGroup, groupIndex, groupSize, dealId } = item;
            const visitsByCity = CITIES.reduce((acc, city) => {
              acc[city] = tourist.visits.find(v => v.city === city);
              return acc;
            }, {} as Record<City, typeof tourist.visits[0] | undefined>);

            return (
              <>
                {/* Group header mobile */}
                {isGrouped && isFirstInGroup && (
                  <div key={`group-header-mobile-${dealId}`} className="px-2 py-2 bg-primary/10 rounded-md border-l-4 border-primary">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <span>Сделка #{dealId === 'no-deal' ? 'Без сделки' : dealId}</span>
                      <Badge variant="outline" className="text-xs">
                        {groupSize} {groupSize === 1 ? 'турист' : groupSize < 5 ? 'туриста' : 'туристов'}
                      </Badge>
                    </div>
                  </div>
                )}
                
                <Card key={tourist.id} data-testid={`tourist-card-mobile-${originalIndex}`} className={isGrouped && groupIndex % 2 === 1 ? "bg-muted/30" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedTourists.has(tourist.id)}
                      onCheckedChange={() => toggleTourist(tourist.id)}
                      data-testid={`checkbox-tourist-mobile-${originalIndex}`}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="shrink-0">{originalIndex + 1}</Badge>
                        <h3 className="font-semibold truncate" data-testid={`tourist-card-name-${originalIndex}`}>
                          {tourist.name}
                        </h3>
                      </div>
                      <div className="space-y-0.5 text-sm text-muted-foreground">
                        {tourist.phone && <div>{tourist.phone}</div>}
                        {tourist.passport && <div>Загранпаспорт: {tourist.passport}</div>}
                        {tourist.birthDate && (
                          <div>ДР: {format(new Date(tourist.birthDate), "dd.MM.yyyy", { locale: ru })}</div>
                        )}
                        {tourist.amount && (
                          <div>Сумма: {tourist.amount} {tourist.currency === "CNY" ? "¥" : "₽"}</div>
                        )}
                        {tourist.nights && <div>Ночей: {tourist.nights}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {CITIES.map((city) => {
                      const visit = visitsByCity[city];
                      return visit ? (
                        <div key={city} className="space-y-1.5 border-l-2 border-primary/20 pl-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium text-primary">{CITY_NAMES[city]}</div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleExportCity(city)}
                              className="h-5 w-5 shrink-0"
                              data-testid={`button-export-city-mobile-${city.toLowerCase()}`}
                              title={`Экспорт ${CITY_NAMES[city]}`}
                            >
                              <Share2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap w-fit">
                            <span>
                              <span className="font-bold">{format(new Date(visit.arrivalDate), "dd.MM", { locale: ru })}</span>
                              {visit.arrivalTime && <span className="text-muted-foreground"> {visit.arrivalTime}</span>}
                            </span>
                            {visit.departureDate && (
                              <>
                                {" - "}
                                <span className="font-bold">{format(new Date(visit.departureDate), "dd.MM", { locale: ru })}</span>
                                {visit.departureTime && <span className="text-muted-foreground"> {visit.departureTime}</span>}
                              </>
                            )}
                          </Badge>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>Отель: {visit.hotelName}</div>
                            {visit.roomType && (
                              <div>Тип: {visit.roomType === "twin" ? "Twin" : "Double"}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs cursor-help">
                                    {visit.transportType === "plane" ? (
                                      <Plane className="h-3 w-3" />
                                    ) : (
                                      <Train className="h-3 w-3" />
                                    )}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Прибытие {visit.transportType === "plane" ? "самолетом" : "поездом"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {visit.departureTransportType && (
                              <>
                                <span className="text-xs text-muted-foreground">→</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-xs cursor-help">
                                        {visit.departureTransportType === "plane" ? (
                                          <Plane className="h-3 w-3" />
                                        ) : (
                                          <Train className="h-3 w-3" />
                                        )}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Убытие {visit.departureTransportType === "plane" ? "самолетом" : "поездом"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                          </div>
                          {(visit.flightNumber || visit.airport || visit.transfer) && (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {visit.flightNumber && <div>Рейс: {visit.flightNumber}</div>}
                              {visit.airport && <div>Аэропорт: {visit.airport}</div>}
                              {visit.transfer && <div>Трансфер: {visit.transfer}</div>}
                            </div>
                          )}
                          {(visit.departureFlightNumber || visit.departureAirport || visit.departureTransfer) && (
                            <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-1 mt-1">
                              {visit.departureFlightNumber && <div>Убытие рейс: {visit.departureFlightNumber}</div>}
                              {visit.departureAirport && <div>Убытие аэропорт: {visit.departureAirport}</div>}
                              {visit.departureTransfer && <div>Убытие трансфер: {visit.departureTransfer}</div>}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </CardContent>
              </Card>
              </>
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
