import { useState } from "react";
import { Lead, LeadStatus } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Filter, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onLeadDelete: (leadId: string) => void;
}

type SortField = "name" | "source" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qualified: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  won: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const statusLabels: Record<LeadStatus, string> = {
  new: "Новый",
  contacted: "Связались",
  qualified: "Квалифицирован",
  won: "Выигран",
  lost: "Проигран",
};

export function LeadsTable({ leads, onLeadClick, onLeadDelete }: LeadsTableProps) {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [statusFilters, setStatusFilters] = useState<Set<LeadStatus>>(
    new Set<LeadStatus>(["new", "contacted", "qualified", "won", "lost"])
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleStatusFilter = (status: LeadStatus) => {
    const newFilters = new Set(statusFilters);
    if (newFilters.has(status)) {
      newFilters.delete(status);
    } else {
      newFilters.add(status);
    }
    setStatusFilters(newFilters);
  };

  const filteredLeads = leads.filter((lead) => statusFilters.has(lead.status as LeadStatus));

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "source":
        comparison = (a.source || "").localeCompare(b.source || "");
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const SortButton = ({ field, children }: { field: SortField; children: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 hover-elevate active-elevate-2 px-2 py-1 rounded-md transition-colors"
      data-testid={`button-sort-${field}`}
    >
      <span className="font-medium">{children}</span>
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const activeFilterCount = 5 - statusFilters.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Показано: {sortedLeads.length} из {leads.length}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-filter-status">
              <Filter className="h-4 w-4 mr-2" />
              Фильтр по статусу
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {(["new", "contacted", "qualified", "won", "lost"] as LeadStatus[]).map(
              (status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilters.has(status)}
                  onCheckedChange={() => toggleStatusFilter(status)}
                  data-testid={`filter-status-${status}`}
                >
                  <Badge className={statusColors[status]} variant="outline">
                    {statusLabels[status]}
                  </Badge>
                </DropdownMenuCheckboxItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="table-leads">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4">
                  <SortButton field="name">Название</SortButton>
                </th>
                <th className="text-left p-4">
                  <SortButton field="source">Источник</SortButton>
                </th>
                <th className="text-left p-4">
                  <SortButton field="status">Статус</SortButton>
                </th>
                <th className="text-left p-4">
                  <SortButton field="createdAt">Дата создания</SortButton>
                </th>
                <th className="text-right p-4">
                  <span className="font-medium">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground">
                    Нет лидов для отображения
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-t hover-elevate cursor-pointer transition-colors"
                    onClick={() => onLeadClick(lead)}
                    data-testid={`row-lead-${lead.id}`}
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        {lead.phone && (
                          <p className="text-sm text-muted-foreground">{lead.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {lead.source || "—"}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge className={statusColors[lead.status as LeadStatus]} variant="outline">
                        {statusLabels[lead.status as LeadStatus]}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLeadClick(lead);
                          }}
                          data-testid={`button-edit-${lead.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLeadDelete(lead.id);
                          }}
                          data-testid={`button-delete-${lead.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
