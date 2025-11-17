import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { updateEventSchema, type Event, type User, COUNTRIES, TOUR_TYPES } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPicker, type ColorOption } from "@/components/ColorPicker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarIcon, Archive, ArchiveRestore, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const formSchema = z.object({
  name: z.string().trim().min(1, "Название обязательно"),
  description: z.string().optional(),
  country: z.string().trim().min(1, "Страна обязательна"),
  cities: z.array(z.string()).min(1, "Укажите хотя бы один город"),
  tourType: z.string().min(1, "Тип тура обязателен"),
  startDate: z.date({ required_error: "Дата начала обязательна" }),
  endDate: z.date({ required_error: "Дата окончания обязательна" }),
  participantLimit: z.number().min(1, "Лимит должен быть больше 0"),
  price: z.string().trim().min(1, "Цена обязательна"),
  color: z.enum(["red", "blue", "green", "yellow", "purple"]).nullable(),
  cityGuides: z.record(z.string(), z.string()).optional(), // City name -> user ID mapping
});

type FormValues = z.infer<typeof formSchema>;

interface EditEventDialogProps {
  open: boolean;
  event: Event | null;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FormValues) => void;
}

export function EditEventDialog({
  open,
  event,
  onOpenChange,
  onSave,
}: EditEventDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Only admins can archive events
  const canArchive = user?.role === "admin";
  
  // Load viewer users for guide assignment
  const { data: viewers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/viewers"],
    enabled: open,
  });

  // Archive/Unarchive mutation
  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const endpoint = archive ? `/api/events/${id}/archive` : `/api/events/${id}/unarchive`;
      const response = await apiRequest("PATCH", endpoint);
      if (!response.ok) {
        throw new Error(archive ? "Не удалось заархивировать тур" : "Не удалось разархивировать тур");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: variables.archive ? "Тур заархивирован" : "Тур разархивирован",
        description: variables.archive 
          ? "Тур перемещён в архив" 
          : "Тур восстановлен из архива",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: event?.name || "",
      description: event?.description || "",
      country: event?.country || "",
      cities: event?.cities || [],
      tourType: event?.tourType || "group",
      startDate: event?.startDate ? new Date(event.startDate) : undefined,
      endDate: event?.endDate ? new Date(event.endDate) : undefined,
      participantLimit: event?.participantLimit || 10,
      price: event?.price ? String(event.price) : "0",
      color: (event?.color as ColorOption) || null,
      cityGuides: (event?.cityGuides as Record<string, string>) || {},
    },
  });

  const handleSubmit = (data: FormValues) => {
    // Validate cities not empty
    if (!data.cities || data.cities.length === 0) {
      form.setError("cities", { message: "Укажите хотя бы один город" });
      return;
    }

    // REQUIRED fields: always send trimmed values (notNull in schema)
    const normalizedData: any = {
      name: data.name.trim(),
      country: data.country.trim(),
      cities: data.cities,
      tourType: data.tourType,
      // Serialize dates to YYYY-MM-DD in local timezone
      startDate: format(data.startDate, "yyyy-MM-dd"),
      endDate: format(data.endDate, "yyyy-MM-dd"),
      price: String(data.price).trim(),
      participantLimit: Number(data.participantLimit),
    };

    // OPTIONAL fields: send null to clear, omit to keep existing
    if (data.description && data.description.trim()) {
      normalizedData.description = data.description.trim();
    } else if (data.description === "") {
      normalizedData.description = null;
    }

    if (data.color) {
      normalizedData.color = data.color;
    } else {
      normalizedData.color = null;
    }

    // Add cityGuides if provided
    if (data.cityGuides && Object.keys(data.cityGuides).length > 0) {
      normalizedData.cityGuides = data.cityGuides;
    } else {
      normalizedData.cityGuides = null;
    }

    onSave(normalizedData);
    // Don't close dialog here - let parent handle it after mutation success
  };

  const handleCitiesChange = (value: string) => {
    const citiesArray = value.split(",").map(city => city.trim()).filter(Boolean);
    form.setValue("cities", citiesArray);
  };

  useEffect(() => {
    if (event) {
      form.reset({
        name: event.name || "",
        description: event.description || "",
        country: event.country || "",
        cities: event.cities || [],
        tourType: event.tourType || "group",
        startDate: event.startDate ? new Date(event.startDate) : undefined,
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        participantLimit: event.participantLimit || 10,
        price: event.price ? String(event.price) : "0",
        color: (event.color as ColorOption) || null,
        cityGuides: (event.cityGuides as Record<string, string>) || {},
      });
    }
  }, [event, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-event">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Редактировать тур</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Название тура" data-testid="input-event-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Описание тура"
                      value={field.value || ""}
                      data-testid="input-event-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Страна</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-country">
                          <SelectValue placeholder="Выберите страну" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Include event's current country if not in predefined list (backward compatibility) */}
                        {event?.country && !COUNTRIES.includes(event.country as any) && (
                          <SelectItem value={event.country}>{event.country} (существующее значение)</SelectItem>
                        )}
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tourType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип тура</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tour-type">
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Include event's current tourType if not in predefined list (backward compatibility) */}
                        {event?.tourType && !TOUR_TYPES.includes(event.tourType as any) && (
                          <SelectItem value={event.tourType}>{event.tourType} (существующее значение)</SelectItem>
                        )}
                        <SelectItem value="group">Групповой</SelectItem>
                        <SelectItem value="individual">Индивидуальный</SelectItem>
                        <SelectItem value="excursion">Экскурсия</SelectItem>
                        <SelectItem value="transfer">Трансфер</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Города (через запятую)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Дели, Агра, Джайпур"
                      value={field.value?.join(", ") || ""}
                      onChange={(e) => handleCitiesChange(e.target.value)}
                      data-testid="input-event-cities"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City Guides Section */}
            {form.watch("cities")?.length > 0 && (
              <div className="space-y-3">
                <FormLabel>Назначение гидов</FormLabel>
                <div className="grid gap-3">
                  {form.watch("cities")?.map((city: string) => (
                    <div key={city} className="grid grid-cols-[1fr,2fr] gap-3 items-center">
                      <div className="text-sm font-medium">{city}</div>
                      <Select
                        value={form.watch("cityGuides")?.[city] || "__NONE__"}
                        onValueChange={(value) => {
                          const currentGuides = form.getValues("cityGuides") || {};
                          if (value === "__NONE__") {
                            // Remove guide assignment for this city
                            const { [city]: _, ...rest } = currentGuides;
                            form.setValue("cityGuides", rest);
                          } else {
                            // Assign guide to this city
                            form.setValue("cityGuides", { ...currentGuides, [city]: value });
                          }
                        }}
                      >
                        <SelectTrigger data-testid={`select-guide-${city}`}>
                          <SelectValue placeholder="Выберите гида" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__NONE__">Без гида</SelectItem>
                          {viewers.map((viewer) => (
                            <SelectItem key={viewer.id} value={viewer.id}>
                              {viewer.firstName} {viewer.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Дата начала</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-start-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd.MM.yyyy") : "Выберите дату"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => date && field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <FormLabel>Дата окончания</FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-pretty break-words">
                          <p>Тур автоматически заархивируется по истечении этой даты</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-end-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd.MM.yyyy") : "Выберите дату"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => date && field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="participantLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Лимит участников</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        data-testid="input-participant-limit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена (₽)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="89000"
                        data-testid="input-event-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Цветовая метка</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value as ColorOption}
                      onChange={field.onChange}
                      data-testid="color-picker-event"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <div className="flex items-center justify-between w-full gap-2">
                {event && canArchive && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => archiveMutation.mutate({ id: event.id, archive: !event.isArchived })}
                    disabled={archiveMutation.isPending}
                    data-testid={event.isArchived ? "button-unarchive" : "button-archive"}
                  >
                    {event.isArchived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Разархивировать
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Архивировать
                      </>
                    )}
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel"
                  >
                    Отмена
                  </Button>
                  <Button type="submit" data-testid="button-save">
                    Сохранить
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
