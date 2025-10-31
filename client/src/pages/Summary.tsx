import { useQuery, useMutation } from "@tanstack/react-query";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EditableCell } from "@/components/EditableCell";
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
import { Loader2, Plane, Train, List, Grid, Share2, Link as LinkIcon, Download, ChevronDown, ChevronUp } from "lucide-react";
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
  const { entityId, domain } = useBitrix24();
  const [isGrouped, setIsGrouped] = useState(true);
  const [selectedTourists, setSelectedTourists] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: tourists, isLoading } = useQuery<TouristWithVisits[]>({
    queryKey: ["/api/tourists", entityId],
    refetchOnMount: true,
  });

  const { data: eventData } = useQuery<{ title: string | null }>({
    queryKey: ["/api/event", entityId, "title"],
    enabled: !!entityId,
  });

  const updateTouristMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TouristWithVisits> }) => {
      return apiRequest("PATCH", `/api/tourists/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourists", entityId] });
      toast({
        title: "Турист обновлен",
        description: "Изменения сохранены успешно",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить туриста: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateField = (touristId: string, field: string, value: string) => {
    updateTouristMutation.mutate({
      id: touristId,
      data: { [field]: value || null },
    });
  };

  const updateVisitMutation = useMutation({
    mutationFn: ({ touristId, visitId, data }: { touristId: string; visitId: string; data: any }) => {
      return apiRequest("PATCH", `/api/tourists/${touristId}/visits/${visitId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourists", entityId] });
      toast({
        title: "Обновлено",
        description: "Изменения сохранены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить визит: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateVisitField = (touristId: string, visitId: string, field: string, value: string) => {
    updateVisitMutation.mutate({
      touristId,
      visitId,
      data: { [field]: value || null },
    });
  };

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

  const handleShowSelectedDeals = () => {
    if (selectedTourists.size === 0) {
      toast({
        title: "Выберите туристов",
        description: "Отметьте туристов для просмотра их сделок",
        variant: "destructive",
      });
      return;
    }

    const selectedTouristsList = tourists?.filter(t => selectedTourists.has(t.id)) || [];
    
    const dealInfo = selectedTouristsList
      .map(t => {
        const dealId = t.bitrixDealId || 'Без сделки';
        return `${t.name}: Сделка #${dealId}`;
      })
      .join('\n');

    toast({
      title: `Сделки выбранных туристов (${selectedTourists.size})`,
      description: dealInfo,
      duration: 10000,
    });
  };

  // Helper function to create Bitrix24 deal URL
  const getBitrixDealUrl = (dealId: string | null | undefined): string | null => {
    if (!dealId || dealId === 'no-deal' || !domain) return null;
    return `https://${domain}/crm/deal/details/${dealId}/`;
  };

  // Helper function to create Bitrix24 contact URL
  const getBitrixContactUrl = (contactId: string | null | undefined): string | null => {
    if (!contactId || !domain) return null;
    return `https://${domain}/crm/contact/details/${contactId}/`;
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
        cityRowSpans: {} as Record<City, number>,
        shouldRenderCityCell: {} as Record<City, boolean>,
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

    // Flatten with group metadata and calculate city row spans
    let currentIndex = 0;
    return groupedArray.flatMap((group, groupIndex) => {
      // Calculate cityRowSpans and shouldRenderCityCell for this group
      const cityRowSpans: Record<City, number> = {} as Record<City, number>;
      const shouldRenderCityCell: Record<City, boolean[]> = {} as Record<City, boolean[]>;
      
      CITIES.forEach(city => {
        cityRowSpans[city] = 0;
        shouldRenderCityCell[city] = [];
        let firstTouristWithCity = true;
        
        group.tourists.forEach((tourist) => {
          const hasVisit = tourist.visits.some(v => v.city === city);
          if (hasVisit) {
            cityRowSpans[city]++;
            shouldRenderCityCell[city].push(firstTouristWithCity);
            firstTouristWithCity = false;
          } else {
            shouldRenderCityCell[city].push(false);
          }
        });
      });

      return group.tourists.map((tourist, indexInGroup) => ({
        tourist,
        originalIndex: currentIndex++,
        isFirstInGroup: indexInGroup === 0,
        groupIndex,
        groupSize: group.tourists.length,
        dealId: group.dealId,
        cityRowSpans,
        shouldRenderCityCell: CITIES.reduce((acc, city) => {
          acc[city] = shouldRenderCityCell[city][indexInGroup];
          return acc;
        }, {} as Record<City, boolean>),
      }));
    });
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
        tourist.surcharge ? `Доплата: ${tourist.surcharge}` : "",
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
        tourist.surcharge ? `Доплата: ${tourist.surcharge}` : "",
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
            Сводная таблица туристов{eventData?.title ? `: ${eventData.title}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Всего туристов: {touristCount}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={isGrouped ? "default" : "outline"}
            size="sm"
            onClick={() => setIsGrouped(!isGrouped)}
            data-testid="button-toggle-group"
          >
            {isGrouped ? <List className="h-4 w-4 sm:mr-2" /> : <Grid className="h-4 w-4 sm:mr-2" />}
            <span className="hidden sm:inline">{isGrouped ? "Разгруппировать" : "Сгруппировать"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowSelectedDeals}
            disabled={selectedTourists.size === 0}
            data-testid="button-show-selected-deals"
          >
            <List className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Показать сделки</span>
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
                  const { tourist, originalIndex, isFirstInGroup, groupIndex, groupSize, dealId: dealIdRaw } = item;
                  const dealId = dealIdRaw || 'no-deal';
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
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  const newExpanded = new Set(expandedGroups);
                                  if (newExpanded.has(dealId)) {
                                    newExpanded.delete(dealId);
                                  } else {
                                    newExpanded.add(dealId);
                                  }
                                  setExpandedGroups(newExpanded);
                                }}
                                className="h-5 w-5 shrink-0"
                                data-testid={`button-toggle-group-${dealId}`}
                              >
                                {expandedGroups.has(dealId) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                              {dealId === 'no-deal' ? (
                                <span>Сделка #Без сделки</span>
                              ) : getBitrixDealUrl(dealId) ? (
                                <a 
                                  href={getBitrixDealUrl(dealId)!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                  data-testid={`link-deal-${dealId}`}
                                >
                                  Сделка #{dealId}
                                </a>
                              ) : (
                                <span>Сделка #{dealId}</span>
                              )}
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
                          <div className="font-medium text-sm">
                            {getBitrixContactUrl(tourist.bitrixContactId) ? (
                              <a 
                                href={getBitrixContactUrl(tourist.bitrixContactId)!} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                data-testid={`link-contact-${originalIndex}`}
                              >
                                {tourist.name}
                              </a>
                            ) : (
                              <EditableCell
                                value={tourist.name}
                                type="text"
                                placeholder="Введите ФИО"
                                onSave={(value) => updateField(tourist.id, "name", value)}
                                className="font-medium"
                              />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Тел:</span>{" "}
                            <EditableCell
                              value={tourist.phone}
                              type="phone"
                              placeholder="Добавить телефон"
                              onSave={(value) => updateField(tourist.id, "phone", value)}
                              className="inline-flex"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Паспорт:</span>{" "}
                            <EditableCell
                              value={tourist.passport}
                              type="text"
                              placeholder="Добавить паспорт"
                              onSave={(value) => updateField(tourist.id, "passport", value)}
                              className="inline-flex"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">ДР:</span>{" "}
                            <EditableCell
                              value={tourist.birthDate}
                              type="date"
                              placeholder="Добавить дату"
                              onSave={(value) => updateField(tourist.id, "birthDate", value)}
                              className="inline-flex"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Доплата:</span>{" "}
                            <EditableCell
                              value={tourist.surcharge}
                              type="text"
                              placeholder="Добавить доплату"
                              onSave={(value) => updateField(tourist.id, "surcharge", value)}
                              className="inline-flex"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Ночей:</span>{" "}
                            <EditableCell
                              value={tourist.nights}
                              type="text"
                              placeholder="Добавить кол-во"
                              onSave={(value) => updateField(tourist.id, "nights", value)}
                              className="inline-flex"
                            />
                          </div>
                        </div>
                      </td>
                      {CITIES.map((city) => {
                        const visit = visitsByCity[city];
                        const isGroupCollapsed = isGrouped && !expandedGroups.has(dealId);
                        const { shouldRenderCityCell, cityRowSpans } = item;
                        
                        // If group is collapsed and this is not the first cell for this city, skip rendering
                        if (isGroupCollapsed && !shouldRenderCityCell[city]) {
                          return null;
                        }

                        // Determine rowSpan
                        const rowSpan = isGroupCollapsed && shouldRenderCityCell[city] ? cityRowSpans[city] : undefined;

                        return (
                          <td
                            key={city}
                            className="px-4 py-3 text-sm align-top"
                            data-testid={`tourist-${originalIndex}-city-${city.toLowerCase()}`}
                            rowSpan={rowSpan}
                          >
                            {visit ? (
                              <div className="flex flex-col gap-1.5">
                                {/* Dates and Times */}
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Прибытие:</span>
                                    <EditableCell
                                      value={visit.arrivalDate}
                                      type="date"
                                      placeholder="Дата"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "arrivalDate", value)}
                                      className="inline-flex text-xs"
                                    />
                                    <EditableCell
                                      value={visit.arrivalTime}
                                      type="time"
                                      placeholder="Время"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "arrivalTime", value)}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Убытие:</span>
                                    <EditableCell
                                      value={visit.departureDate}
                                      type="date"
                                      placeholder="Дата"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "departureDate", value)}
                                      className="inline-flex text-xs"
                                    />
                                    <EditableCell
                                      value={visit.departureTime}
                                      type="time"
                                      placeholder="Время"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "departureTime", value)}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                </div>

                                {/* Hotel */}
                                <div className="flex flex-col gap-0.5 border-t pt-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Отель:</span>
                                    <EditableCell
                                      value={visit.hotelName}
                                      type="text"
                                      placeholder="Название отеля"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "hotelName", value)}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Тип:</span>
                                    <EditableCell
                                      value={visit.roomType}
                                      type="select"
                                      placeholder="Тип комнаты"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "roomType", value)}
                                      selectOptions={[
                                        { value: "twin", label: "Twin" },
                                        { value: "double", label: "Double" },
                                      ]}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                </div>

                                {/* Arrival Transport */}
                                <div className="flex flex-col gap-0.5 border-t pt-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Прибытие:</span>
                                    <EditableCell
                                      value={visit.transportType}
                                      type="select"
                                      placeholder="Транспорт"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "transportType", value)}
                                      selectOptions={[
                                        { value: "plane", label: "✈️ Самолет" },
                                        { value: "train", label: "🚂 Поезд" },
                                      ]}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Рейс:</span>
                                    <EditableCell
                                      value={visit.flightNumber}
                                      type="text"
                                      placeholder="Номер рейса"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "flightNumber", value)}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Аэропорт:</span>
                                    <EditableCell
                                      value={visit.airport}
                                      type="text"
                                      placeholder="Аэропорт"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "airport", value)}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Трансфер:</span>
                                    <EditableCell
                                      value={visit.transfer}
                                      type="text"
                                      placeholder="Трансфер"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "transfer", value)}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                </div>

                                {/* Departure Transport */}
                                <div className="flex flex-col gap-0.5 border-t pt-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Убытие:</span>
                                    <EditableCell
                                      value={visit.departureTransportType}
                                      type="select"
                                      placeholder="Транспорт"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "departureTransportType", value)}
                                      selectOptions={[
                                        { value: "plane", label: "✈️ Самолет" },
                                        { value: "train", label: "🚂 Поезд" },
                                      ]}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Рейс:</span>
                                    <EditableCell
                                      value={visit.departureFlightNumber}
                                      type="text"
                                      placeholder="Номер рейса"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "departureFlightNumber", value)}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Аэропорт:</span>
                                    <EditableCell
                                      value={visit.departureAirport}
                                      type="text"
                                      placeholder="Аэропорт"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "departureAirport", value)}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium">Трансфер:</span>
                                    <EditableCell
                                      value={visit.departureTransfer}
                                      type="text"
                                      placeholder="Трансфер"
                                      onSave={(value) => updateVisitField(tourist.id, visit.id, "departureTransfer", value)}
                                      className="inline-flex text-xs"
                                    />
                                  </div>
                                </div>
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
                      {dealId === 'no-deal' ? (
                        <span>Сделка #Без сделки</span>
                      ) : getBitrixDealUrl(dealId) ? (
                        <a 
                          href={getBitrixDealUrl(dealId)!} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                          data-testid={`link-deal-mobile-${dealId}`}
                        >
                          Сделка #{dealId}
                        </a>
                      ) : (
                        <span>Сделка #{dealId}</span>
                      )}
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
                          {getBitrixContactUrl(tourist.bitrixContactId) ? (
                            <a 
                              href={getBitrixContactUrl(tourist.bitrixContactId)!} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              data-testid={`link-contact-mobile-${originalIndex}`}
                            >
                              {tourist.name}
                            </a>
                          ) : (
                            <span>{tourist.name}</span>
                          )}
                        </h3>
                      </div>
                      <div className="space-y-0.5 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Тел:</span>{" "}
                          <EditableCell
                            value={tourist.phone}
                            type="phone"
                            placeholder="Добавить"
                            onSave={(value) => updateField(tourist.id, "phone", value)}
                            className="inline-flex text-sm"
                          />
                        </div>
                        <div>
                          <span className="font-medium">Паспорт:</span>{" "}
                          <EditableCell
                            value={tourist.passport}
                            type="text"
                            placeholder="Добавить"
                            onSave={(value) => updateField(tourist.id, "passport", value)}
                            className="inline-flex text-sm"
                          />
                        </div>
                        <div>
                          <span className="font-medium">ДР:</span>{" "}
                          <EditableCell
                            value={tourist.birthDate}
                            type="date"
                            placeholder="Добавить"
                            onSave={(value) => updateField(tourist.id, "birthDate", value)}
                            className="inline-flex text-sm"
                          />
                        </div>
                        <div>
                          <span className="font-medium">Доплата:</span>{" "}
                          <EditableCell
                            value={tourist.surcharge}
                            type="text"
                            placeholder="Добавить"
                            onSave={(value) => updateField(tourist.id, "surcharge", value)}
                            className="inline-flex text-sm"
                          />
                        </div>
                        <div>
                          <span className="font-medium">Ночей:</span>{" "}
                          <EditableCell
                            value={tourist.nights}
                            type="text"
                            placeholder="Добавить"
                            onSave={(value) => updateField(tourist.id, "nights", value)}
                            className="inline-flex text-sm"
                          />
                        </div>
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
