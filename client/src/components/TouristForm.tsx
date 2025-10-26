import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plane, Train, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CITIES, CURRENCIES, ROOM_TYPES, type City, type TransportType, type Currency, type RoomType } from "@shared/schema";

const cityNames: Record<City, { en: string; cn: string }> = {
  Beijing: { en: "Beijing", cn: "北京" },
  Luoyang: { en: "Luoyang", cn: "洛阳" },
  Xian: { en: "Xi'an", cn: "西安" },
  Zhangjiajie: { en: "Zhangjiajie", cn: "张家界" },
};

const formSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  phone: z.string().optional(),
  passport: z.string()
    .regex(/^\d{0,9}$/, "Загранпаспорт должен содержать 9 цифр")
    .optional()
    .or(z.literal("")),
  birthDate: z.string().optional(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  nights: z.string().optional(),
});

interface CityVisitData {
  city: City;
  arrivalDate: Date | null;
  arrivalTime: string;
  departureDate: Date | null;
  departureTime: string;
  transportType: TransportType;
  departureTransportType: TransportType | null;
  flightNumber: string;
  airport: string;
  transfer: string;
  departureFlightNumber: string;
  departureAirport: string;
  departureTransfer: string;
  hotelName: string;
  roomType: RoomType | null;
}

interface TouristFormProps {
  onSubmit: (data: {
    name: string;
    email?: string;
    phone?: string;
    passport?: string;
    birthDate?: string;
    amount?: string;
    currency?: string;
    nights?: string;
    visits: Array<{
      city: City;
      arrivalDate: string;
      arrivalTime?: string;
      departureDate?: string;
      departureTime?: string;
      transportType: TransportType;
      departureTransportType?: TransportType;
      flightNumber?: string;
      airport?: string;
      transfer?: string;
      departureFlightNumber?: string;
      departureAirport?: string;
      departureTransfer?: string;
      hotelName: string;
      roomType?: RoomType;
    }>;
  }) => void;
  onCancel?: () => void;
}

