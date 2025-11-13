import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { format } from "date-fns";
import { updateEventSchema, type Event } from "@shared/schema";
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
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
                    <FormControl>
                      <Input {...field} placeholder="Страна" data-testid="input-event-country" />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value || "group"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tour-type">
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="group">Групповой</SelectItem>
                        <SelectItem value="individual">Индивидуальный</SelectItem>
                        <SelectItem value="excursion">Экскурсия</SelectItem>
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
                    <FormLabel>Дата окончания</FormLabel>
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
