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
import { CITIES, type City, type TransportType } from "@shared/schema";

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
});

interface CityVisitData {
  city: City;
  arrivalDate: Date | null;
  transportType: TransportType;
  hotelName: string;
}

interface TouristFormProps {
  onSubmit: (data: {
    name: string;
    email?: string;
    phone?: string;
    visits: Array<{
      city: City;
      arrivalDate: string;
      transportType: TransportType;
      hotelName: string;
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
        transportType: "plane",
        hotelName: "",
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
        transportType: v.transportType,
        hotelName: v.hotelName,
      }));

    if (visits.length === 0) {
      alert("Пожалуйста, добавьте хотя бы один город в маршрут");
      return;
    }

    onSubmit({
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
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
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Дата прибытия *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal mt-1"
                                data-testid={`button-date-${city.toLowerCase()}`}
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

                        <div>
                          <Label>Способ прибытия *</Label>
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

                        <div>
                          <Label htmlFor={`hotel-${city}`}>Отель *</Label>
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