export default function TouristForm({ onSubmit, onCancel }: TouristFormProps) {
  const [selectedCities, setSelectedCities] = useState<Set<City>>(new Set());
  const [cityVisits, setCityVisits] = useState<Map<City, CityVisitData>>(new Map());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      passport: "",
      birthDate: "",
      amount: "",
      currency: "RUB",
      nights: "",
    },
  });

  const toggleCity = (city: City) => {
    const newSelected = new Set(selectedCities);
    if (newSelected.has(city)) {
      newSelected.delete(city);
      const newVisits = new Map(cityVisits);
      newVisits.delete(city);
      setCityVisits(newVisits);
    } else {
      newSelected.add(city);
      const newVisits = new Map(cityVisits);
      newVisits.set(city, {
        city,
        arrivalDate: null,
        arrivalTime: "",
        departureDate: null,
        departureTime: "",
        transportType: "plane",
        departureTransportType: null,
        flightNumber: "",
        airport: "",
        transfer: "",
        departureFlightNumber: "",
        departureAirport: "",
        departureTransfer: "",
        hotelName: "",
        roomType: null,
      });
      setCityVisits(newVisits);
    }
    setSelectedCities(newSelected);
  };

  const updateVisit = (city: City, updates: Partial<CityVisitData>) => {
    const newVisits = new Map(cityVisits);
    const current = newVisits.get(city);
    if (current) {
      newVisits.set(city, { ...current, ...updates });
      setCityVisits(newVisits);
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const visits = Array.from(cityVisits.values())
      .filter((v) => v.arrivalDate && v.hotelName)
      .map((v) => ({
        city: v.city,
        arrivalDate: v.arrivalDate!.toISOString().split("T")[0],
        arrivalTime: v.arrivalTime || undefined,
        departureDate: v.departureDate ? v.departureDate.toISOString().split("T")[0] : undefined,
        departureTime: v.departureTime || undefined,
        transportType: v.transportType,
        departureTransportType: v.departureTransportType || undefined,
        flightNumber: v.flightNumber || undefined,
        airport: v.airport || undefined,
        transfer: v.transfer || undefined,
        departureFlightNumber: v.departureFlightNumber || undefined,
        departureAirport: v.departureAirport || undefined,
        departureTransfer: v.departureTransfer || undefined,
        hotelName: v.hotelName,
        roomType: v.roomType || undefined,
      }));

    if (visits.length === 0) {
      alert("Пожалуйста, добавьте хотя бы один город в маршрут");
      return;
    }

    onSubmit({
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      passport: values.passport || undefined,
      birthDate: values.birthDate || undefined,
      amount: values.amount || undefined,
      currency: values.currency || undefined,
      nights: values.nights || undefined,
      visits,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Информация о туристе</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя и фамилия *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Иван Петров"
                      data-testid="input-tourist-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="ivan@example.com"
                      data-testid="input-tourist-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Телефон</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+7 900 123-45-67"
                      data-testid="input-tourist-phone"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Загранпаспорт</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="769699508"
                      maxLength={9}
                      pattern="\d*"
                      data-testid="input-tourist-passport"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дата рождения</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      data-testid="input-tourist-birthdate"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сумма</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        data-testid="input-tourist-amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Валюта</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tourist-currency">
                          <SelectValue placeholder="Выберите валюту" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency === "RUB" ? "Рубль (₽)" : "Юань (¥)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="nights"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Количество ночей</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="7"
                      data-testid="input-tourist-nights"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Маршрут тура</CardTitle>
            <p className="text-sm text-muted-foreground">
              Выберите города, которые турист посетит
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {CITIES.map((city) => {
                const isSelected = selectedCities.has(city);
                return (
                  <div
                    key={city}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer hover-elevate ${
                      isSelected ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => toggleCity(city)}
                    data-testid={`checkbox-city-${city.toLowerCase()}`}
                  >
                    <div 
                      className={`h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center ${
                        isSelected ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="font-medium">{cityNames[city].en}</div>
                      <div className="text-sm text-muted-foreground">
                        {cityNames[city].cn}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedCities.size > 0 && (
              <div className="space-y-4 mt-6">
                <h4 className="font-medium">Детали посещения городов</h4>
                {Array.from(selectedCities).map((city) => {
                  const visit = cityVisits.get(city);
                  if (!visit) return null;

                  return (
                    <Card key={city} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {cityNames[city].en}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {cityNames[city].cn}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleCity(city)}
                            data-testid={`button-remove-city-${city.toLowerCase()}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Прибытие */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-2">
                            Прибытие
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Дата прибытия *</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                    data-testid={`button-arrival-date-${city.toLowerCase()}`}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {visit.arrivalDate ? (
                                      format(visit.arrivalDate, "PPP", { locale: ru })
                                    ) : (
                                      <span>Выберите дату</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={visit.arrivalDate || undefined}
                                    onSelect={(date) =>
                                      updateVisit(city, { arrivalDate: date || null })
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`arrival-time-${city}`}>Время прибытия</Label>
                              <Input
                                id={`arrival-time-${city}`}
                                type="time"
                                value={visit.arrivalTime}
                                onChange={(e) =>
                                  updateVisit(city, { arrivalTime: e.target.value })
                                }
                                data-testid={`input-arrival-time-${city.toLowerCase()}`}
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Транспорт *</Label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <Button
                                type="button"
                                variant={
                                  visit.transportType === "plane" ? "default" : "outline"
                                }
                                className="justify-start"
                                onClick={() =>
                                  updateVisit(city, { transportType: "plane" })
                                }
                                data-testid={`button-transport-plane-${city.toLowerCase()}`}
                              >
                                <Plane className="mr-2 h-4 w-4" />
                                Самолет
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  visit.transportType === "train" ? "default" : "outline"
                                }
                                className="justify-start"
                                onClick={() =>
                                  updateVisit(city, { transportType: "train" })
                                }
                                data-testid={`button-transport-train-${city.toLowerCase()}`}
                              >
                                <Train className="mr-2 h-4 w-4" />
                                Поезд
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`flight-number-${city}`}>Рейс</Label>
                              <Input
                                id={`flight-number-${city}`}
                                placeholder="CA123, Z2123"
                                value={visit.flightNumber}
                                onChange={(e) =>
                                  updateVisit(city, { flightNumber: e.target.value })
                                }
                                className="mt-1"
                                data-testid={`input-flight-number-${city.toLowerCase()}`}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`airport-${city}`}>Аэропорт</Label>
                              <Input
                                id={`airport-${city}`}
                                placeholder="Название аэропорта"
                                value={visit.airport}
                                onChange={(e) =>
                                  updateVisit(city, { airport: e.target.value })
                                }
                                className="mt-1"
                                data-testid={`input-airport-${city.toLowerCase()}`}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`transfer-${city}`}>Трансфер</Label>
                            <Input
                              id={`transfer-${city}`}
                              placeholder="Информация о трансфере"
                              value={visit.transfer}
                              onChange={(e) =>
                                updateVisit(city, { transfer: e.target.value })
                              }
                              className="mt-1"
                              data-testid={`input-transfer-${city.toLowerCase()}`}
                            />
                          </div>
                        </div>

                        {/* Убытие */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-2">
                            Убытие
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Дата выезда</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                    data-testid={`button-departure-date-${city.toLowerCase()}`}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {visit.departureDate ? (
                                      format(visit.departureDate, "PPP", { locale: ru })
                                    ) : (
                                      <span>Выберите дату</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={visit.departureDate || undefined}
                                    onSelect={(date) =>
                                      updateVisit(city, { departureDate: date || null })
                                    }
                                    disabled={(date) =>
                                      visit.arrivalDate ? date < visit.arrivalDate : false
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`departure-time-${city}`}>Время выезда</Label>
                              <Input
                                id={`departure-time-${city}`}
                                type="time"
                                value={visit.departureTime}
                                onChange={(e) =>
                                  updateVisit(city, { departureTime: e.target.value })
                                }
                                data-testid={`input-departure-time-${city.toLowerCase()}`}
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Транспорт</Label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <Button
                                type="button"
                                variant={
                                  visit.departureTransportType === "plane" ? "default" : "outline"
                                }
                                className="justify-start"
                                onClick={() =>
                                  updateVisit(city, { departureTransportType: "plane" })
                                }
                                data-testid={`button-departure-transport-plane-${city.toLowerCase()}`}
                              >
                                <Plane className="mr-2 h-4 w-4" />
                                Самолет
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  visit.departureTransportType === "train" ? "default" : "outline"
                                }
                                className="justify-start"
                                onClick={() =>
                                  updateVisit(city, { departureTransportType: "train" })
                                }
                                data-testid={`button-departure-transport-train-${city.toLowerCase()}`}
                              >
                                <Train className="mr-2 h-4 w-4" />
                                Поезд
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`departure-flight-number-${city}`}>Рейс</Label>
                              <Input
                                id={`departure-flight-number-${city}`}
                                placeholder="CA123, Z2123"
                                value={visit.departureFlightNumber}
                                onChange={(e) =>
                                  updateVisit(city, { departureFlightNumber: e.target.value })
                                }
                                className="mt-1"
                                data-testid={`input-departure-flight-number-${city.toLowerCase()}`}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`departure-airport-${city}`}>Аэропорт</Label>
                              <Input
                                id={`departure-airport-${city}`}
                                placeholder="Название аэропорта"
                                value={visit.departureAirport}
                                onChange={(e) =>
                                  updateVisit(city, { departureAirport: e.target.value })
                                }
                                className="mt-1"
                                data-testid={`input-departure-airport-${city.toLowerCase()}`}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`departure-transfer-${city}`}>Трансфер</Label>
                            <Input
                              id={`departure-transfer-${city}`}
                              placeholder="Информация о трансфере"
                              value={visit.departureTransfer}
                              onChange={(e) =>
                                updateVisit(city, { departureTransfer: e.target.value })
                              }
                              className="mt-1"
                              data-testid={`input-departure-transfer-${city.toLowerCase()}`}
                            />
                          </div>
                        </div>

                        {/* Отель */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-2">
                            Отель
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`hotel-${city}`}>Название *</Label>
                              <Input
                                id={`hotel-${city}`}
                                placeholder="Название отеля"
                                value={visit.hotelName}
                                onChange={(e) =>
                                  updateVisit(city, { hotelName: e.target.value })
                                }
                                className="mt-1"
                                data-testid={`input-hotel-${city.toLowerCase()}`}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`room-type-${city}`}>Тип номера</Label>
                              <Select
                                value={visit.roomType || ""}
                                onValueChange={(value) =>
                                  updateVisit(city, { roomType: value as RoomType })
                                }
                              >
                                <SelectTrigger
                                  id={`room-type-${city}`}
                                  className="mt-1"
                                  data-testid={`select-room-type-${city.toLowerCase()}`}
                                >
                                  <SelectValue placeholder="Выберите тип" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROOM_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type === "twin" ? "Twin (две кровати)" : "Double (одна кровать)"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Отмена
            </Button>
          )}
          <Button type="submit" data-testid="button-submit">
            Сохранить туриста
          </Button>
        </div>
      </form>
    </Form>
  );
}
