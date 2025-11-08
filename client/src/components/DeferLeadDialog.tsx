import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DeferLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { postponedUntil: Date; postponeReason: string }) => void;
  leadName?: string;
}

const postponeReasons = [
  { value: "expensive", label: "Дорого" },
  { value: "no_response", label: "Пропали не отвечают" },
  { value: "competitor", label: "Ушли к конкурентам" },
  { value: "changed_mind", label: "Передумали" },
];

export function DeferLeadDialog({ open, onOpenChange, onConfirm, leadName }: DeferLeadDialogProps) {
  const [postponedUntil, setPostponedUntil] = useState<Date | undefined>(undefined);
  const [postponeReason, setPostponeReason] = useState<string>("");

  const handleConfirm = () => {
    if (!postponedUntil || !postponeReason) return;
    
    onConfirm({ 
      postponedUntil, 
      postponeReason 
    });
    
    // Reset state
    setPostponedUntil(undefined);
    setPostponeReason("");
  };

  const handleCancel = () => {
    setPostponedUntil(undefined);
    setPostponeReason("");
    onOpenChange(false);
  };

  const isValid = postponedUntil && postponeReason;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-defer-lead">
        <DialogHeader>
          <DialogTitle>Отложить лид</DialogTitle>
          <DialogDescription>
            {leadName ? `Отложить лид: ${leadName}` : "Укажите дату возврата и причину отказа"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="postpone-date">Отложено до</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="postpone-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !postponedUntil && "text-muted-foreground"
                  )}
                  data-testid="button-select-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {postponedUntil ? format(postponedUntil, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={postponedUntil}
                  onSelect={setPostponedUntil}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  data-testid="calendar-postpone-date"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postpone-reason">Причина отказа</Label>
            <Select value={postponeReason} onValueChange={setPostponeReason}>
              <SelectTrigger id="postpone-reason" data-testid="select-postpone-reason">
                <SelectValue placeholder="Выберите причину" />
              </SelectTrigger>
              <SelectContent>
                {postponeReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value} data-testid={`reason-${reason.value}`}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            data-testid="button-cancel-defer"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isValid}
            data-testid="button-confirm-defer"
          >
            Отложить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
