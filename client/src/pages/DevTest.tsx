import { useState, useMemo, useEffect, Fragment } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { 
  getMockTouristsWithItineraries, 
  MOCK_EVENT_TITLE,
  MOCK_ENTITY_ID 
} from "@/lib/mockData";
import { Users, MapPin, Calendar, Hotel, AlertCircle, Share2, Link as LinkIcon, Download, ChevronDown, ChevronUp, Plane, Train, Grid, List } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CITIES } from "@shared/schema";
import type { City, TouristWithVisits } from "@shared/schema";
import { EditableCell } from "@/components/EditableCell";
import { copyToClipboard } from "@/lib/clipboard";
import * as XLSX from "xlsx";

// Mock deals data
const MOCK_DEALS = [
  { id: "5001", title: "Март 2025 - Группа А" },
  { id: "5003", title: "Март 2025 - Группа В" },
  { id: "5005", title: "Март 2025 - VIP группа" },
  { id: "5007", title: "Апрель 2025 - Экспресс тур" },
];

export default function DevTest() {
  const { t } = useTranslation();

  // Helper to get city name based on current language
  const getCityName = (city: City): string => {
    return t(`cities.${city}`);
  };

  // Helper function to get deal title by ID
  const getDealTitle = (dealId: string): string => {
    const deal = MOCK_DEALS.find(d => d.id === dealId);
    return deal?.title || `#${dealId}`;
  };

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

  // Auto-create empty visits for all cities
  useEffect(() => {
    setTourists(prev => prev.map(tourist => {
      const existingCities = new Set(tourist.visits.map(v => v.city));
      const missingCities = CITIES.filter(city => !existingCities.has(city));
      
      if (missingCities.length === 0) return tourist;
      
      const newVisits = missingCities.map(city => ({
        id: `visit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${city}`,
        touristId: tourist.id,
        city,
        arrivalDate: "",
        arrivalTime: "",
        departureDate: "",
        departureTime: "",
        hotelName: "",
        roomType: "",
        transportType: "plane" as const,
        flightNumber: "",
        airport: "",
        transfer: "",
        departureTransportType: "",
        departureFlightNumber: "",
        departureAirport: "",
        departureTransfer: "",
      }));
      
      return { ...tourist, visits: [...tourist.visits, ...newVisits] };
    }));
  }, []);

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
      title: t("devMode.updatedDevMode"),
      description: t("devMode.fieldUpdatedDevMode", { field }),
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
      title: t("devMode.updatedDevMode"),
      description: t("devMode.fieldUpdatedApiMode", { field }),
    });
  };

  // Create new visit for a tourist
  const handleCreateVisit = (touristId: string, city: City) => {
    // Check if visit already exists
    const tourist = tourists.find(t => t.id === touristId);
    if (tourist?.visits.some(v => v.city === city)) {
      toast({
        title: t("toasts.error"),
        description: t("toasts.visitAlreadyExists"),
        variant: "destructive",
      });
      return;
    }

    // Create new visit with empty fields
    const newVisit = {
      id: `visit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      touristId,
      city,
      arrivalDate: "",
      arrivalTime: "",
      departureDate: "",
      departureTime: "",
      hotelName: "",
      roomType: "",
      transportType: "plane" as const,
      flightNumber: "",
      airport: "",
      transfer: "",
      departureTransportType: "",
      departureFlightNumber: "",
      departureAirport: "",
      departureTransfer: "",
    };

    setTourists(prev => prev.map(t => 
      t.id === touristId 
        ? { ...t, visits: [...t.visits, newVisit] }
        : t
    ));

    toast({
      title: t("toasts.visitCreated"),
      description: t("toasts.visitCreatedSuccess", { city: getCityName(city) }),
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
      title: t("devMode.selectedTouristsDealsTitle"),
      description: deals.size > 0 
        ? t("devMode.selectedTouristsDealsContent", { deals: Array.from(deals).join(", ") })
        : t("devMode.noDealsForSelected"),
    });
  };

  // Group selected tourists
  const handleGroup = () => {
    if (selectedTourists.size < 2) {
      toast({
        title: t("toasts.selectTourists"),
        description: t("toasts.selectMinTwoForGrouping"),
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
      title: t("devMode.groupCreatedDevMode"),
      description: t("devMode.groupingSavedLocalStorage", { count: touristIds.length }),
    });
  };

  // Ungroup selected tourists
  const handleUngroup = () => {
    if (selectedTourists.size === 0) {
      toast({
        title: t("toasts.selectTourists"),
        description: t("toasts.selectForUngroup"),
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
      title: t("devMode.touristsUngroupedDevMode"),
      description: t("devMode.ungroupingSavedLocalStorage", { count: touristIds.length }),
    });
  };

  // Open share dialog for specific city
  const handleShareCity = (city: City) => {
    if (!tourists || tourists.length === 0) {
      toast({
        title: t("toasts.noDataToExport"),
        description: t("toasts.nothingToExport"),
        variant: "destructive",
      });
      return;
    }
    setShareDialogCity(city);
    setShareDialogOpen(true);
  };

  // Copy link for city or full table
  const handleCopyLinkInDialog = async () => {
    const urlToCopy = window.location.href;
    console.log('[Copy Link] URL to copy:', urlToCopy);
    console.log('[Copy Link] Share dialog city:', shareDialogCity);
    
    const success = await copyToClipboard(urlToCopy);
    console.log('[Copy Link] Copy result:', success);
    
    if (success) {
      toast({
        title: t("toasts.linkCopied"),
        description: shareDialogCity 
          ? t("toasts.cityLinkCopied", { city: getCityName(shareDialogCity) })
          : t("toasts.linkCopiedToClipboard"),
      });
      setShareDialogOpen(false);
    } else {
      toast({
        title: t("toasts.error"),
        description: t("toasts.failedToCopyLink"),
        variant: "destructive",
      });
    }
  };

  // Open share dialog for full table
  const handleShareFull = () => {
    if (!tourists || tourists.length === 0) {
      toast({
        title: t("toasts.noDataToExport"),
        description: t("toasts.nothingToExport"),
        variant: "destructive",
      });
      return;
    }
    setShareDialogCity(null);
    setShareDialogOpen(true);
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
        [t("summary.headerNumber")]: index + 1,
        [t("fields.name")]: tourist.name,
        [t("fields.phone")]: tourist.phone || "",
        [t("fields.arrival")]: formatDate(visit?.arrivalDate, visit?.arrivalTime),
        [t("fields.departure")]: formatDate(visit?.departureDate, visit?.departureTime),
        [t("fields.hotel")]: visit?.hotelName || "",
        [t("fields.roomType")]: visit?.roomType === "twin" ? t("roomTypes.twin") : visit?.roomType === "double" ? t("roomTypes.double") : "",
        [t("transport.arrivalTransport")]: visit?.transportType === "plane" ? t("transport.plane") : t("transport.train"),
        [t("fields.flightNumber")]: visit?.flightNumber || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, getCityName(city));
    XLSX.writeFile(wb, `${getCityName(city)}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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

      // Check if group is from single deal or custom group with one tourist (for surcharge/nights merging)
      const isSingleDealGroup = group.dealIds.length === 1 && group.dealIds[0] !== '';
      const isCustomGroup = group.groupId.startsWith('custom-');
      const shouldMergeSurchargeNights = (isSingleDealGroup && group.tourists.length > 1) || (isCustomGroup && group.tourists.length === 1);

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
                {t("devMode.title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {t("devMode.description")}
              </p>
            </div>
            <Badge variant="outline" className="text-orange-500 border-orange-500">
              {t("devMode.mockData")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">{t("devMode.entityId")}:</p>
              <p className="text-sm text-muted-foreground font-mono">{MOCK_ENTITY_ID}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("devMode.event")}:</p>
              <p className="text-sm text-muted-foreground">{MOCK_EVENT_TITLE}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" data-testid="tab-summary">
            {t("nav.table")}
          </TabsTrigger>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            {t("nav.dashboard")}
          </TabsTrigger>
          <TabsTrigger value="tourists" data-testid="tab-tourists">
            {t("summary.titleShort", { count: tourists.length })}
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 className="text-base sm:text-lg font-semibold truncate min-w-0">
              {MOCK_EVENT_TITLE}
            </h2>
            <div className="flex gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-grouping-menu"
                  >
                    <Grid className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t("grouping.grouping")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setIsGrouped(!isGrouped)}
                    data-testid="menu-toggle-grouping"
                  >
                    {isGrouped ? <List className="h-4 w-4 mr-2" /> : <Grid className="h-4 w-4 mr-2" />}
                    {isGrouped ? t("grouping.hideGrouping") : t("grouping.showGrouping")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleGroup}
                    disabled={selectedTourists.size < 2}
                    data-testid="menu-group"
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    {t("grouping.group")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleUngroup}
                    disabled={selectedTourists.size === 0}
                    data-testid="menu-ungroup"
                  >
                    <List className="h-4 w-4 mr-2" />
                    {t("grouping.ungroup")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                onClick={handleShareFull}
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("sharing.share")}</span>
              </Button>
            </div>
          </div>

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
                    <th className="px-4 py-3 text-left text-sm font-semibold">{t("summary.headerNumber")}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">{t("summary.headerTourist")}</th>
                    {CITIES.map(city => (
                      <th key={city} className="px-4 py-3 text-left text-sm font-semibold min-w-[250px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>{getCityName(city)}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleShareCity(city)}
                            className="h-6 w-6 shrink-0"
                            title={t("sharing.shareCity", { city: getCityName(city) })}
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
                      <Fragment key={tourist.id}>
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
                                  <span>{t("summary.deal")} #{t("summary.noDeal")}</span>
                                ) : (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span>{t("summary.deal")}:</span>
                                    {dealIds.map((dealId, idx) => (
                                      <span key={dealId} className="flex items-center gap-1">
                                        <span>{getDealTitle(dealId)}</span>
                                        {idx < dealIds.length - 1 && <span>,</span>}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {groupSize} {groupSize === 1 ? t("summary.tourist_one") : groupSize < 5 ? t("summary.tourist_few") : t("summary.tourist_many")}
                                </Badge>
                                {/* Show surcharge/nights in group header when single deal */}
                                {shouldMergeSurchargeNights && (
                                  <>
                                    {tourist.surcharge && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                                        <span className="font-medium text-primary">{t("fields.surcharge")}:</span>
                                        <span>{tourist.surcharge}</span>
                                      </div>
                                    )}
                                    {tourist.nights && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                                        <span className="font-medium text-primary">{t("fields.nights")}:</span>
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
                                  placeholder={t("placeholders.enterName")}
                                  onSave={(value) => updateField(tourist.id, "name", value)}
                                  className="font-medium"
                                />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">{t("fields.phoneShort")}:</span>{" "}
                                <EditableCell
                                  value={tourist.phone}
                                  type="phone"
                                  placeholder={t("placeholders.addPhone")}
                                  onSave={(value) => updateField(tourist.id, "phone", value)}
                                  className="inline-flex"
                                />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">{t("fields.passport")}:</span>{" "}
                                <EditableCell
                                  value={tourist.passport}
                                  type="text"
                                  placeholder={t("placeholders.addPassport")}
                                  onSave={(value) => updateField(tourist.id, "passport", value)}
                                  className="inline-flex"
                                />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">{t("fields.birthDate")}:</span>{" "}
                                <EditableCell
                                  value={tourist.birthDate}
                                  type="date"
                                  placeholder={t("placeholders.addDate")}
                                  onSave={(value) => updateField(tourist.id, "birthDate", value)}
                                  className="inline-flex"
                                />
                              </div>
                              {/* Only show surcharge/nights in tourist card when NOT merged in group header */}
                              {!shouldMergeSurchargeNights && (
                                <>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">{t("fields.surcharge")}:</span>{" "}
                                    <EditableCell
                                      value={tourist.surcharge}
                                      type="text"
                                      placeholder={t("placeholders.addSurcharge")}
                                      onSave={(value) => updateField(tourist.id, "surcharge", value)}
                                      className="inline-flex"
                                    />
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">{t("fields.nights")}:</span>{" "}
                                    <EditableCell
                                      value={tourist.nights}
                                      type="text"
                                      placeholder={t("placeholders.addCount")}
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
                                data-testid={`tourist-${originalIndex}-city-${city.toLowerCase()}`}
                              >
                                {visit && (
                                  <div className="flex flex-col gap-0.5">
                                    {/* Dates */}
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-medium">{t("fields.arrival")}:</span>
                                        <EditableCell
                                          value={visit.arrivalDate}
                                          type="date"
                                          placeholder={t("fields.date")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "arrivalDate", value)}
                                          className="inline-flex text-xs"
                                        />
                                        <EditableCell
                                          value={visit.arrivalTime}
                                          type="time"
                                          placeholder={t("fields.time")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "arrivalTime", value)}
                                          className="inline-flex text-xs"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-medium">{t("fields.departure")}:</span>
                                        <EditableCell
                                          value={visit.departureDate}
                                          type="date"
                                          placeholder={t("fields.date")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "departureDate", value)}
                                          className="inline-flex text-xs"
                                        />
                                        <EditableCell
                                          value={visit.departureTime}
                                          type="time"
                                          placeholder={t("fields.time")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "departureTime", value)}
                                          className="inline-flex text-xs"
                                        />
                                      </div>
                                    </div>
                                    
                                    {/* Hotel */}
                                    <div className="text-xs space-y-0.5 pt-0.5">
                                      <div>
                                        <span className="font-medium text-muted-foreground">{t("fields.hotel")}: </span>
                                        <EditableCell
                                          value={visit.hotelName}
                                          type="text"
                                          placeholder={t("placeholders.hotelName")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "hotelName", value)}
                                          className="inline-flex"
                                        />
                                      </div>
                                      <div>
                                        <span className="font-medium text-muted-foreground">{t("fields.type")}: </span>
                                        <EditableCell
                                          value={visit.roomType}
                                          type="select"
                                          placeholder={t("placeholders.selectType")}
                                          selectOptions={[
                                            { value: "twin", label: t("roomTypes.twin") },
                                            { value: "double", label: t("roomTypes.double") }
                                          ]}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "roomType", value)}
                                          className="inline-flex"
                                        />
                                      </div>
                                    </div>
                                  
                                    {/* Transport - Compact */}
                                    <div className="flex flex-col gap-0.5 pt-0.5">
                                      {/* Arrival Transport */}
                                      <div className="flex items-center gap-0.5 flex-wrap text-xs leading-tight">
                                        {visit.transportType === "plane" ? <Plane className="h-3 w-3 shrink-0" /> : <Train className="h-3 w-3 shrink-0" />}
                                        <span className="font-medium">{t("fields.arrivalShort")}:</span>
                                        <EditableCell
                                          value={visit.transportType}
                                          type="select"
                                          placeholder={t("placeholders.transportType")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "transportType", value)}
                                          selectOptions={[
                                            { value: "plane", label: t("transport.plane") },
                                            { value: "train", label: t("transport.train") },
                                          ]}
                                          className="inline-flex text-xs"
                                        />
                                        <EditableCell
                                          value={visit.flightNumber}
                                          type="text"
                                          placeholder={t("fields.flightNumber")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "flightNumber", value)}
                                          className="inline-flex text-xs"
                                        />
                                        <EditableCell
                                          value={visit.airport}
                                          type="text"
                                          placeholder={t("fields.airport")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "airport", value)}
                                          className="inline-flex text-xs"
                                        />
                                        <span className="text-muted-foreground">•</span>
                                        <EditableCell
                                          value={visit.transfer}
                                          type="text"
                                          placeholder={t("fields.transfer")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "transfer", value)}
                                          className="inline-flex text-xs"
                                        />
                                      </div>
                                      
                                      {/* Departure Transport - always show */}
                                      <div className="flex items-center gap-0.5 flex-wrap text-xs leading-tight">
                                        {visit.departureTransportType === "plane" ? <Plane className="h-3 w-3 shrink-0" /> : visit.departureTransportType === "train" ? <Train className="h-3 w-3 shrink-0" /> : <span className="w-3"></span>}
                                        <span className="font-medium">{t("fields.departureShort")}:</span>
                                        <EditableCell
                                          value={visit.departureTransportType}
                                          type="select"
                                          placeholder={t("placeholders.transportType")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "departureTransportType", value)}
                                          selectOptions={[
                                            { value: "plane", label: t("transport.plane") },
                                            { value: "train", label: t("transport.train") },
                                          ]}
                                          className="inline-flex text-xs"
                                        />
                                        <EditableCell
                                          value={visit.departureFlightNumber}
                                          type="text"
                                          placeholder={t("fields.flightNumber")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "departureFlightNumber", value)}
                                          className="inline-flex text-xs"
                                        />
                                        <EditableCell
                                          value={visit.departureAirport}
                                          type="text"
                                          placeholder={t("fields.airport")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "departureAirport", value)}
                                          className="inline-flex text-xs"
                                        />
                                        <span className="text-muted-foreground">•</span>
                                        <EditableCell
                                          value={visit.departureTransfer}
                                          type="text"
                                          placeholder={t("fields.transfer")}
                                          onSave={(value) => updateVisitField(tourist.id, visit.id, "departureTransfer", value)}
                                          className="inline-flex text-xs"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {processedTourists.map(({ tourist, originalIndex, isFirstInGroup, groupIndex, groupSize, dealIds, shouldMergeSurchargeNights }) => {
              const groupKey = `group-${groupIndex}`;
              return (
              <div key={tourist.id}>
                {isGrouped && isFirstInGroup && (
                  <div className="px-3 py-1.5 bg-primary/10 rounded-md border-l-4 border-primary mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary flex-wrap leading-tight">
                        {!dealIds || dealIds.length === 0 ? (
                          <span>{t("grouping.deal")} #{t("grouping.noDeal")}</span>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span>{t("grouping.deal")}:</span>
                            {dealIds.map((dealId, idx) => (
                              <span key={dealId} className="flex items-center gap-1">
                                <span>{getDealTitle(dealId)}</span>
                                {idx < dealIds.length - 1 && <span>,</span>}
                              </span>
                            ))}
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {groupSize} {groupSize === 1 ? t("grouping.touristSingular") : groupSize < 5 ? t("grouping.touristFew") : t("grouping.touristMany")}
                        </Badge>
                      </div>
                      {/* Show surcharge/nights in group header when single deal */}
                      {shouldMergeSurchargeNights && (tourist.surcharge || tourist.nights) && (
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                          {tourist.surcharge && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-primary">{t("fields.surcharge")}:</span>
                              <span className="text-muted-foreground">{tourist.surcharge}</span>
                            </div>
                          )}
                          {tourist.nights && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-primary">{t("fields.nights")}:</span>
                              <span className="text-muted-foreground">{tourist.nights}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <Card className={isGrouped && groupIndex % 2 === 1 ? "bg-muted/30" : ""}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedTourists.has(tourist.id)}
                        onCheckedChange={() => toggleTourist(tourist.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="shrink-0 text-xs">{originalIndex + 1}</Badge>
                          <h3 className="font-semibold text-xs leading-tight">{tourist.name}</h3>
                        </div>
                        <div className="space-y-0.5 text-xs text-muted-foreground leading-tight">
                          <div>
                            <span className="font-medium">{t("fields.phoneShort")}:</span>{" "}
                            <EditableCell
                              value={tourist.phone}
                              type="phone"
                              placeholder={t("placeholders.add")}
                              onSave={(value) => updateField(tourist.id, "phone", value)}
                              className="inline-flex text-xs"
                            />
                          </div>
                          {/* Only show surcharge/nights in tourist card when NOT merged in group header */}
                          {!shouldMergeSurchargeNights && (
                            <div>
                              <span className="font-medium">{t("fields.surcharge")}:</span>{" "}
                              <EditableCell
                                value={tourist.surcharge}
                                type="text"
                                placeholder={t("placeholders.add")}
                                onSave={(value) => updateField(tourist.id, "surcharge", value)}
                                className="inline-flex text-xs"
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
                <CardTitle className="text-sm font-medium">{t("dev.totalTourists")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTourists}</div>
              </CardContent>
            </Card>

            {CITIES.map(city => (
              <Card key={city}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{getCityName(city)}</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.cityCounts[city]}</div>
                  <p className="text-xs text-muted-foreground">{t("dev.tourists")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tourists Tab */}
        <TabsContent value="tourists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("dev.touristsList")}</CardTitle>
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
                      <div><strong>{t("fields.phone")}:</strong> {tourist.phone || "—"}</div>
                      <div><strong>{t("fields.passport")}:</strong> {tourist.passport || "—"}</div>
                      <div><strong>{t("fields.birthDate")}:</strong> {tourist.birthDate || "—"}</div>
                      <div><strong>{t("fields.surcharge")}:</strong> {tourist.surcharge || "—"}</div>
                      <div><strong>{t("fields.nights")}:</strong> {tourist.nights || "—"}</div>
                      <div><strong>{t("fields.deal")}:</strong> {tourist.bitrixDealId || "—"}</div>
                      <div><strong>{t("dev.visitedCities")}:</strong> {tourist.visits.length}</div>
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
        <DialogContent className="sm:max-w-md" data-testid="dialog-share">
          <DialogHeader>
            <DialogTitle>
              {shareDialogCity 
                ? t("sharing.shareCity", { city: getCityName(shareDialogCity) })
                : t("sharing.shareFullTable")}
            </DialogTitle>
            <DialogDescription>
              {t("sharing.selectFormat")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={handleCopyLinkInDialog}
              className="w-full justify-start"
              variant="outline"
              data-testid="dialog-button-copy-link"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {t("sharing.copyLink")}
            </Button>
            <Button
              onClick={handleExportInDialog}
              className="w-full justify-start"
              variant="outline"
              data-testid="dialog-button-export-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("sharing.exportExcel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
