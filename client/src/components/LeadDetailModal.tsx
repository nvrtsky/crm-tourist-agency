import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lead, LeadStatus } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, X } from "lucide-react";

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onConvertToDeal?: (leadId: string) => void;
}

const leadFormSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  phone: z.string().optional(),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  source: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
  notes: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

const statusLabels: Record<LeadStatus, string> = {
  new: "Новый",
  contacted: "Связались",
  qualified: "Квалифицирован",
  won: "Выигран",
  lost: "Проигран",
};

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qualified: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  won: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export function LeadDetailModal({
  lead,
  isOpen,
  onClose,
  onConvertToDeal,
}: LeadDetailModalProps) {
  const { toast } = useToast();
  const [isConverting, setIsConverting] = useState(false);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: lead?.name || "",
      phone: lead?.phone || "",
      email: lead?.email || "",
      source: lead?.source || "",
      status: (lead?.status as LeadStatus) || "new",
      notes: lead?.notes || "",
    },
  });

  // Reset form and converting state when lead changes
  useEffect(() => {
    if (lead) {
      form.reset({
        name: lead.name,
        phone: lead.phone || "",
        email: lead.email || "",
        source: lead.source || "",
        status: lead.status as LeadStatus,
        notes: lead.notes || "",
      });
      setIsConverting(false);
    }
  }, [lead, form]);

  const updateLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      if (!lead) return;
      return await apiRequest("PATCH", `/api/leads/${lead.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Успешно",
        description: "Лид обновлен",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить лид",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: LeadFormData) => {
    updateLeadMutation.mutate(data);
  };

  const handleConvert = () => {
    if (!lead || !onConvertToDeal) return;
    setIsConverting(true);
    onConvertToDeal(lead.id);
    onClose();
  };

  if (!lead) return null;

  const currentStatus = form.watch("status");
  const canConvert = currentStatus === "qualified";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl" data-testid="modal-lead-detail">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Детали лида</DialogTitle>
            <Badge
              className={statusColors[lead.status as LeadStatus]}
              variant="outline"
              data-testid="badge-lead-status"
            >
              {statusLabels[lead.status as LeadStatus]}
            </Badge>
          </div>
          <DialogDescription>
            Создан:{" "}
            {new Date(lead.createdAt).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Иван Иванов"
                        data-testid="input-lead-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-status">
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["new", "contacted", "qualified", "won", "lost"] as LeadStatus[]).map(
                          (status) => (
                            <SelectItem
                              key={status}
                              value={status}
                              data-testid={`select-option-${status}`}
                            >
                              {statusLabels[status]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+7 (999) 123-45-67"
                        data-testid="input-lead-phone"
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
                        {...field}
                        type="email"
                        placeholder="ivan@example.com"
                        data-testid="input-lead-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Источник</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Сайт, Реклама, Рекомендация..."
                      data-testid="input-lead-source"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Дополнительная информация о лиде..."
                      className="min-h-[100px] resize-none"
                      data-testid="textarea-lead-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <div className="flex items-center justify-between w-full gap-2">
                {canConvert && (
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleConvert}
                    disabled={isConverting}
                    data-testid="button-convert-to-deal"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Конвертировать в сделку
                  </Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    data-testid="button-cancel"
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateLeadMutation.isPending}
                    data-testid="button-save"
                  >
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
