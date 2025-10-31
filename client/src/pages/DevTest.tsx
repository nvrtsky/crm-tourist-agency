import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  getMockTouristsWithItineraries, 
  MOCK_EVENT_TITLE,
  MOCK_ENTITY_ID 
} from "@/lib/mockData";
import { Users, MapPin, Calendar, Hotel, AlertCircle, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CITIES, CITY_NAMES } from "@shared/schema";
import type { City, TouristWithVisits } from "@shared/schema";
import EditableCell from "@/components/EditableCell";
import * as XLSX from "xlsx";

export default function DevTest() {
  const [activeTab, setActiveTab] = useState("summary");
  const [tourists, setTourists] = useState<TouristWithVisits[]>(getMockTouristsWithItineraries());
  const [selectedTourists, setSelectedTourists] = useState<Set<string>>(new Set());
  const [isGrouped, setIsGrouped] = useState(true);
  const { toast } = useToast();

  // Update field handler для inline editing
  const updateField = (touristId: string, field: keyof TouristWithVisits, value: string) => {
    setTourists(prev => prev.map(t => 
      t.id === touristId ? { ...t, [field]: value } : t
    ));
    toast({
      title: "Обновлено (DEV режим)",
      description: `Поле "${field}" обновлено. В реальном режиме данные синхронизируются с Bitrix24.`,
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

  // Export to Excel
  const handleExportCity = (city: City) => {
    const touristsInCity = tourists.filter(t => 
      t.visits.some(v => v.city.toLowerCase() === city.toLowerCase())
    );

    const data = touristsInCity.map((tourist, index) => {
      const visit = tourist.visits.find(v => v.city.toLowerCase() === city.toLowerCase());
      return {
        "№": index + 1,
        "Турист": tourist.name,
        "Телефон": tourist.phone || "",
        "Прибытие": visit ? `${format(new Date(visit.arrivalDate), "dd.MM.yyyy", { locale: ru })}${visit.arrivalTime ? ` ${visit.arrivalTime}` : ""}` : "",
        "Убытие": visit?.departureDate ? `${format(new Date(visit.departureDate), "dd.MM.yyyy", { locale: ru })}${visit.departureTime ? ` ${visit.departureTime}` : ""}` : "",
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
      }));
    }

    const groups: Record<string, TouristWithVisits[]> = {};
    tourists.forEach(tourist => {
      const dealId = tourist.bitrixDealId || "no-deal";
      if (!groups[dealId]) groups[dealId] = [];
      groups[dealId].push(tourist);
    });

    const sortedDealIds = Object.keys(groups).sort((a, b) => {
      if (a === "no-deal") return 1;
      if (b === "no-deal") return -1;
      return a.localeCompare(b);
    });

    const result: Array<{
      tourist: TouristWithVisits;
      originalIndex: number;
      isFirstInGroup: boolean;
      groupIndex: number;
      groupSize: number;
      dealId: string;
    }> = [];

    sortedDealIds.forEach((dealId, groupIndex) => {
      const groupTourists = groups[dealId];
      groupTourists.forEach((tourist, indexInGroup) => {
        result.push({
          tourist,
          originalIndex: tourists.indexOf(tourist),
          isFirstInGroup: indexInGroup === 0,
          groupIndex,
          groupSize: groupTourists.length,
          dealId,
        });
      });
    });

    return result;
  }, [tourists, isGrouped]);

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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsGrouped(!isGrouped)}
                    data-testid="button-toggle-grouping"
                  >
                    {isGrouped ? "Скрыть группировку" : "Показать группировку"}
                  </Button>
                  {selectedTourists.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={showSelectedDeals}
                      data-testid="button-show-deals"
                    >
                      Показать сделки выбранных ({selectedTourists.size})
                    </Button>
                  )}
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
                            onClick={() => handleExportCity(city)}
                            className="h-6 w-6 shrink-0"
                            title={`Экспорт ${CITY_NAMES[city]}`}
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
                  {processedTourists.map(({ tourist, originalIndex, isFirstInGroup, groupIndex, groupSize, dealId }) => {
                    const visitsByCity = CITIES.reduce((acc, city) => {
                      acc[city] = tourist.visits.find(v => v.city.toLowerCase() === city.toLowerCase());
                      return acc;
                    }, {} as Record<City, typeof tourist.visits[0] | undefined>);

                    return (
                      <>
                        {isGrouped && isFirstInGroup && (
                          <tr key={`group-header-${dealId}`} className="bg-primary/10 border-l-4 border-primary">
                            <td colSpan={3 + CITIES.length} className="px-4 py-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <span>Сделка #{dealId}</span>
                                <Badge variant="outline" className="text-xs">
                                  {groupSize} {groupSize === 1 ? 'турист' : groupSize < 5 ? 'туриста' : 'туристов'}
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr 
                          key={tourist.id}
                          className={isGrouped && groupIndex % 2 === 1 ? "bg-muted/30" : ""}
                          data-testid={`row-tourist-${originalIndex}`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedTourists.has(tourist.id)}
                              onCheckedChange={() => toggleTourist(tourist.id)}
                              data-testid={`checkbox-tourist-${originalIndex}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">{originalIndex + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <div className="font-medium text-sm">
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
                            return (
                              <td key={city} className="px-4 py-3 text-sm align-top">
                                {visit ? (
                                  <div className="flex flex-col gap-1.5">
                                    <Badge variant="secondary" className="text-xs whitespace-nowrap w-fit">
                                      <span>
                                        <span className="font-bold">
                                          {format(new Date(visit.arrivalDate), "dd.MM", { locale: ru })}
                                        </span>
                                        {visit.arrivalTime && <span className="text-muted-foreground"> {visit.arrivalTime}</span>}
                                      </span>
                                      {visit.departureDate && (
                                        <span>
                                          {" - "}
                                          <span className="font-bold">
                                            {format(new Date(visit.departureDate), "dd.MM", { locale: ru })}
                                          </span>
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
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {processedTourists.map(({ tourist, originalIndex, isFirstInGroup, groupIndex, dealId }) => (
              <>
                {isGrouped && isFirstInGroup && (
                  <div key={`group-header-mobile-${dealId}`} className="px-2 py-2 bg-primary/10 rounded-md border-l-4 border-primary">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <span>Сделка #{dealId}</span>
                    </div>
                  </div>
                )}
                <Card key={tourist.id} className={isGrouped && groupIndex % 2 === 1 ? "bg-muted/30" : ""}>
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
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ))}
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
    </div>
  );
}
