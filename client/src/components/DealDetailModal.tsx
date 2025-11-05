import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Deal, Contact } from "@shared/schema";
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
import { X, User, Calendar } from "lucide-react";

export type DealStatus = "new" | "negotiation" | "payment" | "confirmed" | "cancelled";

interface DealDetailModalProps {
  deal: Deal | null;
  contact?: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

const dealFormSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  amount: z.coerce.number().min(0, "Сумма должна быть положительной").optional().nullable(),
  status: z.enum(["new", "negotiation", "payment", "confirmed", "cancelled"]),
  probability: z.coerce.number().min(0).max(100).optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

type DealFormData = z.infer<typeof dealFormSchema>;

const statusLabels: Record<DealStatus, string> = {
  new: "Новая",
  negotiation: "Переговоры",
  payment: "Оплата",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
};

const statusColors: Record<DealStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  negotiation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  payment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export function DealDetailModal({
  deal,
  contact,
  isOpen,
  onClose,
}: DealDetailModalProps) {
  const { toast } = useToast();

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: deal?.title || "",
      amount: deal?.amount || null,
      status: (deal?.status as DealStatus) || "new",
      probability: deal?.probability || 50,
      expectedCloseDate: deal?.expectedCloseDate || "",
      notes: deal?.notes || "",
    },
  });

  // Reset form when deal changes
  useEffect(() => {
    if (deal) {
      form.reset({
        title: deal.title,
        amount: deal.amount || null,
        status: deal.status as DealStatus,
        probability: deal.probability || 50,
        expectedCloseDate: deal.expectedCloseDate || "",
        notes: deal.notes || "",
      });
    }
  }, [deal, form]);

  const updateDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      if (!deal) return;
      return await apiRequest("PATCH", `/api/deals/${deal.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({
        title: "Успешно",
        description: "Сделка обновлена",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error?.message || "Не удалось обновить сделку",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DealFormData) => {
    updateDealMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!deal) return null;

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]" data-testid="deal-detail-modal">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <DialogTitle>Детали сделки</DialogTitle>
              <DialogDescription>
                Создана: {formatDate(deal.createdAt)}
              </DialogDescription>
            </div>
            <Badge className={statusColors[deal.status as DealStatus]}>
              {statusLabels[deal.status as DealStatus]}
            </Badge>
          </div>
        </DialogHeader>

        {contact && (
          <div className="rounded-md border p-4 space-y-2 bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              <span>Контакт</span>
            </div>
            <div className="pl-6 space-y-1 text-sm">
              <div className="font-medium" data-testid="deal-contact-name">{contact.name}</div>
              {contact.phone && (
                <div className="text-muted-foreground">{contact.phone}</div>
              )}
              {contact.email && (
                <div className="text-muted-foreground">{contact.email}</div>
              )}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-deal-title" />
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
                    <FormLabel>Сумма (₽)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ""}
                        data-testid="input-deal-amount" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Вероятность (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-deal-probability" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-deal-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <Badge className={statusColors[value as DealStatus]}>
                                {label}
                              </Badge>
                            </div>
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
                name="expectedCloseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ожидаемая дата закрытия</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-deal-close-date" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Дополнительная информация о сделке..."
                      data-testid="textarea-deal-notes"
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
                onClick={handleClose}
                data-testid="button-deal-cancel"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={updateDealMutation.isPending}
                data-testid="button-deal-save"
              >
                {updateDealMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
