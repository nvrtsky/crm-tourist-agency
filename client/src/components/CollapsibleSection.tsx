import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CollapsibleSectionProps {
  id: string;
  title?: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen = true,
  children,
  className = "",
  headerClassName = "",
}: CollapsibleSectionProps) {
  const storageKey = `collapsible-${id}`;
  
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return stored === "true";
    }
    return defaultOpen;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(isOpen));
  }, [isOpen, storageKey]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className={`flex items-center gap-2 ${headerClassName}`}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-7 w-7"
            data-testid={`toggle-${id}`}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        {title && (
          <CollapsibleTrigger asChild>
            <div className="cursor-pointer select-none">
              <span className="font-medium text-sm">{title}</span>
              {description && (
                <span className="text-xs text-muted-foreground ml-2">{description}</span>
              )}
            </div>
          </CollapsibleTrigger>
        )}
      </div>
      <CollapsibleContent className="mt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
