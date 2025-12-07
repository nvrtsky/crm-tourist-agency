import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type OutcomeType = "postponed" | "failed";
export type FailureReasonType = "missing_contact" | "expensive" | "competitor" | "not_target";

export interface DeferLeadDialogResult {
  outcomeType: OutcomeType;
  postponedUntil?: Date;
  postponeReason?: string;
  failureReason?: FailureReasonType;
}

interface DeferLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: DeferLeadDialogResult) => void;
  leadName?: string;
}

const postponeReasons = [
  { value: "next_year", label: "На следующий год" },
  { value: "thinking", label: "Думают" },
  { value: "other_country", label: "Поехали в другую страну" },
  { value: "waiting_passport", label: "Ждут паспорт" },
];

const failureReasons = [
  { value: "missing_contact", label: "Пропали" },
  { value: "expensive", label: "Дорого" },
  { value: "competitor", label: "Ушли к конкурентам" },
  { value: "not_target", label: "Не наша ЦА" },
];

export function DeferLeadDialog({ open, onOpenChange, onConfirm, leadName }: DeferLeadDialogProps) {
  const [outcomeType, setOutcomeType] = useState<OutcomeType>("postponed");
  const [postponedUntil, setPostponedUntil] = useState<Date | undefined>(undefined);
  const [postponeReason, setPostponeReason] = useState<string>("");
  const [failureReason, setFailureReason] = useState<FailureReasonType | "">("");

  useEffect(() => {
    if (open) {
      setOutcomeType("postponed");
      setPostponedUntil(undefined);
      setPostponeReason("");
      setFailureReason("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (outcomeType === "postponed") {
      if (!postponedUntil || !postponeReason) return;
      onConfirm({ 
        outcomeType: "postponed",
        postponedUntil, 
        postponeReason 
      });
    } else {
      if (!failureReason) return;
      onConfirm({ 
        outcomeType: "failed",
        failureReason: failureReason as FailureReasonType
      });
    }
    
    setPostponedUntil(undefined);
    setPostponeReason("");
    setFailureReason("");
  };

  const handleCancel = () => {
    setPostponedUntil(undefined);
    setPostponeReason("");
    setFailureReason("");
    onOpenChange(false);
  };

  const isValid = outcomeType === "postponed" 
    ? (postponedUntil && postponeReason) 
    : failureReason;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-defer-lead">
        <DialogHeader>
          <DialogTitle>Отложен/Провал</DialogTitle>
          <DialogDescription>
            {leadName ? `Лид: ${leadName}` : "Укажите тип исхода и причину"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Тип исхода</Label>
            <RadioGroup 
              value={outcomeType} 
              onValueChange={(value) => setOutcomeType(value as OutcomeType)}
              className="flex gap-4"
              data-testid="radio-outcome-type"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="postponed" id="outcome-postponed" data-testid="radio-postponed" />
                <Label htmlFor="outcome-postponed" className="flex items-center gap-1 cursor-pointer font-normal">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Отложен
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="failed" id="outcome-failed" data-testid="radio-failed" />
                <Label htmlFor="outcome-failed" className="flex items-center gap-1 cursor-pointer font-normal">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Провал
                </Label>
              </div>
            </RadioGroup>
          </div>

          {outcomeType === "postponed" && (
            <>
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
                <Label htmlFor="postpone-reason">Причина</Label>
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
            </>
          )}

          {outcomeType === "failed" && (
            <div className="space-y-2">
              <Label htmlFor="failure-reason">Причина провала</Label>
              <Select value={failureReason} onValueChange={(value) => setFailureReason(value as FailureReasonType)}>
                <SelectTrigger id="failure-reason" data-testid="select-failure-reason">
                  <SelectValue placeholder="Выберите причину провала" />
                </SelectTrigger>
                <SelectContent>
                  {failureReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value} data-testid={`failure-${reason.value}`}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
            variant={outcomeType === "failed" ? "destructive" : "default"}
            data-testid="button-confirm-defer"
          >
            {outcomeType === "postponed" ? "Отложить" : "Провал"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
