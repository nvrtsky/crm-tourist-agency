import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Plus, Search, Filter } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import type { Event } from "@shared/schema";

interface EventWithStats extends Event {
  bookedCount: number;
  availableSpots: number;
}

export default function Events() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [tourTypeFilter, setTourTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("startDate");

  const { data: events = [], isLoading } = useQuery<EventWithStats[]>({
    queryKey: ["/api/events"],
  });

  const filteredEvents = events
    .filter(event => {
      const matchesSearch = !searchQuery || 
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.cities.some(city => city.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCountry = countryFilter === "all" || event.country === countryFilter;
      const matchesTourType = tourTypeFilter === "all" || event.tourType === tourTypeFilter;
      return matchesSearch && matchesCountry && matchesTourType;
    })
    .sort((a, b) => {
      if (sortBy === "startDate") {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
      if (sortBy === "price") {
        return Number(a.price) - Number(b.price);
      }
      if (sortBy === "availability") {
        return b.availableSpots - a.availableSpots;
      }
      return 0;
    });

  const countries = Array.from(new Set(events.map(e => e.country)));
  const tourTypes = Array.from(new Set(events.map(e => e.tourType)));

  const stats = {
    total: events.length,
    upcoming: events.filter(e => new Date(e.startDate) > new Date()).length,
    fullOrAlmostFull: events.filter(e => e.availableSpots <= e.participantLimit * 0.1).length,
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-events">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">События и туры</h1>
          <p className="text-muted-foreground mt-2">
            Управление туристическими событиями и группами
          </p>
        </div>
        <Button data-testid="button-create-event">
          <Plus className="h-4 w-4 mr-2" />
          Создать событие
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="stat-total-events">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего событий</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">В системе</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-upcoming-events">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Предстоящие</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">Еще не началось</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-full-events">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Почти заполнены</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fullOrAlmostFull}</div>
            <p className="text-xs text-muted-foreground">≥90% занято</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-filters">
        <CardHeader>
          <CardTitle>Фильтры и поиск</CardTitle>
          <CardDescription>Найдите нужное событие</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или городу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Страна</label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger data-testid="select-country">
                  <SelectValue placeholder="Все страны" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все страны</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Тип тура</label>
              <Select value={tourTypeFilter} onValueChange={setTourTypeFilter}>
                <SelectTrigger data-testid="select-tour-type">
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {tourTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Сортировка</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startDate">По дате начала</SelectItem>
                  <SelectItem value="price">По цене</SelectItem>
                  <SelectItem value="availability">По доступности</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchQuery("");
                  setCountryFilter("all");
                  setTourTypeFilter("all");
                  setSortBy("startDate");
                }}
                data-testid="button-reset-filters"
              >
                Сбросить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-64 animate-pulse" data-testid={`skeleton-${i}`}>
              <CardContent className="h-full bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card data-testid="card-no-events">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Событий не найдено</h3>
            <p className="text-sm text-muted-foreground">
              Попробуйте изменить фильтры или создайте новое событие
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onViewSummary={(eventId) => setLocation(`/events/${eventId}/summary`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
