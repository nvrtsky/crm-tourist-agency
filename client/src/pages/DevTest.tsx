import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  getMockTouristsWithItineraries, 
  MOCK_EVENT_TITLE,
  MOCK_ENTITY_ID 
} from "@/lib/mockData";
import { Users, MapPin, Calendar, Hotel, AlertCircle, Share2, Link as LinkIcon, Download, ChevronDown, ChevronUp, Plane, Train } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CITIES } from "@shared/schema";
import type { City, TouristWithVisits } from "@shared/schema";
import { EditableCell } from "@/components/EditableCell";
import { copyToClipboard } from "@/lib/clipboard";

const CITY_NAMES: Record<City, string> = {
  Beijing: "Пекин",
  Luoyang: "Лоян",
  Xian: "Сиань",
  Zhangjiajie: "Чжанцзяцзе",
  Shanghai: "Шанхай",
};
import * as XLSX from "xlsx";

export default function DevTest() {
  const [activeTab, setActiveTab] = useState("summary");
  const [tourists, setTourists] = useState<TouristWithVisits[]>(getMockTouristsWithItineraries());
  const [selectedTourists, setSelectedTourists] = useState<Set<string>>(new Set());
  const [isGrouped, setIsGrouped] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [customGroupings, setCustomGroupings] = useState<Map<string, string[]>>(new Map());
  const [ungroupedTourists, setUngroupedTourists] = useState<Set<string>>(new Set());
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogCity, setShareDialogCity] = useState<City | null>(null);
  const { toast } = useToast();

  // Load custom groupings from localStorage
  useEffect(() => {
    try {
      const savedGroupings = localStorage.getItem('devTourGroupings');
      const savedUngrouped = localStorage.getItem('devTourUngrouped');
      
      if (savedGroupings) {
        const parsed = JSON.parse(savedGroupings);
        setCustomGroupings(new Map(Object.entries(parsed)));
      }
      
      if (savedUngrouped) {
        setUngroupedTourists(new Set(JSON.parse(savedUngrouped)));
      }
    } catch (error) {
      console.error('Failed to load custom groupings from localStorage:', error);
    }
  }, []);

  // Save custom groupings to localStorage whenever they change
  useEffect(() => {
    try {
      const groupingsObj = Object.fromEntries(customGroupings);
      localStorage.setItem('devTourGroupings', JSON.stringify(groupingsObj));
    } catch (error) {
      console.error('Failed to save custom groupings to localStorage:', error);
    }
  }, [customGroupings]);

  useEffect(() => {
    try {
      localStorage.setItem('devTourUngrouped', JSON.stringify(Array.from(ungroupedTourists)));
    } catch (error) {
      console.error('Failed to save ungrouped tourists to localStorage:', error);
    }
  }, [ungroupedTourists]);

  // Update field handler для inline editing
  const updateField = (touristId: string, field: keyof TouristWithVisits, value: string | null) => {
    setTourists(prev => prev.map(t => 
      t.id === touristId ? { ...t, [field]: value } : t
    ));
    toast({
      title: "Обновлено (DEV режим)",
      description: `Поле "${field}" обновлено. В реальном режиме данные синхронизируются с Bitrix24.`,
    });
  };

  // Update visit field handler для inline editing
  const updateVisitField = (touristId: string, visitId: string, field: string, value: string) => {
    setTourists(prev => prev.map(t => {
      if (t.id !== touristId) return t;
      return {
        ...t,
        visits: t.visits.map(v => 
          v.id === visitId ? { ...v, [field]: value || null } : v
        )
      };
    }));
    toast({
      title: "Обновлено (DEV режим)",
      description: `Поле "${field}" обновлено. В реальном режиме данные синхронизируются с API.`,
    });
  };

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Toggle tourist selection
  const toggleTourist = (id: string) => {
    setSelectedTourists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle all tourists
  const toggleAll = () => {
    if (selectedTourists.size === tourists.length) {
      setSelectedTourists(new Set());
    } else {
      setSelectedTourists(new Set(tourists.map(t => t.id)));
    }
  };

  // Show selected tourists deals
  const showSelectedDeals = () => {
    const deals = new Set(
      tourists
        .filter(t => selectedTourists.has(t.id) && t.bitrixDealId)
        .map(t => t.bitrixDealId)
    );
    toast({
      title: "Сделки выбранных туристов",
      description: deals.size > 0 
        ? `Сделки: ${Array.from(deals).join(", ")}`
        : "Нет сделок для выбранных туристов",
    });
  };

  // Group selected tourists
  const handleGroup = () => {
    if (selectedTourists.size < 2) {
      toast({
        title: "Выберите туристов",
        description: "Для группировки выберите минимум 2 туристов",
        variant: "destructive",
      });
      return;
    }

    const groupId = Date.now().toString();
    const touristIds = Array.from(selectedTourists);

    // Remove selected tourists from ungrouped set
    const newUngrouped = new Set(ungroupedTourists);
    touristIds.forEach(id => newUngrouped.delete(id));
    setUngroupedTourists(newUngrouped);

    // Remove selected tourists from other custom groups
    const newGroupings = new Map(customGroupings);
    newGroupings.forEach((ids, gid) => {
      const filteredIds = ids.filter(id => !touristIds.includes(id));
      if (filteredIds.length === 0) {
        newGroupings.delete(gid);
      } else if (filteredIds.length !== ids.length) {
        newGroupings.set(gid, filteredIds);
      }
    });

    // Add new custom group
    newGroupings.set(groupId, touristIds);
    setCustomGroupings(newGroupings);

    // Clear selection
    setSelectedTourists(new Set());

    toast({
      title: "Группа создана (DEV режим)",
      description: `Сгруппировано ${touristIds.length} туристов. В реальном режиме группировка сохраняется в localStorage.`,
    });
  };

  // Ungroup selected tourists
  const handleUngroup = () => {
    if (selectedTourists.size === 0) {
      toast({
        title: "Выберите туристов",
        description: "Отметьте туристов для разгруппировки",
        variant: "destructive",
      });
      return;
    }

    const touristIds = Array.from(selectedTourists);

    // Add to ungrouped set
    const newUngrouped = new Set(ungroupedTourists);
    touristIds.forEach(id => newUngrouped.add(id));
    setUngroupedTourists(newUngrouped);

    // Remove from custom groups
    const newGroupings = new Map(customGroupings);
    newGroupings.forEach((ids, gid) => {
      const filteredIds = ids.filter(id => !touristIds.includes(id));
      if (filteredIds.length === 0) {
        newGroupings.delete(gid);
      } else if (filteredIds.length !== ids.length) {
        newGroupings.set(gid, filteredIds);
      }
    });
    setCustomGroupings(newGroupings);

    // Clear selection
    setSelectedTourists(new Set());

    toast({
      title: "Туристы разгруппированы (DEV режим)",
      description: `Разгруппировано ${touristIds.length} туристов. В реальном режиме разгруппировка сохраняется в localStorage.`,
    });
  };

  // Open share dialog for specific city
  const handleShareCity = (city: City) => {
    if (!tourists || tourists.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нечего экспортировать",
        variant: "destructive",
      });
      return;
    }
    setShareDialogCity(city);
    setShareDialogOpen(true);
  };

  // Copy link for city or full table
  const handleCopyLinkInDialog = async () => {
    const success = await copyToClipboard(window.location.href);
    
    if (success) {
      toast({
        title: "Ссылка скопирована",
        description: shareDialogCity 
          ? `Ссылка на таблицу для ${CITY_NAMES[shareDialogCity]} скопирована в буфер обмена` 
          : "Ссылка на сводную таблицу скопирована в буфер обмена",
      });
      setShareDialogOpen(false);
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      });
    }
  };

  // Export Excel from dialog
  const handleExportInDialog = () => {
    if (shareDialogCity) {
      handleExportCity(shareDialogCity);
    }
    setShareDialogOpen(false);
  };

  // Export to Excel with date validation
  const handleExportCity = (city: City) => {
    const touristsInCity = tourists.filter(t => 
      t.visits.some(v => v.city.toLowerCase() === city.toLowerCase())
    );

    const data = touristsInCity.map((tourist, index) => {
      const visit = tourist.visits.find(v => v.city.toLowerCase() === city.toLowerCase());
      
      // Safely format dates with validation
      const formatDate = (dateStr: string | null | undefined, time?: string | null) => {
        if (!dateStr) return "";
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return "";
          return `${format(date, "dd.MM.yyyy", { locale: ru })}${time ? ` ${time}` : ""}`;
        } catch {
          return "";
        }
      };

      return {
        "№": index + 1,
        "Турист": tourist.name,
        "Телефон": tourist.phone || "",
        "Прибытие": formatDate(visit?.arrivalDate, visit?.arrivalTime),
        "Убытие": formatDate(visit?.departureDate, visit?.departureTime),
        "Отель": visit?.hotelName || "",
        "Тип номера": visit?.roomType === "twin" ? "Twin" : visit?.roomType === "double" ? "Double" : "",
        "Транспорт прибытия": visit?.transportType === "plane" ? "Самолет" : "Поезд",
        "Рейс/Поезд": visit?.flightNumber || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, CITY_NAMES[city]);
    XLSX.writeFile(wb, `${CITY_NAMES[city]}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  // Dashboard statistics
  const stats = useMemo(() => {
    const totalTourists = tourists.length;
    const cityCounts = CITIES.reduce((acc, city) => {
      acc[city] = tourists.filter(t => 
        t.visits.some(v => v.city.toLowerCase() === city.toLowerCase())
      ).length;
      return acc;
    }, {} as Record<City, number>);

    return { totalTourists, cityCounts };
  }, [tourists]);

  // Process tourists for grouping
  const processedTourists = useMemo(() => {
    if (!isGrouped) {
      return tourists.map((tourist, index) => ({
        tourist,
        originalIndex: index,
        isFirstInGroup: false,
        groupIndex: 0,
        groupSize: 1,
        dealId: tourist.bitrixDealId || "no-deal",
        dealIds: tourist.bitrixDealId ? [tourist.bitrixDealId] : [],
        cityRowSpans: {} as Record<City, number>,
        shouldRenderCityCell: {} as Record<City, boolean>,
        shouldMergeSurchargeNights: false,
        shouldRenderSurchargeNights: true,
      }));
    }

    // Create a set of tourists that are accounted for (in custom groups or ungrouped)
    const accountedTourists = new Set<string>();
    const groupedArray: { dealIds: string[]; tourists: TouristWithVisits[]; groupId: string }[] = [];

    // 1. Add custom groups
    customGroupings.forEach((touristIds, groupId) => {
      const groupTourists = tourists.filter(t => touristIds.includes(t.id));
      if (groupTourists.length > 0) {
        // Collect all unique dealIds from tourists in this group
        const dealIds = Array.from(new Set(
          groupTourists
            .map(t => t.bitrixDealId)
            .filter(Boolean) as string[]
        ));
        
        groupedArray.push({
          dealIds,
          tourists: groupTourists,
          groupId: `custom-${groupId}`,
        });
        
        groupTourists.forEach(t => accountedTourists.add(t.id));
      }
    });

    // 2. Add ungrouped tourists as individual groups
    ungroupedTourists.forEach(touristId => {
      const tourist = tourists.find(t => t.id === touristId);
      if (tourist) {
        groupedArray.push({
          dealIds: tourist.bitrixDealId ? [tourist.bitrixDealId] : [],
          tourists: [tourist],
          groupId: `ungrouped-${touristId}`,
        });
        accountedTourists.add(touristId);
      }
    });

    // 3. Group remaining tourists by dealId (automatic grouping)
    const remainingTourists = tourists.filter(t => !accountedTourists.has(t.id));
    const autogrouped = remainingTourists.reduce((acc, tourist) => {
      const dealId = tourist.bitrixDealId || 'no-deal';
      if (!acc[dealId]) {
        acc[dealId] = [];
      }
      acc[dealId].push(tourist);
      return acc;
    }, {} as Record<string, TouristWithVisits[]>);

    // Add auto-grouped to groupedArray
    Object.entries(autogrouped).forEach(([dealId, tourists]) => {
      groupedArray.push({
        dealIds: dealId === 'no-deal' ? [] : [dealId],
        tourists,
        groupId: `auto-${dealId}`,
      });
    });

    // Sort groups (custom groups first, then by dealId)
    groupedArray.sort((a, b) => {
      // Custom groups first
      const aIsCustom = a.groupId.startsWith('custom-');
      const bIsCustom = b.groupId.startsWith('custom-');
      if (aIsCustom && !bIsCustom) return -1;
      if (!aIsCustom && bIsCustom) return 1;
      
      // Then by first dealId
      const aFirstDeal = a.dealIds[0] || 'zzz';
      const bFirstDeal = b.dealIds[0] || 'zzz';
      return aFirstDeal.localeCompare(bFirstDeal);
    });

    const result: Array<{
      tourist: TouristWithVisits;
      originalIndex: number;
      isFirstInGroup: boolean;
      groupIndex: number;
      groupSize: number;
      dealId: string;
      dealIds: string[];
      cityRowSpans: Record<City, number>;
      shouldRenderCityCell: Record<City, boolean>;
      shouldMergeSurchargeNights: boolean;
      shouldRenderSurchargeNights: boolean;
    }> = [];

    let currentIndex = 0;
    groupedArray.forEach((group, groupIndex) => {
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

      // Check if group is from single deal (for surcharge/nights merging)
      const isSingleDealGroup = group.dealIds.length === 1 && group.dealIds[0] !== '';
      const shouldMergeSurchargeNights = isSingleDealGroup && group.tourists.length > 1;

      group.tourists.forEach((tourist, indexInGroup) => {
        result.push({
          tourist,
          originalIndex: currentIndex++,
          isFirstInGroup: indexInGroup === 0,
          groupIndex,
          groupSize: group.tourists.length,
          dealId: group.dealIds[0] || 'no-deal', // backward compatibility
          dealIds: group.dealIds,
          cityRowSpans,
          shouldRenderCityCell: CITIES.reduce((acc, city) => {
            acc[city] = shouldRenderCityCell[city][indexInGroup];
            return acc;
          }, {} as Record<City, boolean>),
          shouldMergeSurchargeNights,
          shouldRenderSurchargeNights: indexInGroup === 0,
        });
      });
    });

    return result;
  }, [tourists, isGrouped, customGroupings, ungroupedTourists]);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                DEV Тестовый режим
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Это тестовая страница с mock данными для разработки. 
                Изменения не синхронизируются с Bitrix24.
              </p>
            </div>
            <Badge variant="outline" className="text-orange-500 border-orange-500">
              Mock Data
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Entity ID:</p>
              <p className="text-sm text-muted-foreground font-mono">{MOCK_ENTITY_ID}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Событие:</p>
              <p className="text-sm text-muted-foreground">{MOCK_EVENT_TITLE}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" data-testid="tab-summary">
            Сводная таблица
          </TabsTrigger>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            Дашборд
          </TabsTrigger>
          <TabsTrigger value="tourists" data-testid="tab-tourists">
            Туристы ({tourists.length})
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>{MOCK_EVENT_TITLE}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsGrouped(!isGrouped)}
                    data-testid="button-toggle-grouping"
                  >
                    {isGrouped ? "Скрыть группировку" : "Показать группировку"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGroup}
                    disabled={selectedTourists.size < 2}
                    data-testid="button-group"
                  >
                    Сгруппировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUngroup}
                    disabled={selectedTourists.size === 0}
                    data-testid="button-ungroup"
                  >
                    Разгруппировать
                  </Button>
                  {/* Hidden per user request */}
                  {/* {selectedTourists.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={showSelectedDeals}
                      data-testid="button-show-deals"
                    >
                      Показать сделки выбранных ({selectedTourists.size})
                    </Button>
                  )} */}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Desktop Table */}
          <Card className="hidden md:block overflow-x-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={selectedTourists.size === tourists.length}
                        onCheckedChange={toggleAll}
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">№</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">Турист</th>
                    {CITIES.map(city => (
                      <th key={city} className="px-4 py-3 text-left text-sm font-semibold min-w-[250px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>{CITY_NAMES[city]}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleShareCity(city)}
                            className="h-6 w-6 shrink-0"
                            title={`Поделиться ${CITY_NAMES[city]}`}
                            data-testid={`button-export-${city.toLowerCase()}`}
                          >
                            <Share2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processedTourists.map(({ tourist, originalIndex, isFirstInGroup, groupIndex, groupSize, dealIds, cityRowSpans, shouldRenderCityCell, shouldMergeSurchargeNights }) => {
                    const groupKey = `group-${groupIndex}`;
                    const visitsByCity = CITIES.reduce((acc, city) => {
                      acc[city] = tourist.visits.find(v => v.city.toLowerCase() === city.toLowerCase());
                      return acc;
                    }, {} as Record<City, typeof tourist.visits[0] | undefined>);

                    return (
                      <>
                        {isGrouped && isFirstInGroup && (
                          <tr key={`group-header-${groupKey}`} className="bg-primary/10 border-l-4 border-primary">
                            <td colSpan={3 + CITIES.length} className="px-4 py-2">
                              <div className="flex items-center gap-3 text-sm font-medium text-primary flex-wrap">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleGroup(groupKey)}
                                  className="h-5 w-5 shrink-0"
                                  data-testid={`button-toggle-group-${groupKey}`}
                                >
                                  {expandedGroups.has(groupKey) ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                                {!dealIds || dealIds.length === 0 ? (
                                  <span>Сделка #Без сделки</span>
                                ) : (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span>Сделка:</span>
                                    {dealIds.map((dealId, idx) => (
                                      <span key={dealId} className="flex items-center gap-1">
                                        <span>#{dealId}</span>
                                        {idx < dealIds.length - 1 && <span>,</span>}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {groupSize} {groupSize === 1 ? 'турист' : groupSize < 5 ? 'туриста' : 'туристов'}
                                </Badge>
                                {/* Show surcharge/nights in group header when single deal */}
                                {shouldMergeSurchargeNights && (
                                  <>
                                    {tourist.surcharge && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                                        <span className="font-medium text-primary">Доплата:</span>
                                        <span>{tourist.surcharge}</span>
                                      </div>
                                    )}
                                    {tourist.nights && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                                        <span className="font-medium text-primary">Ночей:</span>
                                        <span>{tourist.nights}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr 
                          key={tourist.id}
                          className={isGrouped && groupIndex % 2 === 1 ? "bg-muted/30" : ""}
                          data-testid={`row-tourist-${originalIndex}`}
                        >
                          <td className="px-4 py-2">
                            <Checkbox
                              checked={selectedTourists.has(tourist.id)}
                              onCheckedChange={() => toggleTourist(tourist.id)}
                              data-testid={`checkbox-tourist-${originalIndex}`}
                            />
                          </td>
                          <td className="px-4 py-2 text-xs">{originalIndex + 1}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-col gap-0.5">
                              <div className="font-medium text-xs leading-tight">
                                <EditableCell
                                  value={tourist.name}
                                  type="text"
                                  placeholder="Введите ФИО"
                                  onSave={(value) => updateField(tourist.id, "name", value)}
                                  className="font-medium"
                                />
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
                              {/* Only show surcharge/nights in tourist card when NOT merged in group header */}
                              {!shouldMergeSurchargeNights && (
                                <>
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
                                </>
                              )}
                            </div>
                          </td>
                          {CITIES.map((city) => {
                            const visit = visitsByCity[city];
                            const isGroupCollapsed = isGrouped && !expandedGroups.has(groupKey);
                            
                            // If group is collapsed and we shouldn't render this cell, return null
                            if (isGroupCollapsed && !shouldRenderCityCell[city]) {
                              return null;
                            }

                            // Determine rowSpan
                            const rowSpan = isGroupCollapsed && shouldRenderCityCell[city] ? cityRowSpans[city] : undefined;

                            return (
                              <td 
                                key={city} 
                                className="px-4 py-2 text-xs align-top"
                                rowSpan={rowSpan}
                              >
                                <div className="flex flex-col gap-0.5">
                                  {/* Dates */}
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-medium">Прибытие:</span>
                                      {visit ? (
                                        <>
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
                                        </>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-medium">Отъезд:</span>
                                      {visit ? (
                                        <>
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
                                        </>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Hotel */}
                                  <div className="text-xs space-y-0.5 pt-0.5">
                                    <div>
                                      <span className="font-medium text-muted-foreground">Отель: </span>
                                      {visit ? (
                                        <EditableCell
                                          value={visit.hotelName}
                                          type="text"
                                          placeholder="Название отеля"
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "hotelName", value)}
                                          className="inline-flex"
                                        />
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-medium text-muted-foreground">Тип: </span>
                                      {visit ? (
                                        <EditableCell
                                          value={visit.roomType}
                                          type="select"
                                          placeholder="Выбрать"
                                          selectOptions={[
                                            { value: "twin", label: "Twin" },
                                            { value: "double", label: "Double" }
                                          ]}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "roomType", value)}
                                          className="inline-flex"
                                        />
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Transport - Compact */}
                                  <div className="flex flex-col gap-0.5 pt-0.5">
                                    {visit ? (
                                      <>
                                        {/* Arrival Transport */}
                                        <div className="flex items-center gap-0.5 flex-wrap text-xs leading-tight">
                                          {visit.transportType === "plane" ? <Plane className="h-3 w-3 shrink-0" /> : <Train className="h-3 w-3 shrink-0" />}
                                          <span className="font-medium">Приб:</span>
                                          <EditableCell
                                            value={visit.transportType}
                                            type="select"
                                            placeholder="Вид"
                                            onSave={(value) => updateVisitField(tourist.id, visit.id, "transportType", value)}
                                            selectOptions={[
                                              { value: "plane", label: "Самолет" },
                                              { value: "train", label: "Поезд" },
                                            ]}
                                            className="inline-flex text-xs"
                                          />
                                          <EditableCell
                                            value={visit.flightNumber}
                                            type="text"
                                            placeholder="№"
                                            onSave={(value) => updateVisitField(tourist.id, visit.id, "flightNumber", value)}
                                            className="inline-flex text-xs"
                                          />
                                          <EditableCell
                                            value={visit.airport}
                                            type="text"
                                            placeholder="Аэропорт"
                                            onSave={(value) => updateVisitField(tourist.id, visit.id, "airport", value)}
                                            className="inline-flex text-xs"
                                          />
                                          <span className="text-muted-foreground">•</span>
                                          <EditableCell
                                            value={visit.transfer}
                                            type="text"
                                            placeholder="Трансфер"
                                            onSave={(value) => updateVisitField(tourist.id, visit.id, "transfer", value)}
                                            className="inline-flex text-xs"
                                          />
                                        </div>
                                        
                                        {/* Departure Transport - always show */}
                                        <div className="flex items-center gap-0.5 flex-wrap text-xs leading-tight">
                                          {visit.departureTransportType === "plane" ? <Plane className="h-3 w-3 shrink-0" /> : visit.departureTransportType === "train" ? <Train className="h-3 w-3 shrink-0" /> : <span className="w-3"></span>}
                                          <span className="font-medium">Убыт:</span>
                                          <EditableCell
                                            value={visit.departureTransportType}
                                            type="select"
                                            placeholder="Вид"
                                            onSave={(value) => updateVisitField(tourist.id, visit.id, "departureTransportType", value)}
                                            selectOptions={[
                                              { value: "plane", label: "Самолет" },
                                              { value: "train", label: "Поезд" },
                                            ]}
                                            className="inline-flex text-xs"
                                          />
                                          <EditableCell
                                            value={visit.departureFlightNumber}
                                            type="text"
                                            placeholder="№"
                                            onSave={(value) => updateVisitField(tourist.id, visit.id, "departureFlightNumber", value)}
                                            className="inline-flex text-xs"
                                          />
                                          <EditableCell
                                            value={visit.departureAirport}
                                            type="text"
                                            placeholder="Аэропорт"
                                            onSave={(value) => updateVisitField(tourist.id, visit.id, "departureAirport", value)}
                                            className="inline-flex text-xs"
                                          />
                                          <span className="text-muted-foreground">•</span>
                                          <EditableCell
                                            value={visit.departureTransfer}
                                            type="text"
                                            placeholder="Трансфер"
                                            onSave={(value) => updateVisitField(tourist.id, visit.id, "departureTransfer", value)}
                                            className="inline-flex text-xs"
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-1 text-xs">
                                        <span className="font-medium">Транспорт:</span>
                                        <span className="text-muted-foreground">—</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {processedTourists.map(({ tourist, originalIndex, isFirstInGroup, groupIndex, groupSize, dealIds, shouldMergeSurchargeNights }) => {
              const groupKey = `group-${groupIndex}`;
              return (
              <div key={tourist.id}>
                {isGrouped && isFirstInGroup && (
                  <div className="px-3 py-2 bg-primary/10 rounded-md border-l-4 border-primary mb-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary flex-wrap">
                        {!dealIds || dealIds.length === 0 ? (
                          <span>Сделка #Без сделки</span>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span>Сделка:</span>
                            {dealIds.map((dealId, idx) => (
                              <span key={dealId} className="flex items-center gap-1">
                                <span>#{dealId}</span>
                                {idx < dealIds.length - 1 && <span>,</span>}
                              </span>
                            ))}
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {groupSize} {groupSize === 1 ? 'турист' : groupSize < 5 ? 'туриста' : 'туристов'}
                        </Badge>
                      </div>
                      {/* Show surcharge/nights in group header when single deal */}
                      {shouldMergeSurchargeNights && (tourist.surcharge || tourist.nights) && (
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                          {tourist.surcharge && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-primary">Доплата:</span>
                              <span className="text-muted-foreground">{tourist.surcharge}</span>
                            </div>
                          )}
                          {tourist.nights && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-primary">Ночей:</span>
                              <span className="text-muted-foreground">{tourist.nights}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <Card className={isGrouped && groupIndex % 2 === 1 ? "bg-muted/30" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedTourists.has(tourist.id)}
                        onCheckedChange={() => toggleTourist(tourist.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="shrink-0">{originalIndex + 1}</Badge>
                          <h3 className="font-semibold text-sm">{tourist.name}</h3>
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
                          {/* Only show surcharge/nights in tourist card when NOT merged in group header */}
                          {!shouldMergeSurchargeNights && (
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
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
            })}
          </div>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего туристов</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTourists}</div>
              </CardContent>
            </Card>

            {CITIES.map(city => (
              <Card key={city}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{CITY_NAMES[city]}</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.cityCounts[city]}</div>
                  <p className="text-xs text-muted-foreground">туристов</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tourists Tab */}
        <TabsContent value="tourists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Список туристов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tourists.map((tourist, index) => (
                  <Card key={tourist.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{index + 1}. {tourist.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                      <div><strong>Email:</strong> {tourist.email || "—"}</div>
                      <div><strong>Телефон:</strong> {tourist.phone || "—"}</div>
                      <div><strong>Паспорт:</strong> {tourist.passport || "—"}</div>
                      <div><strong>Дата рождения:</strong> {tourist.birthDate || "—"}</div>
                      <div><strong>Доплата:</strong> {tourist.surcharge || "—"}</div>
                      <div><strong>Ночей:</strong> {tourist.nights || "—"}</div>
                      <div><strong>Сделка:</strong> {tourist.bitrixDealId || "—"}</div>
                      <div><strong>Посещаемые города:</strong> {tourist.visits.length}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Поделиться: Полная таблица</DialogTitle>
            <DialogDescription>
              Выберите формат для экспорта данных
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleCopyLinkInDialog}
              className="w-full justify-start"
              variant="outline"
              data-testid="dialog-button-copy-link"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Копировать ссылку
            </Button>
            <Button
              onClick={handleExportInDialog}
              className="w-full justify-start"
              variant="outline"
              data-testid="dialog-button-download-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать Excel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
